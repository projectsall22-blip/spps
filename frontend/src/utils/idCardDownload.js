import JSZip from 'jszip';

// Scale factor — 3× for high-res PNG
const R = 3;
const s = (v) => v * R;

// Card dimensions (matches preview: 230×370)
const CW = 230 * R;

// ── Helpers ──────────────────────────────────────────────────────────────────
const loadImage = (src) =>
  new Promise((resolve) => {
    if (!src) { resolve(null); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

const roundRect = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

const ellipseText = (ctx, text, maxW) => {
  if (!text) return '—';
  let t = String(text);
  while (ctx.measureText(t).width > maxW && t.length > 1) t = t.slice(0, -1);
  if (t.length < String(text).length) t = t.slice(0, -1) + '…';
  return t;
};

const wrapText = (ctx, text, maxW) => {
  if (!text) return ['—'];
  const raw   = String(text).replace(/,/g, ', ').replace(/\s+/g, ' ').trim();
  const words = raw.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = word; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines.length ? lines : ['—'];
};

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  : '—';

// Parse hex color → [r,g,b]
const hex2rgb = (h) => {
  const hex = (h && h.length === 7) ? h : '#1a237e';
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
};


// ════════════════════════════════════════════════════════════════════════════
// STUDENT CARD — matches new preview theme exactly
// ════════════════════════════════════════════════════════════════════════════
const drawStudentCard = async (canvas, student, settings, assets, color = '#1a237e') => {
  const { logoImg, signImg, photoImg } = assets;
  const [r, g, b] = hex2rgb(color);
  const GOLD  = '#FFD700';
  const light = `rgba(${r},${g},${b},0.08)`;
  const mid   = `rgba(${r},${g},${b},0.15)`;

  // ── Layout (all values × R = 3) ──
  const stripH  = s(6);   // top 3-stripe bar
  const hdrH    = s(88);  // header gradient block
  const photoW  = s(88),  photoH = s(100);
  const photoSecH = s(12) + photoH + s(7) + s(18) + s(10); // padding + photo + gap + name + badges
  const lx      = s(12);
  const valX    = lx + s(46);
  const valMaxW = CW - valX - lx;
  const baseRH  = s(14);
  const lineH   = s(9);
  const admBoxH = s(22);
  const ftH     = s(40);
  const botH    = s(5);   // bottom stripe

  // Pre-measure info rows
  const rows = [
    ['Father',   student.fatherName || student.guardianName || '—'],
    ['Mother',   student.motherName || '—'],
    ['D.O.B.',   fmtDate(student.dateOfBirth)],
    ['Contact',  student.fatherMobile || student.motherMobile || student.guardianMobile || '—'],
    ['Address',  student.address || '—'],
  ];
  const tmp  = document.createElement('canvas');
  tmp.width  = CW; tmp.height = 10;
  const mctx = tmp.getContext('2d');
  mctx.font  = `500 ${s(7)}px Arial`;
  const rowH = rows.map(([, v]) => {
    const lines = wrapText(mctx, v, valMaxW);
    return lines.length > 1 ? lines.length * lineH + s(4) : baseRH;
  });
  const totalRowsH = rowH.reduce((a, b) => a + b, 0);

  const CH = stripH + hdrH + photoSecH + s(6) + admBoxH + s(4) + totalRowsH + s(4) + ftH + botH;
  canvas.width = CW; canvas.height = CH;
  const ctx = canvas.getContext('2d');

  // Clip card with rounded corners
  ctx.save();
  roundRect(ctx, 0, 0, CW, CH, s(14));
  ctx.clip();
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, CW, CH);

  // ── TOP 3-STRIPE BAR ──
  ctx.fillStyle = color;      ctx.fillRect(0, 0, CW/3, stripH);
  ctx.fillStyle = GOLD;       ctx.fillRect(CW/3, 0, CW/3, stripH);
  ctx.fillStyle = color;      ctx.fillRect(CW*2/3, 0, CW/3, stripH);

  // ── HEADER ──
  const hg = ctx.createLinearGradient(0, stripH, CW, stripH + hdrH);
  hg.addColorStop(0, color);
  hg.addColorStop(1, `rgba(${r},${g},${b},0.85)`);
  ctx.fillStyle = hg;
  ctx.fillRect(0, stripH, CW, hdrH);

  // Decorative circle
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.beginPath(); ctx.arc(CW - s(20), stripH - s(20), s(80), 0, Math.PI*2); ctx.fill();

  // Logo circle
  const logoSz = s(54), lx0 = s(10), ly0 = stripH + (hdrH - logoSz) / 2;
  ctx.save();
  ctx.beginPath(); ctx.arc(lx0 + logoSz/2, ly0 + logoSz/2, logoSz/2, 0, Math.PI*2);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = s(2.5); ctx.stroke(); ctx.clip();
  if (logoImg) ctx.drawImage(logoImg, lx0, ly0, logoSz, logoSz);
  else { ctx.fillStyle = '#e0e7ff'; ctx.fillRect(lx0, ly0, logoSz, logoSz); }
  ctx.restore();

  // School text
  const tx = lx0 + logoSz + s(8), tw = CW - tx - s(8), ty = ly0 + s(4);
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.font = `900 ${s(11.5)}px Arial`; ctx.fillStyle = '#fff';
  ctx.fillText(ellipseText(ctx, settings.schoolName || 'Sardar Patel Public School', tw), tx + tw/2, ty);
  ctx.font = `400 ${s(6)}px Arial`; ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText('Govt. Recognised', tx + tw/2, ty + s(15));
  ctx.font = `400 ${s(6)}px Arial`; ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(ellipseText(ctx, settings.schoolAddress || 'Udaichandpur, Soraon, Prayagraj', tw), tx + tw/2, ty + s(24));
  ctx.font = `800 ${s(6.5)}px Arial`; ctx.fillStyle = GOLD;
  ctx.fillText(`Ph: ${settings.contactNumber || '—'}`, tx + tw/2, ty + s(34));

  // "Student ID Card" badge in header
  const badgeTxt = 'Student ID Card';
  ctx.font = `900 ${s(7.5)}px Arial`;
  const bw = ctx.measureText(badgeTxt).width + s(28);
  const bx = (CW - bw) / 2, by = stripH + hdrH - s(18);
  roundRect(ctx, bx, by, bw, s(14), s(7));
  ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = s(1); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(badgeTxt, CW/2, by + s(7));

  // ── PHOTO SECTION ──
  const pSecY  = stripH + hdrH;
  ctx.fillStyle = light; ctx.fillRect(0, pSecY, CW, photoSecH);

  const photoX = (CW - photoW) / 2, photoY = pSecY + s(12);
  ctx.strokeStyle = color; ctx.lineWidth = s(3);
  roundRect(ctx, photoX, photoY, photoW, photoH, s(8));
  ctx.stroke();
  ctx.save(); roundRect(ctx, photoX, photoY, photoW, photoH, s(8)); ctx.clip();
  if (photoImg) { ctx.drawImage(photoImg, photoX, photoY, photoW, photoH); }
  else {
    ctx.fillStyle = '#e8eaf6'; ctx.fillRect(photoX, photoY, photoW, photoH);
    ctx.font = `900 ${s(40)}px Arial`; ctx.fillStyle = color;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText((student.name||'?').charAt(0).toUpperCase(), photoX+photoW/2, photoY+photoH/2);
  }
  ctx.restore();

  // Name
  const nameY = photoY + photoH + s(7);
  ctx.font = `800 ${s(13.5)}px Arial`; ctx.fillStyle = '#1a1a2e';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillText(ellipseText(ctx, student.name || '', CW - s(20)), CW/2, nameY);

  // Class badge + Category badge
  const badgeY = nameY + s(18);
  const cls = `Class ${student.class || '—'}${student.section ? ' - ' + student.section : ''}`;
  const cat = student.admissionType === 'New' ? 'New Adm.' : (student.category || 'General');
  ctx.font = `800 ${s(7)}px Arial`;
  const b1w = ctx.measureText(cls).width + s(20), b2w = ctx.measureText(cat).width + s(20);
  const gap = s(6), totalBW = b1w + b2w + gap, bStartX = (CW - totalBW) / 2;
  const bH = s(14);
  roundRect(ctx, bStartX, badgeY, b1w, bH, s(7)); ctx.fillStyle = color; ctx.fill();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(cls, bStartX + b1w/2, badgeY + bH/2);
  roundRect(ctx, bStartX + b1w + gap, badgeY, b2w, bH, s(7)); ctx.fillStyle = GOLD; ctx.fill();
  ctx.fillStyle = '#1a1a1a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(cat, bStartX + b1w + gap + b2w/2, badgeY + bH/2);

  // ── INFO TABLE ──
  const infoY = pSecY + photoSecH + s(6);
  ctx.fillStyle = '#fff'; ctx.fillRect(0, pSecY + photoSecH, CW, CH - pSecY - photoSecH - botH);

  // Admission No highlighted box
  const admY = infoY;
  roundRect(ctx, lx, admY, CW - lx*2, admBoxH, s(6));
  ctx.fillStyle = mid; ctx.fill();
  ctx.font = `900 ${s(7)}px Arial`; ctx.fillStyle = color;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText('Adm. No.:', lx + s(8), admY + admBoxH/2);
  ctx.font = `900 ${s(9)}px Arial`;
  ctx.fillText(student.UID || '—', lx + s(8) + ctx.measureText('Adm. No.: ').width + s(4), admY + admBoxH/2);

  // Info rows
  let ry = admY + admBoxH + s(4);
  rows.forEach(([lbl, val], i) => {
    ctx.strokeStyle = light; ctx.lineWidth = s(1);
    ctx.beginPath(); ctx.moveTo(lx, ry); ctx.lineTo(CW - lx, ry); ctx.stroke();
    ctx.font = `700 ${s(7)}px Arial`; ctx.fillStyle = '#666';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(lbl, lx, ry + rowH[i]/2);
    ctx.font = `500 ${s(7)}px Arial`; ctx.fillStyle = '#1a1a1a';
    ctx.textBaseline = 'top';
    wrapText(ctx, val, valMaxW).forEach((line, li) => ctx.fillText(line, valX, ry + s(3) + li * lineH));
    ry += rowH[i];
  });

  // ── FOOTER ──
  const ftY = ry + s(4);
  ctx.fillStyle = light; ctx.fillRect(0, ftY, CW, ftH);
  ctx.strokeStyle = mid; ctx.lineWidth = s(1);
  ctx.beginPath(); ctx.moveTo(0, ftY); ctx.lineTo(CW, ftY); ctx.stroke();

  // Principal sign (left)
  if (signImg) {
    const sh = s(26), sw = sh * (signImg.width / signImg.height);
    ctx.drawImage(signImg, lx, ftY + s(4), sw, sh);
    ctx.strokeStyle = '#555'; ctx.lineWidth = s(1);
    ctx.beginPath(); ctx.moveTo(lx, ftY + s(4) + sh + s(1)); ctx.lineTo(lx + sw, ftY + s(4) + sh + s(1)); ctx.stroke();
    ctx.font = `600 ${s(6.5)}px Arial`; ctx.fillStyle = '#555';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText("Principal's Sign", lx + sw/2, ftY + s(4) + sh + s(2));
  }

  // Academic year (right)
  const yearX = CW - lx - s(60), yearY = ftY + s(8);
  ctx.font = `600 ${s(6)}px Arial`; ctx.fillStyle = '#888';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillText('Academic Year', yearX + s(30), yearY);
  ctx.font = `900 ${s(8)}px Arial`; ctx.fillStyle = color;
  ctx.fillText(settings.currentAcademicYear || '2025-26', yearX + s(30), yearY + s(10));

  // ── BOTTOM 3-STRIPE ──
  const botY = CH - botH;
  ctx.fillStyle = GOLD;  ctx.fillRect(0, botY, CW/4, botH);
  ctx.fillStyle = color; ctx.fillRect(CW/4, botY, CW/2, botH);
  ctx.fillStyle = GOLD;  ctx.fillRect(CW*3/4, botY, CW/4, botH);

  ctx.restore();
};

// ════════════════════════════════════════════════════════════════════════════
// TEACHER CARD — purple theme
// ════════════════════════════════════════════════════════════════════════════
const drawTeacherCard = async (canvas, teacher, settings, assets) => {
  const { logoImg, signImg, photoImg } = assets;
  const PRIMARY = '#7b1fa2';
  const GOLD    = '#FFD700';
  const light   = 'rgba(123,31,162,0.08)';
  const mid     = 'rgba(123,31,162,0.15)';

  const stripH  = s(6);
  const hdrH    = s(88);
  const photoW  = s(88), photoH = s(100);
  const photoSecH = s(12) + photoH + s(7) + s(18) + s(14);
  const lx      = s(12);
  const valX    = lx + s(46);
  const valMaxW = CW - valX - lx;
  const baseRH  = s(14);
  const lineH   = s(9);
  const admBoxH = s(22);
  const ftH     = s(40);
  const botH    = s(5);

  const rows = [
    ['Phone',   teacher.phone || '—'],
    ['Email',   teacher.email || '—'],
    ['Address', teacher.address || '—'],
  ];
  const tmp = document.createElement('canvas');
  tmp.width = CW; tmp.height = 10;
  const mctx = tmp.getContext('2d');
  mctx.font = `500 ${s(7)}px Arial`;
  const rowH = rows.map(([, v]) => {
    const lines = wrapText(mctx, v, valMaxW);
    return lines.length > 1 ? lines.length * lineH + s(4) : baseRH;
  });
  const totalRowsH = rowH.reduce((a, b) => a + b, 0);
  const CH = stripH + hdrH + photoSecH + s(6) + admBoxH + s(4) + totalRowsH + s(4) + ftH + botH;

  canvas.width = CW; canvas.height = CH;
  const ctx = canvas.getContext('2d');

  ctx.save();
  roundRect(ctx, 0, 0, CW, CH, s(14));
  ctx.clip();
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, CW, CH);

  // Top stripe
  ctx.fillStyle = PRIMARY;  ctx.fillRect(0, 0, CW/3, stripH);
  ctx.fillStyle = GOLD;     ctx.fillRect(CW/3, 0, CW/3, stripH);
  ctx.fillStyle = PRIMARY;  ctx.fillRect(CW*2/3, 0, CW/3, stripH);

  // Header
  const hg = ctx.createLinearGradient(0, stripH, CW, stripH + hdrH);
  hg.addColorStop(0, PRIMARY); hg.addColorStop(1, '#4a148c');
  ctx.fillStyle = hg; ctx.fillRect(0, stripH, CW, hdrH);

  // Decorative circle
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.beginPath(); ctx.arc(CW - s(20), stripH - s(20), s(80), 0, Math.PI*2); ctx.fill();

  // Logo
  const logoSz = s(54), lx0 = s(10), ly0 = stripH + (hdrH - logoSz) / 2;
  ctx.save();
  ctx.beginPath(); ctx.arc(lx0 + logoSz/2, ly0 + logoSz/2, logoSz/2, 0, Math.PI*2);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = s(2.5); ctx.stroke(); ctx.clip();
  if (logoImg) ctx.drawImage(logoImg, lx0, ly0, logoSz, logoSz);
  else { ctx.fillStyle = '#f3e5f5'; ctx.fillRect(lx0, ly0, logoSz, logoSz); }
  ctx.restore();

  // School text
  const tx = lx0 + logoSz + s(8), tw = CW - tx - s(8), ty = ly0 + s(4);
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.font = `900 ${s(11.5)}px Arial`; ctx.fillStyle = '#fff';
  ctx.fillText(ellipseText(ctx, settings.schoolName || 'Sardar Patel Public School', tw), tx + tw/2, ty);
  ctx.font = `400 ${s(6)}px Arial`; ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText('Govt. Recognised', tx + tw/2, ty + s(15));
  ctx.font = `400 ${s(6)}px Arial`; ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(ellipseText(ctx, settings.schoolAddress || 'Udaichandpur, Soraon, Prayagraj', tw), tx + tw/2, ty + s(24));
  ctx.font = `800 ${s(6.5)}px Arial`; ctx.fillStyle = GOLD;
  ctx.fillText(`Ph: ${settings.contactNumber || '—'}`, tx + tw/2, ty + s(34));

  // Badge
  const badgeTxt = 'Staff ID Card';
  ctx.font = `900 ${s(7.5)}px Arial`;
  const bw = ctx.measureText(badgeTxt).width + s(28);
  const bx = (CW - bw)/2, by = stripH + hdrH - s(18);
  roundRect(ctx, bx, by, bw, s(14), s(7));
  ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = s(1); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(badgeTxt, CW/2, by + s(7));

  // Photo section
  const pSecY = stripH + hdrH;
  ctx.fillStyle = light; ctx.fillRect(0, pSecY, CW, photoSecH);

  const photoX = (CW - photoW)/2, photoY = pSecY + s(12);
  ctx.strokeStyle = PRIMARY; ctx.lineWidth = s(3);
  roundRect(ctx, photoX, photoY, photoW, photoH, s(8)); ctx.stroke();
  ctx.save(); roundRect(ctx, photoX, photoY, photoW, photoH, s(8)); ctx.clip();
  if (photoImg) ctx.drawImage(photoImg, photoX, photoY, photoW, photoH);
  else {
    ctx.fillStyle = '#f3e5f5'; ctx.fillRect(photoX, photoY, photoW, photoH);
    ctx.font = `900 ${s(40)}px Arial`; ctx.fillStyle = PRIMARY;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText((teacher.name||'?').charAt(0).toUpperCase(), photoX+photoW/2, photoY+photoH/2);
  }
  ctx.restore();

  // Name
  const nameY = photoY + photoH + s(7);
  ctx.font = `800 ${s(13.5)}px Arial`; ctx.fillStyle = '#1a1a2e';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillText(ellipseText(ctx, teacher.name || '', CW - s(20)), CW/2, nameY);

  // Designation badge
  const desig = teacher.designation || 'Teacher';
  ctx.font = `800 ${s(7)}px Arial`;
  const db_w = ctx.measureText(desig).width + s(24), db_h = s(14);
  const db_x = (CW - db_w)/2, db_y = nameY + s(18);
  roundRect(ctx, db_x, db_y, db_w, db_h, s(7)); ctx.fillStyle = PRIMARY; ctx.fill();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(desig, db_x + db_w/2, db_y + db_h/2);

  // Info table
  ctx.fillStyle = '#fff'; ctx.fillRect(0, pSecY + photoSecH, CW, CH - pSecY - photoSecH - botH);
  const infoY = pSecY + photoSecH + s(6);

  // Emp ID box
  roundRect(ctx, lx, infoY, CW - lx*2, admBoxH, s(6));
  ctx.fillStyle = mid; ctx.fill();
  ctx.font = `900 ${s(7)}px Arial`; ctx.fillStyle = PRIMARY;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText('Emp. ID:', lx + s(8), infoY + admBoxH/2);
  ctx.font = `900 ${s(9)}px Arial`;
  ctx.fillText(teacher.employeeCode || '—', lx + s(8) + ctx.measureText('Emp. ID: ').width + s(4), infoY + admBoxH/2);

  // Rows
  let ry = infoY + admBoxH + s(4);
  rows.forEach(([lbl, val], i) => {
    ctx.strokeStyle = light; ctx.lineWidth = s(1);
    ctx.beginPath(); ctx.moveTo(lx, ry); ctx.lineTo(CW - lx, ry); ctx.stroke();
    ctx.font = `700 ${s(7)}px Arial`; ctx.fillStyle = '#666';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(lbl, lx, ry + rowH[i]/2);
    ctx.font = `500 ${s(7)}px Arial`; ctx.fillStyle = '#1a1a1a';
    ctx.textBaseline = 'top';
    wrapText(ctx, val, valMaxW).forEach((line, li) => ctx.fillText(line, valX, ry + s(3) + li * lineH));
    ry += rowH[i];
  });

  // Footer
  const ftY = ry + s(4);
  ctx.fillStyle = light; ctx.fillRect(0, ftY, CW, ftH);
  ctx.strokeStyle = mid; ctx.lineWidth = s(1);
  ctx.beginPath(); ctx.moveTo(0, ftY); ctx.lineTo(CW, ftY); ctx.stroke();

  if (signImg) {
    const sh = s(26), sw = sh * (signImg.width / signImg.height);
    ctx.drawImage(signImg, lx, ftY + s(4), sw, sh);
    ctx.strokeStyle = '#555'; ctx.lineWidth = s(1);
    ctx.beginPath(); ctx.moveTo(lx, ftY + s(4) + sh + s(1)); ctx.lineTo(lx + sw, ftY + s(4) + sh + s(1)); ctx.stroke();
    ctx.font = `600 ${s(6.5)}px Arial`; ctx.fillStyle = '#555';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText("Principal's Sign", lx + sw/2, ftY + s(4) + sh + s(2));
  }

  const yearX = CW - lx - s(60), yearY = ftY + s(8);
  ctx.font = `600 ${s(6)}px Arial`; ctx.fillStyle = '#888';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillText('Academic Year', yearX + s(30), yearY);
  ctx.font = `900 ${s(8)}px Arial`; ctx.fillStyle = PRIMARY;
  ctx.fillText(settings.currentAcademicYear || '2025-26', yearX + s(30), yearY + s(10));

  // Bottom stripe
  const botY = CH - botH;
  ctx.fillStyle = GOLD;    ctx.fillRect(0, botY, CW/4, botH);
  ctx.fillStyle = PRIMARY; ctx.fillRect(CW/4, botY, CW/2, botH);
  ctx.fillStyle = GOLD;    ctx.fillRect(CW*3/4, botY, CW/4, botH);

  ctx.restore();
};

// ════════════════════════════════════════════════════════════════════════════
// EXPORT
// ════════════════════════════════════════════════════════════════════════════
const resolvePhoto = (profileImage) => {
  if (!profileImage) return null;
  if (profileImage.startsWith('data:')) return profileImage;
  if (profileImage.startsWith('http'))  return profileImage;
  const apiBase = import.meta.env?.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
  return `${apiBase}${profileImage}`;
};

const itemToBlob = async (item, type, settings, sharedAssets, studentColor = '#1a237e') => {
  const photoImg = await loadImage(resolvePhoto(item.profileImage));
  const canvas   = document.createElement('canvas');
  if (type === 'student')
    await drawStudentCard(canvas, item, settings, { ...sharedAssets, photoImg }, studentColor);
  else
    await drawTeacherCard(canvas, item, settings, { ...sharedAssets, photoImg });
  return new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/png', 1.0)
  );
};

const triggerDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a   = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

export const downloadCards = async (items, type, settings, schoolLogoSrc, signImageSrc, onProgress, studentColor = '#1a237e') => {
  if (!items?.length) throw new Error('No items to download');
  const label  = type === 'student' ? 'student' : 'teacher';
  const shared = {
    logoImg: await loadImage(settings.schoolLogo || schoolLogoSrc),
    signImg: await loadImage(signImageSrc),
  };

  if (items.length === 1) {
    onProgress?.(0, 1);
    const name = items[0].name?.replace(/\s+/g, '_') || 'card';
    triggerDownload(await itemToBlob(items[0], type, settings, shared, studentColor), `${name}-id-card.png`);
    onProgress?.(1, 1);
    return;
  }

  const zip    = new JSZip();
  const folder = zip.folder(`${label}-id-cards`);
  for (let i = 0; i < items.length; i++) {
    onProgress?.(i, items.length);
    const name = items[i].name?.replace(/\s+/g, '_') || `card_${i+1}`;
    folder.file(`${name}.png`, await itemToBlob(items[i], type, settings, shared, studentColor));
  }
  onProgress?.(items.length, items.length);
  triggerDownload(await zip.generateAsync({ type: 'blob' }), `${label}-id-cards.zip`);
};
