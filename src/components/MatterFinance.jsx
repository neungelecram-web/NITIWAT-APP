import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { receiptHTML, printHTML } from '../lib/docTemplates'

const FT_TH = { fee: 'ค่าวิชาชีพ', expense: 'ค่าใช้จ่าย', deposit: 'เงินวาง/มัดจำ', payment: 'รับชำระ' }
const FT_OPTS = ['fee', 'expense', 'deposit', 'payment']
const INCOME = new Set(['deposit', 'payment'])
const baht = (n) => (Number(n) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const field = { width: '100%', padding: '9px 11px', border: '1px solid var(--line2)', borderRadius: '8px', fontFamily: 'inherit', fontSize: '14px', background: '#fff' }

export default function MatterFinance({ matterId, profile }) {
  const [rows, setRows] = useState([])
  const [matter, setMatter] = useState(null)
  const [loading, setLoading] = useState(true)
  const [f, setF] = useState({ type: 'fee', amount: '', entry_date: '', description: '' })
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')
  const [receipt, setReceipt] = useState(null)

  async function load() {
    setLoading(true)
    const mm = await supabase.from('matters').select('matter_no, title, clients(name)').eq('id', matterId).single()
    setMatter(mm.data || null)
    const { data } = await supabase.from('finance').select('*, profiles(full_name)').eq('matter_id', matterId).order('entry_date', { ascending: false }).order('created_at', { ascending: false })
    setRows(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [matterId])
  function flash(m) { setToast(m); setTimeout(() => setToast(''), 1800) }

  async function add() {
    if (!f.amount || Number(f.amount) <= 0) { flash('กรุณากรอกจำนวนเงิน'); return }
    setBusy(true)
    const payload = { matter_id: matterId, type: f.type, amount: Number(f.amount), description: f.description.trim() || null, created_by: profile?.id || null }
    if (f.entry_date) payload.entry_date = f.entry_date
    const { error } = await supabase.from('finance').insert(payload)
    setBusy(false)
    if (error) { flash('บันทึกไม่สำเร็จ'); return }
    setF({ type: 'fee', amount: '', entry_date: '', description: '' }); load(); flash('บันทึกรายการแล้ว')
  }
  async function del(id) { await supabase.from('finance').delete().eq('id', id); setRows(rows.filter((r) => r.id !== id)) }

  async function saveReceiptToDocs() {
    const html = receiptHTML({ entry: receipt, m: matter, profile })
    const { error } = await supabase.from('documents').insert({
      matter_id: matterId, category: 'payment', name: `ใบเสร็จ_${receipt.receipt_no || ''}.html`,
      is_generated: true, generated_html: html, uploaded_by: profile?.id || null,
    })
    if (error) { flash('บันทึกเข้าคลังไม่สำเร็จ'); return }
    flash('บันทึกใบเสร็จเข้าคลังเอกสารแล้ว')
  }

  const charges = rows.filter((r) => !INCOME.has(r.type)).reduce((a, r) => a + Number(r.amount || 0), 0)
  const received = rows.filter((r) => INCOME.has(r.type)).reduce((a, r) => a + Number(r.amount || 0), 0)
  const balance = charges - received

  return (
    <>
      <div className="sec">
        <div className="sec-h">สรุปการเงินของคดี</div>
        <div className="kpis" style={{ padding: 14, gridTemplateColumns: 'repeat(3,1fr)' }}>
          <div className="kpi"><div className="lab">เรียกเก็บรวม</div><div className="val tnum">{baht(charges)}<small>฿</small></div></div>
          <div className="kpi"><div className="lab">รับชำระ/วางแล้ว</div><div className="val tnum" style={{ color: 'var(--s-closed)' }}>{baht(received)}<small>฿</small></div></div>
          <div className="kpi"><div className="lab">คงค้าง</div><div className="val tnum" style={{ color: balance > 0 ? 'var(--danger)' : 'var(--text)' }}>{baht(balance)}<small>฿</small></div></div>
        </div>
      </div>

      <div className="sec">
        <div className="sec-h">เพิ่มรายการ</div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}><div className="fld-l">ประเภท</div>
              <select style={field} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
                {FT_OPTS.map((t) => <option key={t} value={t}>{FT_TH[t]}</option>)}
              </select></div>
            <div style={{ flex: 1 }}><div className="fld-l">จำนวนเงิน (บาท)</div><input style={field} type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></div>
            <div style={{ flex: 1 }}><div className="fld-l">วันที่</div><input style={field} type="date" value={f.entry_date} onChange={(e) => setF({ ...f, entry_date: e.target.value })} /></div>
          </div>
          <div><div className="fld-l">รายละเอียด</div><input style={field} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="เช่น ค่าวิชาชีพยื่นฟ้อง / รับวางเงินงวดแรก" /></div>
          <button className="btn btn-pri btn-sm" onClick={add} disabled={busy}>{busy ? 'กำลังบันทึก…' : '+ เพิ่มรายการ'}</button>
        </div>
      </div>

      <div className="sec">
        <div className="sec-h">รายการเคลื่อนไหว</div>
        <div style={{ padding: '4px 16px 14px' }}>
          {loading && <div style={{ color: 'var(--muted)', fontSize: 13, padding: '8px 0' }}>กำลังโหลด…</div>}
          {!loading && rows.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 13, padding: '8px 0' }}>ยังไม่มีรายการ</div>}
          {rows.map((r) => {
            const inc = INCOME.has(r.type)
            return (
              <div key={r.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
                <span className={'tag ' + (inc ? 't-closed' : 't-grey')}>{FT_TH[r.type]}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{r.description || FT_TH[r.type]}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.entry_date}{r.receipt_no ? ` · ใบเสร็จ ${r.receipt_no}` : ''}{r.profiles?.full_name ? ` · ${r.profiles.full_name}` : ''}</div>
                </div>
                <div className="tnum" style={{ fontWeight: 700, color: inc ? 'var(--s-closed)' : 'var(--text)' }}>{inc ? '+' : ''}{baht(r.amount)}</div>
                {inc && <button className="btn btn-gho btn-sm" onClick={() => setReceipt(r)}>ใบเสร็จ</button>}
                <button className="btn btn-gho btn-sm" onClick={() => del(r.id)}>ลบ</button>
              </div>
            )
          })}
        </div>
      </div>

      {receipt && (
        <div className="lb show" onClick={(e) => { if (e.target.classList.contains('lb')) setReceipt(null) }}>
          <div className="lb-inner">
            <div className="lb-head">
              <div style={{ width: 32, height: 32, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', background: '#15803d' }}>💵</div>
              <b>ใบเสร็จรับเงิน {receipt.receipt_no || ''}</b>
              <button className="x" onClick={() => setReceipt(null)}>✕</button>
            </div>
            <div className="lb-body paper-mode"><div className="paper" dangerouslySetInnerHTML={{ __html: receiptHTML({ entry: receipt, m: matter, profile }) }} /></div>
            <div className="lb-foot">
              <div className="spacer"></div>
              <button className="btn btn-gho btn-sm" onClick={() => saveReceiptToDocs()}>บันทึกเข้าคลังเอกสาร</button>
              <button className="btn btn-pri btn-sm" onClick={() => printHTML(receiptHTML({ entry: receipt, m: matter, profile }))}>🖨 พิมพ์ / บันทึก PDF</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast show">✓ {toast}</div>}
    </>
  )
}
