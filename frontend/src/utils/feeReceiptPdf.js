/**
 * feeReceiptPdf.js
 * Beautiful fee receipt — 4.1in × 5.8in each copy
 * Two copies side by side: School Copy (left) | Parent Copy (right)
 * Opens print dialog ΓåÆ Save as PDF
 */

import defaultLogoUrl from '../assets/school_logo.png';

const fmtAmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (d) => d
    ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—';

function toWords(num) {
    const a = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
               'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen',
               'Seventeen','Eighteen','Nineteen'];
    const b = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
    num = Math.round(num);
    if (!num) return 'Zero';
    if (num < 20) return a[num];
    if (num < 100) return b[Math.floor(num/10)] + (num%10 ? ' '+a[num%10] : '');
    if (num < 1000) return a[Math.floor(num/100)]+' Hundred'+(num%100?' '+toWords(num%100):'');
    if (num < 100000) return toWords(Math.floor(num/1000))+' Thousand'+(num%1000?' '+toWords(num%1000):'');
    if (num < 10000000) return toWords(Math.floor(num/100000))+' Lakh'+(num%100000?' '+toWords(num%100000):'');
    return toWords(Math.floor(num/10000000))+' Crore'+(num%10000000?' '+toWords(num%10000000):'');
}

function buildCopy(data, copyLabel) {
    const { student, payments, groupReceiptNo, academicYear, collectedAt,
            schoolName, schoolAddress, schoolPhone, schoolLogo,
            discount: totalDiscount, fine: totalFine } = data;

    const grandTotal = payments.reduce((s, p) => s + p.amountPaid, 0);
    const months = payments.map(p => p.month || 'General').join(', ');

    // Logo: use converted base64, or fall back to the bundled URL directly
    const logoSrc = schoolLogo || defaultLogoUrl;

    // Build fee rows — one per month with sub-rows for components
    let slNo = 1;
    const feeRows = payments.map(p => {
        const components = (p.feeComponents || []).filter(fc =>
            fc.frequency === 'monthly' || !fc.dueMonth || fc.dueMonth === p.month
        );

        const mainRow = `
            <tr class="month-main">
                <td class="tc">${slNo++}</td>
                <td><b>${p.month || 'General'} Fee</b></td>
                <td class="tr">${fmtAmt(p.totalAmount)}</td>
                <td class="tr paid-col">${fmtAmt(p.amountPaid + (p.discount || 0))}</td>
            </tr>`;

        const subRows = components.length > 0 ? components.map(fc => `
            <tr class="month-sub">
                <td></td>
                <td class="sub-desc">Γå│ ${fc.name}</td>
                <td class="tr sub-amt">${fmtAmt(fc.amount)}</td>
                <td></td>
            </tr>`).join('') : '';

        return mainRow + subRows;
    }).join('');

    // Pad to min 5 data rows
    const dataRowCount = payments.length + payments.reduce((s, p) => s + (p.feeComponents?.length || 0), 0);
    const padRows = Array(Math.max(0, 5 - dataRowCount)).fill(
        `<tr class="pad-row"><td>&nbsp;</td><td></td><td></td><td></td></tr>`
    ).join('');

    return `
    <div class="receipt">

        <!-- Decorative top stripe -->
        <div class="top-stripe"></div>

        <!-- Header -->
        <div class="header">
            ${logoSrc ? `<img src="${logoSrc}" class="logo" alt="Logo" />` : ''}
            <div class="school-info">
                <div class="school-name">${schoolName || 'DV Convent School'}</div>
                <div class="school-sub">${schoolAddress || 'Akodha, Rohi, Bhadohi - 221308'}</div>
                <div class="school-sub">≡ƒô₧ ${schoolPhone || '0000000000'}</div>
            </div>
        </div>

        <!-- FEE RECEIPT title -->
        <div class="receipt-title">
            <span class="title-line"></span>
            <span class="title-text">FEE RECEIPT</span>
            <span class="title-line"></span>
        </div>

        <!-- Info grid -->
        <table class="info-grid">
            <tr>
                <td class="lbl">Receipt No</td>
                <td class="val colon">:</td>
                <td class="val"><b>${groupReceiptNo || '—'}</b></td>
                <td class="lbl">Date</td>
                <td class="val colon">:</td>
                <td class="val">${fmtDate(collectedAt)}</td>
            </tr>
            <tr>
                <td class="lbl">Adm No</td>
                <td class="val colon">:</td>
                <td class="val">${student?.admissionNo || student?.UID || '—'}</td>
                <td class="lbl">Session</td>
                <td class="val colon">:</td>
                <td class="val">${academicYear || '—'}</td>
            </tr>
            <tr>
                <td class="lbl">Name</td>
                <td class="val colon">:</td>
                <td class="val" colspan="4"><b>${student?.name || '—'}</b></td>
            </tr>
            <tr>
                <td class="lbl">Class</td>
                <td class="val colon">:</td>
                <td class="val">${student?.class || '—'}</td>
                <td class="lbl">Mode</td>
                <td class="val colon">:</td>
                <td class="val">${payments[0]?.paymentMode || '—'}</td>
            </tr>
            <tr>
                <td class="lbl">Months</td>
                <td class="val colon">:</td>
                <td class="val" colspan="4">${months}</td>
            </tr>
            ${payments[0]?.paidBy ? `
            <tr>
                <td class="lbl">Paid By</td>
                <td class="val colon">:</td>
                <td class="val" colspan="4"><b>${payments[0].paidBy}</b></td>
            </tr>` : ''}
        </table>

        <!-- Fee table -->
        <table class="fee-table">
            <thead>
                <tr>
                    <th style="width:7%">#</th>
                    <th style="width:57%;text-align:left">Description</th>
                    <th style="width:20%;text-align:right">Due</th>
                    <th style="width:16%;text-align:right">Amount</th>
                </tr>
            </thead>
            <tbody>
                ${feeRows}
                ${padRows}
            </tbody>
        </table>

        <!-- Total bar -->
        <div class="total-bar" style="background:linear-gradient(90deg,#1a3a6b,#2563eb);">
            <span>Total Due</span>
            <span class="total-amt">${fmtAmt(grandTotal + (totalDiscount || 0))}</span>
        </div>

        <!-- Discount / Fine rows -->
        ${totalDiscount > 0 ? `
        <div class="disc-row" style="background:#f0fdf4;border:1px solid #bbf7d0;">
            <span style="color:#374151;">Discount</span>
            <span style="color:#166534;font-weight:bold;margin-left:auto;">- ${fmtAmt(totalDiscount)}</span>
        </div>` : ''}
        ${totalFine > 0 ? `
        <div class="disc-row" style="background:#fff5f5;border:1px solid #fecaca;">
            <span style="color:#374151;">Fine</span>
            <span style="color:#991b1b;font-weight:bold;margin-left:auto;">+ ${fmtAmt(totalFine)}</span>
        </div>` : ''}

        <!-- Net paid bar -->
        <div class="total-bar">
            <span>Total Amount Paid</span>
            <span class="total-amt">${fmtAmt(grandTotal)}</span>
        </div>

        <!-- Amount in words -->
        <div class="words-row">
            <span class="words-label">In Words:</span>
            <span class="words-text">${toWords(grandTotal)} Only</span>
        </div>

        <!-- Pay mode -->
        <div class="pay-mode-row">
            <span>Pay Mode: <b>${payments[0]?.paymentMode || 'Cash'}</b></span>
            <span>Date: <b>${fmtDate(collectedAt)}</b></span>
            ${(payments[0]?.transactionId && ['UPI','Online','Google Pay','Phone Pay','Paytm','Bank Transfer'].includes(payments[0]?.paymentMode))
                ? `<span>Txn ID: <b>${payments[0].transactionId}</b></span>`
                : payments[0]?.transactionId
                ? `<span>Ref: <b>${payments[0].transactionId}</b></span>`
                : ''
            }
        </div>

        <!-- Footer -->
        <div class="footer">
            <div class="footer-note">This is a computer generated receipt.</div>
            <div class="sig-area">
                <div class="sig-block">
                    <div class="sig-line"></div>
                    <div class="sig-label">Authorised Signatory</div>
                </div>
                <div class="copy-label">${copyLabel}</div>
            </div>
        </div>

        <!-- Bottom stripe -->
        <div class="bottom-stripe"></div>
    </div>`;
}

