import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import MatterDetail from './MatterDetail'

const STAGE_TH = { collect: 'ทวงหนี้', enforce: 'บังคับคดี', litig: 'ฟ้องคดี', closed: 'ปิดคดี' }
const STAGE_OPTS = ['collect', 'enforce', 'litig', 'closed']
const STAGE_CLS = { collect: 't-collect', enforce: 't-enforce', litig: 't-litig', closed: 't-closed' }
const baht = (n) => (Number(n) || 0).toLocaleString('th-TH')
const odClass = (d) => (d > 90 ? 'hi' : d > 0 ? 'mid' : 'ok')

export default function Debts({ profile }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const [openId, setOpenId] = useState(null)
  const [toast, setToast] = useState('')

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('matters').select('*, matter_debt(*)').eq('matter_type', 'debt').order('created_at', { ascending: false })
    setRows(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])
  function flash(m) { setToast(m); setTimeout(() => setToast(''), 1800) }

  const debt = (r) => (Array.isArray(r.matter_debt) ? (r.matter_debt[0] || {}) : (r.matter_debt || {}))

  async function setStage(id, stage) {
    await supabase.from('matters').update({ stage }).eq('id', id)
    setRows(rows.map((r) => (r.id === id ? { ...r, stage } : r)))
    flash('เลื่อนขั้นตอนแล้ว')
  }

  let list = rows
  if (filter !== 'all') list = list.filter((r) => r.stage === filter)
  if (q) {
    const s = q.toLowerCase()
    list = list.filter((r) => { const d = debt(r); return [r.title, d.contract_no, d.vehicle_plate, d.vehicle_brand, d.vehicle_model].join(' ').toLowerCase().includes(s) })
  }

  const counts = { all: rows.length }
  STAGE_OPTS.forEach((s) => { counts[s] = rows.filter((r) => r.stage === s).length })
  const sumOS = rows.reduce((a, r) => a + (Number(debt(r).os_balance) || 0), 0)
  const sumDue = rows.reduce((a, r) => a + (Number(debt(r).amount_due) || 0) + (Number(debt(r).penalty) || 0), 0)
  const over90 = rows.filter((r) => (Number(debt(r).days_overdue) || 0) > 90).length

  const Chip = ({ k, label }) => (
    <button className={'chip' + (filter === k ? ' on' : '')} onClick={() => setFilter(k)}>{label}<span className="c">{counts[k] ?? 0}</span></button>
  )

  return (
    <>
      <div className="kpis">
        <div className="kpi"><div className="lab">คดีหนี้ทั้งหมด</div><div className="val">{rows.length}<small>คดี</small></div></div>
        <div className="kpi"><div className="lab">ยอดคงเหลือรวม</div><div className="val tnum">{baht(sumOS)}<small>฿</small></div></div>
        <div className="kpi"><div className="lab">ยอดค้างชำระรวม</div><div className="val tnum" style={{ color: 'var(--danger)' }}>{baht(sumDue)}<small>฿</small></div></div>
        <div className="kpi"><div className="lab"><span className="dot" style={{ background: 'var(--danger)' }}></span>ค้างเกิน 90 วัน</div><div className="val">{over90}<small>ราย</small></div></div>
      </div>

      <div className="filters">
        <Chip k="all" label="ทั้งหมด" />
        <Chip k="collect" label="ทวงหนี้" />
        <Chip k="enforce" label="บังคับคดี" />
        <Chip k="litig" label="ฟ้องคดี" />
        <Chip k="closed" label="ปิดคดี" />
        <div className="spacer"></div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหา ชื่อ/สัญญา/ทะเบียน"
          style={{ padding: '8px 12px', border: '1px solid var(--line2)', borderRadius: 9, background: 'var(--surface2)', width: 240 }} />
      </div>

      <div className="card">
        {loading ? (
          <div className="empty"><b>กำลังโหลด…</b></div>
        ) : list.length === 0 ? (
          <div className="empty"><div className="ic">฿</div><b>ไม่พบคดีหนี้</b>นำเข้าข้อมูลได้ที่เมนู "นำเข้างานหนี้"</div>
        ) : (
          <div className="tbl-wrap"><table>
            <thead><tr>
              <th>ลูกหนี้ / สัญญา</th><th>หลักประกัน</th><th className="num">ยอดคงเหลือ</th>
              <th className="num">ยอดค้าง</th><th className="num">วันค้าง</th><th>ขั้นตอน</th>
            </tr></thead>
            <tbody>
              {list.map((r) => {
                const d = debt(r)
                const due = (Number(d.amount_due) || 0) + (Number(d.penalty) || 0)
                const od = Number(d.days_overdue) || 0
                return (
                  <tr key={r.id} className="clk" onClick={() => setOpenId(r.id)}>
                    <td><div style={{ fontWeight: 600 }}>{r.title}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.matter_no}</div></td>
                    <td>{[d.vehicle_brand, d.vehicle_model].filter(Boolean).join(' ') || '—'}<div style={{ fontSize: 12, color: 'var(--muted)' }}>{d.vehicle_plate || ''}</div></td>
                    <td className="num tnum">{baht(d.os_balance)}</td>
                    <td className="num tnum">{due ? baht(due) : '—'}</td>
                    <td className={'num od ' + odClass(od)}>{od}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <select value={r.stage || 'collect'} onChange={(e) => setStage(r.id, e.target.value)}
                        className={'tag ' + (STAGE_CLS[r.stage] || 't-grey')}
                        style={{ border: 'none', fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer', padding: '3px 8px', borderRadius: 20 }}>
                        {STAGE_OPTS.map((s) => <option key={s} value={s}>{STAGE_TH[s]}</option>)}
                      </select>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table></div>
        )}
      </div>

      {openId && (
        <MatterDetail
          matterId={openId}
          clients={[]}
          profile={profile}
          onClose={() => setOpenId(null)}
          onChanged={() => load()}
        />
      )}

      {toast && <div className="toast show">✓ {toast}</div>}
    </>
  )
}
