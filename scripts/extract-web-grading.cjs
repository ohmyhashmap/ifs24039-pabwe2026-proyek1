#!/usr/bin/env node
/**
 * extract-web-grading.js
 * Ekstrak laporan audit Web Grading dari HTML halaman Delcom.
 *
 * Usage:
 *   node extract-web-grading.js <file.html>
 *
 * Contoh:
 *   node extract-web-grading.js halaman.html
 *
 * Output:
 *   - web-grading-report.txt   (human-readable)
 *   - web-grading-report.json  (machine-readable)
 */

const fs = require('fs');
const path = require('path');

let cheerio;
try {
  cheerio = require('cheerio');
} catch {
  console.error('❌ cheerio belum terinstall. Jalankan:');
  console.error('   npm i cheerio');
  process.exit(1);
}

const inputFile = process.argv[2];
if (!inputFile) {
  console.error('Usage: node extract-web-grading.js <file.html>');
  process.exit(1);
}
if (!fs.existsSync(inputFile)) {
  console.error(`❌ File tidak ditemukan: ${inputFile}`);
  process.exit(1);
}

const html = fs.readFileSync(inputFile, 'utf8');
const $ = cheerio.load(html);

const report = {
  meta: {
    audited_url: null,
    extracted_at: new Date().toISOString(),
    source_file: path.basename(inputFile),
  },
  scores: {},
  lighthouse_metrics: [],
  failed_audits: [],
  axe_violations: [],
  crawled_paths: { public: [], authenticated: [] },
};

// ─────────────────────────────────────────────────────
// 1. META — URL yang diaudit
// ─────────────────────────────────────────────────────
const urlBadge = $('.badge.bg-white.text-success').first().text().trim();
if (urlBadge) {
  report.meta.audited_url = urlBadge.replace(/^Audited URL:\s*/, '').trim();
}

// ─────────────────────────────────────────────────────
// 2. SKOR AKHIR & RAW/PENALTI
// ─────────────────────────────────────────────────────
const finalScoreText = $('.display-5').first().text().trim();
const finalMatch = finalScoreText.match(/(\d+)\s*\/\s*(\d+)/);
if (finalMatch) {
  report.scores.final = parseInt(finalMatch[1], 10);
  report.scores.max = parseInt(finalMatch[2], 10);
}

$('.p-3.border.rounded').each((_, el) => {
  const text = $(el).text();
  if (text.includes('Score Awal (Raw)')) {
    const raw = text.match(/Score Awal \(Raw\):\s*(\d+)/);
    const penalty = text.match(/Penalti Keterlambatan:\s*(-?\d+)/);
    const final = text.match(/Score Akhir:\s*(\d+)/);
    if (raw) report.scores.raw = parseInt(raw[1], 10);
    if (penalty) report.scores.penalty = parseInt(penalty[1], 10);
    if (final) report.scores.final = parseInt(final[1], 10);
  }
});

// ─────────────────────────────────────────────────────
// 3. SKOR KATEGORI (Lighthouse + Axe)
// ─────────────────────────────────────────────────────
$('#summary-tab-pane h3').each((_, el) => {
  const score = parseInt($(el).text().trim(), 10);
  const label = $(el).siblings('small.text-muted').text().trim();
  if (label && !isNaN(score)) {
    const key = label.toLowerCase().replace(/\s+/g, '_');
    report.scores[key] = score;
  }
});

// ─────────────────────────────────────────────────────
// 4. METRIK PERFORMA (FCP, LCP, CLS, dst.)
// ─────────────────────────────────────────────────────
$('.card.border-primary .col-6.col-md-3').each((_, el) => {
  const $el = $(el);
  const metric = $el.find('small.text-muted').first().text().trim();
  const value = $el.find('h4').first().text().trim().replace(/\s+/g, ' ');
  const badge = $el.find('.badge').first();
  const scoreMatch = badge.text().match(/Score:\s*(\d+)/);
  const score = scoreMatch ? parseInt(scoreMatch[1], 10) : null;

  let status = 'unknown';
  if (badge.hasClass('bg-success-subtle')) status = 'good';
  else if (badge.hasClass('bg-warning-subtle')) status = 'warn';
  else if (badge.hasClass('bg-danger-subtle')) status = 'fail';

  if (metric) report.lighthouse_metrics.push({ metric, value, score, status });
});

