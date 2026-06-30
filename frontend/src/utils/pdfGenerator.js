import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const FIELD_MAP = {
  name: "Name of Student",
  class: "Class",
  UID: "Admission No.",
  dateOfBirth: "Date of Birth",
  category: "Category",
  fatherName: "Father's Name",
  fatherMobile: "Father's Contact",
  motherName: "Mother's Name",
  motherMobile: "Mother's Mobile",
  guardianName: "Guardian Name",
  guardianMobile: "Guardian Mobile",
  aadharNumber: "Aadhar No",
  penNumber: "PEN No.",
  address: "Address",
  pincode: "Pincode"
};

// -------------------------------------------------------------------
// COLUMN WIDTH CONFIG
// Controls minimum width per field key (in points).
// Landscape A4 usable width ≈ 780pt, Portrait ≈ 515pt (after margins)
// -------------------------------------------------------------------
const COLUMN_WIDTH_MAP = {
  // S.No is always fixed at 30
  name:          { min: 80,  wrap: true  },
  class:         { min: 35,  wrap: false },
  UID:           { min: 50,  wrap: false },
  dateOfBirth:   { min: 55,  wrap: false },
  category:      { min: 45,  wrap: false },
  fatherName:    { min: 75,  wrap: true  },
  fatherMobile:  { min: 68,  wrap: false },
  motherName:    { min: 75,  wrap: true  },
  motherMobile:  { min: 68,  wrap: false },
  guardianName:  { min: 75,  wrap: true  },
  guardianMobile:{ min: 68,  wrap: false },
  aadharNumber:  { min: 72,  wrap: false },
  penNumber:     { min: 62,  wrap: false },
  address:       { min: 90,  wrap: true  },
  pincode:       { min: 45,  wrap: false }
};

const resolveContact = (student) => {
  if (student.fatherName || student.fatherMobile) {
    return {
      fatherName: student.fatherName || "---",
      fatherMobile: student.fatherMobile || "---"
    };
  } else if (student.motherName || student.motherMobile) {
    return {
      fatherName: student.motherName || "---",
      fatherMobile: student.motherMobile || "---"
    };
  } else {
    return {
      fatherName: student.guardianName || "---",
      fatherMobile: student.guardianMobile || "---"
    };
  }
};

