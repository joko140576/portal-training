# E-Learning Sertifikasi Custody ATM & CRM

Website e-training + post-test + sertifikat otomatis untuk petugas custody
(pengisian uang tunai ATM/CRM).

## Isi paket

```
index.html            Sesi 1 (judul & definisi) + Sesi 2 (tabel materi PDF & video)
posttest.html          Biodata → 25 soal pilihan ganda → hasil → sertifikat
gas/Code.gs             Backend Google Apps Script (dihubungkan ke Google Sheet)
local-test/server.js    Mock server lokal (Node.js) untuk uji coba tanpa GAS
local-test/soal.json    25 soal contoh
local-test/pegawai.json Data pegawai contoh
```

## 1. Uji coba lokal (tanpa Google sama sekali)

1. Pastikan Node.js terpasang di komputer.
2. Buka terminal di folder `local-test/`, jalankan:
   ```
   node server.js
   ```
   Server mock akan aktif di `http://localhost:8080`.
3. Buka `posttest.html` langsung di browser (double click, atau lewat
   `Live Server`/`python -m http.server` bila browser memblokir `file://`).
4. Coba login dengan NPP contoh: `20231045`, `20220098`, atau `20190231`
   (lihat `pegawai.json`).
5. Jawab 25 soal → kirim → jika skor ≥ 70, sertifikat otomatis tampil dan
   bisa diunduh (PNG/PDF).

`posttest.html` sudah diset `USE_LOCAL = true` secara default sehingga
langsung memakai mock server ini. Data hasil test lokal tersimpan di
`local-test/hasil.json` (dibuat otomatis).

## 2. Setup database asli (Google Spreadsheet)

Buat 1 Google Spreadsheet baru dengan 3 sheet:

**Sheet "Soal"**
| ID | Soal | OpsiA | OpsiB | OpsiC | OpsiD | Kunci |
|----|------|-------|-------|-------|-------|-------|
| 1  | ...  | ...   | ...   | ...   | ...   | a     |

**Sheet "Pegawai"**
| NPP | Nama | Region | Kantor |
|-----|------|--------|--------|

**Sheet "Hasil"** — boleh dikosongkan, akan terisi otomatis oleh skrip
(header dibuat otomatis saat submit pertama).

Isi kedua sheet pertama sesuai `soal.json` dan `pegawai.json` sebagai
referensi format, lalu ganti dengan data 25 soal dan seluruh pegawai
yang sebenarnya.

## 3. Deploy Apps Script (backend produksi)

1. Di spreadsheet tadi: **Extensions → Apps Script**.
2. Hapus isi default, tempel isi `gas/Code.gs`.
3. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Salin URL `.../exec` yang dihasilkan.
5. Di `posttest.html`, ubah:
   ```js
   const USE_LOCAL = false;
   const GAS_URL_PROD = "https://script.google.com/macros/s/XXXXXXXX/exec";
   ```

### Kenapa polanya "GET saja" (anti-CORS)?

Apps Script Web App tidak menyediakan handler `doOptions`, sehingga
permintaan `fetch()` yang memicu **CORS preflight** (misalnya POST dengan
header `Content-Type: application/json`) akan gagal. Solusinya, seluruh
komunikasi di proyek ini memakai **GET** dengan data dikirim lewat query
string (`?action=submitTest&data=<json url-encoded>`), yang merupakan
"simple request" dan tidak memicu preflight — sehingga aman dipanggil
lintas-origin langsung dari file HTML statis manapun.

## 4. Mengisi materi PDF & video di index.html

Buka `index.html`, cari blok `const materiPDF = [...]` dan
`const materiVideo = [...]` di bagian akhir file:

- **PDF**: isi `file` dengan link Google Drive (share: "siapa saja yang
  memiliki tautan") format `https://drive.google.com/file/d/FILE_ID/view`.
- **Video**: isi `fileId` dengan ID file video di Google Drive (video juga
  harus di-share "siapa saja yang memiliki tautan").

Catatan teknis video: pemutar Google Drive berjalan di dalam iframe
lintas-domain, sehingga tombol **Play/Stop** kustom tidak bisa
mengontrol playback internal secara native (batasan keamanan browser).
Implementasi saat ini: **Play** memuat ulang iframe, **Stop**/`Close`
mengosongkan `src` iframe (video benar-benar berhenti). Kontrol
play/pause/seek asli tetap tersedia di dalam frame video itu sendiri.

## 5. Sertifikat

Sertifikat "premium" digambar langsung di browser (HTML canvas) memakai
nama yang **sudah diverifikasi dari sheet Pegawai** (bukan nama isian
bebas), lalu bisa diunduh sebagai PNG atau PDF. Ini memastikan nama pada
sertifikat selalu sesuai database, bukan sekadar input manual peserta.

## 6. Mengganti gambar header ATM

`index.html` memakai ilustrasi SVG orisinal (bukan foto berhak cipta) agar
bisa langsung dipakai tanpa masalah lisensi. Untuk mengganti dengan foto
ATM/CRM milik perusahaan sendiri, cari blok `<div class="atm-wrap">` dan
ganti tag `<svg>...</svg>` dengan `<img src="URL_FOTO_ANDA" ...>`.