// ─────────────────────────────────────────────────────
// 5. AUDIT GAGAL (10 item di card-danger)
// ─────────────────────────────────────────────────────
$('.card.border-danger > .card-body > .list-group > .list-group-item').each((_, el) => {
  const $el = $(el);
  const title = $el.find('strong.text-danger').first().text().trim();
  if (!title) return;

  const badge = $el.find('.badge.bg-danger-subtle').first().text().trim().replace(/\s+/g, ' ');
  const description = $el.find('p.text-muted').first().text().trim();

  const items = [];
  $el.find('.list-group-item.bg-light').each((__, itemEl) => {
    const $item = $(itemEl);
    const url = $item.find('a').attr('href');
    const code = $item.find('code').text().trim();
    const label = $item.find('.text-muted.d-block').first().text().trim();
    const wasted = $item.find('.badge').first().text().trim().replace(/\s+/g, ' ');
    const delay = $item.find('.badge.bg-warning-subtle').first().text().trim().replace(/\s+/g, ' ');

    if (url) items.push({ url, wasted: wasted || delay || null });
    else if (code) items.push({ code, label: label || null });
  });

  report.failed_audits.push({ title, badge, description, items });
});

// ─────────────────────────────────────────────────────
// 6. PELANGGARAN AXE
// ─────────────────────────────────────────────────────
$('#axe-tab-pane .accordion-item').each((_, el) => {
  const $el = $(el);
  const severity = $el.find('.badge.text-uppercase').first().text().trim();
  const title = $el.find('.accordion-button strong').first().text().trim();
  const count = $el.find('.badge.bg-secondary-subtle').first().text().trim();
  const description = $el.find('.accordion-body p').first().text().trim();

  const elements = [];
  $el.find('.accordion-body code').each((__, c) => {
    elements.push($(c).text().trim());
  });

  if (title) report.axe_violations.push({ severity, title, count, description, elements });
});

// ─────────────────────────────────────────────────────
// 7. CRAWLED PATHS
// ─────────────────────────────────────────────────────
$('.col-md-6').each((_, el) => {
  const $el = $(el);
  const header = $el.find('h6').text();
  const content = $el.find('.font-monospace').text().trim();
  const paths = content.split(/[\n\r]+/).map(p => p.trim()).filter(Boolean);

  if (header.includes('Public Paths')) {
    report.crawled_paths.public = paths;
  } else if (header.includes('Authenticated Paths')) {
    report.crawled_paths.authenticated = paths;
  }
});

// ─────────────────────────────────────────────────────
// 8. GENERATE TXT
// ─────────────────────────────────────────────────────
const line = '═'.repeat(70);
const dash = '─'.repeat(70);
const out = [];

out.push(line);
out.push('        LAPORAN WEB GRADING — HASIL EKSTRAKSI');
out.push(line);
out.push(`URL          : ${report.meta.audited_url || 'N/A'}`);
out.push(`File Sumber  : ${report.meta.source_file}`);
out.push(`Diekstrak    : ${new Date(report.meta.extracted_at).toLocaleString('id-ID')}`);
out.push('');

out.push(dash);
out.push('  SKOR AKHIR');
out.push(dash);
if (report.scores.raw !== undefined) {
  out.push(`  Skor Raw         : ${report.scores.raw}`);
  out.push(`  Penalti          : ${report.scores.penalty ?? 0}`);
}
out.push(`  SKOR AKHIR       : ${report.scores.final ?? 'N/A'}/${report.scores.max || 100}`);
out.push('');

out.push(dash);
out.push('  SKOR KATEGORI');
out.push(dash);
[
  ['performance', 'Performance'],
  ['accessibility', 'Accessibility'],
  ['best_practices', 'Best Practices'],
  ['seo', 'SEO'],
  ['axe_accessibility', 'Axe Accessibility'],
].forEach(([key, label]) => {
  if (report.scores[key] !== undefined) {
    const s = report.scores[key];
    const icon = s >= 90 ? '✅' : s >= 50 ? '⚠️' : '❌';
    out.push(`  ${icon} ${label.padEnd(22)}: ${s}/100`);
  }
});
out.push('');

