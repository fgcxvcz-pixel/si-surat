import nodemailer from 'nodemailer'

function createTransport() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com'
  const port = Number(process.env.SMTP_PORT || 587)
  const user = process.env.EMAIL_USER || process.env.SMTP_USER || ''
  const passRaw = process.env.EMAIL_PASSWORD || process.env.SMTP_PASS || ''
  const pass = String(passRaw).replace(/\s+/g, '')

  if (!user || !pass) return null

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    family: 4,
    auth: { user, pass },
  })
}

export function isSmtpConfigured() {
  return !!(process.env.EMAIL_USER || process.env.SMTP_USER) &&
    !!(process.env.EMAIL_PASSWORD || process.env.SMTP_PASS)
}

export async function sendOtpEmail(to, otp, expiryMinutes) {
  const transport = createTransport()
  if (!transport) {
    throw new Error('SMTP belum dikonfigurasi (EMAIL_USER / EMAIL_PASSWORD)')
  }

  const from = process.env.MAIL_FROM || `SiSurat <${process.env.EMAIL_USER || process.env.SMTP_USER}>`
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#111;max-width:480px;margin:0 auto;padding:24px;">
      <h2 style="margin:0 0 8px;color:#0F172A;">Reset Password SiSurat</h2>
      <p style="margin:0 0 16px;color:#475569;font-size:14px;">Gunakan kode di bawah ini untuk mengganti password Anda.</p>
      <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;padding:20px;text-align:center;margin:0 0 16px;">
        <div style="font-size:32px;font-weight:700;letter-spacing:8px;color:#1D4ED8;font-family:monospace;">${otp}</div>
      </div>
      <p style="margin:0 0 8px;color:#334155;font-size:14px;">Kode berlaku selama <strong>${expiryMinutes} menit</strong>.</p>
      <p style="margin:0;color:#64748B;font-size:13px;">Jangan bagikan kode ini ke siapa pun. Jika Anda tidak meminta reset password, abaikan email ini.</p>
      <p style="margin:16px 0 0;color:#94A3B8;font-size:12px;">— SiSurat, Sistem Manajemen Surat Digital</p>
    </div>
  `

  await transport.sendMail({
    from,
    to,
    subject: 'Kode Reset Password SiSurat',
    html,
    text: `Kode reset password SiSurat: ${otp}. Berlaku ${expiryMinutes} menit. Jangan bagikan kode ini.`,
  })
}
