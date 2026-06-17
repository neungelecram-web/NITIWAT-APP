import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const THM = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
const EV_TH = { hearing: 'นัดพิจารณา/สืบพยาน', mediation: 'นัดไกล่เกลี่ย', judgment: 'นัดฟังคำพิพากษา', deadline: 'ครบกำหนด/เส้นตาย', appointment: 'นัดหมายอื่น ๆ' }
const EV_COLOR = { hearing: '#6d28d9', mediation: '#1b6e8c', judgment: '#b91c1c', deadline: '#c2410c', appointment: '#15803d' }

function isoOf(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const TODAY = isoOf(new Date())
function fmtISOThai(iso) { if (!iso) return '—'; const [y, m, d] = iso.split('-').map(Number); return `${d} ${THM[m]} ${y + 543}` }

export default function Calendar() {
  const [events, setEvents] = useState([])
  const [cal, setCal] = useState(null)
  const [sel, setSel] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.from('events').select('*, matters(matter_no, title)').order('event_date')
      const evs = data || []
      setEvents(evs)
      const up = evs.map((e) => e.event_date).filter((d) => d >= TODAY).sort()
      const base = (up[0] || TODAY).split('-').map(Number)
      setCal({ y: base[0], m: base[1] })
      setLoading(false)
    })()
  }, [])

  if (loading || !cal) return <div className="empty"><b>กำลังโหลด…</b></div>

  const { y, m } = cal
  const startWd = new Date(y, m - 1, 1).getDay()
  const days = new Date(y, m, 0).getDate()
  const prevDays = new Date(y, m - 1, 0).getDate()
  const evMap = {}
  events.forEach((e) => { (evMap[e.event_date] = evMap[e.event_date] || []).push(e) })

  const cells = []
  for (let i = 0; i < startWd; i++) cells.push(<div className="cal-cell out" key={'p' + i}><div className="cal-day">{prevDays - startWd + 1 + i}</div></div>)
  for (let d = 1; d <= days; d++) {
    const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const evs = evMap[iso] || []
    const isT = iso === TODAY
    cells.push(
      <div className={'cal-cell' + (isT ? ' today' : '')} key={'d' + d}>
        <div className={'cal-day' + (isT ? ' t' : '')}>{d}</div>
        {evs.map((e) => (
          <button className="cal-ev" key={e.id} style={{ background: EV_COLOR[e.type] }} title={e.title} onClick={() => setSel(e)}>{e.title}</button>
        ))}
      </div>
    )
  }
  const trail = (7 - (startWd + days) % 7) % 7
  for (let i = 1; i <= trail; i++) cells.push(<div className="cal-cell out" key={'t' + i}><div className="cal-day">{i}</div></div>)

  const upcoming = events.filter((e) => e.event_date >= TODAY).slice(0, 10)
  const wd = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

  function nav(delta) {
    let mm = m + delta, yy = y
    if (mm < 1) { mm = 12; yy-- }
    if (mm > 12) { mm = 1; yy++ }
    setCal({ y: yy, m: mm })
  }
  function today() { const t = TODAY.split('-').map(Number); setCal({ y: t[0], m: t[1] }) }

  return (
    <>
      <div className="note"><span className="ic">📅</span><div>ปฏิทินรวมวันนัดทุกคดี — นัดพิจารณา สืบพยาน ไกล่เกลี่ย ฟังคำพิพากษา และกำหนดการสำคัญ คลิกที่นัดเพื่อดูรายละเอียด (เพิ่มวันนัดได้จากแท็บ "วันนัด" ในแฟ้มคดี)</div></div>

      <div className="cal-top">
        <div className="cal-title">{THM[m]} {y + 543}</div>
        <button className="btn btn-gho btn-sm" onClick={() => nav(-1)}>‹</button>
        <button className="btn btn-gho btn-sm" onClick={today}>วันนี้</button>
        <button className="btn btn-gho btn-sm" onClick={() => nav(1)}>›</button>
      </div>

      <div className="cal-layout">
        <div className="card" style={{ padding: 14 }}>
          <div className="cal">
            {wd.map((w) => <div className="cal-wd" key={w}>{w}</div>)}
            {cells}
          </div>
          <div className="cal-legend">
            {Object.keys(EV_TH).map((k) => <span className="leg" key={k}><span className="d" style={{ background: EV_COLOR[k] }}></span>{EV_TH[k]}</span>)}
          </div>
        </div>

        <div className="card">
          <div className="card-h"><h3>นัดที่จะถึง</h3></div>
          <div style={{ padding: '4px 0' }}>
            {upcoming.length === 0 && <div className="empty" style={{ padding: 34 }}><div className="ic">📅</div><b>ไม่มีนัดที่จะถึง</b></div>}
            {upcoming.map((e) => {
              const p = e.event_date.split('-')
              return (
                <div className="up-ev" key={e.id} onClick={() => setSel(e)}>
                  <div className="up-date" style={{ borderColor: EV_COLOR[e.type] }}><b>{+p[2]}</b><span>{THM[+p[1]]}</span></div>
                  <div className="up-body"><b>{e.title}</b><div className="sub">{e.matters ? e.matters.title : ''} · {EV_TH[e.type]}</div></div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {sel && (
        <div className="lb show" onClick={(ev) => { if (ev.target.classList.contains('lb')) setSel(null) }}>
          <div className="lb-inner" style={{ maxWidth: 440 }}>
            <div className="lb-head">
              <div style={{ width: 32, height: 32, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', background: EV_COLOR[sel.type] }}>📅</div>
              <b>{EV_TH[sel.type]}</b>
              <button className="x" onClick={() => setSel(null)}>✕</button>
            </div>
            <div style={{ padding: 18 }}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>{sel.title}</div>
              <div className="sec" style={{ margin: 0 }}>
                <div className="kv">
                  <div className="row"><div className="k">วันที่</div><div className="v">{fmtISOThai(sel.event_date)}</div></div>
                  <div className="row"><div className="k">ประเภท</div><div className="v">{EV_TH[sel.type]}</div></div>
                  <div className="row full"><div className="k">คดี</div><div className="v">{sel.matters ? `${sel.matters.matter_no} · ${sel.matters.title}` : '—'}</div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