if (report.lighthouse_metrics.length) {
  out.push(dash);
  out.push('  METRIK PERFORMA');
  out.push(dash);
  report.lighthouse_metrics.forEach(m => {
    const icon = m.status === 'good' ? '✅' : m.status === 'warn' ? '⚠️' : '❌';
    out.push(`  ${icon} ${m.metric.padEnd(35)}: ${m.value.padEnd(15)} (skor: ${m.score ?? 'N/A'})`);
  });
  out.push('');
}

if (report.failed_audits.length) {
  out.push(dash);
  out.push(`  AUDIT GAGAL (${report.failed_audits.length})`);
  out.push(dash);
  report.failed_audits.forEach((a, i) => {
    out.push(`  ${i + 1}. ${a.title}`);
    if (a.badge) out.push(`     Info   : ${a.badge}`);
    if (a.description) {
      const clean = a.description.replace(/\[.*?\]\(.*?\)/g, '').trim();
      out.push(`     Detail : ${clean.slice(0, 220)}${clean.length > 220 ? '…' : ''}`);
    }
    if (a.items && a.items.length) {
      a.items.forEach(item => {
        if (item.url) {
          out.push(`       • ${item.url}${item.wasted ? `  [${item.wasted}]` : ''}`);
        } else if (item.code) {
          const code = item.code.slice(0, 90).replace(/\s+/g, ' ');
          out.push(`       • \`${code}${item.code.length > 90 ? '…' : ''}\`${item.label ? `  (${item.label})` : ''}`);
        }
      });
    }
    out.push('');
  });
}

if (report.axe_violations.length) {
  out.push(dash);
  out.push(`  PELANGGARAN AXE (${report.axe_violations.length})`);
  out.push(dash);
  report.axe_violations.forEach((v, i) => {
    out.push(`  ${i + 1}. [${v.severity.toUpperCase()}] ${v.title}`);
    if (v.count) out.push(`     Jumlah : ${v.count}`);
    if (v.description) out.push(`     Detail : ${v.description.slice(0, 220)}`);
    if (v.elements.length) {
      out.push(`     Elemen :`);
      v.elements.forEach(code => {
        const c = code.slice(0, 90).replace(/\s+/g, ' ');
        out.push(`       - \`${c}${code.length > 90 ? '…' : ''}\``);
      });
    }
    out.push('');
  });
}

if (report.crawled_paths.public.length || report.crawled_paths.authenticated.length) {
  out.push(dash);
  out.push('  CRAWLED PATHS');
  out.push(dash);
  out.push(`  Public (${report.crawled_paths.public.length}):`);
  report.crawled_paths.public.forEach(p => out.push(`    • ${p}`));
  out.push('');
  out.push(`  Authenticated (${report.crawled_paths.authenticated.length}):`);
  report.crawled_paths.authenticated.forEach(p => out.push(`    • ${p}`));
  out.push('');
}

out.push(line);

// ─────────────────────────────────────────────────────
// 8. GENERATE TXT (SIMPAN KE FOLDER SCRIPT)
// ─────────────────────────────────────────────────────
const txtFile  = path.join(__dirname, 'web-grading-report.txt');
const jsonFile = path.join(__dirname, 'web-grading-report.json');

fs.writeFileSync(txtFile, out.join('\n'), 'utf8');
fs.writeFileSync(jsonFile, JSON.stringify(report, null, 2), 'utf8');

console.log(`✅ ${path.relative(process.cwd(), txtFile)}`);
console.log(`✅ ${path.relative(process.cwd(), jsonFile)}`);
console.log('');
console.log(`📊 Skor Akhir      : ${report.scores.final}/${report.scores.max || 100}`);
console.log(`   Failed audits   : ${report.failed_audits.length}`);
console.log(`   Axe violations  : ${report.axe_violations.length}`);