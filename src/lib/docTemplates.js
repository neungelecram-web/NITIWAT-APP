// แม่แบบเอกสารอัตโนมัติ — ดึงข้อมูลจากคดี (matters) + คู่ความ (parties) มากรอกให้
const THM = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
export function thaiToday() {
  const d = new Date()
  return `${d.getDate()} ${THM[d.getMonth() + 1]} ${d.getFullYear() + 543}`
}
const baht = (n) => (Number(n) || 0).toLocaleString('th-TH')
const lawyer = (p) => p?.full_name || 'ทนายความผู้รับมอบอำนาจ'
const byRole = (parties, roles) => {
  for (const r of roles) { const p = (parties || []).find((x) => x.role === r); if (p) return p }
  return null
}

const LETTERHEAD = `<div class="ph-head"><div class="ph-seal">นว</div><div><div class="ph-org">สำนักงานทนายความนิติวัฒน์</div><div class="ph-sub">เลขที่ 99 ถนนนิติธรรม แขวงพระบรมมหาราชวัง เขตพระนคร กรุงเทพมหานคร 10200 · โทร. 02-000-0000</div></div></div>`

function noticeTpl({ m, parties, profile }) {
  const def = byRole(parties, ['defendant', 'debtor'])
  const name = def?.name || '..............................'
  const addr = def?.address || '..............................'
  const amount = m.claim_amount ? baht(m.claim_amount) : '..............'
  const cli = m.clients?.name || 'ลูกความของข้าพเจ้า'
  return `${LETTERHEAD}
   <div class="ph-meta"><div>ที่ นว. ${m.matter_no}/2569</div><div>วันที่ ${thaiToday()}</div></div>
   <p><b>เรื่อง</b>&nbsp;&nbsp;ขอบอกกล่าวทวงถามให้ชำระหนี้</p>
   <p><b>เรียน</b>&nbsp;&nbsp;${name}</p>
   <div class="ph-body">
   <p class="ind">ด้วยข้าพเจ้าในฐานะทนายความผู้รับมอบอำนาจจาก ${cli} ขอเรียนว่า ท่านมีภาระหนี้ที่ต้องชำระแก่ลูกความของข้าพเจ้า คำนวณถึงวันที่มีหนังสือฉบับนี้เป็นเงินจำนวน ${amount} บาท (${m.title})</p>
   <p class="ind">ปรากฏว่าท่านเพิกเฉยไม่ชำระหนี้ดังกล่าว ข้าพเจ้าจึงขอบอกกล่าวมายังท่าน ให้นำเงินจำนวนดังกล่าวมาชำระ หรือติดต่อเพื่อชำระหนี้ ภายในกำหนด 15 (สิบห้า) วัน นับแต่วันที่ได้รับหนังสือฉบับนี้ หากพ้นกำหนดแล้วท่านยังเพิกเฉย ข้าพเจ้ามีความจำเป็นต้องดำเนินคดีตามกฎหมายกับท่านจนถึงที่สุด โดยท่านจะต้องรับผิดในค่าฤชาธรรมเนียมและค่าทนายความทั้งหมด</p>
   <p class="ind">จึงเรียนมาเพื่อโปรดทราบและดำเนินการภายในกำหนด (ที่อยู่ผู้รับ: ${addr})</p></div>
   <div class="ph-sign"><div>ขอแสดงความนับถือ</div><div class="ph-line"></div><div>( ${lawyer(profile)} )</div><div>ทนายความผู้รับมอบอำนาจ</div></div>`
}

function poaTpl({ m, profile }) {
  const cli = m.clients?.name || '..............................'
  return `<div class="ph-center"><b>หนังสือมอบอำนาจ</b></div>
   <div class="ph-meta"><div></div><div>วันที่ ${thaiToday()}</div></div>
   <div class="ph-body">
   <p class="ind">โดยหนังสือฉบับนี้ ข้าพเจ้า ${cli} ขอแต่งตั้งและมอบอำนาจให้ ${lawyer(profile)} เป็นผู้รับมอบอำนาจ มีอำนาจกระทำการแทนข้าพเจ้าในกิจการดังต่อไปนี้</p>
   <p class="ind">1. ดำเนินคดี "${m.title}" ${m.court ? 'ต่อ ' + m.court : ''} ทั้งในฐานะโจทก์หรือจำเลย ผู้ร้องหรือผู้คัดค้าน ตลอดจนการบังคับคดี</p>
   <p class="ind">2. ยื่นฟ้อง ยื่นคำให้การ คำร้อง คำขอ คำแถลง อุทธรณ์ ฎีกา และดำเนินกระบวนพิจารณาใด ๆ แทนข้าพเจ้าจนเสร็จการ</p>
   <p class="ind">3. รับเงิน รับเอกสาร ทำสัญญาประนีประนอมยอมความ และรับชำระหนี้แทนข้าพเจ้า</p>
   <p class="ind">การใดที่ผู้รับมอบอำนาจได้กระทำไปภายในขอบอำนาจนี้ ให้ถือเสมือนว่าข้าพเจ้าได้กระทำด้วยตนเองทุกประการ</p></div>
   <div style="display:flex;justify-content:space-around;margin-top:46px;text-align:center">
     <div><div class="ph-line"></div><div>( ${cli} )</div><div>ผู้มอบอำนาจ</div></div>
     <div><div class="ph-line"></div><div>( ${lawyer(profile)} )</div><div>ผู้รับมอบอำนาจ</div></div>
   </div>`
}

