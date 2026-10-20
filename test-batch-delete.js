import mysql from 'mysql2/promise'

const pool = mysql.createPool({
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: '',
  database: 'sisurat_db',
})

async function test() {
  const conn = await pool.getConnection()
  try {
    console.log('=== Cek surat untuk batch delete test ===')
    const [surat] = await conn.query('SELECT id, nomor_surat, tujuan FROM surat_keluar LIMIT 3')
    console.log(`Found ${surat.length} surat:`)
    surat.forEach(s => console.log(`  ID: ${s.id}, nomor: ${s.nomor_surat}, tujuan: ${s.tujuan}`))
    
    if (surat.length >= 2) {
      const idsToDelete = surat.slice(0, 2).map(s => s.id)
      console.log(`\n=== Simulate batch delete dengan IDs: ${idsToDelete.join(', ')} ===`)
      
      const response = await fetch('http://localhost:3000/api/surat-keluar/batch', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer dummy-token-for-test'
        },
        body: JSON.stringify({ ids: idsToDelete })
      })
      
      const result = await response.json()
      console.log('Response status:', response.status)
      console.log('Response body:', result)
    }
  } catch (err) {
    console.error('Error:', err.message)
  } finally {
    await conn.release()
    await pool.end()
  }
}

test()
