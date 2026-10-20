

import logoPath from "../assets/logo-sandya.png"

const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}
function getDayName(year: number, month: number, day: number) {
  return HARI[new Date(year, month - 1, day).getDay()]
}
function isWeekend(year: number, month: number, day: number) {
  const d = new Date(year, month - 1, day).getDay()
  return d === 0 || d === 6
}

export function PrintRekapSurat({ smByDay, skByDay, smTotal, skTotal, year, month }: {
  smByDay: Record<number, boolean>
  skByDay: Record<number, boolean>
  smTotal: number
  skTotal: number
  year: number
  month: number
}) {
  const daysInMonth = getDaysInMonth(year, month)


  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Rekap Surat - ${BULAN[month - 1]} ${year}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 24px; color: #000000; }
    .header { text-align: center; margin-bottom: 20px; }
    .header h1 { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
    .header p { font-size: 12px; color: #000000; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { border: 1px solid #000000; padding: 6px 4px; text-align: center; }
    th { background: #334155; color: 000000; font-weight: 600; font-size: 10px; }
    th.weekend { background: #475569; }
    td.weekend { background: #e2e8f0; }
    .label-cell { text-align: left; font-weight: 600; padding-left: 10px; min-width: 100px; }
    .dot-red { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #ef4444; margin-right: 6px; vertical-align: middle; }
    .dot-green { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #22c55e; margin-right: 6px; vertical-align: middle; }
    .check { color: #16a34a; font-weight: 700; }
    .dash { color: #000000; }
    .total-cell { font-weight: 700; font-size: 12px; }
    .total-red { color: #dc2626; }
    .total-green { color: #16a34a; }
    .footer { margin-top: 12px; font-size: 10px; color: #000000; display: flex; gap: 16px; }
    .footer span { display: flex; align-items: center; gap: 4px; }
    @media print {
      body { padding: 12px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Rekap Surat</h1>
    <p>${BULAN[month - 1]} ${year}</p>
  </div>
  <table>
    <thead>
      <tr>
        <th class="label-cell" style="text-align:left">Jenis Surat</th>
        ${Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1
          const w = isWeekend(year, month, day)
          return `<th class="${w ? "weekend" : ""}">${String(day).padStart(2, "0")}<br/>${getDayName(year, month, day)}</th>`
        }).join("")}
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="label-cell"><span class="dot-red"></span>Surat Masuk</td>
        ${Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1
          const has = smByDay[day]
          const w = isWeekend(year, month, day)
          return `<td class="${w ? "weekend" : ""}"><span class="${has ? "check" : "dash"}">${has ? "✓" : "–"}</span></td>`
        }).join("")}
        <td class="total-cell total-red">${smTotal}</td>
      </tr>
      <tr>
        <td class="label-cell"><span class="dot-green"></span>Surat Keluar</td>
        ${Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1
          const has = skByDay[day]
          const w = isWeekend(year, month, day)
          return `<td class="${w ? "weekend" : ""}"><span class="${has ? "check" : "dash"}">${has ? "✓" : "–"}</span></td>`
        }).join("")}
        <td class="total-cell total-green">${skTotal}</td>
      </tr>
    </tbody>
  </table>
  <div class="footer">
    <span><span class="check">✓</span> Ada surat</span>
    <span><span class="dash">–</span> Tidak ada surat</span>
  </div>
</body>
</html>`

  return html
}

export async function openPrintRekap(data: {
  smByDay: Record<number, boolean>
  skByDay: Record<number, boolean>
  smTotal: number
  skTotal: number
  year: number
  month: number
}) {
  const { smByDay, skByDay, smTotal, skTotal, year, month } = data
  const daysInMonth = getDaysInMonth(year, month)

  const HARI_P = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]
  const BULAN_P = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]

  function getDayNameP(y: number, m: number, d: number) { return HARI_P[new Date(y, m - 1, d).getDay()] }
  function isWeekendP(y: number, m: number, d: number) { const dd = new Date(y, m - 1, d).getDay(); return dd === 0 || dd === 6 }

  const win = window.open("", "_blank")
  if (!win) return

  let logoBase64 = ""
  try {
    const res = await fetch(logoPath)
    const blob = await res.blob()
    logoBase64 = await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.readAsDataURL(blob)
    })
  } catch {}

const header = `
<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
    ${logoBase64 ? `<img src="${logoBase64}" style="height:70px" />` : ""}
    <div style="margin-left:auto;text-align:right; flex-grow:3; width:100%;">
    <span style="font-size:14px;color:#0F172A; font-weight:700;white-space:nowrap;">
            <div>SANDYA NETWORKS KANTOR LAYANAN PACITAN</div>
    <span style="font-size:10px;color:#64748b; font-weight:400;">
            <div>Jl. Jend. Sudirman No. 3, Bowongan, Arjowinangun, Kecamatan Pacitan</div>
    <span style="font-size:10px;color:#64748b; font-weight:400;">
            <div>+62 811-8882-2525 | info@sandya.net | www.sandya.net</div>
    </span>
    </div>
  </div>
  <div style="text-align:center;margin-bottom:16px">
    <h1 style="font-size:18px;font-weight:700;margin:0 0 2px">Rekap Surat</h1>
    <p style="font-size:12px;color:#000000;margin:0">${BULAN_P[month - 1]} ${year}</p>
  </div>
`

  const thCells = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1
    const w = isWeekendP(year, month, day)
    return `<th style="padding:5px 3px;font-size:10px;background:${w ? "#253c5c" : "#27446d"};color:white;border:1px solid #000000">${String(day).padStart(2, "0")}<br>${getDayNameP(year, month, day)}</th>`
  }).join("")

  const smCells = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1
    const has = smByDay[day]
    const w = isWeekendP(year, month, day)
    return `<td style="padding:5px 3px;text-align:center;border:1px solid #000000;background:${w ? "#e2e8f0" : "white"};color:${has ? "#16a34a" : "#1e40af"};font-weight:${has ? "700" : "400"};font-size:12px">${has ? "✓" : "–"}</td>`
  }).join("")

  const skCells = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1
    const has = skByDay[day]
    const w = isWeekendP(year, month, day)
    return `<td style="padding:5px 3px;text-align:center;border:1px solid #000000;background:${w ? "#e2e8f0" : "white"};color:${has ? "#16a34a" : "#1e40af"};font-weight:${has ? "700" : "400"};font-size:12px">${has ? "✓" : "–"}</td>`
  }).join("")

   const html = `<!DOCTYPE html><html><head><meta charset="utf-8">  <title>Rekap Surat</title><style>@page{size:landscape;margin:0}body{margin:0!important;padding:12px!important}</style></head><body style="font-family:'Segoe UI',Arial,sans-serif;padding:20px;color:#000000">
   ${header}
   <table style="width:100%;border-collapse:collapse;font-size:11px">
     <thead><tr>
       <th style="text-align:left;padding:5px 8px;font-size:10px;background:#334155;color:000000;border:1px solid #080808;min-width:100px">Jenis Surat</th>
       ${thCells}
       <th style="padding:5px 6px;font-size:10px;background:#334155;color:000000;border:1px solid #080808">Total</th>
     </tr></thead>
     <tbody>
       <tr>
         <td style="text-align:left;padding:5px 8px;font-weight:600;border:1px solid #080808;background:#f1f5f9"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#ef4444;margin-right:6px;vertical-align:middle"></span>Surat Masuk</td>
         ${smCells}
         <td style="padding:5px 6px;text-align:center;font-weight:700;font-size:13px;color:#000000;border:1px solid #080808;background:#f1f5f9">${smTotal}</td>
       </tr>
       <tr>
         <td style="text-align:left;padding:5px 8px;font-weight:600;border:1px solid #080808;background:#e2e8f0"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#22c55e;margin-right:6px;vertical-align:middle"></span>Surat Keluar</td>
         ${skCells}
         <td style="padding:5px 6px;text-align:center;font-weight:700;font-size:13px;color:#080808;border:1px solid #080808;background:#e2e8f0">${skTotal}</td>
       </tr>
     </tbody>
   </table>
   <div style="margin-top:10px;font-size:10px;color:#080808;display:flex;gap:16px">
     <span>✓ Ada surat</span><span style="color:#000000">– Tidak ada surat</span>
   </div>
   </body></html>`

  win.document.write(html)
  win.document.close()
  setTimeout(() => { win.print() }, 300)
}
