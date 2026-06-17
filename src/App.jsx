import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Login from './components/Login'
import Matters from './components/Matters'
import Calendar from './components/Calendar'
import ImportDebt from './components/ImportDebt'
import Debts from './components/Debts'
import Users from './components/Users'
import Profile from './components/Profile'
import Reports from './components/Reports'
import Dashboard from './components/Dashboard'

const ROLE_TH = {
  admin: 'ผู้ดูแลระบบ',
  lawyer: 'ทนายความ',
  collector: 'เจ้าหน้าที่เร่งรัดหนี้',
  paralegal: 'นิติกร / ธุรการ',
}

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('matters')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  async function loadProfile() {
    if (!session) { setProfile(null); return }
    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
    setProfile(data)
  }
  useEffect(() => { loadProfile() }, [session])

  if (loading) return null
  if (!session) return <Login />

  const nav = [
    { id: 'dashboard', label: 'หน้าหลัก', ic: '▦' },
    { id: 'matters', label: 'ทะเบียนคดี', ic: '☰' },
    { id: 'debts', label: 'งานหนี้', ic: '฿' },
    { id: 'calendar', label: 'ปฏิทินนัดความ', ic: '📅' },
    { id: 'reports', label: 'รายงาน', ic: '📊' },
    { id: 'import', label: 'นำเข้างานหนี้', ic: '⬆' },
  ]
  if (profile?.role === 'admin') nav.push({ id: 'users', label: 'ผู้ใช้งาน', ic: '◍' })
  nav.push({ id: 'profile', label: 'โปรไฟล์ของฉัน', ic: '👤' })
  const titles = {
    dashboard: ['หน้าหลัก', 'ภาพรวมสำนักงาน'],
    matters: ['ทะเบียนคดี', 'คดีทั้งหมดในระบบ'],
    debts: ['งานหนี้', 'พอร์ตหนี้ซื้อมา · ทวงหนี้/บังคับคดี/ฟ้อง'],
    calendar: ['ปฏิทินนัดความ', 'วันนัดศาลและกำหนดการทุกคดี'],
    reports: ['รายงาน', 'สถิติและภาพรวมทั้งสำนักงาน'],
    import: ['นำเข้างานหนี้', 'อัปโหลดไฟล์ลิสซิ่งเข้าระบบ'],
    users: ['ผู้ใช้งาน', 'จัดการบัญชีและบทบาท'],
    profile: ['โปรไฟล์ของฉัน', 'ข้อมูลส่วนตัวและรหัสผ่าน'],
  }

  return (
    <div className="shell">
      <aside className="side">
        <div className="side-brand">
          <div className="seal">นว</div>
          <div className="tt"><b>นิติวัฒน์</b><span>Legal Case System</span></div>
        </div>
        <nav className="nav">
          {nav.map((n) => (
            <button key={n.id} className={'nav-item' + (view === n.id ? ' active' : '')} onClick={() => setView(n.id)}>
              <span className="ic">{n.ic}</span>{n.label}
            </button>
          ))}
        </nav>
        <div className="side-user">
          <div className="av" style={{ background: '#b08537' }}>{(profile?.full_name || session.user.email || '?').slice(0, 2)}</div>
          <div className="info"><b>{profile?.full_name || session.user.email}</b><span>{ROLE_TH[profile?.role] || profile?.role}</span></div>
          <button className="out" title="ออกจากระบบ" onClick={() => supabase.auth.signOut()}>⏻</button>
        </div>
      </aside>
      <div className="main">
        <div className="topbar">
          <div className="crumb">{titles[view][0]}<small>{titles[view][1]}</small></div>
        </div>
        <div className="content">
          {view === 'dashboard' && <Dashboard profile={profile} onNav={setView} />}
          {view === 'matters' && <Matters profile={profile} />}
          {view === 'debts' && <Debts profile={profile} />}
          {view === 'calendar' && <Calendar />}
          {view === 'reports' && <Reports />}
          {view === 'import' && <ImportDebt profile={profile} />}
          {view === 'users' && profile?.role === 'admin' && <Users me={profile} />}
          {view === 'profile' && <Profile me={profile} onSaved={loadProfile} />}
        </div>
      </div>
    </div>
  )
}
