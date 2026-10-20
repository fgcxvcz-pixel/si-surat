import React, { useEffect } from "react"
import { getFileUrl } from "./lib/api"

export function PrintPDFPage() {
  const [params, setParams] = React.useState<{
    nomor_surat: string
    perihal: string
    isi_surat: string
    tanggal_kirim: string
    tujuan: string
    ttdPath: string
    nama_ttd: string
  } | null>(null)

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    let ttdPath = ""
    const raw = searchParams.get("file_final_ttd") || ""
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        ttdPath = parsed.path || ""
      } catch {}
    }
    const data = {
      nomor_surat: searchParams.get("nomor_surat") || "",
      perihal: searchParams.get("perihal") || "",
      isi_surat: searchParams.get("isi_surat") || "",
      tanggal_kirim: searchParams.get("tanggal_kirim") || "",
      tujuan: searchParams.get("tujuan") || "",
      ttdPath,
      nama_ttd: searchParams.get("nama_ttd") || "",
    }
    setParams(data)

    setTimeout(() => {
      window.print()
    }, 500)
  }, [])

  if (!params) {
    return <div className="p-8">Loading...</div>
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-"
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString("id-ID", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    } catch {
      return dateStr
    }
  }

  return (
    <html lang="id">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>{params.perihal || "Cetak Surat"}</title>
        <style>{`
          @page { size:A4 portrait; margin:0; }
          * { box-sizing:border-box; }
          html,body { margin:0; padding:0; background:#eee; }
          body { font-family:"Times New Roman", Times, serif; color:#111; }
          .sheet {
            width:210mm;
            height:297mm;
            margin:10mm auto;
            background:#fff;
            position:relative;
            overflow:hidden;
          }
          .logo {
            position:absolute; left:11.5mm; top:7.0mm;
            width:61.5mm; height:auto;
          }
          .company {
            position:absolute; top:12.0mm; right:10.0mm;
            width:100mm; text-align:right;
            font-family:Arial,Helvetica,sans-serif;
          }
          .company .name {
            font-size:15px; font-weight:700; letter-spacing:.2px;
            margin:0 0 0.5mm 0;
            line-height:1.2;
          }
          .company .line {
            font-size:11.2px; line-height:1.3; font-weight:400;
            margin:0;
          }
          .meta {
            position:absolute; left:24.2mm; top:43.4mm;
            font-size:15px; line-height:1.45;
          }
          .meta .row { display:flex; }
          .meta .label { width:19mm; }
          .meta .colon { width:4mm; }
          .meta .value { font-weight:400; }
          .meta .subject { font-weight:700; text-decoration:underline; }
          .date {
            position:absolute; top:43.0mm; right:19.5mm;
            font-size:15px;
          }
          .address {
            position:absolute; left:24.2mm; top:62.0mm;
            font-size:15px; line-height:1.42;
          }
          .salute {
            position:absolute; left:24.2mm; top:82.4mm;
            font-size:15px;
          }
          .content {
            position:absolute; left:24.2mm; right:18.8mm; top:90.6mm;
            font-size:14.65px; line-height:1.18;
            text-align:justify;
          }
          .content p { margin:0 0 3.8mm 0; }
          .intro { text-indent:0; }
          ol {
            margin:0 0 4.0mm 7.5mm;
            padding-left:5.5mm;
          }
          li {
            padding-left:1.2mm;
            margin:0 0 1.2mm 0;
          }
          li::marker { font-weight:700; }
          .item-title { font-weight:700; }
          .item-body { display:block; }
          .closing {
            margin-top:2.0mm;
          }
          .signature {
            position:absolute;
            right:20.0mm; bottom:10.2mm;
            width:72mm;
            text-align:center;
            font-size:15px;
          }
          .signature .greeting { line-height:1.2; margin-bottom:0; }
          .signature img {
            display:block;
            width:72mm;
            height:34mm;
            object-fit:contain;
            object-position:center;
            margin:-1mm auto -1mm;
          }
          .signature .person {
            font-weight:700;
            line-height:1.15;
          }
          .signature .role { line-height:1.15; }

          @media print {
            html,body { width:210mm; height:297mm; background:#fff; }
            .sheet { margin:0; box-shadow:none; }
          }
          @media screen {
            .sheet { box-shadow:0 0 8px rgba(0,0,0,.18); }
          }
        `}</style>
      </head>
      <body>
        <section className="sheet">
          <img className="logo" src="/logo-sandya.png" alt="logo" />
          <div className="company">
            <div className="name">SANDYA NETWORKS KANTOR LAYANAN PACITAN</div>
            <div className="line">Jl. Jend. Sudirman No. 3, Bowongan, Arjowinangun, Kecamatan Pacitan</div>
            <div className="line">+62 811-8882-2525 | info@sandya.net | www.sandya.net</div>
          </div>

          <div className="meta">
            <div className="row">
              <span className="label">Nomor</span>
              <span className="colon">:</span>
              <span className="value">{params.nomor_surat || "-"}</span>
            </div>
            <div className="row">
              <span className="label">Perihal</span>
              <span className="colon">:</span>
              <span className="value subject">{params.perihal || "-"}</span>
            </div>
          </div>

          <div className="date">Pacitan, {formatDate(params.tanggal_kirim)}</div>

          <div className="address">Yth. {params.tujuan || "-"}</div>

          <div className="salute">Dengan hormat,</div>

          <div className="content">
            <p className="intro">{params.isi_surat || "-"}</p>
          </div>

          {params.ttdPath && (
            <div className="signature">
              <div className="greeting">
                Hormat kami,
                <br />
                Sandya Networks
              </div>
              <img className="tanda-tangan-image" src={getFileUrl(params.ttdPath)} alt="tanda tangan" />
              <div className="person">{params.nama_ttd || "Sandya Networks"}</div>
              <div className="role">a.n. Kepala Kantor Layanan Pacitan</div>
            </div>
          )}
        </section>
      </body>
    </html>
  )
}