function plaintTpl({ m, parties, profile }) {
  const plaintiff = byRole(parties, ['plaintiff'])?.name || m.clients?.name || '..............................'
  const def = byRole(parties, ['defendant', 'debtor'])?.name || '..............................'
  const amount = m.claim_amount ? baht(m.claim_amount) : '..............'
  return `<div class="ph-center"><b>คำฟ้อง</b></div>
   <div class="ph-court">${m.court || 'ศาล..............................'}</div>
   <div class="ph-meta"><div>คดีหมายเลขดำที่ ${m.case_number || '............/2569'}</div><div>วันที่ ${thaiToday()}</div></div>
   <p>ความแพ่ง</p>
   <p>ระหว่าง&nbsp;&nbsp;&nbsp;&nbsp;${plaintiff}&nbsp;&nbsp;&nbsp;&nbsp;โจทก์</p>
   <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${def}&nbsp;&nbsp;&nbsp;&nbsp;จำเลย</p>
   <p><b>เรื่อง</b>&nbsp;&nbsp;${m.title}</p>
   <p><b>ทุนทรัพย์</b>&nbsp;&nbsp;${amount} บาท</p>
   <div class="ph-body">
   <p class="ind"><b>ข้อ 1.</b> โจทก์เป็นผู้มีสิทธิและมีอำนาจฟ้องคดีนี้ ${m.description ? 'โดยมีข้อเท็จจริงโดยสรุปว่า ' + m.description : ''}</p>
   <p class="ind"><b>ข้อ 2.</b> จำเลยกระทำการอันเป็นการโต้แย้งสิทธิของโจทก์ ทำให้โจทก์ได้รับความเสียหายคิดเป็นเงินจำนวน ${amount} บาท</p>
   <p class="ind"><b>ข้อ 3.</b> โจทก์ได้ทวงถามให้จำเลยชำระหนี้/ปฏิบัติตามสิทธิแล้ว แต่จำเลยเพิกเฉย โจทก์ไม่มีทางอื่นใดจึงต้องนำคดีมาฟ้องต่อศาลนี้เพื่อขอบารมีศาลเป็นที่พึ่ง</p>
   <p class="ind" style="margin-top:8px"><b>ควรมิควรแล้วแต่จะโปรด</b></p>
   <p class="ph-center" style="margin:12px 0 6px"><b>คำขอท้ายฟ้อง</b></p>
   <p class="ind">ขอศาลได้โปรดมีคำพิพากษาหรือคำสั่งดังต่อไปนี้</p>
   <p class="ind">1. ให้จำเลยชำระเงินจำนวน ${amount} บาท พร้อมดอกเบี้ยตามกฎหมายนับแต่วันฟ้องจนกว่าจะชำระเสร็จแก่โจทก์</p>
   <p class="ind">2. ให้จำเลยใช้ค่าฤชาธรรมเนียมและค่าทนายความแทนโจทก์</p></div>
   <div class="ph-sign"><div class="ph-line"></div><div>( ${lawyer(profile)} )</div><div>ทนายความโจทก์</div></div>`
}

export const TEMPLATES = {
  notice: { label: 'หนังสือบอกกล่าวทวงถาม', ic: '✉️', cat: 'notice', color: '#c2410c', desc: 'แจ้งให้ชำระหนี้ภายในกำหนด 15 วัน', build: noticeTpl },
  poa: { label: 'หนังสือมอบอำนาจ', ic: '✍️', cat: 'poa', color: '#4d7c0f', desc: 'ลูกความมอบอำนาจให้ทนายดำเนินคดี', build: poaTpl },
  plaint: { label: 'คำฟ้อง (แพ่ง)', ic: '⚖️', cat: 'plaint', color: '#6d28d9', desc: 'ร่างคำฟ้องคดีแพ่งจากข้อมูลคดี', build: plaintTpl },
}

const PAPER_CSS = `*{box-sizing:border-box}body{margin:0}.paper{background:#fff;color:#1a1a1a;font-family:'Sarabun',sans-serif;max-width:720px;margin:0 auto;padding:48px 54px;font-size:15px;line-height:1.9}.paper p{margin:0 0 9px;text-align:justify}.paper .ind{text-indent:2.6em}.paper .ph-head{display:flex;gap:14px;align-items:center;border-bottom:2px solid #1b2a4a;padding-bottom:12px;margin-bottom:10px}.paper .ph-seal{width:46px;height:46px;border-radius:50%;background:#1b2a4a;color:#caa25a;display:flex;align-items:center;justify-content:center;font-weight:800;border:2px solid #b08537;flex-shrink:0}.paper .ph-org{font-weight:800;font-size:18px;color:#1b2a4a}.paper .ph-sub{font-size:11.5px;color:#555}.paper .ph-meta{display:flex;justify-content:space-between;margin:12px 0}.paper .ph-center{text-align:center;font-size:17px;margin:4px 0 8px}.paper .ph-court{text-align:center;margin-bottom:6px}.paper .ph-body{margin-top:8px}.paper .ph-sign{margin-top:42px;text-align:center;float:right;width:300px}.paper .ph-line{border-bottom:1px dotted #333;margin:32px 30px 6px}.paper:after{content:'';display:block;clear:both}`

