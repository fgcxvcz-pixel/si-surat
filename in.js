import mysql from 'mysql2/promise'

const pool = mysql.createPool({
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: '',
  database: 'sisurat_db',
})

async function insertDummy() {
  const conn = await pool.getConnection()
  try {
    console.log('=== Insert Dummy Data ===\n')

    // Get current date
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')

    console.log('Inserting 5 Surat Masuk...')
    for (let i = 1; i <= 100; i++) {
      const nomorSuratMasuk = `SM-${year}-${String(i).padStart(3, '0')}`
      const tanggalTerima = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000)) // i hari lalu
      
      await conn.query(
        `INSERT INTO surat_masuk (id_user, nomor_surat, pengirim, perihal, isi_surat, jenis_surat, tanggal_terima, status_tindak_lanjut)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          1,
          nomorSuratMasuk,
          `Pengirim Dummy ${i}`,
          `Perihal Surat Masuk ${i}`,
          `Ini adalah isi surat masuk dummy nomor ${i}. Lorem ipsum dolor sit amet.`,
          'surat masuk biasa',
          tanggalTerima.toISOString().slice(0, 19).replace('T', ' '),
          'tidak'
        ]
      )
      console.log(`  ✓ Surat Masuk ${i}: ${nomorSuratMasuk}`)
    }

    console.log('\nInserting 5 Surat Keluar...')
    const BULAN_ROMAWI = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII']
    const bulanRomawi = BULAN_ROMAWI[now.getMonth()]
    
    for (let i = 1; i <= 100; i++) {
      const nomorSuratKeluar = `${String(i).padStart(3, '0')}.01/SSI-PCT/${bulanRomawi}/${year}`
      const tanggalKirim = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000)) // i hari lalu
      
      await conn.query(
        `INSERT INTO surat_keluar (id_user, nomor_surat, tujuan, perihal, jenis_surat, isi_surat, tanggal_kirim, status_approval)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          1,
          nomorSuratKeluar,
          `Tujuan Dummy ${i}`,
          `Perihal Surat Keluar ${i}`,
          'surat tugas',
          `Ini adalah isi surat keluar dummy nomor ${i}. Lorem ipsum dolor sit amet.`,
          tanggalKirim.toISOString().slice(0, 19).replace('T', ' '),
          'menunggu'
        ]
      )
      console.log(`  ✓ Surat Keluar ${i}: ${nomorSuratKeluar}`)
    }

    console.log('\n=== Success! ===')
    console.log('5 Surat Masuk + 5 Surat Keluar inserted')

  } catch (err) {
    console.error('Error:', err.message)
  } finally {
    await conn.release()
    await pool.end()
  }
}

insertDummy()