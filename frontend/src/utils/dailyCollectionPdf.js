/**
 * dailyCollectionPdf.js
 * Daily Fee Collection Report — full A4 portrait
 * Shows all payments for a given date, grouped by source (Admin / Student Portal)
 */

const fmtAmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtTime = (d) => d
    ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
    : '—';
const fmtDateLong = (d) => d
    ? new Date(d).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
    : '—';

function modeTag(mode) {
    const colors = {
        'Cash':          '#166534,#dcfce7',
        'Google Pay':    '#1d4ed8,#dbeafe',
        'PhonePe':       '#6b21a8,#f3e8ff',
        'Bank Transfer': '#0f766e,#ccfbf1',
        'UPI':           '#b45309,#fef3c7',
        'Online':        '#0369a1,#e0f2fe',
    };
    const [fg, bg] = (colors[mode] || '#374151,#f3f4f6').split(',');
    return `<span style="background:${bg};color:${fg};padding:1px 7px;border-radius:20px;font-size:7.5pt;font-weight:bold;white-space:nowrap">${mode}</span>`;
}

function buildRows(entries) {
    if (!entries.length) return `<tr><td colspan="7" style="text-align:center;padding:16px;color:#9ca3af;font-style:italic">No entries</td></tr>`;
    return entries.map((e, i) => `
        <tr style="background:${i % 2 === 0 ? '#fff' : '#f8faff'}">
            <td style="padding:5px 8px;text-align:center;color:#6b7280;font-size:8pt">${i + 1}</td>
            <td style="padding:5px 8px;font-family:monospace;font-size:8pt;color:#6366f1">${e.receiptNo || '—'}</td>
            <td style="padding:5px 8px">
                <div style="font-weight:600;font-size:8.5pt;color:#111827">${e.student?.name || '—'}</div>
                <div style="font-size:7.5pt;color:#6b7280">Class ${e.student?.class || '—'} · ${e.student?.admissionNo || e.student?.UID || ''}</div>
            </td>
            <td style="padding:5px 8px;font-size:8pt;color:#374151">${e.months}</td>
            <td style="padding:5px 8px;text-align:right;font-size:8.5pt;font-weight:700;color:#1d4ed8">${fmtAmt(e.amountPaid)}</td>
            <td style="padding:5px 8px;text-align:center">${modeTag(e.paymentMode)}</td>
            <td style="padding:5px 8px;text-align:center;font-size:7.5pt;color:#6b7280">${fmtTime(e.createdAt)}</td>
        </tr>`).join('');
}

