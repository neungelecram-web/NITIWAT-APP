import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'

// ช่องปลายทางในฐานข้อมูล + คำพ้องสำหรับเดาการจับคู่ (เรียงเฉพาะเจาะจงก่อนกว้าง)
const TARGETS = [
  { key: 'debtor_name', label: 'ชื่อลูกหนี้', req: true, aliases: ['ชื่อ-สกุล', 'ชื่อสกุล', 'ชื่อ-นามสกุล', 'ชื่อนามสกุล', 'ชื่อลูกค้า', 'ชื่อ'] },
  { key: 'contract_no', label: 'เลขสัญญา', req: true, aliases: ['เลขที่สัญญา', 'เลขสัญญา', 'สัญญา', 'contract'] },
  { key: 'id_card', label: 'เลขบัตรประชาชน', aliases: ['เลขบัตรประชาชน', 'เลขประจำตัวประชาชน', 'เลขบัตร', 'บัตรประชาชน'] },
  { key: 'phone', label: 'โทรศัพท์', aliases: ['เบอร์โทรฯ', 'เบอร์โทร', 'โทรศัพท์', 'มือถือ', 'โทร'] },
  { key: 'address', label: 'ที่อยู่', aliases: ['ที่อยู่'] },
  { key: 'amount_due', label: 'ยอดค้างชำระ', num: true, aliases: ['ยอดค้างชำระ', 'ยอดค้าง', 'ค้างชำระ'] },
  { key: 'penalty', label: 'ค่าปรับ', num: true, aliases: ['ค่าปรับ', 'เบี้ยปรับ'] },
  { key: 'collect_target', label: 'เป้าเก็บ', num: true, aliases: ['เป้าเก็บ', 'เป้า'] },
  { key: 'os_balance', label: 'ยอดคงเหลือ', num: true, aliases: ['คงเหลือ', 'ยอดคงเหลือ'] },
  { key: 'principal', label: 'เงินต้นคงเหลือ', num: true, aliases: ['เงินต้นคงเหลือ', 'เงินต้น'] },
  { key: 'loan_amount', label: 'วงเงิน / ลูกหนี้', num: true, aliases: ['ลูกหนี้', 'วงเงิน', 'ยอดจัด'] },
  { key: 'days_overdue', label: 'จำนวนวันค้าง', int: true, aliases: ['จำนวนวันค้าง', 'วันค้าง', 'overdue'] },
  { key: 'product', label: 'สินค้า', aliases: ['สินค้า', 'ประเภทสินค้า'] },
  { key: 'vehicle_brand', label: 'ยี่ห้อรถ', aliases: ['ยี่ห้อ'] },
  { key: 'vehicle_model', label: 'รุ่นรถ', aliases: ['รุ่น'] },
  { key: 'vehicle_plate', label: 'ทะเบียนรถ', aliases: ['ทะเบียนรถ', 'ทะเบียน'] },
  { key: 'vehicle_chassis', label: 'เลขตัวถัง', aliases: ['เลขตัวถัง', 'ตัวถัง'] },
  { key: 'vehicle_engine', label: 'เลขเครื่อง', aliases: ['เลขเครื่อง', 'เครื่องยนต์'] },
  { key: 'guarantor_name', label: 'ชื่อผู้ค้ำ', aliases: ['ชื่อผู้ค้ำ', 'ผู้ค้ำประกัน', 'ผู้ค้ำ'] },
]

const field = { width: '100%', padding: '9px 11px', border: '1px solid var(--line2)', borderRadius: '8px', fontFamily: 'inherit', fontSize: '14px', background: '#fff' }
const norm = (s) => String(s ?? '').replace(/\s+/g, '').toLowerCase()
const str = (v) => { const s = String(v ?? '').trim(); return s === '' ? null : s }
const num = (v) => { const t = String(v ?? '').replace(/[^0-9.\-]/g, ''); if (t === '' || t === '-') return null; const n = Number(t); return isFinite(n) ? n : null }
const intg = (v) => { const t = String(v ?? '').replace(/[^0-9\-]/g, ''); if (t === '' || t === '-') return null; const n = parseInt(t, 10); return isFinite(n) ? n : null }

