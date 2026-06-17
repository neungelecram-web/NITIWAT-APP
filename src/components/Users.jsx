import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const ROLE_TH = { admin: 'ผู้ดูแลระบบ', lawyer: 'ทนายความ', collector: 'เจ้าหน้าที่เร่งรัดหนี้', paralegal: 'นิติกร / ธุรการ' }
const ROLE_OPTS = ['admin', 'lawyer', 'collector', 'paralegal']
const sel = { padding: '6px 9px', border: '1px solid var(--line2)', borderRadius: 8, fontFamily: 'inherit', fontSize: 13.5, background: '#fff' }
const field = { width: '100%', padding: '9px 11px', border: '1px solid var(--line2)', borderRadius: '8px', fontFamily: 'inherit', fontSize: '14px', background: '#fff' }

export default function Users({ me }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('created_at')
    setRows(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])
  function flash(m) { setToast(m); setTimeout(() => setToast(''), 1800) }

  async function setRole(id, role) {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
    if (error) { flash('แก้ไขไม่สำเร็จ: ' + error.message); return }
    setRows(rows.map((r) => (r.id === id ? { ...r, role } : r)))
    flash('อัปเดตบทบาทแล้ว')
  }
  async function toggleActive(u) {
    const { error } = await supabase.from('profiles').update({ active: !u.active }).eq('id', u.id)
    if (error) { flash('แก้ไขไม่สำเร็จ: ' + error.message); return }
    setRows(rows.map((r) => (r.id === u.id ? { ...r, active: !u.active } : r)))
    flash(u.active ? 'ปิดบัญชีแล้ว' : 'เปิดใช้งานแล้ว')
  }

  return (
    <>
      <div className="filters">
        <div className="note" style={{ margin: 0, flex: 1 }}><span className="ic">◍</span><div>จัดการบทบาทและสถานะผู้ใช้ — กด "เพิ่มผู้ใช้ใหม่" เพื่อสร้างบัญชีล็อกอินได้จากที่นี่เลย</div></div>
        <button className="btn btn-pri" onClick={() => setShowAdd(true)}>+ เพิ่มผู้ใช้ใหม่</button>
      </div>

      <div className="card">
        {loading ? (
          <div className="empty"><b>กำลังโหลด…</b></div>
        ) : (
          <div className="tbl-wrap"><table>
            <thead><tr><th>ผู้ใช้</th><th>บทบาท</th><th>สถานะ</th><th>วันที่สร้าง</th><th></th></tr></thead>
            <tbody>
              {rows.map((u) => {
                const isMe = u.id === me?.id
                return (
                  <tr key={u.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{u.full_name || '(ยังไม่ตั้งชื่อ)'}{isMe && <span className="tag t-grey" style={{ marginLeft: 8, fontSize: 11 }}>คุณ</span>}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{u.email}</div>
                    </td>
                    <td>
                      <select style={sel} value={u.role} disabled={isMe} onChange={(e) => setRole(u.id, e.target.value)}>
                        {ROLE_OPTS.map((r) => <option key={r} value={r}>{ROLE_TH[r]}</option>)}
                      </select>
                    </td>
                    <td>
                      {u.active
                        ? <span className="tag t-closed">ใช้งานอยู่</span>
                        : <span className="tag t-danger">ปิดบัญชี</span>}
                    </td>
                    <td className="tnum" style={{ fontSize: 13 }}>{u.created_at ? new Date(u.created_at).toLocaleDateString('th-TH') : '—'}</td>
                    <td>
                      {!isMe && <button className="btn btn-gho btn-sm" onClick={() => toggleActive(u)}>{u.active ? 'ปิดบัญชี' : 'เปิดใช้งาน'}</button>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table></div>
        )}
      </div>

      <div className="note" style={{ marginTop: 16 }}><span className="ic">ⓘ</span><div>บัญชีของคุณเองจะแก้บทบาท/ปิดบัญชีตัวเองไม่ได้ (กันล็อกตัวเองออกจากระบบจัดการ)</div></div>

      {showAdd && <AddUser onClose={() => setShowAdd(false)} onCreated={() => { setShowAdd(false); flash('สร้างผู้ใช้ใหม่แล้ว'); load() }} />}
      {toast && <div className="toast show">✓ {toast}</div>}
    </>
  )
}

function AddUser({ onClose, onCreated }) {
  const [full_name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('paralegal')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function save() {
    setErr('')
    if (!email.trim() || !password) { setErr('กรุณากรอกอีเมลและรหัสผ่าน'); return }
    if (password.length < 6) { setErr('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'); return }
    setBusy(true)
    const { data, error } = await supabase.functions.invoke('admin-create-user', {
      body: { email: email.trim(), password, full_name: full_name.trim(), role },
    })
    setBusy(false)
    if (error) { setErr('เรียกฟังก์ชันไม่สำเร็จ: ' + error.message); return }
    if (!data?.ok) { setErr(data?.error || 'สร้างผู้ใช้ไม่สำเร็จ'); return }
    onCreated()
  }

  return (
    <div className="lb show" onClick={(e) => { if (e.target.classList.contains('lb')) onClose() }}>
      <div className="lb-inner" style={{ maxWidth: 460 }}>
        <div className="lb-head"><b>เพิ่มผู้ใช้ใหม่</b><button className="x" onClick={onClose}>✕</button></div>
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {err && <div className="login-err">{err}</div>}
          <div><div className="fld-l">ชื่อ-สกุล</div><input style={field} value={full_name} onChange={(e) => setName(e.target.value)} placeholder="เช่น สมหญิง ใจดี" /></div>
          <div><div className="fld-l">อีเมล (ใช้ล็อกอิน) *</div><input style={field} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@nitiwat.com" /></div>
          <div><div className="fld-l">รหัสผ่านเริ่มต้น *</div><input style={field} type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="อย่างน้อย 6 ตัวอักษร" /></div>
          <div><div className="fld-l">บทบาท</div>
            <select style={field} value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLE_OPTS.map((r) => <option key={r} value={r}>{ROLE_TH[r]}</option>)}
            </select></div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>แนะนำให้ผู้ใช้เปลี่ยนรหัสผ่านเองที่เมนู "โปรไฟล์ของฉัน" หลังเข้าระบบครั้งแรก</div>
        </div>
        <div className="lb-foot">
          <div className="spacer"></div>
          <button className="btn btn-gho btn-sm" onClick={onClose}>ยกเลิก</button>
          <button className="btn btn-pri btn-sm" onClick={save} disabled={busy}>{busy ? 'กำลังสร้าง…' : 'สร้างผู้ใช้'}</button>
        </div>
      </div>
    </div>
  )
}
