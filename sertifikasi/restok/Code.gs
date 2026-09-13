/**
 * ============================================================
 *  BACKEND POST-TEST SERTIFIKASI CUSTODY — Google Apps Script
 * ============================================================
 *
 *  Cara pakai singkat:
 *  1. Buat Google Spreadsheet baru dengan 3 sheet (nama harus PERSIS):
 *
 *     Sheet "Soal"    -> kolom: ID | Soal | OpsiA | OpsiB | OpsiC | OpsiD | Kunci
 *     Sheet "Pegawai" -> kolom: NPP | Nama | Region | Kantor
 *     Sheet "Hasil"   -> kolom: Timestamp | NPP | Nama | Region | Kantor | Skor | Status
 *       (baris pertama = header, akan terisi otomatis oleh skrip ini)
 *
 *  2. Buka Extensions > Apps Script pada spreadsheet tsb, tempel isi
 *     file ini sebagai Code.gs.
 *
 *  3. Deploy > New deployment > Web app
 *       - Execute as: Me
 *       - Who has access: Anyone
 *     Salin URL "…/exec" yang dihasilkan, isi ke GAS_URL_PROD pada
 *     posttest.html.
 *
 *  4. TENTANG CORS ("anti-CORS pattern"):
 *     Skrip ini HANYA merespons doGet (bukan doPost dengan header
 *     custom). Semua data dikirim lewat query string dan dibaca via
 *     fetch() metode GET dari sisi frontend. Karena ini adalah
 *     "simple request" tanpa header non-standar, browser TIDAK
 *     mengirim preflight OPTIONS — dan Apps Script memang tidak
 *     menyediakan doOptions bawaan, sehingga pola GET ini adalah
 *     cara paling aman untuk menghindari error CORS pada Web App GAS.
 * ============================================================
 */

const SHEET_SOAL = 'Soal';
const SHEET_PEGAWAI = 'Pegawai';
const SHEET_HASIL = 'Hasil';
const PASS_SCORE = 70;

function doGet(e) {
  const action = e.parameter.action;
  let result;

  try {
    if (action === 'getSoal') {
      result = getSoal();
    } else if (action === 'verifyPegawai') {
      result = verifyPegawai(e.parameter.npp);
    } else if (action === 'submitTest') {
      result = submitTest(JSON.parse(e.parameter.data));
    } else {
      result = { error: 'Aksi tidak dikenal: ' + action };
    }
  } catch (err) {
    result = { error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Ambil semua soal TANPA kolom kunci jawaban (agar tidak bocor ke client) */
function getSoal() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_SOAL);
  const rows = sh.getDataRange().getValues();
  const header = rows.shift(); // ID | Soal | OpsiA | OpsiB | OpsiC | OpsiD | Kunci

  const soal = rows
    .filter(r => r[0] !== '' && r[0] !== null)
    .map(r => ({
      id: r[0],
      soal: r[1],
      opsi_a: r[2],
      opsi_b: r[3],
      opsi_c: r[4],
      opsi_d: r[5]
      // r[6] (Kunci) sengaja TIDAK dikirim ke client
    }));

  return { soal };
}

/** Cek NPP terdaftar di sheet Pegawai, kembalikan nama resmi dari database */
function verifyPegawai(npp) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_PEGAWAI);
  const rows = sh.getDataRange().getValues();
  rows.shift(); // header

  const match = rows.find(r => String(r[0]).trim() === String(npp).trim());
  if (!match) {
    return { found: false };
  }
  return {
    found: true,
    nama: match[1],
    region: match[2],
    kantor: match[3]
  };
}

/** Hitung skor di server (bukan di client) lalu simpan hasil ke sheet Hasil */
function submitTest(payload) {
  const { npp, nama, region, kantor, jawaban } = payload;

  const shSoal = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_SOAL);
  const rows = shSoal.getDataRange().getValues();
  rows.shift(); // header

  let benar = 0;
  let total = 0;

  rows.forEach(r => {
    const id = r[0];
    if (id === '' || id === null) return;
    total++;
    const kunci = String(r[6]).trim().toLowerCase();
    const dijawab = jawaban[id] ? String(jawaban[id]).trim().toLowerCase() : '';
    if (dijawab === kunci) benar++;
  });

  const skor = total > 0 ? Math.round((benar / total) * 100) : 0;
  const status = skor >= PASS_SCORE ? 'LULUS' : 'TIDAK LULUS';

  // simpan ke sheet Hasil (anti-duplikasi sederhana tidak wajib, tapi bisa
  // ditambahkan pengecekan NPP + hari yang sama bila diperlukan)
  const shHasil = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_HASIL);
  if (shHasil.getLastRow() === 0) {
    shHasil.appendRow(['Timestamp', 'NPP', 'Nama', 'Region', 'Kantor', 'Skor', 'Status']);
  }
  shHasil.appendRow([new Date(), npp, nama, region, kantor, skor, status]);

  return { nama, skor, status };
}
