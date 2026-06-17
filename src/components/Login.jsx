import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setErr('')
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw })
    setBusy(false)
    if (error) {
      const msg = error.message === 'Invalid login credentials'
        ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
        : error.message
      setErr('เข้าสู่ระบบไม่สำเร็จ: ' + msg)
    }
    // ถ้าสำเร็จ App.jsx จะรับรู้ผ่าน onAuthStateChange เองอัตโนมัติ
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-head">
          <div className="seal">นว</div>
          <h1>สำนักงานทนายความนิติวัฒน์</h1>
          <p>ระบบบริหารงานคดี · ทวงหนี้ · ว่าความ</p>
        </div>
        <form className="login-body" onSubmit={submit}>
          {err && <div className="login-err">{err}</div>}
          <div className="lf">
            <label>อีเมล</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </div>
          <div className="lf">
            <label>รหัสผ่าน</label>
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} required />
          </div>
          <button className="btn-login" disabled={busy}>
            {busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
          </button>
        </form>
        <div className="login-foot">เข้าสู่ระบบด้วยบัญชีที่ผู้ดูแลระบบสร้างให้</div>
      </div>
    </div>
  )
}