export function printHTML(html) {
  let fr = document.getElementById('printFrame')
  if (!fr) {
    fr = document.createElement('iframe')
    fr.id = 'printFrame'
    fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
    document.body.appendChild(fr)
  }
  const doc = fr.contentDocument || fr.contentWindow.document
  doc.open()
  doc.write(`<!doctype html><html lang="th"><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700;800&display=swap" rel="stylesheet"><style>${PAPER_CSS}@page{margin:18mm}</style></head><body><div class="paper">${html}</div></body></html>`)
  doc.close()
  setTimeout(() => { try { fr.contentWindow.focus(); fr.contentWindow.print() } catch (e) { alert('ไม่สามารถสั่งพิมพ์ได้ในสภาพแวดล้อมนี้') } }, 600)
}

// ---------- ใบเสร็จรับเงิน ----------
export function bahttext(num) {
  num = (Math.round((Number(num) || 0) * 100) / 100).toFixed(2)
  const [bahtStr, satangStr] = num.split('.')
  const t1 = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า']
  const t2 = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน']
  const numText = (nstr) => {
    let s = ''
    const n = String(parseInt(nstr, 10))
    const L = n.length
    for (let i = 0; i < L; i++) {
      const d = +n[i]; const pos = L - 1 - i
      if (d === 0) continue
      if (pos === 1 && d === 1) s += 'สิบ'
      else if (pos === 1 && d === 2) s += 'ยี่สิบ'
      else if (pos === 0 && d === 1 && L > 1) s += 'เอ็ด'
      else s += t1[d] + t2[pos]
    }
    return s
  }
  const toThai = (numInt) => {
    numInt = String(parseInt(numInt, 10))
    if (numInt === '0') return ''
    if (numInt.length > 6) {
      const head = numInt.slice(0, numInt.length - 6)
      const tail = numInt.slice(numInt.length - 6)
      return toThai(head) + 'ล้าน' + (parseInt(tail, 10) ? numText(tail) : '')
    }
    return numText(numInt)
  }
  const bahtNum = parseInt(bahtStr, 10); const sat = parseInt(satangStr, 10)
  if (bahtNum === 0 && sat === 0) return 'ศูนย์บาทถ้วน'
  let result = ''
  if (bahtNum > 0) result += toThai(bahtStr) + 'บาท'
  if (sat > 0) result += numText(satangStr) + 'สตางค์'
  else result += 'ถ้วน'
  return result
}

function thaiDateISO(iso) {
  if (!iso) return thaiToday()
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${THM[m]} ${y + 543}`
}

export function receiptHTML({ entry, m, profile }) {
  const payer = m?.clients?.name || '...............................................'
  const amount = Number(entry.amount) || 0
  const fmt = amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const desc = entry.description || (entry.type === 'deposit' ? 'เงินวาง / มัดจำ' : 'รับชำระค่าบริการ / ค่าวิชาชีพ')
  return `${LETTERHEAD}
   <div class="ph-center" style="margin-top:6px"><b>ใบเสร็จรับเงิน</b></div>
   <div class="ph-meta"><div>เลขที่ ${entry.receipt_no || '-'}</div><div>วันที่ ${thaiDateISO(entry.entry_date)}</div></div>
   <div class="ph-body">
   <p>ได้รับเงินจาก&nbsp;&nbsp;${payer}</p>
   <p>ในนามคดี&nbsp;&nbsp;${m?.matter_no || ''} ${m?.title || ''}</p>
   <table style="width:100%;border-collapse:collapse;margin:14px 0">
     <tr><th style="border:1px solid #999;padding:8px 12px;text-align:left;background:#f3f4f6">รายการ</th><th style="border:1px solid #999;padding:8px 12px;text-align:right;background:#f3f4f6;white-space:nowrap">จำนวนเงิน (บาท)</th></tr>
     <tr><td style="border:1px solid #999;padding:10px 12px">${desc}</td><td style="border:1px solid #999;padding:10px 12px;text-align:right">${fmt}</td></tr>
     <tr><td style="border:1px solid #999;padding:8px 12px;text-align:right"><b>รวมทั้งสิ้น</b></td><td style="border:1px solid #999;padding:8px 12px;text-align:right"><b>${fmt}</b></td></tr>
   </table>
   <p class="ph-center"><b>( ${bahttext(amount)} )</b></p>
   </div>
   <div class="ph-sign"><div class="ph-line"></div><div>( ${lawyer(profile)} )</div><div>ผู้รับเงิน</div></div>`
}
