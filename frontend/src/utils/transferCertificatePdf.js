/**
 * transferCertificatePdf.js
 * Premium Transfer Certificate — A4 portrait, single page
 * Matches the school's official TC format used across Indian schools
 */

const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

const fmtDateShort = (d) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

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
    return toWords(Math.floor(num/1000))+' Thousand'+(num%1000?' '+toWords(num%1000):'');
}

function getClassInWords(cls) {
    const map = {
        'Nursery': 'Nursery', 'LKG': 'Lower Kindergarten (LKG)',
        'UKG': 'Upper Kindergarten (UKG)',
        '1':'First','2':'Second','3':'Third','4':'Fourth','5':'Fifth',
        '6':'Sixth','7':'Seventh','8':'Eighth','9':'Ninth','10':'Tenth',
        '11':'Eleventh','12':'Twelfth'
    };
    return map[cls] || cls;
}

export function printTransferCertificate(data) {
    const {
        student, tcNumber, bookNo, srNo, issueDate, reason = 'Parent\'s Request',
        admissionDate, admissionClass, leavingDate, applicationDate, remark,
        religion, caste,
        isDuplicate: forceDuplicate,
        schoolName, schoolAddress, schoolPhone, schoolEmail,
        schoolAffiliation, schoolLogo, stateBoardLogo, academicYear,
        principalName = '', stampImageBase64 = '', principalSign = ''
    } = data;

    const logoSrc = schoolLogo
        ? (schoolLogo.startsWith('data:') ? schoolLogo : `data:image/png;base64,${schoolLogo}`)
        : '/src/assets/school_logo.png';

    // State board logo — use provided or local stateboard asset
    const stateLogo = stateBoardLogo
        ? (stateBoardLogo.startsWith('data:') ? stateBoardLogo : `data:image/png;base64,${stateBoardLogo}`)
        : '/src/assets/stateboard.png';

    const dob = student?.dateOfBirth ? new Date(student.dateOfBirth) : null;
    const dobWords = dob
        ? `${toWords(dob.getDate())} ${dob.toLocaleString('en-IN',{month:'long'})} ${toWords(dob.getFullYear())}`
        : '—';

    const admDateDisplay  = admissionDate ? fmtDate(admissionDate) : (student?.admissionDate ? fmtDate(student.admissionDate) : '—');
    const leavingDateDisplay = leavingDate ? fmtDate(leavingDate) : '—';
    const tcDate = issueDate ? fmtDate(issueDate) : fmtDate(new Date());

    const isDuplicate = forceDuplicate === true;

    const admClass = admissionClass || student?.class || '—';

    const rows = [
        ['1',  'Admission Number',                                    student?.UID || student?.admissionNo || '—'],
        ['2',  'Name of Student',                                     `<b style="font-size:11pt">${student?.name || '—'}</b>`],
        ['3',  "Father's Name",                                       student?.fatherName || '—'],
        ['4',  "Mother's Name",                                       student?.motherName || '—'],
        ['5',  'Address',                                             student?.address ? `${student.address}${student.pincode ? ', ' + student.pincode : ''}` : '—'],
        ['6',  'Date of Birth (in figures)',                          fmtDateShort(student?.dateOfBirth)],
        ['7',  'Date of Birth (in words)',                            dobWords],
        ['8',  'Nationality',                                         'Indian'],
        ['9',  'Religion',                                            data.religion || '—'],
        ['10', 'Caste / Category',                                    `${data.caste || '—'} (${student?.category || '—'})`],
        ['11', 'Aadhar Number',                                       student?.aadharNumber || '—'],
        ['12', 'PEN Number',                                          student?.penNumber || '—'],
        ['13', 'Date of Admission',                                   admDateDisplay],
        ['14', 'Class at the time of Admission',                      `Class ${admClass} (${getClassInWords(admClass)})`],
        ['15', 'Class at the time of Leaving',                        `Class ${student?.class || '—'} (${getClassInWords(student?.class)})`],
        ['16', 'Date of Leaving',                                     leavingDateDisplay],
        ['17', 'Academic Session',                                    academicYear || '—'],
        ['18', 'Whether failed (if so, mention the class)',           'No'],
        ['19', 'Subject Studied',                                     'As per school curriculum'],
        ['20', 'Whether qualified for promotion to next class',       'Yes'],
        ['21', 'Any dues outstanding against the student',            'None'],
        ['22', 'Reason for leaving',                                  reason],
        ['23', 'Date of application for TC',                          applicationDate ? fmtDate(applicationDate) : tcDate],
        ['24', 'Date of issue of TC',                                 tcDate],
        ['25', 'Conduct &amp; Character',                             'Good'],
        ['26', 'Remarks',                                             remark || '—'],
    ];

    const tableRows = rows.map(([no, label, val]) => `
        <tr>
            <td class="sl">${no}.</td>
            <td class="label">${label}</td>
            <td class="colon">:</td>
            <td class="value">${val}</td>
        </tr>`).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Transfer Certificate — ${student?.name || ''}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }

@page {
    size: A4 portrait;
    margin: 0;
}

