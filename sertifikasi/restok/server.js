/**
 * Mock server lokal untuk menguji posttest.html SEBELUM deploy ke
 * Google Apps Script. Meniru kontrak API yang sama persis dengan
 * gas/Code.gs (action=getSoal | verifyPegawai | submitTest), sehingga
 * frontend tidak perlu diubah saat nanti diarahkan ke URL GAS asli.
 *
 * Jalankan:
 *   node server.js
 * lalu buka posttest.html langsung di browser (pastikan konstanta
 * USE_LOCAL = true dan GAS_URL_LOCAL = "http://localhost:8080").
 *
 * Tidak butuh dependency apapun (hanya modul bawaan Node.js).
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8080;
const PASS_SCORE = 70;

const soal = JSON.parse(fs.readFileSync(path.join(__dirname, 'soal.json'), 'utf8'));
const pegawai = JSON.parse(fs.readFileSync(path.join(__dirname, 'pegawai.json'), 'utf8'));
const hasilFile = path.join(__dirname, 'hasil.json');
if (!fs.existsSync(hasilFile)) fs.writeFileSync(hasilFile, '[]');

function sendJson(res, obj) {
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(obj));
}

function getSoal() {
  // sembunyikan kunci jawaban, sama seperti Code.gs
  const publicSoal = soal.map(({ kunci, ...rest }) => rest);
  return { soal: publicSoal };
}

function verifyPegawai(npp) {
  const match = pegawai.find(p => String(p.npp).trim() === String(npp).trim());
  if (!match) return { found: false };
  return { found: true, nama: match.nama, region: match.region, kantor: match.kantor };
}

function submitTest(payload) {
  const { npp, nama, region, kantor, jawaban } = payload;
  let benar = 0;
  soal.forEach(q => {
    const dijawab = jawaban[q.id] ? String(jawaban[q.id]).toLowerCase() : '';
    if (dijawab === String(q.kunci).toLowerCase()) benar++;
  });
  const skor = Math.round((benar / soal.length) * 100);
  const status = skor >= PASS_SCORE ? 'LULUS' : 'TIDAK LULUS';

  const semuaHasil = JSON.parse(fs.readFileSync(hasilFile, 'utf8'));
  semuaHasil.push({ timestamp: new Date().toISOString(), npp, nama, region, kantor, skor, status });
  fs.writeFileSync(hasilFile, JSON.stringify(semuaHasil, null, 2));

  return { nama, skor, status };
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  const parsed = url.parse(req.url, true);
  const action = parsed.query.action;

  try {
    if (action === 'getSoal') return sendJson(res, getSoal());
    if (action === 'verifyPegawai') return sendJson(res, verifyPegawai(parsed.query.npp));
    if (action === 'submitTest') return sendJson(res, submitTest(JSON.parse(parsed.query.data)));
    return sendJson(res, { error: 'Aksi tidak dikenal: ' + action });
  } catch (err) {
    return sendJson(res, { error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`Mock GAS server jalan di http://localhost:${PORT}`);
  console.log('Endpoint tersedia: ?action=getSoal | ?action=verifyPegawai&npp=... | ?action=submitTest&data=...');
});