function autoGuess(headers) {
  const used = new Set()
  const map = {}
  for (const t of TARGETS) {
    let found = ''
    // รอบ 1: ชื่อตรงเป๊ะก่อน
    for (const a of t.aliases) {
      const na = norm(a)
      const h = headers.find((x) => !used.has(x) && norm(x) === na)
      if (h) { found = h; break }
    }
    // รอบ 2: ค่อยหาแบบมีคำนั้นอยู่ในชื่อ
    if (!found) for (const a of t.aliases) {
      const na = norm(a)
      const h = headers.find((x) => !used.has(x) && norm(x).includes(na))
      if (h) { found = h; break }
    }
    if (found) used.add(found)
    map[t.key] = found
  }
  return map
}

export default function ImportDebt({ profile }) {
  const [step, setStep] = useState('upload') // upload | map | done
  const [headers, setHeaders] = useState([])
  const [rows, setRows] = useState([])
  const [fileName, setFileName] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [err, setErr] = useState('')
  const [map, setMap] = useState({})
  const [seller, setSeller] = useState('MTC (เมืองไทย แคปปิตอล)')
  const [lot, setLot] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [result, setResult] = useState(null)
  const fileRef = useRef(null)

  async function handleFile(file) {
    setErr('')
    if (!file) return
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(ws, { defval: '' })
      if (!data.length) { setErr('ไม่พบข้อมูลในไฟล์ (หรือหัวตารางไม่ได้อยู่บรรทัดแรกของชีต)'); return }
      const hdrs = Object.keys(data[0])
      setHeaders(hdrs); setRows(data); setFileName(file.name)
    } catch (e) { setErr('อ่านไฟล์ไม่สำเร็จ: ' + (e.message || e)) }
  }

  function reset() { setStep('upload'); setHeaders([]); setRows([]); setFileName(''); setErr(''); setMap({}); setResult(null); setProgress('') }
  function toMapping() { setMap(autoGuess(headers)); setStep('map') }

  async function runImport() {
    if (!map.debtor_name || !map.contract_no) { setErr('กรุณาจับคู่ "ชื่อลูกหนี้" และ "เลขสัญญา" ก่อนนำเข้า'); return }
    setErr(''); setBusy(true); setProgress('กำลังตรวจสอบข้อมูลซ้ำ…')
    const val = (row, key) => (map[key] ? row[map[key]] : null)
    try {
      const existing = new Set()
      const { data: ex } = await supabase.from('matter_debt').select('contract_no')
      ;(ex || []).forEach((r) => { if (r.contract_no) existing.add(String(r.contract_no).trim()) })

      const toImport = rows.filter((r) => {
        const cn = String(val(r, 'contract_no') ?? '').trim()
        return cn === '' ? true : !existing.has(cn)
      })
      const skipped = rows.length - toImport.length
      let imported = 0
      const BATCH = 100
      for (let i = 0; i < toImport.length; i += BATCH) {
        const chunk = toImport.slice(i, i + BATCH)
        const mattersPayload = chunk.map((r) => ({
          matter_type: 'debt', stage: 'collect', status: 'active',
          title: `${String(val(r, 'debtor_name') ?? '').trim() || 'ลูกหนี้'} · สัญญา ${String(val(r, 'contract_no') ?? '').trim()}`,
          claim_amount: num(val(r, 'os_balance')) ?? num(val(r, 'amount_due')),
          assigned_to: profile?.id || null, created_by: profile?.id || null,
        }))
        const { data: insM, error: me } = await supabase.from('matters').insert(mattersPayload).select('id')
        if (me) throw me
        const debtPayload = insM.map((mm, idx) => {
          const r = chunk[idx]
          return {
            matter_id: mm.id, financial_institution: str(seller), lot: str(lot),
            contract_no: str(val(r, 'contract_no')),
            loan_amount: num(val(r, 'loan_amount')), os_balance: num(val(r, 'os_balance')),
            principal: num(val(r, 'principal')), amount_due: num(val(r, 'amount_due')),
            penalty: num(val(r, 'penalty')), collect_target: num(val(r, 'collect_target')),
            days_overdue: intg(val(r, 'days_overdue')),
            product: str(val(r, 'product')), vehicle_brand: str(val(r, 'vehicle_brand')),
            vehicle_model: str(val(r, 'vehicle_model')), vehicle_plate: str(val(r, 'vehicle_plate')),
            vehicle_chassis: str(val(r, 'vehicle_chassis')), vehicle_engine: str(val(r, 'vehicle_engine')),
            raw_import: r,
          }
        })
        const { error: de } = await supabase.from('matter_debt').insert(debtPayload)
        if (de) throw de
        const partiesPayload = []
        insM.forEach((mm, idx) => {
          const r = chunk[idx]
          const dn = str(val(r, 'debtor_name'))
          if (dn) partiesPayload.push({ matter_id: mm.id, role: 'debtor', name: dn, id_card: str(val(r, 'id_card')), phone: str(val(r, 'phone')), address: str(val(r, 'address')) })
          const gn = str(val(r, 'guarantor_name'))
          if (gn) partiesPayload.push({ matter_id: mm.id, role: 'guarantor', name: gn })
        })
        if (partiesPayload.length) { const { error: pe } = await supabase.from('parties').insert(partiesPayload); if (pe) throw pe }
        imported += insM.length
        setProgress(`นำเข้าแล้ว ${imported}/${toImport.length} รายการ…`)
      }
      setResult({ imported, skipped }); setStep('done')
    } catch (e) {
      setErr('นำเข้าไม่สำเร็จ: ' + (e.message || e))
    } finally { setBusy(false); setProgress('') }
  }

  // ---------- UI ----------
  if (step === 'done') {
    return (
      <div className="card" style={{ maxWidth: 520, margin: '0 auto' }}>
        <div className="empty">
          <div className="ic" style={{ color: 'var(--s-closed)' }}>✓</div>
          <b>นำเข้าข้อมูลสำเร็จ</b>
          นำเข้าใหม่ {result.imported} รายการ{result.skipped > 0 ? ` · ข้ามรายการซ้ำ (เลขสัญญาเดิม) ${result.skipped} รายการ` : ''}
          <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button className="btn btn-gho btn-sm" onClick={reset}>นำเข้าไฟล์อีกล็อต</button>
          </div>
          <div style={{ marginTop: 10, fontSize: 13, color: 'var(--muted)' }}>ดูคดีที่นำเข้าได้ที่เมนู "ทะเบียนคดี" (ประเภท: งานหนี้)</div>
        </div>
      </div>
    )
  }

  if (step === 'map') {
    return (
      <>
        <div className="filters">
          <div><b>{fileName}</b> <span style={{ color: 'var(--muted)' }}>— {rows.length} แถว · จับคู่คอลัมน์</span></div>
          <div className="spacer"></div>
          <button className="btn btn-gho btn-sm" onClick={() => setStep('upload')}>‹ กลับ</button>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-h"><h3>ข้อมูลล็อตนี้ (ใช้กับทุกแถว)</h3></div>
          <div style={{ padding: 16, display: 'flex', gap: 12 }}>
            <div style={{ flex: 2 }}><div className="fld-l">ผู้ขายหนี้ / ลิสซิ่ง</div><input style={field} value={seller} onChange={(e) => setSeller(e.target.value)} /></div>
            <div style={{ flex: 1 }}><div className="fld-l">ล็อต</div><input style={field} value={lot} onChange={(e) => setLot(e.target.value)} placeholder="เช่น 2567-06" /></div>
          </div>
        </div>

        <div className="card">
          <div className="card-h"><h3>จับคู่คอลัมน์</h3><span className="r">ช่องฐานข้อมูล ← คอลัมน์ในไฟล์ (ระบบเดาให้แล้ว ปรับได้)</span></div>
          <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 18px' }}>
            {TARGETS.map((t) => (
              <div key={t.key}>
                <div className="fld-l">{t.label}{t.req ? ' *' : ''}</div>
                <select style={field} value={map[t.key] || ''} onChange={(e) => setMap({ ...map, [t.key]: e.target.value })}>
                  <option value="">— ไม่ใช้ —</option>
                  {headers.map((h, i) => <option key={i} value={h}>{h || `(คอลัมน์ ${i + 1})`}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>

        {err && <div className="login-err" style={{ marginTop: 14 }}>{err}</div>}

        <div className="filters" style={{ marginTop: 16 }}>
          <div className="spacer"></div>
          {progress && <span style={{ color: 'var(--brass)', fontSize: 14, marginRight: 12 }}>{progress}</span>}
          <button className="btn btn-pri" onClick={runImport} disabled={busy}>{busy ? 'กำลังนำเข้า…' : `นำเข้า ${rows.length} รายการเข้าระบบ`}</button>
        </div>
        <div className="note" style={{ marginTop: 14 }}><span className="ic">ⓘ</span><div>ระบบจะข้ามแถวที่มี "เลขสัญญา" ซ้ำกับข้อมูลเดิมในระบบโดยอัตโนมัติ และเก็บคอลัมน์ทั้งหมดจากไฟล์ต้นฉบับไว้ครบใน raw_import เผื่อใช้ภายหลัง</div></div>
      </>
    )
  }

  // step === 'upload'
  return (
    <>
      <div className="note"><span className="ic">⬆</span><div>นำเข้าข้อมูลลูกหนี้จากไฟล์ Excel ที่ได้รับจากบริษัทลิสซิ่ง (เช่น MTC) — อ่านไฟล์ → ตรวจตัวอย่าง → จับคู่คอลัมน์ → บันทึกเข้าระบบ</div></div>
      {!rows.length ? (
        <div className="card" style={{ padding: 18 }}>
          <div className={'drop' + (dragOver ? ' drag' : '')}
            onClick={() => fileRef.current && fileRef.current.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}>
            <div className="ic">⬆</div>
            <b>ลากไฟล์ Excel มาวาง หรือคลิกเพื่อเลือก</b>
            <small>รองรับ .xlsx / .xls — หัวตาราง (ชื่อคอลัมน์) ควรอยู่บรรทัดแรกของชีต</small>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={(e) => { handleFile(e.target.files[0]); e.target.value = '' }} />
          </div>
          {err && <div className="login-err" style={{ marginTop: 12 }}>{err}</div>}
        </div>
      ) : (
        <>
          <div className="filters">
            <div><b>{fileName}</b> <span style={{ color: 'var(--muted)' }}>— ตรวจพบ {headers.length} คอลัมน์ · {rows.length} แถวข้อมูล</span></div>
            <div className="spacer"></div>
            <button className="btn btn-gho btn-sm" onClick={reset}>เลือกไฟล์ใหม่</button>
            <button className="btn btn-pri btn-sm" onClick={toMapping}>ถัดไป: จับคู่คอลัมน์ →</button>
          </div>
          <div className="card">
            <div className="card-h"><h3>ตัวอย่างข้อมูล 3 แถวแรก</h3><span className="r">เลื่อนแนวนอนเพื่อดูคอลัมน์ทั้งหมด →</span></div>
            <div className="tbl-wrap" style={{ maxHeight: '55vh' }}>
              <table>
                <thead><tr>{headers.map((h, i) => <th key={i} style={{ whiteSpace: 'nowrap' }}>{h || `(คอลัมน์ ${i + 1})`}</th>)}</tr></thead>
                <tbody>
                  {rows.slice(0, 3).map((r, ri) => (
                    <tr key={ri}>{headers.map((h, ci) => <td key={ci} style={{ whiteSpace: 'nowrap' }}>{String(r[h] ?? '')}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  )
}