export function downloadDailyCollectionPdf({ date, entries, totalAmount, totalCash, totalOnline, byAdmin, byStudent, byMode, schoolName, schoolAddress, schoolPhone, schoolLogo, academicYear }) {

    const adminEntries   = entries.filter(e => e.collectedByModel === 'Admin');
    const studentEntries = entries.filter(e => e.collectedByModel === 'Student');

    const logoSrc = schoolLogo
        ? (schoolLogo.startsWith('data:') ? schoolLogo : `data:image/png;base64,${schoolLogo}`)
        : '/src/assets/school_logo.png';

    const modeBreakdown = Object.entries(byMode || {})
        .map(([mode, amt]) => `<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px dotted #e5e7eb">
            <span style="font-size:8pt;color:#374151">${mode}</span>
            <span style="font-size:8pt;font-weight:700;color:#111827">${fmtAmt(amt)}</span>
        </div>`).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Daily Collection Report — ${date}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
@page { size: A4 portrait; margin: 12mm 10mm; }
body { font-family: Arial, Helvetica, sans-serif; font-size: 9pt; color: #111827; background:#fff; -webkit-print-color-adjust:exact; print-color-adjust:exact; }

.page { width:100%; }

/* Header */
.header { display:flex; align-items:center; gap:12px; padding-bottom:10px; border-bottom:3px solid #0F2044; margin-bottom:10px; }
.logo { width:56px; height:56px; object-fit:contain; border-radius:50%; border:2px solid #1E40AF; background:#fff; flex-shrink:0; }
.school-name { font-size:16pt; font-weight:bold; color:#0F2044; line-height:1.2; }
.school-sub { font-size:8.5pt; color:#555; margin-top:3px; }

/* Report title bar */
.title-bar { background:linear-gradient(90deg,#0F2044,#1E40AF); color:#fff; padding:7px 14px; border-radius:6px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; }
.title-bar .report-name { font-size:11pt; font-weight:bold; letter-spacing:1px; }
.title-bar .report-meta { font-size:8pt; color:rgba(255,255,255,0.75); text-align:right; }

/* Summary cards row */
.summary-row { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:10px; }
.sum-card { border-radius:8px; padding:8px 10px; }
.sum-card .lbl { font-size:7pt; font-weight:bold; text-transform:uppercase; letter-spacing:0.5px; opacity:0.75; }
.sum-card .val { font-size:13pt; font-weight:900; margin-top:2px; }
.sum-card .sub { font-size:7pt; opacity:0.7; margin-top:1px; }

/* Section header */
.section-hdr { display:flex; align-items:center; gap:8px; margin:10px 0 5px; }
.section-hdr .badge { padding:3px 10px; border-radius:20px; font-size:8pt; font-weight:bold; }
.section-hdr .count { font-size:8pt; color:#6b7280; }

/* Table */
.tbl { width:100%; border-collapse:collapse; font-size:8.5pt; border:1px solid #e5e7eb; border-radius:6px; overflow:hidden; }
.tbl thead tr { background:linear-gradient(90deg,#0F2044,#1E40AF); color:#fff; }
.tbl th { padding:6px 8px; font-size:8pt; font-weight:bold; letter-spacing:0.3px; }
.tbl td { border-bottom:1px solid #f3f4f6; vertical-align:middle; }
.tbl tbody tr:last-child td { border-bottom:none; }

/* Subtotal row */
.subtotal-row td { background:#f0f4ff; font-weight:bold; color:#1d4ed8; padding:5px 8px; font-size:8.5pt; border-top:2px solid #c7d2fe; }

/* Mode breakdown */
.mode-box { border:1px solid #e5e7eb; border-radius:6px; padding:8px 10px; margin-top:10px; }
.mode-box .mode-title { font-size:8pt; font-weight:bold; color:#374151; margin-bottom:5px; text-transform:uppercase; letter-spacing:0.5px; }

/* Grand total */
.grand-total { background:linear-gradient(90deg,#0F2044,#1E40AF); color:#fff; border-radius:8px; padding:10px 14px; margin-top:10px; display:flex; justify-content:space-between; align-items:center; }
.grand-total .gt-label { font-size:9pt; opacity:0.8; }
.grand-total .gt-val { font-size:16pt; font-weight:900; letter-spacing:0.5px; }

/* Footer */
.footer { margin-top:14px; padding-top:8px; border-top:1px solid #e5e7eb; display:flex; justify-content:space-between; align-items:flex-end; }
.footer .note { font-size:7pt; color:#9ca3af; font-style:italic; }
.sig-block { text-align:center; }
.sig-line { width:100px; height:1px; background:#0F2044; margin-bottom:3px; }
.sig-label { font-size:7.5pt; font-weight:bold; color:#374151; }

@media print { body { margin:0; } }
</style>
</head>
<body>
<div class="page">

    <!-- Header -->
    <div class="header">
        <img src="${logoSrc}" class="logo" alt="Logo" onerror="this.style.display='none'" />
        <div>
            <div class="school-name">${schoolName || 'DV Convent School'}</div>
            <div class="school-sub">${schoolAddress || ''} ${schoolPhone ? '· ≡ƒô₧ ' + schoolPhone : ''}</div>
        </div>
    </div>

    <!-- Title bar -->
    <div class="title-bar">
        <div>
            <div class="report-name">DAILY FEE COLLECTION REPORT</div>
            <div style="font-size:9pt;color:rgba(255,255,255,0.85);margin-top:2px">${fmtDateLong(date)}</div>
        </div>
        <div class="report-meta">
            <div>Academic Year: <b>${academicYear || '—'}</b></div>
            <div>Generated: ${new Date().toLocaleString('en-IN')}</div>
        </div>
    </div>

    <!-- Summary cards -->
    <div class="summary-row">
        <div class="sum-card" style="background:#eff6ff;color:#1d4ed8">
            <div class="lbl">Total Collected</div>
            <div class="val">${fmtAmt(totalAmount)}</div>
            <div class="sub">${entries.length} receipt${entries.length !== 1 ? 's' : ''}</div>
        </div>
        <div class="sum-card" style="background:#f0fdf4;color:#166534">
            <div class="lbl">Cash</div>
            <div class="val">${fmtAmt(totalCash)}</div>
            <div class="sub">${entries.filter(e => e.paymentMode === 'Cash').length} payments</div>
        </div>
        <div class="sum-card" style="background:#faf5ff;color:#6b21a8">
            <div class="lbl">Digital / Online</div>
            <div class="val">${fmtAmt(totalOnline)}</div>
            <div class="sub">${entries.filter(e => e.paymentMode !== 'Cash').length} payments</div>
        </div>
        <div class="sum-card" style="background:#fff7ed;color:#c2410c">
            <div class="lbl">Student Portal</div>
            <div class="val">${fmtAmt(byStudent || 0)}</div>
            <div class="sub">${studentEntries.length} self-paid</div>
        </div>
    </div>

    <!-- Admin collected section -->
    ${adminEntries.length > 0 ? `
    <div class="section-hdr">
        <span class="badge" style="background:#dbeafe;color:#1d4ed8">Admin Collected</span>
        <span class="count">${adminEntries.length} receipt${adminEntries.length !== 1 ? 's' : ''} · ${fmtAmt(byAdmin || 0)}</span>
    </div>
    <table class="tbl">
        <thead>
            <tr>
                <th style="width:4%;text-align:center">#</th>
                <th style="width:10%;text-align:left">Receipt</th>
                <th style="width:25%;text-align:left">Student</th>
                <th style="width:22%;text-align:left">Months</th>
                <th style="width:14%;text-align:right">Amount</th>
                <th style="width:14%;text-align:center">Mode</th>
                <th style="width:11%;text-align:center">Time</th>
            </tr>
        </thead>
        <tbody>
            ${buildRows(adminEntries)}
            <tr class="subtotal-row">
                <td colspan="4" style="text-align:right">Admin Subtotal</td>
                <td style="text-align:right">${fmtAmt(byAdmin || 0)}</td>
                <td colspan="2"></td>
            </tr>
        </tbody>
    </table>` : ''}

    <!-- Student portal section -->
    ${studentEntries.length > 0 ? `
    <div class="section-hdr" style="margin-top:12px">
        <span class="badge" style="background:#f3e8ff;color:#6b21a8">Student Portal (Self-Paid)</span>
        <span class="count">${studentEntries.length} receipt${studentEntries.length !== 1 ? 's' : ''} · ${fmtAmt(byStudent || 0)}</span>
    </div>
    <table class="tbl">
        <thead>
            <tr>
                <th style="width:4%;text-align:center">#</th>
                <th style="width:10%;text-align:left">Receipt</th>
                <th style="width:25%;text-align:left">Student</th>
                <th style="width:22%;text-align:left">Months</th>
                <th style="width:14%;text-align:right">Amount</th>
                <th style="width:14%;text-align:center">Mode</th>
                <th style="width:11%;text-align:center">Time</th>
            </tr>
        </thead>
        <tbody>
            ${buildRows(studentEntries)}
            <tr class="subtotal-row">
                <td colspan="4" style="text-align:right">Portal Subtotal</td>
                <td style="text-align:right">${fmtAmt(byStudent || 0)}</td>
                <td colspan="2"></td>
            </tr>
        </tbody>
    </table>` : ''}

    <!-- Mode breakdown + Grand total -->
    <div style="display:grid;grid-template-columns:1fr 2fr;gap:10px;margin-top:10px;align-items:start">
        <div class="mode-box">
            <div class="mode-title">Payment Mode Breakdown</div>
            ${modeBreakdown || '<div style="font-size:8pt;color:#9ca3af;font-style:italic">No data</div>'}
        </div>
        <div class="grand-total">
            <div>
                <div class="gt-label">Grand Total Collected</div>
                <div style="font-size:8pt;color:rgba(255,255,255,0.65);margin-top:2px">${fmtDateLong(date)}</div>
            </div>
            <div class="gt-val">${fmtAmt(totalAmount)}</div>
        </div>
    </div>

    <!-- Footer -->
    <div class="footer">
        <div class="note">This is a computer generated report. · ${new Date().toLocaleString('en-IN')}</div>
        <div class="sig-block">
            <div class="sig-line"></div>
            <div class="sig-label">Authorised Signatory</div>
        </div>
    </div>

</div>
<script>
window.onload = function() { setTimeout(function(){ window.print(); }, 400); };
</script>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=900,height=1100');
    if (!win) { alert('Please allow popups to download the report.'); return; }
    win.document.write(html);
    win.document.close();
}