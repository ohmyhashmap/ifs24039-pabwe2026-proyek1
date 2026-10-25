// save-as: generate-lighthouse-txt.js
const fs = require('fs');

const inputFile = 'sigapasap-lighthouse.json';
const outputFile = 'sigapasap-lighthouse-report.txt';

const raw = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
const lhr = raw.lhr || raw; // Lighthouse CLI wraps results in a `lhr` object

const line = '═'.repeat(68);
const dash = '─'.repeat(68);
const out = [];

out.push(line);
out.push('        LAPORAN LIGHTHOUSE — TEKS');
out.push(line);
out.push(`URL      : ${lhr.finalUrl || lhr.finalDisplayedUrl}`);
out.push(`Waktu    : ${new Date(lhr.fetchTime).toLocaleString('id-ID')}`);
out.push(`Versi LH : ${lhr.lighthouseVersion}`);
out.push(`Device   : ${lhr.configSettings?.emulatedFormFactor || 'desktop/mobile (sesuai preset)'}`);
out.push('');

// ── SKOR KATEGORI ──
out.push(dash);
out.push('  1. SKOR KATEGORI');
out.push(dash);

const categoryLabels = {
  performance: 'Performance',
  accessibility: 'Accessibility',
  'best-practices': 'Best Practices',
  seo: 'SEO',
  pwa: 'PWA',
};

for (const [key, cat] of Object.entries(lhr.categories)) {
  const score = Math.round((cat.score || 0) * 100);
  const label = categoryLabels[key] || cat.title;
  const icon = score >= 90 ? '✅' : score >= 50 ? '⚠️' : '🚨';
  out.push(`  ${icon} ${label.padEnd(22)}: ${score}/100`);
}
out.push('');

// ── METRIK PERFORMANCE UTAMA ──
const metricIds = [
  'first-contentful-paint',
  'largest-contentful-paint',
  'total-blocking-time',
  'cumulative-layout-shift',
  'speed-index',
  'interactive',
];

out.push(dash);
out.push('  2. METRIK PERFORMANCE UTAMA');
out.push(dash);

for (const id of metricIds) {
  const a = lhr.audits[id];
  if (!a) continue;
  const score = a.score !== null ? Math.round(a.score * 100) : null;
  const icon = score === 100 ? '✅' : score >= 50 ? '⚠️' : '🚨';
  const val = a.displayValue || '-';
  out.push(`  ${icon} ${a.title.padEnd(32)}: ${val.padEnd(12)} (skor: ${score ?? 'N/A'})`);
}
out.push('');

// ── AUDIT GAGAL / PERLU PERHATIAN ──
out.push(dash);
out.push('  3. AUDIT YANG PERLU PERHATIAN (skor < 100)');
out.push(dash);

let failed = 0;
const skipModes = new Set(['notApplicable', 'informative', 'manual']);

for (const [id, audit] of Object.entries(lhr.audits)) {
  if (audit.score === null || audit.score === 1) continue;
  if (skipModes.has(audit.scoreDisplayMode)) continue;

  failed++;
  const icon = audit.score === 0 ? '❌' : '⚠️';
  out.push(`  ${icon} ${audit.title}`);
  if (audit.displayValue) out.push(`     Nilai  : ${audit.displayValue}`);
  if (audit.description) {
    const clean = audit.description.replace(/\[.*?\]\(.*?\)/g, '').replace(/\n/g, ' ').trim();
    out.push(`     Saran  : ${clean.slice(0, 180)}${clean.length > 180 ? '…' : ''}`);
  }
  out.push('');
}

if (failed === 0) out.push('  ✅ Tidak ada audit yang gagal.');
out.push('');

// ── RINGKASAN ──
out.push(line);
out.push('  RINGKASAN');
out.push(line);
out.push(`Audit perlu perhatian : ${failed}`);
out.push(`Performance           : ${Math.round((lhr.categories.performance?.score || 0) * 100)}/100`);
out.push(`Accessibility         : ${Math.round((lhr.categories.accessibility?.score || 0) * 100)}/100`);
out.push(`Best Practices        : ${Math.round((lhr.categories['best-practices']?.score || 0) * 100)}/100`);
out.push(`SEO                   : ${Math.round((lhr.categories.seo?.score || 0) * 100)}/100`);
out.push(line);

fs.writeFileSync(outputFile, out.join('\n'), 'utf8');
console.log(`✅ Laporan teks disimpan: ${outputFile}`);