import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const THM = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
const TYPE_TH = { civil: 'คดีแพ่ง', criminal: 'คดีอาญา', family: 'คดีครอบครัว', labor: 'คดีแรงงาน', administrative: 'คดีปกครอง', bankruptcy: 'คดีล้มละลาย', debt: 'งานหนี้', other: 'อื่น ๆ' }
const EV_TH = { hearing: 'นัดพิจารณา/สืบพยาน', mediation: 'นัดไกล่เกลี่ย', judgment: 'นัดฟังคำพิพากษา', deadline: 'ครบกำหนด', appointment: 'นัดหมาย' }
const baht = (n) => Math.round(Number(n) || 0).toLocaleString('th-TH')
const isoOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const TODAY = isoOf(new Date())

function Tile({ icon, label, value, sub, color }) {
  return (
    <div className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 48, height: 48, borderRadius: 13, background: color + '20', color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 23, flexShrink: 0 }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{label}</div>
        <div className="tnum" style={{ fontSize: 23, fontWeight: 800, lineHeight: 1.15 }}>{value}</div>
        {sub && <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{sub}</div>}
      </div>
    </div>
  )
}

export default function Dashboard({ profile, onNav }) {
  const [s, setS] = useState(null)
  useEffect(() => {
    ;(async () => {
      const [mAll, mActive, deb, fin, ev, recent] = await Promise.all([
        supabase.from('matters').select('*', { count: 'exact', head: true }),
        supabase.from('matters').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('matter_debt').select('amount_due, penalty, days_overdue'),
        supabase.from('finance').select('type, amount'),
        supabase.from('events').select('*, matters(title)').gte('event_date', TODAY).order('event_date').limit(6),
        supabase.from('matters').select('id, matter_no, title, matter_type, created_at').order('created_at', { ascending: false }).limit(6),
      ])
      const debt = deb.data || []; const finance = fin.data || []
      const over90 = debt.filter((r) => Number(r.days_overdue || 0) > 90).length
      const received = finance.filter((f) => f.type === 'deposit' || f.type === 'payment').reduce((a, f) => a + Number(f.amount || 0), 0)
      setS({ total: mAll.count || 0, active: mActive.count || 0, upcoming: ev.data || [], recent: recent.data || [], over90, received })
    })()
  }, [])

  const now = new Date()
  const greet = now.getHours() < 12 ? 'สวัสดีตอนเช้า' : now.getHours() < 17 ? 'สวัสดีตอนบ่าย' : 'สวัสดีตอนเย็น'
  const todayTh = `${now.getDate()} ${THM[now.getMonth() + 1]} ${now.getFullYear() + 543}`

  return (
    <>
      <div style={{ background: 'linear-gradient(135deg,#1b2a4a,#33507f)', color: '#fff', borderRadius: 16, padding: '22px 24px', marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{greet}, {profile?.full_name || 'ผู้ใช้งาน'}</div>
          <div style={{ opacity: 0.8, fontSize: 13.5, marginTop: 2 }}>ภาพรวมงานของสำนักงานทนายความนิติวัฒน์ · {todayTh}</div>
        </div>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,.12)', border: '2px solid #b08537', color: '#caa25a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18 }}>นว</div>
      </div>

      {!s ? <div className="empty"><b>กำลังโหลด…</b></div> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <Tile icon="📁" color="#1b2a4a" label="คดีทั้งหมด" value={s.total} sub="ในระบบ" />
            <Tile icon="⚖️" color="#1b6e8c" label="กำลังดำเนินการ" value={s.active} sub="คดีที่ยัง active" />
            <Tile icon="⏰" color="#b91c1c" label="หนี้ค้างเกิน 90 วัน" value={s.over90} sub="ราย" />
            <Tile icon="💰" color="#15803d" label="รับชำระแล้วรวม" value={baht(s.received) + ' ฿'} sub="ทุกคดี" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginTop: 16 }}>
            <div className="card">
              <div className="card-h"><h3>นัดที่จะถึง</h3><button className="btn btn-gho btn-sm" onClick={() => onNav && onNav('calendar')}>ดูปฏิทิน</button></div>
              <div style={{ padding: '4px 0' }}>
                {s.upcoming.length === 0 ? <div className="empty" style={{ padding: 30 }}><div className="ic">📅</div><b>ไม่มีนัดที่จะถึง</b></div>
                  : s.upcoming.map((e) => {
                    const p = e.event_date.split('-')
                    return (
                      <div className="up-ev" key={e.id} onClick={() => onNav && onNav('calendar')}>
                        <div className="up-date"><b>{+p[2]}</b><span>{THM[+p[1]]}</span></div>
                        <div className="up-body"><b>{e.title}</b><div className="sub">{e.matters ? e.matters.title : ''} · {EV_TH[e.type] || e.type}</div></div>
                      </div>
                    )
                  })}
              </div>
            </div>

            <div className="card">
              <div className="card-h"><h3>คดีล่าสุด</h3><button className="btn btn-gho btn-sm" onClick={() => onNav && onNav('matters')}>ดูทั้งหมด</button></div>
              <div style={{ padding: '4px 16px 10px' }}>
                {s.recent.length === 0 ? <div className="empty" style={{ padding: 30 }}><div className="ic">☰</div><b>ยังไม่มีคดี</b></div>
                  : s.recent.map((m) => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
                      <span className="tag t-grey">{TYPE_TH[m.matter_type] || m.matter_type}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{m.matter_no}</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
