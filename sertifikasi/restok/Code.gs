/**
 * =====================================================================
 *  POST TEST - SERTIFIKASI CUSTODY  (BACKEND API)
 *  PT Swadharma Sarana Informatika
 * =====================================================================
 *  File ini HANYA backend (API JSON). Frontend (index.html) di-hosting
 *  TERPISAH di Vercel dan memanggil backend ini lewat fetch().
 *
 *  CARA DEPLOY:
 *  1. Buka spreadsheet soal:
 *     https://docs.google.com/spreadsheets/d/13Oj_-ibbJJXu2Ia2Xmpt0a-AY-mSBkLanwJmT8kUvSI/edit
 *  2. Pastikan ada sheet "Soal": A=No, B=Soal, C-F=Pilihan A-D,
 *     G=Jawaban benar (A/B/C/D). Baris 1 header, baris 2-26 = 25 soal.
 *  3. Extensions > Apps Script pada spreadsheet tsb.
 *  4. Buat file "Code.gs", tempel isi file ini (file index.html versi
 *     lama TIDAK dipakai lagi di sini, boleh dihapus dari project).
 *  5. Deploy > New deployment > pilih tipe "Web app".
 *       - Execute as     : Me
 *       - Who has access : Anyone
 *  6. Klik Deploy, salin URL yang berakhiran ".../exec"
 *     Itulah APPS_SCRIPT_URL yang harus dimasukkan ke index.html
 *     (lihat konstanta CONFIG.APPS_SCRIPT_URL di file index.html).
 *  7. Setiap kali Anda mengubah kode ini, buat "New deployment" lagi
 *     (atau "Manage deployments > Edit > New version") supaya
 *     perubahan ikut ter-publish ke URL /exec.
 * =====================================================================
 */

const SOAL_SHEET_NAME  = 'Soal';
const HASIL_SHEET_NAME = 'Hasil';
const TEMA_SERTIFIKASI = 'Sertifikasi Custody PT Swadharma Sarana Informatika';
const PASSING_GRADE    = 70;
const JUMLAH_SOAL      = 25;

/**
 * Menangani request GET, dipakai untuk action=getQuestions.
 * Contoh: https://script.google.com/macros/s/XXXX/exec?action=getQuestions
 */
function doGet(e) {
  try {
    const action = e.parameter.action;

    if (action === 'getQuestions') {
      return jsonOutput_({ ok: true, data: getQuestions_() });
    }

    return jsonOutput_({
      ok: true,
      message: 'Backend Post Test Sertifikasi Custody aktif. Gunakan ?action=getQuestions atau POST action=submitTest.'
    });
  } catch (err) {
    return jsonOutput_({ ok: false, error: err.message });
  }
}

/**
 * Menangani request POST, dipakai untuk action=submitTest.
 * Body dikirim sebagai application/x-www-form-urlencoded:
 *   action=submitTest&payload=<JSON string>
 * (sengaja pakai form-encoded, BUKAN application/json, supaya browser
 *  tidak melakukan CORS preflight OPTIONS - Apps Script tidak melayani
 *  OPTIONS secara default).
 */
function doPost(e) {
  try {
    const action = e.parameter.action;

    if (action === 'submitTest') {
      const payload = JSON.parse(e.parameter.payload);
      const result = submitTest_(payload);
      return jsonOutput_({ ok: true, data: result });
    }

    return jsonOutput_({ ok: false, error: 'Unknown action: ' + action });
  } catch (err) {
    return jsonOutput_({ ok: false, error: err.message });
  }
}

function jsonOutput_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Mengambil soal dari sheet "Soal". Kolom jawaban (G) TIDAK ikut
 * dikirim ke client, supaya jawaban tidak bisa dilihat lewat
 * DevTools / Network tab.
 */
function getQuestions_() {
  const sheet = getSheet_(SOAL_SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  const questions = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[1]) continue;
    questions.push({
      index: questions.length,
      soal: row[1],
      pilihan: {
        A: row[2],
        B: row[3],
        C: row[4],
        D: row[5]
      }
    });
    if (questions.length >= JUMLAH_SOAL) break;
  }
  return questions;
}

/**
 * payload = {
 *   nama, npp, region, kantor,
 *   jawaban: { "0": "A", "1": "C", ... }
 * }
 */
function submitTest_(payload) {
  const sheet = getSheet_(SOAL_SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  let benar = 0;
  let total = 0;
  let idx = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[1]) continue;
    if (idx >= JUMLAH_SOAL) break;

    total++;
    const jawabanBenar = String(row[6] || '').trim().toUpperCase();
    const jawabanUser  = String((payload.jawaban && payload.jawaban[idx]) || '').trim().toUpperCase();
    if (jawabanBenar !== '' && jawabanUser === jawabanBenar) {
      benar++;
    }
    idx++;
  }

  const nilai = total > 0 ? Math.round((benar / total) * 100) : 0;
  const lulus = nilai >= PASSING_GRADE;
  const tanggal = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'GMT+7', 'dd MMMM yyyy');

  logHasil_(payload, nilai, benar, total, lulus);

  return {
    nilai: nilai,
    benar: benar,
    total: total,
    lulus: lulus,
    passingGrade: PASSING_GRADE,
    tema: TEMA_SERTIFIKASI,
    nama: payload.nama,
    npp: payload.npp,
    region: payload.region,
    kantor: payload.kantor,
    tanggal: tanggal
  };
}

function logHasil_(payload, nilai, benar, total, lulus) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(HASIL_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(HASIL_SHEET_NAME);
    sheet.appendRow(['Timestamp', 'Nama Pegawai', 'NPP', 'Region', 'Kantor', 'Benar', 'Total Soal', 'Nilai', 'Status']);
    sheet.getRange(1, 1, 1, 9).setFontWeight('bold');
  }
  sheet.appendRow([
    new Date(), payload.nama, payload.npp, payload.region, payload.kantor,
    benar, total, nilai, lulus ? 'LULUS' : 'TIDAK LULUS'
  ]);
}

function getSheet_(name) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) {
    throw new Error('Sheet "' + name + '" tidak ditemukan. Pastikan nama sheet soal Anda adalah "' + name + '".');
  }
  return sheet;
}