export const generateStudentListPDF = (students, reportTitle, selectedFields) => {
  try {
    // ─── SMART ORIENTATION: ≤6 fields → Portrait, >6 → Landscape ───
    const usePortrait = selectedFields.length <= 6;
    const orientation = usePortrait ? 'portrait' : 'landscape';

    const doc = new jsPDF({ orientation, unit: 'pt', format: 'a4' });
    const pageWidth  = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 30;

    // ─── HEADER ───────────────────────────────────────────────────
    doc.setTextColor(0, 0, 0);
    doc.setFont('times', 'bold');
    doc.setFontSize(usePortrait ? 22 : 20);
    doc.text("SARDAR PATEL PUBLIC SCHOOL", pageWidth / 2, 44, { align: 'center' });

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1.5);
    doc.line(margin, 54, pageWidth - margin, 54);

    doc.setFontSize(12);
    doc.setFont('times', 'normal');
    doc.text(reportTitle, pageWidth / 2, 74, { align: 'center' });

    // ─── BUILD TABLE DATA ─────────────────────────────────────────
    const tableHeaders = ['S.No', ...selectedFields.map(key => FIELD_MAP[key] || key)];

    const tableRows = students.map((student, index) => {
      const contact = resolveContact(student);
      const rowData = [String(index + 1)];

      selectedFields.forEach(field => {
        let value;
        if (field === 'fatherName')       value = contact.fatherName;
        else if (field === 'fatherMobile') value = contact.fatherMobile;
        else if (field === 'dateOfBirth' && student[field])
          value = new Date(student[field]).toLocaleDateString('en-GB');
        else
          value = student[field];

        rowData.push(value || "---");
      });

      return rowData;
    });

    // ─── COLUMN STYLES ────────────────────────────────────────────
    // S.No is column 0, selectedFields start at column 1
    const columnStyles = {
      0: { cellWidth: 28, halign: 'center', overflow: 'linebreak' }
    };

    // Calculate total min width to see if we need to distribute extra space
    const usableWidth = pageWidth - (margin * 2) - 28; // subtract S.No width and margins
    const totalMinWidth = selectedFields.reduce((sum, key) => {
      return sum + (COLUMN_WIDTH_MAP[key]?.min || 60);
    }, 0);

    // If total min widths < usable space, distribute the extra evenly
    const extraPerCol = totalMinWidth < usableWidth
      ? (usableWidth - totalMinWidth) / selectedFields.length
      : 0;

    selectedFields.forEach((key, idx) => {
      const colConfig = COLUMN_WIDTH_MAP[key] || { min: 60, wrap: true };
      columnStyles[idx + 1] = {
        cellWidth: colConfig.min + extraPerCol,
        overflow: 'linebreak',
        // This is the key fix: wrap at word boundaries only
        ...(colConfig.wrap
          ? { halign: 'left' }
          : { halign: 'center' })
      };
    });

    // ─── FONT SIZE: scale down if many columns ────────────────────
    const fontSize = selectedFields.length <= 5  ? 10
                   : selectedFields.length <= 8  ? 9
                   : selectedFields.length <= 10 ? 8
                   : 7.5;

    // ─── DRAW TABLE ───────────────────────────────────────────────
    autoTable(doc, {
      startY: 90,
      margin: { left: margin, right: margin },
      head: [tableHeaders],
      body: tableRows,
      theme: 'grid',
      styles: {
        font: 'times',
        fontSize,
        cellPadding: { top: 5, right: 4, bottom: 5, left: 4 },
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.7,
        overflow: 'linebreak',   // ← KEY: break at words, not characters
        valign: 'middle',
        minCellHeight: 20,
      },
      headStyles: {
        fillColor: [240, 240, 240],
        fontStyle: 'bold',
        halign: 'center',
        fontSize: fontSize,
        lineWidth: 1.1,
        overflow: 'linebreak',
      },
      columnStyles,
      // This hook ensures word-wrap respects word boundaries
      didParseCell: (data) => {
        if (data.section === 'body' && data.cell.raw) {
          // Replace any existing soft hyphens or zero-width spaces — clean input
          data.cell.text = data.cell.text.map(t =>
            typeof t === 'string' ? t.replace(/\u00AD|\u200B/g, '') : t
          );
        }
      },
      didDrawPage: (data) => {
        // Footer: timestamp + page number on every page
        doc.setFont('times', 'italic');
        doc.setFontSize(7.5);
        doc.setTextColor(120, 120, 120);
        doc.text(
          `Generated: ${new Date().toLocaleString()}`,
          margin,
          pageHeight - 16
        );
        doc.text(
          `Page ${data.pageNumber}`,
          pageWidth - margin,
          pageHeight - 16,
          { align: 'right' }
        );
      }
    });

    // ─── SIGNATURE ────────────────────────────────────────────────
    const finalY = doc.lastAutoTable.finalY + 50;
    // Only draw signature if it fits on current page
    if (finalY + 30 < pageHeight - 30) {
      doc.setTextColor(0, 0, 0);
      doc.setLineWidth(1);
      doc.line(pageWidth - margin - 160, finalY, pageWidth - margin, finalY);
      doc.setFont('times', 'bold');
      doc.setFontSize(11);
      doc.text("Principal Signature", pageWidth - margin - 80, finalY + 18, { align: 'center' });
    }

    // ─── SAVE ─────────────────────────────────────────────────────
    const safeFileName = reportTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    doc.save(`${safeFileName}.pdf`);

    return true;
  } catch (error) {
    console.error("PDF Logic Error:", error);
    throw error;
  }
};
