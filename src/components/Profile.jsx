import { useState } from 'react'
import { supabase } from '../lib/supabase'

const ROLE_TH = { admin: 'ผู้ดูแลระบบ', lawyer: 'ทนายความ', collector: 'เจ้าหน้าที่เร่งรัดหนี้', paralegal: 'นิติกร / ธุรการ' }
const field = { width: '100%', padding: '9px 11px', border: '1px solid var(--line2)', borderRadius: '8px', fontFamily: 'inherit', fontSize: '14px', background: '#fff' }
const ro = { ...field, background: '#f1f5f9', color: 'var(--muted)' }

export default function Profile({ me, onSaved }) {
  const [name, setName] = useState(me?.full_name || '')
  const [savingName, setSavingName] = useState(false)
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [savingPw, setSavingPw] = useState(false)
  const [err, setErr] = useState('')
  const [toast, setToast] = useState('')
  function flash(m) { setToast(m); setTimeout(() => setToast(''), 1800) }

  async function saveName() {
    setSavingName(true)
    const { error } = await supabase.from('profiles').update({ full_name: name.trim() }).eq('id', me.id)
    setSavingName(false)
    if (error) { flash('บันทึกไม่สำเร็จ'); return }
    flash('บันทึกโปรไฟล์แล้ว'); onSaved && onSaved()
  }
  async function savePw() {
    setErr('')
    if (pw.length < 6) { setErr('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'); return }
    if (pw !== pw2) { setErr('รหัสผ่านยืนยันไม่ตรงกัน'); return }
    setSavingPw(true)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setSavingPw(false)
    if (error) { setErr('เปลี่ยนรหัสผ่านไม่สำเร็จ: ' + error.message); return }
    setPw(''); setPw2(''); flash('เปลี่ยนรหัสผ่านแล้ว')
  }

  return (
    <div style={{ maxWidth: 520 }}>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-h"><h3>ข้อมูลส่วนตัว</h3></div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div><div className="fld-l">ชื่อ-สกุล</div><input style={field} value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><div className="fld-l">อีเมล</div><input style={ro} value={me?.email || ''} disabled /></div>
          <div>
            <div className="fld-l">บทบาท</div>
            <input style={ro} value={ROLE_TH[me?.role] || me?.role || ''} disabled />
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>บทบาทเปลี่ยนได้โดยผู้ดูแลระบบเท่านั้น</div>
          </div>
          <button className="btn btn-pri" onClick={saveName} disabled={savingName}>{savingName ? 'กำลังบันทึก…' : 'บันทึกข้อมูล'}</button>
        </div>
      </div>

      <div className="card">
        <div className="card-h"><h3>เปลี่ยนรหัสผ่าน</h3></div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div><div className="fld-l">รหัสผ่านใหม่</div><input style={field} type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="อย่างน้อย 6 ตัวอักษร" /></div>
          <div><div className="fld-l">ยืนยันรหัสผ่านใหม่</div><input style={field} type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></div>
          {err && <div className="login-err">{err}</div>}
          <button className="btn btn-pri" onClick={savePw} disabled={savingPw}>{savingPw ? 'กำลังเปลี่ยน…' : 'เปลี่ยนรหัสผ่าน'}</button>
        </div>
      </div>

      {toast && <div className="toast show">✓ {toast}</div>}
    </div>
  )
}
