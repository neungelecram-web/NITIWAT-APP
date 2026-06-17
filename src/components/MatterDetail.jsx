import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { TEMPLATES, printHTML } from '../lib/docTemplates'
import MatterFinance from './MatterFinance'

const TYPE_TH = { civil: 'คดีแพ่ง', criminal: 'คดีอาญา', family: 'คดีครอบครัว', labor: 'คดีแรงงาน', administrative: 'คดีปกครอง', bankruptcy: 'คดีล้มละลาย', debt: 'งานหนี้', other: 'อื่น ๆ' }
const TYPE_OPTS = ['civil', 'criminal', 'family', 'labor', 'administrative', 'bankruptcy', 'other']
const STATUS_TH = { active: 'กำลังดำเนินการ', closed: 'ปิดคดี', suspended: 'พักคดี' }
const STATUS_OPTS = ['active', 'closed', 'suspended']
const LEVEL_TH = { trial: 'ศาลชั้นต้น', appeal: 'ศาลอุทธรณ์', supreme: 'ศาลฎีกา' }
const PARTY_TH = { plaintiff: 'โจทก์', defendant: 'จำเลย', debtor: 'ลูกหนี้', guarantor: 'ผู้ค้ำประกัน', witness: 'พยาน', third_party: 'บุคคลภายนอก', opposing_counsel: 'ทนายฝ่ายตรงข้าม' }
const PARTY_OPTS = Object.keys(PARTY_TH)
const ACT_TH = { call: 'ติดต่อ/โทร', note: 'บันทึก', pay: 'รับชำระ', enforce: 'บอกกล่าว/บังคับ', litig: 'ดำเนินคดี', doc: 'เอกสาร', assign: 'มอบหมาย', stage: 'เปลี่ยนขั้นตอน', system: 'ระบบ' }
const ACT_OPTS = ['note', 'call', 'pay', 'enforce', 'litig']
const EV_TH = { hearing: 'นัดพิจารณา/สืบพยาน', mediation: 'นัดไกล่เกลี่ย', judgment: 'นัดฟังคำพิพากษา', deadline: 'ครบกำหนด/เส้นตาย', appointment: 'นัดหมายอื่น ๆ' }
const EV_OPTS = Object.keys(EV_TH)
const DOC_TH = { contract: 'สัญญา', assignment: 'หนังสือโอนสิทธิ', poa: 'หนังสือมอบอำนาจ', notice: 'หนังสือบอกกล่าว', plaint: 'คำฟ้อง', answer: 'คำให้การ', judgment: 'คำพิพากษา', execution: 'หมาย/บังคับคดี', collateral: 'หลักประกัน', id: 'เอกสารส่วนตัว', payment: 'หลักฐานชำระ', other: 'อื่น ๆ' }
const DOC_OPTS = Object.keys(DOC_TH)
const DOC_IC = { contract: '📄', assignment: '🔁', poa: '✍️', notice: '✉️', plaint: '⚖️', answer: '📝', judgment: '🏛️', execution: '🔨', collateral: '🚗', id: '🪪', payment: '💵', other: '📎' }
const DOC_COLOR = { contract: '#1b6e8c', assignment: '#0f766e', poa: '#4d7c0f', notice: '#c2410c', plaint: '#6d28d9', answer: '#9333ea', judgment: '#b91c1c', execution: '#be123c', collateral: '#b9791a', id: '#475569', payment: '#15803d', other: '#64748b' }

const field = { width: '100%', padding: '9px 11px', border: '1px solid var(--line2)', borderRadius: '8px', fontFamily: 'inherit', fontSize: '14px', background: '#fff' }
function fmtSize(b) { if (b == null) return ''; if (b < 1024) return b + ' B'; if (b < 1048576) return (b / 1024).toFixed(0) + ' KB'; return (b / 1048576).toFixed(1) + ' MB' }
const baht = (n) => (Number(n) || 0).toLocaleString('th-TH')

