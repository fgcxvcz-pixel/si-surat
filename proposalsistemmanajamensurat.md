**PROPOSAL PROJECT PRAKTIK KERJA LAPANGAN (PKL)**

**MANAJEMEN SURAT**

**(Aplikasi Pengelolaan Surat Masuk dan Surat Keluar Berbasis Web)**

## Latar Belakang

## Sandya Networks Kantor Layanan Pacitan merupakan salah satu penyedia layanan jaringan internet yang dalam kegiatan operasionalnya tidak lepas dari aktivitas persuratan, baik surat masuk maupun surat keluar. Saat ini, pengelolaan surat sudah dilakukan dengan bantuan komputer, namun masih menggunakan aplikasi yang terpisah-pisah seperti pengolah kata dan spreadsheet, belum terintegrasi dalam satu sistem khusus persuratan

## Kondisi ini masih memiliki beberapa kelemahan, di antaranya penomoran surat yang harus dilakukan secara manual dan rentan duplikasi, proses pencarian arsip yang tidak efisien karena tersimpan di berbagai lokasi, tidak adanya mekanisme persetujuan (approval) surat keluar secara digital, serta ketiadaan pengingat otomatis untuk surat yang memerlukan tindak lanjut. Selain itu, pencetakan surat resmi masih memerlukan pengaturan format secara manual setiap kali dibuat. Permasalahan-permasalahan tersebut berpotensi menghambat efisiensi kerja dan alur komunikasi, baik secara internal maupun dengan pihak eksternal

## Berdasarkan kondisi tersebut, kami sebagai siswa Kompetensi Keahlian Rekayasa Perangkat Lunak (RPL) SMK Negeri 1 Pacitan yang akan melaksanakan Praktik Kerja Lapangan (PKL) selama 6 (enam) bulan di Sandya Networks Kantor Layanan Pacitan, bermaksud mengajukan proyek pengembangan Sistem Manajemen Surat berbasis web. Sistem ini diharapkan dapat membantu proses pencatatan, pengarsipan, penomoran otomatis, persetujuan digital, pencarian, dan pemantauan tindak lanjut surat secara lebih cepat, rapi, dan terpusat

## Tujuan Proyek

## Menghasilkan Sistem Manajemen Surat berbasis web yang dapat digunakan oleh Sandya Networks Kantor Layanan Pacitan untuk mengelola surat masuk dan surat keluar secara digital

## Mempermudah proses pencatatan, penomoran otomatis, pengarsipan berbasis folder, dan pencarian surat berdasarkan nomor, perihal, atau rentang tanggal agar lebih efisien dibandingkan sistem sebelumnya

## Menyediakan alur persetujuan (approval) surat keluar secara digital oleh Kepala Bagian, sehingga proses validasi tidak lagi memerlukan tatap muka atau pengiriman fisik

## Menyediakan fitur pengingat (reminder) tindak lanjut surat agar tidak ada dokumen penting yang terlewat batas waktunya

## Menyediakan pencetakan surat keluar dalam format resmi dengan tanda tangan digital, serta kemudahan berbagi informasi surat via WhatsApp

## Menjadi sarana penerapan ilmu yang telah dipelajari di sekolah ke dalam proyek nyata di dunia kerja

## Ruang Lingkup Sistem

Sistem yang dikembangkan mencakup pengelolaan surat secara digital dengan ruang lingkup sebagai berikut:

## Autentikasi & Hak Akses — login dengan role Admin dan Kepala Bagian

## Surat Masuk & Keluar — pencatatan, upload PDF, folder, kategori

## Nomor Surat Otomatis — pembuatan nomor surat keluar secara otomatis

## Approval Surat Keluar — alur persetujuan oleh Kepala Bagian

## Master Data — pengelolaan jenis surat, kategori, dan folder

## Dashboard & Laporan — statistik dan rekap periodik

## Reminder Tindak Lanjut — pengingat surat yang perlu ditindaklanjuti

## Tanda Tangan Digital — upload dan pengelolaan tanda tangan

## Manajemen Akun — CRUD akun pengguna

## Cetak PDF & WhatsApp — cetak surat resmi dan berbagi via WhatsApp

## Fitur Utama

## Login & Hak Akses — autentikasi dengan role-based akses (Admin & Kepala Bagian)

## Surat Masuk — pencatatan surat masuk dengan upload PDF, folder, kategori, dan tindak lanjut

## Surat Keluar — pencatatan surat keluar dengan nomor otomatis, approval workflow, dan cetak PDF resmi

## Pencarian & Filter — pencarian dan filter berdasarkan nomor, perihal, kategori, folder, dan tanggal

## Reminder Tindak Lanjut — pengingat untuk surat yang perlu balasan/tindakan dengan status tracking

## Dashboard & Laporan — statistik surat masuk/keluar, rekap periodik, dan export CSV

## Master Data — pengelolaan jenis surat, kategori, dan folder oleh admin

## Manajemen Akun — CRUD akun pengguna dan pengubahan role oleh admin

## Tanda Tangan Digital — upload dan pengelolaan tanda tangan digital untuk approval

## Kirim via WhatsApp — berbagi info surat dan link PDF langsung ke WhatsApp

## Teknologi yang Digunakan

### Frontend

- React 19.3.0
- TypeScript 5.9.3
- Vite 8.3.0
- Tailwind CSS 4.3.3
- ExcelJS 4.4.0
- file-saver 2.0.5

### Backend

- Node.js 24.14.1
- Express 5.2.1
- cors 2.8.6
- Multer 2.4.0
- nodemailer 10.0.13
- jsonwebtoken 9.0.3
- bcryptjs 3.0.3

