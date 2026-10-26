const fs = require('fs');
const report = JSON.parse(fs.readFileSync('lighthouse-report.json', 'utf8'));
const lhr = report.lhr || report; // Lighthouse v3+ membungkus hasil dalam properti 'lhr'

const line = '═'.repeat(64);
const dash = '─'.repeat(64);
const out = [];

out.push(line);
out.push('        LAPORAN LIGHTHOUSE (TEKS)');
out.push(line);
out.push(`URL      : ${lhr.finalUrl}`);
out.push(`Waktu    : ${new Date(lhr.fetchTime).toLocaleString('id-ID')}`);
out.push(`Versi LH : ${lhr.lighthouseVersion}`);
out.push('');

// ── SKOR KATEGORI ──
out.push(dash);
out.push('  SKOR KATEGORI');
out.push(dash);
const categoryNames = {
	performance: 'Performance',
	accessibility: 'Accessibility',
	'best-practices': 'Best Practices',
	seo: 'SEO',
	pwa: 'PWA'
};
for (const [key, cat] of Object.entries(lhr.categories)) {
	const score = Math.round((cat.score || 0) * 100);
	const label = categoryNames[key] || cat.title;
	const icon = score >= 90 ? '✅' : score >= 50 ? '⚠️' : '🚨';
	out.push(`  ${icon} ${label.padEnd(20)}: ${score}/100`);
}
out.push('');

// ── METRIK PERFORMANCE UTAMA ──
const perfAudits = lhr.categories.performance?.auditRefs || [];
const metricIds = [
	'largest-contentful-paint',
	'first-contentful-paint',
	'cumulative-layout-shift',
	'total-blocking-time',
	'speed-index'
];
out.push(dash);
out.push('  METRIK PERFORMANCE UTAMA');
out.push(dash);
for (const id of metricIds) {
	const a = lhr.audits[id];
	if (!a) continue;
	const score = a.score !== null ? Math.round(a.score * 100) : 'N/A';
	const icon = a.score === 1 ? '✅' : a.score >= 0.5 ? '⚠️' : '🚨';
	out.push(`  ${icon} ${a.title.padEnd(28)}: ${a.displayValue || '-'} (skor: ${score})`);
}
out.push('');

// ── AUDIT YANG GAGAL (SKOR < 1) ──
out.push(dash);
out.push('  AUDIT YANG PERLU PERHATIAN (SKOR < 1)');
out.push(dash);
let failedCount = 0;
for (const [id, audit] of Object.entries(lhr.audits)) {
	if (
		audit.score !== null &&
		audit.score < 1 &&
		audit.scoreDisplayMode !== 'notApplicable' &&
		audit.scoreDisplayMode !== 'informative'
	) {
		failedCount++;
		const icon = audit.score === 0 ? '❌' : '⚠️';
		out.push(`  ${icon} ${audit.title}`);
		if (audit.displayValue) out.push(`     Nilai : ${audit.displayValue}`);
		if (audit.description)
			out.push(`     Saran : ${audit.description.replace(/\[.*?\]\(.*?\)/g, '').slice(0, 150)}...`);
		out.push('');
	}
}
if (failedCount === 0) out.push('  ✅ Tidak ada audit yang gagal.');
out.push('');

// ── RINGKASAN ──
out.push(line);
out.push('  RINGKASAN');
out.push(line);
out.push(`Total audit gagal/perlu perhatian : ${failedCount}`);
out.push(line);

// Simpan ke file
fs.writeFileSync('lighthouse-report.txt', out.join('\n'));
console.log(`✅ Laporan teks disimpan: lighthouse-report.txt`);
