import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import MatterDetail from './MatterDetail'

const TYPE_TH = {
  civil: 'คดีแพ่ง',
  criminal: 'คดีอาญา',
  family: 'คดีครอบครัว',
  labor: 'คดีแรงงาน',
  administrative: 'คดีปกครอง',
  bankruptcy: 'คดีล้มละลาย',
  debt: 'งานหนี้',
  other: 'อื่น ๆ',
}
const TYPE_OPTS = ['civil', 'criminal', 'family', 'labor', 'administrative', 'bankruptcy', 'other']

const field = {
  width: '100%', padding: '9px 11px', border: '1px solid var(--line2)',
  borderRadius: '8px', fontFamily: 'inherit', fontSize: '14px', background: '#fff',
}

export default function Matters({ profile }) {
  const [rows, setRows] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [openId, setOpenId] = useState(null)
  const [toast, setToast] = useState('')

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('matters')
      .select('*, clients(name)')
      .order('created_at', { ascending: false })
    setRows(data || [])
    setLoading(false)
  }
  async function loadClients() {
    const { data } = await supabase.from('clients').select('id,name').order('name')
    setClients(data || [])
  }
  useEffect(() => { load(); loadClients() }, [])

  function flash(m) { setToast(m); setTimeout(() => setToast(''), 2200) }

  return (
    <>
      <div className="filters">
        <div className="spacer"></div>
        <button className="btn btn-pri" onClick={() => setShowForm(true)}>+ เพิ่มคดีใหม่</button>
      </div>

      <div className="card">
        {loading ? (
          <div className="empty"><b>กำลังโหลด…</b></div>
        ) : rows.length === 0 ? (
          <div className="empty"><div className="ic">☰</div><b>ยังไม่มีคดีในระบบ</b>กดปุ่ม "เพิ่มคดีใหม่" เพื่อบันทึกคดีแรก</div>
        ) : (
          <div className="tbl-wrap"><table>
            <thead><tr>
              <th>เลขคดี</th><th>ชื่อเรื่อง</th><th>ประเภท</th><th>ลูกความ</th>
              <th>ศาล / เลขคดี</th><th>สถานะ</th><th>วันที่เปิด</th>
            </tr></thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} className="clk" onClick={() => setOpenId(m.id)}>
                  <td className="tnum">{m.matter_no}</td>
                  <td style={{ fontWeight: 600 }}>{m.title}</td>
                  <td><span className="tag t-grey">{TYPE_TH[m.matter_type] || m.matter_type}</span></td>
                  <td>{m.clients?.name || '—'}</td>
                  <td>
                    {m.court || '—'}
                    {m.case_number ? <div style={{ fontSize: 12, color: 'var(--muted)' }}>{m.case_number}</div> : null}
                  </td>
                  <td>{m.status}</td>
                  <td className="tnum">{m.date_opened}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>

      {showForm && (
        <AddMatter
          clients={clients}
          profile={profile}
          onClose={() => setShowForm(false)}
          onSaved={(msg) => { setShowForm(false); flash(msg); load(); loadClients() }}
        />
      )}

      {openId && (
        <MatterDetail
          matterId={openId}
          clients={clients}
          profile={profile}
          onClose={() => setOpenId(null)}
          onChanged={() => load()}
        />
      )}

      {toast && <div className="toast show">✓ {toast}</div>}
    </>
  )
}

function AddMatter({ clients, profile, onClose, onSaved }) {
  const [type, setType] = useState('civil')
  const [title, setTitle] = useState('')
  const [clientId, setClientId] = useState('')
  const [newClient, setNewClient] = useState('')
  const [court, setCourt] = useState('')
  const [caseNo, setCaseNo] = useState('')
  const [amount, setAmount] = useState('')
  const [desc, setDesc] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function save() {
    setErr('')
    if (!title.trim()) { setErr('กรุณากรอกชื่อเรื่อง/คดี'); return }
    setBusy(true)
    try {
      let cid = clientId && clientId !== '__new__' ? clientId : null
      if (clientId === '__new__') {
        if (!newClient.trim()) { setErr('กรุณากรอกชื่อลูกความ'); setBusy(false); return }
        const { data: c, error: ce } = await supabase
          .from('clients')
          .insert({ name: newClient.trim(), created_by: profile?.id || null })
          .select()
          .single()
        if (ce) throw ce
        cid = c.id
      }
      const { error } = await supabase.from('matters').insert({
        matter_type: type,
        title: title.trim(),
        client_id: cid,
        court: court.trim() || null,
        case_number: caseNo.trim() || null,
        claim_amount: amount ? Number(amount) : null,
        description: desc.trim() || null,
        assigned_to: profile?.id || null,
        created_by: profile?.id || null,
      })
      if (error) throw error
      onSaved('บันทึกคดีใหม่แล้ว')
    } catch (e) {
      setErr('บันทึกไม่สำเร็จ: ' + (e.message || e))
      setBusy(false)
    }
  }

  return (
    <div className="lb show" onClick={(e) => { if (e.target.classList.contains('lb')) onClose() }}>
      <div className="lb-inner" style={{ maxWidth: '520px' }}>
        <div className="lb-head"><b>เพิ่มคดีใหม่</b><button className="x" onClick={onClose}>✕</button></div>
        <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '68vh', overflow: 'auto' }}>
          {err && <div className="login-err">{err}</div>}
          <div><div className="fld-l">ประเภทคดี</div>
            <select style={field} value={type} onChange={(e) => setType(e.target.value)}>
              {TYPE_OPTS.map((t) => <option key={t} value={t}>{TYPE_TH[t]}</option>)}
            </select></div>
          <div><div className="fld-l">ชื่อเรื่อง / คดี *</div>
            <input style={field} type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="เช่น นายสมหมาย ฟ้องเรียกเงินตามสัญญากู้" /></div>
          <div><div className="fld-l">ลูกความ</div>
            <select style={field} value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">— ไม่ระบุ —</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              <option value="__new__">+ เพิ่มลูกความใหม่…</option>
            </select></div>
          {clientId === '__new__' && (
            <div><div className="fld-l">ชื่อลูกความใหม่</div>
              <input style={field} type="text" value={newClient} onChange={(e) => setNewClient(e.target.value)} placeholder="ชื่อบุคคล หรือ บริษัท" /></div>
          )}
          <div><div className="fld-l">ศาล</div>
            <input style={field} type="text" value={court} onChange={(e) => setCourt(e.target.value)} placeholder="เช่น ศาลแพ่งกรุงเทพใต้" /></div>
          <div><div className="fld-l">เลขคดี (ถ้ามี)</div>
            <input style={field} type="text" value={caseNo} onChange={(e) => setCaseNo(e.target.value)} placeholder="เช่น ผบ.123/2569" /></div>
          <div><div className="fld-l">ทุนทรัพย์ (บาท)</div>
            <input style={field} type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" /></div>
          <div><div className="fld-l">รายละเอียด</div>
            <textarea style={{ ...field, resize: 'vertical', minHeight: '64px' }} value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
        </div>
        <div className="lb-foot">
          <div className="spacer"></div>
          <button className="btn btn-gho btn-sm" onClick={onClose}>ยกเลิก</button>
          <button className="btn btn-pri btn-sm" onClick={save} disabled={busy}>{busy ? 'กำลังบันทึก…' : 'บันทึกคดี'}</button>
        </div>
      </div>
    </div>
  )
}