body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 10pt;
    background: #fff;
    color: #111;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    min-height: 100vh;
    margin: 0;
    padding: 0;
}

.page {
    width: 210mm;
    min-height: 297mm;
    max-height: 297mm;
    padding: 8mm 13mm 8mm;
    position: relative;
    background: #fff;
    margin: 0 auto;
    overflow: hidden;
}

/* ── Outer border frame ── */
.outer-border {
    position: absolute;
    inset: 6mm;
    border: 3px double #1a3a6b;
    pointer-events: none;
    z-index: 0;
}
.inner-border {
    position: absolute;
    inset: 8.5mm;
    border: 1px solid #1a3a6b;
    pointer-events: none;
    z-index: 0;
}

.content {
    position: relative;
    z-index: 1;
    padding: 5mm 7mm;
    display: flex;
    flex-direction: column;
    height: calc(297mm - 16mm);
}

/* ── Watermark ── */
.watermark {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-30deg);
    font-size: 72pt;
    font-weight: bold;
    color: rgba(26,58,107,0.04);
    white-space: nowrap;
    pointer-events: none;
    z-index: 0;
    letter-spacing: 4px;
    font-family: Arial, sans-serif;
}

/* ── Top info bar ── */
.top-bar {
    display: flex;
    justify-content: space-between;
    font-size: 8.5pt;
    font-weight: bold;
    color: #1a3a6b;
    margin-bottom: 4px;
    padding: 0 2px;
}

/* ── Header ── */
.header {
    position: relative;
    padding-bottom: 5px;
    border-bottom: 2.5px solid #1a3a6b;
    margin-bottom: 3px;
    text-align: center;
}
.logo {
    position: absolute;
    left: 0;
    top: 0;
    transform: none;
    width: 92px;
    height: 92px;
    object-fit: contain;
    border-radius: 50%;
    border: 3px solid #1a3a6b;
    background: #fff;
    box-shadow: 0 2px 8px rgba(26,58,107,0.2);
}
.school-block { text-align: center; }
.school-name {
    font-size: 22pt;
    font-weight: bold;
    color: #1a3a6b;
    letter-spacing: 0.5px;
    line-height: 1.2;
    font-family: 'Times New Roman', serif;
}
.school-tagline {
    font-size: 10pt;
    color: #555;
    font-style: italic;
    font-weight: bold;
    margin-top: 3px;
}
.school-meta {
    font-size: 10pt;
    color: #333;
    font-weight: bold;
    margin-top: 3px;
    line-height: 1.6;
}
.affil-row {
    margin-top: 3px;
}
.affil-badge {
    display: inline-block;
    background: #1a3a6b;
    color: #fff;
    font-size: 7.5pt;
    padding: 1px 10px;
    border-radius: 20px;
    letter-spacing: 0.5px;
}
.affil-secondary {
    background: #2d6a4f;
}

/* ── TC Title ── */
.tc-title-wrap {
    text-align: center;
    margin: 4px 0 4px;
}
.tc-title {
    display: inline-block;
    font-size: 12pt;
    font-weight: bold;
    color: #1a3a6b;
    letter-spacing: 4px;
    text-transform: uppercase;
    border-bottom: 2px solid #1a3a6b;
    padding-bottom: 1px;
}
.tc-subtitle {
    font-size: 7.5pt;
    color: #666;
    margin-top: 2px;
    font-style: italic;
}

/* ── TC Meta row ── */
.tc-meta {
    display: flex;
    justify-content: space-between;
    font-size: 8.5pt;
    margin-bottom: 5px;
    padding: 4px 12px;
    background: #f0f4ff;
    border: 1px solid #c7d7f5;
    border-radius: 3px;
    gap: 20px;
}
.tc-meta span { font-weight: bold; color: #1a3a6b; }

/* ── Duplicate stamp ── */
.duplicate-stamp {
    display: inline-block;
    border: 2px solid #dc2626;
    color: #dc2626;
    font-size: 9pt;
    font-weight: bold;
    padding: 1px 10px;
    letter-spacing: 3px;
    border-radius: 2px;
    margin-left: 8px;
    vertical-align: middle;
}

/* ── Main table ── */
.tc-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9pt;
    margin-bottom: 5px;
}
.tc-table tr {
    border-bottom: 1px solid #dde4f0;
}
.tc-table tr:nth-child(even) {
    background: #f7f9ff;
}
.tc-table td {
    padding: 3.8px 5px;
    vertical-align: top;
    line-height: 1.42;
}
.tc-table .sl {
    width: 5%;
    color: #888;
    font-size: 8.5pt;
    text-align: right;
    padding-right: 6px;
}
.tc-table .label {
    width: 42%;
    font-weight: 600;
    color: #1a3a6b;
}
.tc-table .colon {
    width: 2%;
    color: #888;
    text-align: center;
}
.tc-table .value {
    width: 51%;
    color: #111;
}

/* ── Declaration ── */
.declaration {
    font-size: 8pt;
    color: #333;
    line-height: 1.6;
    padding: 5px 8px;
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-radius: 3px;
    margin-bottom: 0;
    font-style: italic;
    margin-top: auto;
}