export async function downloadFeeReceipt(receiptData) {
    const apiBase = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL)
        ? import.meta.env.VITE_API_URL.replace('/api', '')
        : '';

    // Convert any image src ΓåÆ base64 using canvas (works cross-origin too)
    function imgToBase64(src) {
        return new Promise((resolve) => {
            if (!src) return resolve(null);
            if (src.startsWith('data:')) return resolve(src);
            const url = src.startsWith('http') ? src : `${apiBase}${src}`;
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                try {
                    const c = document.createElement('canvas');
                    c.width = img.naturalWidth;
                    c.height = img.naturalHeight;
                    c.getContext('2d').drawImage(img, 0, 0);
                    resolve(c.toDataURL('image/png'));
                } catch {
                    // canvas tainted — return the URL directly so img tag still works
                    resolve(url);
                }
            };
            img.onerror = () => resolve(null);
            img.src = url;
        });
    }

    // Try settings logo first, then fallback to bundled default
    let logoBase64 = await imgToBase64(receiptData.schoolLogo);
    if (!logoBase64) {
        // defaultLogoUrl is a Vite-bundled URL — use directly, no conversion needed
        logoBase64 = defaultLogoUrl;
    }

    const dataWithLogo = { ...receiptData, schoolLogo: logoBase64 };

    const schoolCopy  = buildCopy(dataWithLogo, 'SCHOOL COPY');
    const parentCopy  = buildCopy(dataWithLogo, 'PARENT COPY');

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Fee Receipt</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }

