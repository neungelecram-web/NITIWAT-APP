import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const TYPE_TH = { civil: 'คดีแพ่ง', criminal: 'คดีอาญา', family: 'คดีครอบครัว', labor: 'คดีแรงงาน', administrative: 'คดีปกครอง', bankruptcy: 'คดีล้มละลาย', debt: 'งานหนี้', other: 'อื่น ๆ' }
const STATUS_TH = { active: 'กำลังดำเนินการ', closed: 'ปิดคดี', suspended: 'พักคดี' }
const STAGE_TH = { collect: 'ทวงหนี้', enforce: 'บังคับคดี', litig: 'ฟ้องคดี', closed: 'ปิดคดี' }
const STAGE_COLOR = { collect: '#b08537', enforce: '#1b6e8c', litig: '#6d28d9', closed: '#15803d' }
const TYPE_COLOR = ['#1b2a4a', '#1b6e8c', '#b08537', '#15803d', '#6d28d9', '#b91c1c', '#0f766e', '#64748b']
const baht = (n) => Math.round(Number(n) || 0).toLocaleString('th-TH')

function Tile({ icon, label, value, sub, color }) {
  return (
    <div className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14, borderTop: `3px solid ${color}` }}>
      <div style={{ width: 48, height: 48, borderRadius: 13, background: color + '20', color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 23, flexShrink: 0 }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{label}</div>
        <div className="tnum" style={{ fontSize: 23, fontWeight: 800, lineHeight: 1.15 }}>{value}</div>
        {sub && <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{sub}</div>}
      </div>
    </div>
  )
}