export default function MatterDetail({ matterId, clients, profile, onClose, onChanged }) {
  const [m, setM] = useState(null)
  const [f, setF] = useState(null)
  const [parties, setParties] = useState([])
  const [acts, setActs] = useState([])
  const [events, setEvents] = useState([])
  const [docs, setDocs] = useState([])
  const [tab, setTab] = useState('detail')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState('')
  const [np, setNp] = useState({ role: 'defendant', name: '', id_card: '', phone: '', address: '' })
  const [na, setNa] = useState({ type: 'note', body: '' })
  const [ne, setNe] = useState({ type: 'hearing', title: '', event_date: '' })
  const [dcat, setDcat] = useState('contract')
  const [dragOver, setDragOver] = useState(false)
  const [gen, setGen] = useState(null)       // null | 'pick' | { key }
  const [viewDoc, setViewDoc] = useState(null) // saved generated doc being previewed
  const [mdebt, setMdebt] = useState(null)
  const fileRef = useRef(null)

  function flash(msg) { setToast(msg); setTimeout(() => setToast(''), 2200) }

  async function setStage(stage) {
    await supabase.from('matters').update({ stage }).eq('id', matterId)
    setM((prev) => (prev ? { ...prev, stage } : prev))
    onChanged && onChanged()
    flash('เลื่อนขั้นตอนแล้ว')
  }

  async function loadDocs() {
    setDocs((await supabase.from('documents').select('*, profiles(full_name)').eq('matter_id', matterId).order('created_at', { ascending: false })).data || [])
  }
  async function loadAll() {
    const { data: matter } = await supabase.from('matters').select('*, clients(name)').eq('id', matterId).single()
    setM(matter)
    setF({
      title: matter.title || '', matter_type: matter.matter_type, status: matter.status || 'active',
      client_id: matter.client_id || '', court: matter.court || '', case_number: matter.case_number || '',
      court_level: matter.court_level || '', claim_amount: matter.claim_amount ?? '', description: matter.description || '',
    })
    setParties((await supabase.from('parties').select('*').eq('matter_id', matterId).order('created_at')).data || [])
    setActs((await supabase.from('activities').select('*, profiles(full_name)').eq('matter_id', matterId).order('created_at', { ascending: false })).data || [])
    setEvents((await supabase.from('events').select('*').eq('matter_id', matterId).order('event_date')).data || [])
    await loadDocs()
    const md = await supabase.from('matter_debt').select('*').eq('matter_id', matterId).maybeSingle()
    setMdebt(md.data || null)
  }
  useEffect(() => { loadAll() }, [matterId])

  async function saveDetail() {
    setSaving(true)
    const { error } = await supabase.from('matters').update({
      title: f.title.trim(), matter_type: f.matter_type, status: f.status,
      client_id: f.client_id || null, court: f.court.trim() || null, case_number: f.case_number.trim() || null,
      court_level: f.court_level || null, claim_amount: f.claim_amount !== '' ? Number(f.claim_amount) : null,
      description: f.description.trim() || null,
    }).eq('id', matterId)
    setSaving(false)
    if (error) { flash('บันทึกไม่สำเร็จ'); return }
    flash('บันทึกแล้ว'); loadAll(); onChanged && onChanged()
  }

  async function addParty() {
    if (!np.name.trim()) return
    const { error } = await supabase.from('parties').insert({ matter_id: matterId, role: np.role, name: np.name.trim(), id_card: np.id_card.trim() || null, phone: np.phone.trim() || null, address: np.address.trim() || null })
    if (error) { flash('เพิ่มไม่สำเร็จ'); return }
    setNp({ role: 'defendant', name: '', id_card: '', phone: '', address: '' })
    setParties((await supabase.from('parties').select('*').eq('matter_id', matterId).order('created_at')).data || [])
    flash('เพิ่มคู่ความแล้ว')
  }
  async function delParty(id) {
    await supabase.from('parties').delete().eq('id', id)
    setParties(parties.filter((x) => x.id !== id))
  }

  async function addAct() {
    if (!na.body.trim()) return
    const { error } = await supabase.from('activities').insert({ matter_id: matterId, type: na.type, body: na.body.trim(), created_by: profile?.id || null })
    if (error) { flash('บันทึกไม่สำเร็จ'); return }
    setNa({ type: 'note', body: '' })
    setActs((await supabase.from('activities').select('*, profiles(full_name)').eq('matter_id', matterId).order('created_at', { ascending: false })).data || [])
    flash('บันทึกงานแล้ว')
  }

  async function addEvent() {
    if (!ne.title.trim() || !ne.event_date) { flash('กรอกวันที่และรายละเอียด'); return }
    const { error } = await supabase.from('events').insert({ matter_id: matterId, type: ne.type, title: ne.title.trim(), event_date: ne.event_date, created_by: profile?.id || null })
    if (error) { flash('บันทึกไม่สำเร็จ'); return }
    setNe({ type: 'hearing', title: '', event_date: '' })
    setEvents((await supabase.from('events').select('*').eq('matter_id', matterId).order('event_date')).data || [])
    flash('เพิ่มวันนัดแล้ว')
  }

  async function handleUpload(fileList) {
    if (!fileList || !fileList.length) return
    setUploading(true)
    for (const file of fileList) {
      const safe = file.name.replace(/[^\w.\-]/g, '_')
      const path = `${matterId}/${Date.now()}_${safe}`
      const { error: ue } = await supabase.storage.from('documents').upload(path, file)
      if (ue) { flash('อัปโหลดไม่สำเร็จ: ' + ue.message); continue }
      await supabase.from('documents').insert({ matter_id: matterId, category: dcat, name: file.name, storage_path: path, mime: file.type || null, size_bytes: file.size, uploaded_by: profile?.id || null })
    }
    setUploading(false)
    await loadDocs()
    flash('อัปโหลดเอกสารแล้ว')
  }
  async function openDoc(d) {
    if (d.is_generated) { setViewDoc(d); return }
    const { data, error } = await supabase.storage.from('documents').createSignedUrl(d.storage_path, 120)
    if (error || !data) { flash('เปิดไฟล์ไม่สำเร็จ'); return }
    window.open(data.signedUrl, '_blank')
  }
  async function delDoc(d) {
    if (d.storage_path) await supabase.storage.from('documents').remove([d.storage_path])
    await supabase.from('documents').delete().eq('id', d.id)
    setDocs(docs.filter((x) => x.id !== d.id))
  }
  async function saveGen(key) {
    const t = TEMPLATES[key]
    const html = t.build({ m, parties, profile })
    const { error } = await supabase.from('documents').insert({ matter_id: matterId, category: t.cat, name: `${t.label}_${m.matter_no}.html`, is_generated: true, generated_html: html, uploaded_by: profile?.id || null })
    if (error) { flash('บันทึกไม่สำเร็จ'); return }
    setGen(null); await loadDocs(); flash('สร้างและบันทึกเอกสารแล้ว')
  }

  if (!m || !f) {
    return (
      <>
        <div className="scrim show" onClick={onClose}></div>
        <div className="drawer show"><div className="dr-body" style={{ padding: 24 }}>กำลังโหลด…</div></div>
      </>
    )
  }

  const tabs = [
    { id: 'detail', label: 'รายละเอียด' },
    { id: 'parties', label: `คู่ความ (${parties.length})` },
    { id: 'docs', label: `เอกสาร (${docs.length})` },
    { id: 'log', label: `บันทึกงาน (${acts.length})` },
    { id: 'events', label: `วันนัด (${events.length})` },
    { id: 'finance', label: 'การเงิน' },
  ]

  return (
    <>
      <div className="scrim show" onClick={onClose}></div>
      <div className="drawer show">
        <div className="dr-head">
          <div className="av" style={{ background: '#b08537' }}>{m.matter_no?.slice(-2)}</div>
          <div><h2>{m.title}</h2><div className="meta">{m.matter_no} · {TYPE_TH[m.matter_type]} · {STATUS_TH[m.status] || m.status}</div></div>
          <button className="x" onClick={onClose}>✕</button>
        </div>

        {m.matter_type === 'debt' && (() => {
          const ORDER = [{ key: 'intake', label: 'รับเข้า' }, { key: 'collect', label: 'ทวงหนี้' }, { key: 'enforce', label: 'บังคับคดี' }, { key: 'litig', label: 'ฟ้องคดี' }]
          const stage = m.stage || 'collect'
          const curIdx = stage === 'closed' ? ORDER.length : Math.max(1, ORDER.findIndex((o) => o.key === stage))
          return (
            <div className="dr-steps">
              <div className="stepper">
                {ORDER.map((s, i) => (
                  <div key={s.key} className={'stp' + (i < curIdx ? ' done' : '') + (i === curIdx ? ' cur' : '')}
                    onClick={() => { if (i >= 1) setStage(s.key) }} style={{ cursor: i >= 1 ? 'pointer' : 'default' }} title={i >= 1 ? 'คลิกเพื่อเลื่อนมาขั้นนี้' : ''}>
                    <div className="c">{i < curIdx ? '✓' : (i + 1)}</div>
                    <div className="t">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        <div className="dr-tabs">
          {tabs.map((t) => (
            <button key={t.id} className={'dr-tab' + (tab === t.id ? ' on' : '')} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>

        <div className="dr-body">
          {tab === 'detail' && (
            <div className="sec">
              <div className="sec-h">ข้อมูลคดี</div>
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {m.matter_type === 'debt' && mdebt && (
                  <div style={{ background: 'var(--brass-bg)', border: '1px solid var(--line)', borderRadius: 10, padding: 12 }}>
                    <div style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>ยอดหนี้</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', fontSize: 13.5 }}>
                      <div><span style={{ color: 'var(--muted)' }}>สถาบันการเงิน: </span>{mdebt.financial_institution || '—'}{mdebt.lot ? ` (ล็อต ${mdebt.lot})` : ''}</div>
                      <div><span style={{ color: 'var(--muted)' }}>เลขสัญญา: </span>{mdebt.contract_no || '—'}</div>
                      <div><span style={{ color: 'var(--muted)' }}>วงเงินกู้: </span><b className="tnum">{baht(mdebt.loan_amount)}</b></div>
                      <div><span style={{ color: 'var(--muted)' }}>ยอดคงเหลือ (OS): </span><b className="tnum">{baht(mdebt.os_balance)}</b></div>
                      <div><span style={{ color: 'var(--muted)' }}>ยอดค้างชำระ: </span><b className="tnum">{baht(mdebt.amount_due)}</b></div>
                      <div><span style={{ color: 'var(--muted)' }}>วันค้างชำระ: </span><b style={{ color: (mdebt.days_overdue || 0) > 90 ? 'var(--danger)' : 'inherit' }}>{mdebt.days_overdue ?? '—'} วัน</b></div>
                      {(mdebt.vehicle_brand || mdebt.vehicle_plate) && <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--muted)' }}>หลักประกัน: </span>{[mdebt.vehicle_brand, mdebt.vehicle_model].filter(Boolean).join(' ')} {mdebt.vehicle_plate ? `(${mdebt.vehicle_plate})` : ''}</div>}
                    </div>
                  </div>
                )}
                <div><div className="fld-l">ชื่อเรื่อง / คดี</div><input style={field} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1 }}><div className="fld-l">ประเภทคดี</div>
                    <select style={field} value={f.matter_type} onChange={(e) => setF({ ...f, matter_type: e.target.value })}>
                      {TYPE_OPTS.map((t) => <option key={t} value={t}>{TYPE_TH[t]}</option>)}
                    </select></div>
                  <div style={{ flex: 1 }}><div className="fld-l">สถานะ</div>
                    <select style={field} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
                      {STATUS_OPTS.map((s) => <option key={s} value={s}>{STATUS_TH[s]}</option>)}
                    </select></div>
                </div>
                <div><div className="fld-l">ลูกความ</div>
                  <select style={field} value={f.client_id} onChange={(e) => setF({ ...f, client_id: e.target.value })}>
                    <option value="">— ไม่ระบุ —</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select></div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 2 }}><div className="fld-l">ศาล</div><input style={field} value={f.court} onChange={(e) => setF({ ...f, court: e.target.value })} /></div>
                  <div style={{ flex: 1 }}><div className="fld-l">ชั้นศาล</div>
                    <select style={field} value={f.court_level} onChange={(e) => setF({ ...f, court_level: e.target.value })}>
                      <option value="">—</option>
                      {Object.keys(LEVEL_TH).map((l) => <option key={l} value={l}>{LEVEL_TH[l]}</option>)}
                    </select></div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1 }}><div className="fld-l">เลขคดี</div><input style={field} value={f.case_number} onChange={(e) => setF({ ...f, case_number: e.target.value })} /></div>
                  <div style={{ flex: 1 }}><div className="fld-l">ทุนทรัพย์ (บาท)</div><input style={field} type="number" value={f.claim_amount} onChange={(e) => setF({ ...f, claim_amount: e.target.value })} /></div>
                </div>
                <div><div className="fld-l">รายละเอียด</div><textarea style={{ ...field, resize: 'vertical', minHeight: 64 }} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
                <button className="btn btn-pri" onClick={saveDetail} disabled={saving}>{saving ? 'กำลังบันทึก…' : 'บันทึกการแก้ไข'}</button>
              </div>
            </div>
          )}

          {tab === 'parties' && (
            <>
              <div className="sec">
                <div className="sec-h">คู่ความ / บุคคลที่เกี่ยวข้อง</div>
                <div style={{ padding: '4px 16px' }}>
                  {parties.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 13, padding: '10px 0' }}>ยังไม่มีคู่ความ</div>}
                  {parties.map((p) => (
                    <div key={p.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
                      <span className="tag t-grey">{PARTY_TH[p.role]}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{[p.id_card, p.phone].filter(Boolean).join(' · ') || '—'}</div>
                        {p.address && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{p.address}</div>}
                      </div>
                      <button className="btn btn-gho btn-sm" onClick={() => delParty(p.id)}>ลบ</button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="sec">
                <div className="sec-h">เพิ่มคู่ความ</div>
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ flex: 1 }}><div className="fld-l">ฐานะ</div>
                      <select style={field} value={np.role} onChange={(e) => setNp({ ...np, role: e.target.value })}>
                        {PARTY_OPTS.map((r) => <option key={r} value={r}>{PARTY_TH[r]}</option>)}
                      </select></div>
                    <div style={{ flex: 2 }}><div className="fld-l">ชื่อ-สกุล</div><input style={field} value={np.name} onChange={(e) => setNp({ ...np, name: e.target.value })} /></div>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ flex: 1 }}><div className="fld-l">เลขบัตรประชาชน</div><input style={field} value={np.id_card} onChange={(e) => setNp({ ...np, id_card: e.target.value })} /></div>
                    <div style={{ flex: 1 }}><div className="fld-l">โทรศัพท์</div><input style={field} value={np.phone} onChange={(e) => setNp({ ...np, phone: e.target.value })} /></div>
                  </div>
                  <div><div className="fld-l">ที่อยู่</div><input style={field} value={np.address} onChange={(e) => setNp({ ...np, address: e.target.value })} /></div>
                  <button className="btn btn-pri btn-sm" onClick={addParty}>+ เพิ่มคู่ความ</button>
                </div>
              </div>
            </>
          )}

          {tab === 'docs' && (
            <>
              <div className="genbar">
                <div><b>✨ สร้างเอกสารอัตโนมัติ</b><div className="sub">กรอกข้อมูลคดีลงในหนังสือบอกกล่าว · มอบอำนาจ · คำฟ้อง</div></div>
                <button className="btn btn-pri btn-sm" onClick={() => setGen('pick')}>สร้างเอกสาร</button>
              </div>
              <div className="sec" style={{ padding: 14 }}>
                <div className="catpick-lab">เลือกประเภทเอกสารก่อนอัปโหลด</div>
                <div className="catpick">
                  {DOC_OPTS.map((c) => (
                    <button key={c} className={c === dcat ? 'on' : ''} onClick={() => setDcat(c)}>{DOC_IC[c]} {DOC_TH[c]}</button>
                  ))}
                </div>
                <div className={'drop' + (dragOver ? ' drag' : '')}
                  onClick={() => fileRef.current && fileRef.current.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files) }}>
                  <div className="ic">⬆</div>
                  <b>ลากไฟล์มาวาง หรือคลิกเพื่อเลือก</b>
                  <small>จัดเก็บเป็นประเภท "{DOC_TH[dcat]}"</small>
                  <input ref={fileRef} type="file" multiple style={{ display: 'none' }} onChange={(e) => { handleUpload(e.target.files); e.target.value = '' }} />
                </div>
                {uploading && <div style={{ fontSize: 13, color: 'var(--brass)', marginTop: 8 }}>กำลังอัปโหลด…</div>}
              </div>
              <div style={{ padding: '4px 0 8px' }}>
                {docs.length === 0 && <div className="empty" style={{ padding: 30 }}><div className="ic">🗂</div><b>ยังไม่มีเอกสาร</b>อัปโหลดหรือสร้างเอกสารของคดีนี้</div>}
                {docs.map((d) => (
                  <div className="doc" key={d.id}>
                    <div className="thumb" style={{ background: DOC_COLOR[d.category] || '#64748b' }}>{DOC_IC[d.category] || '📎'}</div>
                    <div className="meta">
                      <b onClick={() => openDoc(d)} title={d.name}>{d.name}</b>
                      <div className="sub">{DOC_TH[d.category] || d.category} · {d.profiles?.full_name || ''}{d.size_bytes ? ' · ' + fmtSize(d.size_bytes) : ''}{d.is_generated ? ' · เอกสารที่สร้าง' : ''}</div>
                    </div>
                    <div className="acts">
                      <button title="เปิด" onClick={() => openDoc(d)}>👁</button>
                      <button title="ลบ" onClick={() => delDoc(d)}>🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === 'log' && (
            <div className="sec">
              <div className="sec-h">บันทึกการดำเนินงาน</div>
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <textarea style={{ ...field, resize: 'vertical', minHeight: 56 }} placeholder="บันทึกผลการดำเนินงาน เช่น โทรติดตาม / ยื่นคำร้อง / นัดลูกความ…" value={na.body} onChange={(e) => setNa({ ...na, body: e.target.value })} />
                <div style={{ display: 'flex', gap: 10 }}>
                  <select style={field} value={na.type} onChange={(e) => setNa({ ...na, type: e.target.value })}>
                    {ACT_OPTS.map((t) => <option key={t} value={t}>{ACT_TH[t]}</option>)}
                  </select>
                  <button className="btn btn-pri btn-sm" style={{ whiteSpace: 'nowrap' }} onClick={addAct}>บันทึก</button>
                </div>
              </div>
              <div className="timeline">
                {acts.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 13, padding: '6px 0' }}>ยังไม่มีบันทึก</div>}
                {acts.map((a) => (
                  <div className="tl" key={a.id}>
                    <div className="ic">•</div>
                    <div className="body"><b>{ACT_TH[a.type] || a.type}</b><p>{a.body}</p><div className="when">{a.profiles?.full_name || ''} · {new Date(a.created_at).toLocaleString('th-TH')}</div></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'finance' && <MatterFinance matterId={matterId} profile={profile} />}
          {tab === 'events' && (
            <div className="sec">
              <div className="sec-h">วันนัด / กำหนดการ</div>
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1 }}><div className="fld-l">ประเภท</div>
                    <select style={field} value={ne.type} onChange={(e) => setNe({ ...ne, type: e.target.value })}>
                      {EV_OPTS.map((t) => <option key={t} value={t}>{EV_TH[t]}</option>)}
                    </select></div>
                  <div style={{ flex: 1 }}><div className="fld-l">วันที่</div><input style={field} type="date" value={ne.event_date} onChange={(e) => setNe({ ...ne, event_date: e.target.value })} /></div>
                </div>
                <div><div className="fld-l">รายละเอียด</div><input style={field} value={ne.title} onChange={(e) => setNe({ ...ne, title: e.target.value })} placeholder="เช่น นัดสืบพยานโจทก์ เวลา 09.00 น." /></div>
                <button className="btn btn-pri btn-sm" onClick={addEvent}>+ เพิ่มวันนัด</button>
              </div>
              <div style={{ padding: '4px 16px 14px' }}>
                {events.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 13, padding: '6px 0' }}>ยังไม่มีวันนัด</div>}
                {events.map((e) => (
                  <div key={e.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--line)' }}>
                    <span className="tag t-litig">{EV_TH[e.type]}</span>
                    <div style={{ flex: 1 }}><div style={{ fontWeight: 600 }}>{e.title}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{e.event_date}</div></div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ตัวเลือกแม่แบบ */}
      {gen === 'pick' && (
        <div className="lb show" onClick={(e) => { if (e.target.classList.contains('lb')) setGen(null) }}>
          <div className="lb-inner" style={{ maxWidth: 520 }}>
            <div className="lb-head"><b>สร้างเอกสารอัตโนมัติ</b><button className="x" onClick={() => setGen(null)}>✕</button></div>
            <div style={{ padding: 18 }}>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>เลือกแบบเอกสาร ระบบจะกรอกข้อมูลจากคดี <b>{m.title}</b> ให้อัตโนมัติ</div>
              {Object.entries(TEMPLATES).map(([k, t]) => (
                <button key={k} className="tpl-card" onClick={() => setGen({ key: k })}>
                  <div className="thumb" style={{ background: t.color }}>{t.ic}</div>
                  <div><b>{t.label}</b><div className="sub">{t.desc}</div></div>
                  <div className="go">›</div>
                </button>
              ))}
              <div className="tpl-note">⚠ เอกสารที่สร้างเป็นร่างเบื้องต้น ควรให้ทนายความตรวจทานและแก้ไขก่อนใช้งานจริงทุกครั้ง</div>
            </div>
          </div>
        </div>
      )}

      {/* แสดงตัวอย่างก่อนบันทึก */}
      {gen && gen.key && (() => {
        const t = TEMPLATES[gen.key]; const html = t.build({ m, parties, profile })
        return (
          <div className="lb show" onClick={(e) => { if (e.target.classList.contains('lb')) setGen(null) }}>
            <div className="lb-inner">
              <div className="lb-head">
                <div style={{ width: 32, height: 32, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', background: t.color }}>{t.ic}</div>
                <b>{t.label}</b><span className="tag t-grey">ร่าง</span>
                <button className="x" onClick={() => setGen(null)}>✕</button>
              </div>
              <div className="lb-body paper-mode"><div className="paper" dangerouslySetInnerHTML={{ __html: html }} /></div>
              <div className="lb-foot">
                <button className="btn btn-gho btn-sm" onClick={() => setGen('pick')}>‹ เลือกแบบอื่น</button>
                <div className="spacer"></div>
                <button className="btn btn-gho btn-sm" onClick={() => printHTML(html)}>🖨 พิมพ์ / บันทึก PDF</button>
                <button className="btn btn-pri btn-sm" onClick={() => saveGen(gen.key)}>บันทึกเข้าคลัง</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ดูเอกสารที่สร้างไว้ */}
      {viewDoc && (
        <div className="lb show" onClick={(e) => { if (e.target.classList.contains('lb')) setViewDoc(null) }}>
          <div className="lb-inner">
            <div className="lb-head">
              <div style={{ width: 32, height: 32, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', background: DOC_COLOR[viewDoc.category] || '#64748b' }}>{DOC_IC[viewDoc.category] || '📄'}</div>
              <b>{viewDoc.name}</b>
              <button className="x" onClick={() => setViewDoc(null)}>✕</button>
            </div>
            <div className="lb-body paper-mode"><div className="paper" dangerouslySetInnerHTML={{ __html: viewDoc.generated_html }} /></div>
            <div className="lb-foot"><div className="spacer"></div><button className="btn btn-pri btn-sm" onClick={() => printHTML(viewDoc.generated_html)}>🖨 พิมพ์ / บันทึก PDF</button></div>
          </div>
        </div>
      )}

      {toast && <div className="toast show">✓ {toast}</div>}
    </>
  )
}