@page {
    size: A4 portrait;
    margin: 0;
}

body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 9pt;
    background: #fff;
    color: #1a1a2e;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    width: 210mm;
    height: 297mm;
}

/* A4 page — top half only */
.page {
    display: flex;
    flex-direction: row;
    width: 210mm;
    height: 148.5mm;   /* exactly half of A4 */
    border-bottom: 2px dashed #999;
}

/* ── Single receipt copy ── */
.receipt {
    width: 50%;
    height: 148.5mm;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: #fff;
    padding: 4mm 5mm;
}
.receipt:first-child {
    border-right: 1.5px dashed #bbb;
}

/* Decorative stripes */
.top-stripe {
    height: 5px;
    background: linear-gradient(90deg, #0F2044 0%, #1E40AF 50%, #0F2044 100%);
    flex-shrink: 0;
}
.bottom-stripe {
    height: 3px;
    background: linear-gradient(90deg, #0F2044 0%, #1E40AF 50%, #0F2044 100%);
    margin-top: auto;
    flex-shrink: 0;
}

/* Header */
.header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 0 4px;
    border-bottom: 2px solid #0F2044;
    background: linear-gradient(135deg, #f8faff 0%, #eff6ff 100%);
    flex-shrink: 0;
}
.logo {
    width: 55px;
    height: 55px;
    object-fit: contain;
    border-radius: 50%;
    border: 2px solid #1E40AF;
    flex-shrink: 0;
    background: #fff;
}
.school-info { flex: 1; text-align: center; }
.school-name {
    font-size: 11pt;
    font-weight: bold;
    color: #0F2044;
    letter-spacing: 0.3px;
    line-height: 1.2;
}
.school-sub { font-size: 7pt; color: #444; margin-top: 2px; line-height: 1.3; }

/* Receipt title */
.receipt-title {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 2px 0;
    background: #0F2044;
    flex-shrink: 0;
}
.title-line {
    flex: 1;
    height: 1px;
    background: rgba(255,255,255,0.3);
}
.title-text {
    color: #fff;
    font-size: 7pt;
    font-weight: bold;
    letter-spacing: 2px;
    white-space: nowrap;
}

/* Info grid */
.info-grid {
    width: 100%;
    border-collapse: collapse;
    font-size: 7.5pt;
    margin: 2px 0;
}
.info-grid td { padding: 1px 3px; }
.info-grid .lbl { font-weight: bold; color: #0F2044; width: 18%; white-space: nowrap; }
.info-grid .colon { width: 3%; color: #666; }
.info-grid .val { color: #222; }
.info-grid tr { border-bottom: 1px dotted #e0e0e0; }

/* Fee table */
.fee-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 7.5pt;
    margin: 2px 0;
}
.fee-table thead tr {
    background: linear-gradient(90deg, #0F2044, #1E40AF);
    color: #fff;
}
.fee-table th {
    padding: 2px 3px;
    font-size: 7pt;
    font-weight: bold;
    letter-spacing: 0.3px;
}
.fee-table td {
    padding: 2px 3px;
    border-bottom: 1px solid #eee;
}
.fee-table .month-main { background: #f0f4ff; }
.fee-table .month-main td { font-size: 7.5pt; }
.fee-table .month-sub td { font-size: 7pt; color: #555; border-bottom: 1px dotted #eee; }
.fee-table .sub-desc { padding-left: 8px; }
.fee-table .sub-amt { color: #444; }
.fee-table .pad-row td { height: 10px; }
.fee-table .paid-col { color: #0F2044; font-weight: bold; }
.tc { text-align: center; }
.tr { text-align: right; }

/* Total bar */
.total-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 2px 0 0;
    padding: 3px 6px;
    background: linear-gradient(90deg, #0F2044, #1E40AF);
    color: #fff;
    font-size: 7.5pt;
    font-weight: bold;
    border-radius: 2px;
    flex-shrink: 0;
}
.total-amt { font-size: 8.5pt; letter-spacing: 0.5px; }

/* Discount/Fine row */
.disc-row {
    margin: 1px 0;
    padding: 3px 6px;
    border-radius: 2px;
    font-size: 7.5pt;
    display: flex;
    align-items: center;
    flex-shrink: 0;
}

/* Words */
.words-row {
    margin: 2px 0;
    padding: 2px 5px;
    background: #f8faff;
    border: 1px solid #dbeafe;
    border-radius: 2px;
    font-size: 7pt;
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    flex-shrink: 0;
}
.words-label { font-weight: bold; color: #0F2044; white-space: nowrap; }
.words-text { color: #333; font-style: italic; }

/* Pay mode */
.pay-mode-row {
    margin: 2px 0;
    padding: 2px 5px;
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 2px;
    font-size: 7pt;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    color: #166534;
    flex-shrink: 0;
}

/* Footer */
.footer {
    padding: 2px 0;
    margin-top: auto;
    flex-shrink: 0;
}
.sig-area {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-top: 4px;
    padding-top: 3px;
}
.sig-block {
    text-align: center;
}
.sig-line {
    width: 80px;
    height: 1px;
    background: #0F2044;
    margin-bottom: 2px;
}
.sig-label {
    font-size: 6.5pt;
    color: #333;
    font-weight: bold;
}
.copy-label {
    font-weight: bold;
    font-size: 8pt;
    color: #0F2044;
    letter-spacing: 2px;
    text-align: right;
    border-top: 2px solid #0F2044;
    padding-top: 3px;
    min-width: 90px;
}
.footer-note {
    text-align: center;
    font-size: 6pt;
    color: #999;
    font-style: italic;
    margin-top: 3px;
}

@media print {
    body { margin: 0; }
    .page { page-break-after: avoid; }
}
</style>
</head>
<body>
<div class="page">
    ${schoolCopy}
    ${parentCopy}
</div>
<script>
window.onload = function() { setTimeout(function(){ window.print(); }, 400); };
</script>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=1200,height=900');
    if (!win) { alert('Please allow popups to download the receipt.'); return; }
    win.document.write(html);
    win.document.close();
}