### Database

- MariaDB 10.6+
- mysql2/promise 3.24.5
- Connection pooling (10 connections)

### Security

- JWT authentication (7-day expiry)
- bcryptjs password hashing (12 rounds)
- OTP via email (6-digit, 15 min expiry)
- Role-based access control (3 roles: Super Admin, Admin, Kepala Bagian)
- Parameterized SQL queries (injection prevention)
- File upload validation (MIME type + size limits)
- Rate limiting (forgot password: 5 attempts/15 min)

# Proses Pembuatan proyek

| **No.** | **Kegiatan**                                                                                                              |
| ------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1       | Observasi lingkungan kerja, pengumpulan kebutuhan, dan analisis proses persuratan yang berjalan                           |
| 2       | Perancangan sistem: struktur database, alur aplikasi, dan desain antarmuka (UI/UX)                                        |
| 3       | Pengembangan modul autentikasi pengguna dan manajemen hak akses                                                           |
| 4       | Pengembangan modul pencatatan surat masuk dan surat keluar beserta upload dokumen PDF                                     |
| 5       | Pengembangan modul penomoran surat otomatis, pencarian arsip, dan pengelolaan data master (jenis surat, kategori, folder) |
| 6       | Pengembangan fitur approval surat keluar oleh Kepala Bagian                                                               |
| 7       | Pengembangan fitur reminder / pengingat tindak lanjut surat dan tanda tangan digital                                      |
| 8       | Pengembangan fitur dashboard, laporan periodik, cetak PDF, dan integrasi WhatsApp                                         |
| 9       | Pengujian seluruh modul (testing) dan perbaikan bug (debugging)                                                           |
| 10      | Implementasi, pelatihan penggunaan sistem bagi staf, dan penyusunan dokumentasi                                           |
| 11      | Evaluasi akhir, penyempurnaan, dan penyusunan laporan PKL                                                                 |

# Implementasi Antarmuka Sistem

1. **Halaman Login**

## Halaman masuk aplikasi. Tampilan split-screen — panel kiri menampilkan branding SiSurat dengan ilustrasi, panel kanan berisi form input username dan password. Pengguna dapat menampilkan/menyembunyikan password, serta mengakses halaman "Lupa Password". Setelah login, sistem mengambil data profil dan role pengguna dari tabel pengguna yang terhubung ke roles

1. **Halaman Lupa Password**

## Halaman reset password via OTP email dalam 3 langkah

## \- Step 1 — Input username, sistem mencari email dari database lalu mengirim kode OTP

## \- Step 2 — Input kode OTP yang diterima di email untuk verifikasi

## \- Step 3 — Input password baru dan konfirmasi, lalu password diubah

1. **Halaman Dashboard**

## Halaman utama setelah login. Menampilkan sapaan sesuai waktu, 3 kartu statistik (Surat Masuk, Surat Keluar, Surat Balasan bulan ini), serta tabel rekap periodik yang bisa diganti antara mingguan/bulanan/kuartalan. Tersedia tombol ekspor data ke CSV

1. **Halaman Surat Masuk**

## Halaman manajemen surat masuk. Terdiri dari sidebar folder kustom (untuk mengelompokkan surat berdasarkan pengirim/bulan), toolbar pencarian/filter, dan tabel daftar surat masuk. Setiap baris bisa diperluas untuk melihat detail lengkap termasuk isi surat, file lampiran (preview PDF), dan status tindak lanjut. Pengguna bisa menambah, mengedit, menghapus, membalas surat (dengan deadline), membagikan via WhatsApp, dan mengekspor ke CSV

1. **Halaman Surat Keluar**

## Mirip dengan surat masuk, tapi untuk surat keluar. Memiliki sidebar folder, tabel surat, dan detail yang mencakup tujuan, jenis surat, file draft, serta surat masuk terkait. Fitur khusus: tombol Approve (hanya untuk role Kepala Bagian) untuk menyetujui surat, yang otomatis menandatangani dengan tanda tangan digital aktif, mengubah status surat masuk terkait menjadi "selesai", dan memperbarui status reminder. Tersedia juga cetak PDF

1. **Halaman Manajemen Akun**

## Halaman khusus Admin untuk mengelola akun pengguna. Menampilkan kartu peran (Admin dan Kepala Bagian) sebagai referensi kemampuan masing-masing role, serta tabel daftar pengguna. Admin bisa menambah akun baru, mengedit profil (nama, username, email, role), mengganti password, dan menghapus akun. Role Kepala/Kepala Bagian akan melihat "Akses Ditolak"

1. **Halaman Master Data**

## Halaman pengelolaan data referensi dengan 4 tab

## \- Jenis Surat Masuk — daftar jenis surat masuk yang bisa ditambah, diubah nama, atau dihapus

## \- Jenis Surat Keluar — sama untuk jenis surat keluar, lengkap dengan kode otomatis

## \- Kategori — kategori surat (biasa/penting)

## \- Folder — folder kustom untuk mengorganisir surat masuk dan keluar (tampil 2 panel berdampingan)

## \- Setiap tab memiliki jumlah item yang ditampilkan di badge, pencarian, dan CRUD (tambah/ubah nama/hapus) dengan konfirmasi

1. **Halaman Tanda Tangan Digital**

## Halaman pengelolaan tanda tangan digital. Pengguna bisa mengunggah gambar tanda tangan (PNG/JPG, maks 2MB), mengaktifkan/menonaktifkan tanda tangan, dan menghapusnya. Hanya satu tanda tangan yang bisa aktif pada satu waktu — tanda tangan aktif inilah yang akan otomatis digunakan saat surat keluar disetujui oleh Kepala Bagian