/* ── Signature row ── */
.sig-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-top: 8px;
    padding-top: 4px;
}
.sig-block { text-align: center; }
.sig-line {
    width: 110px;
    min-height: 40px;
    border-bottom: 1px solid #1a3a6b;
    margin: 0 auto 3px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
}
.sig-label {
    font-size: 8pt;
    font-weight: bold;
    color: #1a3a6b;
}
.sig-sub {
    font-size: 7.5pt;
    color: #666;
    margin-top: 1px;
}

/* ── Stamp area ── */
.stamp-area {
    width: 72px;
    height: 72px;
    border: 1px dashed rgba(0,0,0,0.08);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 7pt;
    color: rgba(0,0,0,0.08);
    text-align: center;
    overflow: hidden;
}
.stamp-area img { width: 100%; height: 100%; object-fit: contain; }

/* ── Footer ── */
.tc-footer {
    text-align: center;
    font-size: 7.5pt;
    color: #999;
    font-style: italic;
    margin-top: 8px;
    padding-top: 6px;
    border-top: 1px dashed #ddd;
}

@media print {
    body { margin: 0; padding: 0; display: block; }
    .page { margin: 0 auto; page-break-after: avoid; }
}
</style>
</head>
<body>
<div class="page">
    <div class="outer-border"></div>
    <div class="inner-border"></div>
    <div class="watermark">${schoolName || 'SCHOOL'}</div>

    <div class="content">

        <!-- Top bar: Sr No (left) | Affiliation No (right) -->
        <div class="top-bar">
            <div>Sr. No: ${srNo || '—'}</div>
            <div>Affiliation No: ${data.affiliationNumber || '51380'}</div>
        </div>

        <!-- Header -->
        <div class="header">
            <img src="${logoSrc}" class="logo" alt="School Logo" onerror="this.style.display='none'" />
            <div class="school-block">
                <div class="school-name">${schoolName || 'DV Convent School'}</div>
                <div class="school-tagline">Empowering Minds, Building Futures</div>
                <div class="school-meta">
                    ${schoolAddress || 'Akodha, Rohi, Bhadohi - 221308'} &nbsp;|&nbsp; Ph: ${schoolPhone || '—'}
                    ${schoolEmail ? ` &nbsp;|&nbsp; Γ£ë ${schoolEmail}` : ''}
                </div>
                <div class="affil-row">
                    <span class="affil-badge">Affiliated by State Government</span>
                    ${schoolAffiliation ? `&nbsp;<span class="affil-badge affil-secondary">${schoolAffiliation}</span>` : ''}
                </div>
            </div>
        </div>

        <!-- TC Title -->
        <div class="tc-title-wrap">
            <div class="tc-title">Transfer Certificate</div>
            <div class="tc-subtitle">This certificate is issued on the request of the parent/guardian</div>
        </div>

        <!-- TC Meta -->
        <div class="tc-meta">
            <div>Book No: &nbsp;<span>${bookNo || '—'}</span></div>
            <div>TC No: &nbsp;<span>${tcNumber || '—'}</span></div>
            <div>School Code: &nbsp;<span>${data.schoolCode || '65730'}</span></div>
        </div>

        <!-- Main Table -->
        <table class="tc-table">
            <tbody>
                ${tableRows}
            </tbody>
        </table>

        <!-- Declaration -->
        <div class="declaration">
            Certified that the above information is correct as per the school records. This Transfer Certificate is issued
            to enable the student to seek admission in another institution. The school wishes the student all the best
            in future endeavours.
        </div>

        <!-- Signatures -->
        <div class="sig-row">
            <div class="sig-block">
                <div class="sig-line"></div>
                <div class="sig-label">Class Teacher</div>
                <div class="sig-sub">Signature &amp; Date</div>
            </div>

            <div class="stamp-area">
                ${stampImageBase64
                    ? `<img src="${stampImageBase64}" alt="Stamp" />`
                    : '<span>School<br/>Seal</span>'
                }
            </div>

            <div class="sig-block">
                <div class="sig-line">
                    ${principalSign ? `<img src="${principalSign}" style="max-height:38px;max-width:100px;object-fit:contain;display:block;margin:0 auto 2px;" alt="sign" />` : ''}
                </div>
                <div class="sig-label">Principal / Head of School</div>
                <div class="sig-sub">${principalName || ''}</div>
            </div>
        </div>

        <!-- Footer -->
        <div class="tc-footer">
            This is a computer-generated Transfer Certificate. &nbsp;|&nbsp;
            Issued on: ${tcDate} &nbsp;|&nbsp;
            ${isDuplicate ? 'ΓÜá DUPLICATE COPY — Original issued on ' + fmtDate(student?.tcIssuedAt) : 'Original Copy'}
        </div>

    </div>
</div>
<script>
window.onload = function() { setTimeout(function(){ window.print(); }, 500); };
</script>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=900,height=1100');
    if (!win) { alert('Please allow popups to print the Transfer Certificate.'); return; }
    win.document.write(html);
    win.document.close();
}