function Bar({ label, value, max, color, suffix }) {
  const pct = max > 0 ? Math.max(3, Math.round((value / max) * 100)) : 0
  return (
    <div style={{ marginBottom: 13 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
        <span style={{ fontWeight: 500 }}>{label}</span>
        <span className="tnum" style={{ fontWeight: 700, color: color || 'var(--ink)' }}>{value.toLocaleString('th-TH')}{suffix || ''}</span>
      </div>
      <div style={{ height: 10, background: '#eef1f5', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ width: pct + '%', height: '100%', borderRadius: 8, background: `linear-gradient(90deg, ${color || '#b08537'}, ${(color || '#b08537')}cc)` }}></div>
      </div>
    </div>
  )
}

function SecCard({ icon, title, children }) {
  return (
    <div className="card">
      <div className="card-h"><h3>{icon} {title}</h3></div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  )
}

export default function Reports() {
  const [d, setD] = useState(null)
  useEffect(() => {
    ;(async () => {
      const [mm, fin, debt, profs] = await Promise.all([
        supabase.from('matters').select('id, matter_type, status, stage, assigned_to'),
        supabase.from('finance').select('type, amount'),
        supabase.from('matter_debt').select('os_balance, amount_due, penalty, days_overdue'),
        supabase.from('profiles').select('id, full_name'),
      ])
      setD({ matters: mm.data || [], finance: fin.data || [], debt: debt.data || [], profiles: profs.data || [] })
    })()
  }, [])

  if (!d) return <div className="empty"><b>กำลังประมวลผลรายงาน…</b></div>

  const { matters, finance, debt, profiles } = d
  const nameById = Object.fromEntries(profiles.map((p) => [p.id, p.full_name || '(ไม่ระบุชื่อ)']))

  const total = matters.length
  const activeCount = matters.filter((m) => m.status === 'active').length
  const byType = {}; matters.forEach((m) => { byType[m.matter_type] = (byType[m.matter_type] || 0) + 1 })
  const byStatus = {}; matters.forEach((m) => { byStatus[m.status] = (byStatus[m.status] || 0) + 1 })
  const debtMatters = matters.filter((m) => m.matter_type === 'debt')
  const byStage = {}; debtMatters.forEach((m) => { const s = m.stage || 'collect'; byStage[s] = (byStage[s] || 0) + 1 })

  const billed = finance.filter((f) => f.type === 'fee' || f.type === 'expense').reduce((a, f) => a + Number(f.amount || 0), 0)
  const received = finance.filter((f) => f.type === 'deposit' || f.type === 'payment').reduce((a, f) => a + Number(f.amount || 0), 0)
  const outstanding = billed - received

  const osTotal = debt.reduce((a, r) => a + Number(r.os_balance || 0), 0)
  const dueTotal = debt.reduce((a, r) => a + Number(r.amount_due || 0) + Number(r.penalty || 0), 0)
  const over90 = debt.filter((r) => Number(r.days_overdue || 0) > 90).length

  const byAssignee = {}; matters.forEach((m) => { const k = m.assigned_to || 'unassigned'; byAssignee[k] = (byAssignee[k] || 0) + 1 })
  const assigneeRows = Object.entries(byAssignee)
    .map(([k, v]) => ({ name: k === 'unassigned' ? '(ยังไม่มอบหมาย)' : (nameById[k] || '(ไม่ทราบ)'), count: v }))
    .sort((a, b) => b.count - a.count)

  const typeEntries = Object.entries(byType).sort((a, b) => b[1] - a[1])
  const maxType = Math.max(1, ...Object.values(byType))
  const maxStatus = Math.max(1, ...Object.values(byStatus))
  const maxStage = Math.max(1, ...Object.values(byStage))
  const maxAssignee = Math.max(1, ...assigneeRows.map((r) => r.count))
  const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: 16, marginTop: 16 }

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        <Tile icon="📁" color="#1b2a4a" label="คดีทั้งหมด" value={total} sub="ในระบบ" />
        <Tile icon="⚖️" color="#1b6e8c" label="กำลังดำเนินการ" value={activeCount} sub="คดี active" />
        <Tile icon="💰" color="#15803d" label="รับชำระแล้วรวม" value={baht(received) + ' ฿'} sub="ทุกคดี" />
        <Tile icon="⏳" color="#b91c1c" label="ค้างรับค่าบริการ" value={baht(Math.max(0, outstanding)) + ' ฿'} sub="ยังไม่ชำระ" />
      </div>

      <div style={grid}>
        <SecCard icon="📂" title="คดีตามประเภท">
          {typeEntries.length === 0 ? <div style={{ color: 'var(--muted)', fontSize: 13 }}>ยังไม่มีข้อมูล</div>
            : typeEntries.map(([k, v], i) => <Bar key={k} label={TYPE_TH[k] || k} value={v} max={maxType} color={TYPE_COLOR[i % TYPE_COLOR.length]} suffix=" คดี" />)}
        </SecCard>

        <SecCard icon="🏷️" title="คดีตามสถานะ">
          {Object.keys(byStatus).length === 0 ? <div style={{ color: 'var(--muted)', fontSize: 13 }}>ยังไม่มีข้อมูล</div>
            : Object.entries(byStatus).map(([k, v]) => <Bar key={k} label={STATUS_TH[k] || k} value={v} max={maxStatus} suffix=" คดี" color={k === 'active' ? '#1b6e8c' : k === 'closed' ? '#15803d' : '#94a3b8'} />)}
        </SecCard>

        <SecCard icon="🚗" title="งานหนี้ตามขั้นตอน">
          {debtMatters.length === 0 ? <div style={{ color: 'var(--muted)', fontSize: 13 }}>ยังไม่มีงานหนี้</div>
            : ['collect', 'enforce', 'litig', 'closed'].filter((s) => byStage[s]).map((s) => <Bar key={s} label={STAGE_TH[s]} value={byStage[s]} max={maxStage} color={STAGE_COLOR[s]} suffix=" คดี" />)}
          <div style={{ display: 'flex', gap: 10, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 90, background: 'var(--surface2)', borderRadius: 10, padding: '10px 12px' }}><div style={{ color: 'var(--muted)', fontSize: 12 }}>ยอดคงเหลือรวม</div><div className="tnum" style={{ fontWeight: 800, fontSize: 16 }}>{baht(osTotal)} ฿</div></div>
            <div style={{ flex: 1, minWidth: 90, background: 'var(--surface2)', borderRadius: 10, padding: '10px 12px' }}><div style={{ color: 'var(--muted)', fontSize: 12 }}>ยอดค้างรวม</div><div className="tnum" style={{ fontWeight: 800, fontSize: 16, color: 'var(--danger)' }}>{baht(dueTotal)} ฿</div></div>
            <div style={{ flex: 1, minWidth: 90, background: 'var(--surface2)', borderRadius: 10, padding: '10px 12px' }}><div style={{ color: 'var(--muted)', fontSize: 12 }}>ค้างเกิน 90 วัน</div><div className="tnum" style={{ fontWeight: 800, fontSize: 16 }}>{over90} ราย</div></div>
          </div>
        </SecCard>

        <SecCard icon="💵" title="การเงินรวมทั้งสำนักงาน">
          <Bar label="เรียกเก็บรวม (ค่าวิชาชีพ + ค่าใช้จ่าย)" value={Math.round(billed)} max={Math.max(1, billed, received)} color="#b08537" suffix=" ฿" />
          <Bar label="รับชำระ / วางแล้วรวม" value={Math.round(received)} max={Math.max(1, billed, received)} color="#15803d" suffix=" ฿" />
          <Bar label="คงค้างรับ" value={Math.round(Math.max(0, outstanding))} max={Math.max(1, billed, received)} color="#b91c1c" suffix=" ฿" />
        </SecCard>

        <SecCard icon="👤" title="คดีตามผู้รับผิดชอบ">
          {assigneeRows.length === 0 ? <div style={{ color: 'var(--muted)', fontSize: 13 }}>ยังไม่มีข้อมูล</div>
            : assigneeRows.map((r, i) => <Bar key={i} label={r.name} value={r.count} max={maxAssignee} color="#1b2a4a" suffix=" คดี" />)}
        </SecCard>
      </div>

      <div className="note" style={{ marginTop: 16 }}><span className="ic">ⓘ</span><div>ตัวเลขคำนวณจากข้อมูลจริงในระบบแบบเรียลไทม์ — เปิดหน้านี้เมื่อใดก็เห็นภาพรวมล่าสุด</div></div>
    </>
  )
}
