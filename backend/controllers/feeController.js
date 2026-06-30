const FeeStructure = require('../models/FeeStructure');
const FeePayment   = require('../models/FeePayment');
const Student      = require('../models/Student');
const Class        = require('../models/Class');
const BusRoute     = require('../models/BusRoute');

// ─── FEE STRUCTURE ────────────────────────────────────────────────────────────
const getFeeStructures = async (req, res) => {
    const filter = req.query.academicYear ? { academicYear: req.query.academicYear } : {};
    const list = await FeeStructure.find(filter).sort({ className: 1 });
    res.json(list);
};

const createFeeStructure = async (req, res) => {
    const { className, academicYear, admissionType, feeComponents } = req.body;
    if (!className || !academicYear || !admissionType || !feeComponents?.length)
        return res.status(400).json({ message: 'className, academicYear, admissionType and feeComponents are required' });

    const exists = await FeeStructure.findOne({ className, academicYear, admissionType });
    if (exists) return res.status(400).json({ message: `Structure for Class ${className} (${admissionType}, ${academicYear}) already exists` });

    const s = await FeeStructure.create({ className, academicYear, admissionType, feeComponents });
    res.status(201).json(s);
};

const updateFeeStructure = async (req, res) => {
    const s = await FeeStructure.findById(req.params.id);
    if (!s) return res.status(404).json({ message: 'Not found' });
    if (req.body.feeComponents) s.feeComponents = req.body.feeComponents;
    if (req.body.academicYear)  s.academicYear  = req.body.academicYear;
    await s.save();
    res.json(s);
};

const deleteFeeStructure = async (req, res) => {
    await FeeStructure.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
};

// ─── PAYMENTS ─────────────────────────────────────────────────────────────────
const collectFee = async (req, res) => {
    const { studentId, academicYear, month, months, monthAmounts, feeComponents, totalAmount, discount, fine,
            amountPaid, paymentMode, transactionId, remarks, paidBy } = req.body;

    if (!studentId || !academicYear || !totalAmount || amountPaid === undefined)
        return res.status(400).json({ message: 'studentId, academicYear, totalAmount and amountPaid are required' });

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    // Support multi-month: create one payment record per month with correct per-month amount
    const monthList = months?.length ? months : [month || ''];

    // Generate one shared group receipt number for all months in this transaction
    const count = await FeePayment.countDocuments();
    const groupReceiptNo = String(count + 1).padStart(4, '0');

    const createdPayments = [];
    const totalDiscount = discount || 0;
    const totalFine     = fine || 0;

    for (let idx = 0; idx < monthList.length; idx++) {
        const m = monthList[idx];
        const perMonthTotal = monthAmounts?.[m] ?? Math.round((totalAmount / monthList.length) * 100) / 100;

        // Apply full discount/fine on first month only (to keep it simple and visible)
        const perMonthDiscount = idx === 0 ? totalDiscount : 0;
        const perMonthFine     = idx === 0 ? totalFine : 0;
        const perMonthNet      = perMonthTotal - perMonthDiscount + perMonthFine;
        const status = perMonthNet > 0 ? 'paid' : 'pending';

        // Only include fee components relevant to this month:
        // - monthly components apply to every month
        // - one-time/annually/quarterly components only apply if their dueMonth matches
        const monthComponents = (feeComponents || []).filter(c => {
            if (c.frequency === 'monthly') return true;
            if (c.dueMonth) return c.dueMonth === m;
            return false; // skip components with no dueMonth that aren't monthly
        });

        const payment = await FeePayment.create({
            student: studentId, academicYear, month: m,
            feeComponents: monthComponents,
            totalAmount: perMonthTotal,
            discount: perMonthDiscount,
            fine: perMonthFine,
            amountPaid: perMonthNet,
            paymentMode: paymentMode || 'Cash', transactionId: transactionId || '',
            remarks: remarks || '', paidBy: paidBy || '',
            collectedBy: req.user._id, collectedByModel: 'Admin', status,
            groupReceiptNo,
        });
        createdPayments.push(payment);
    }

    // amountPaid is already correctly calculated per month in the loop above

    await createdPayments[0].populate('student', 'name class admissionNo UID');
    res.status(201).json({ payments: createdPayments, count: createdPayments.length, student: createdPayments[0].student, groupReceiptNo });
};

const getPayments = async (req, res) => {
    const { studentId, academicYear, month, className, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (studentId)    filter.student      = studentId;
    if (academicYear) filter.academicYear = academicYear;
    if (month)        filter.month        = month;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    let query = FeePayment.find(filter)
        .populate('student', 'name class admissionNo UID')
        .sort({ createdAt: -1 })
        .skip(skip).limit(parseInt(limit));

    const [payments, total] = await Promise.all([query, FeePayment.countDocuments(filter)]);

    // filter by class after populate
    const filtered = className ? payments.filter(p => p.student?.class === className) : payments;
    res.json({ payments: filtered, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
};

const deletePayment = async (req, res) => {
    await FeePayment.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
};

const getStudentFeeDetails = async (req, res) => {
    const { studentId } = req.params;
    const { academicYear } = req.query;

    const student = await Student.findById(studentId).select('name class admissionNo UID admissionType busRoute');
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const filter = { student: studentId };
    if (academicYear) filter.academicYear = academicYear;

    const payments = await FeePayment.find(filter).sort({ createdAt: -1 });
    const totalPaid = payments.reduce((s, p) => s + p.amountPaid, 0);

    const admType = (student.admissionType || 'Old').toLowerCase();
    const structure = academicYear
        ? await FeeStructure.findOne({ className: student.class, academicYear, admissionType: admType })
          || await FeeStructure.findOne({ className: student.class, academicYear })
        : null;

    // totalDue = annual fee minus what's been paid.
    const totalDue = structure
        ? Math.max(0, structure.totalAnnual - totalPaid)
        : payments.reduce((s, p) => s + (p.totalAmount - p.discount + p.fine - p.amountPaid), 0);

    // ── Per-month status ──────────────────────────────────────────────────────
    // Academic year months in order: April ΓåÆ March
    const MONTHS = ['April','May','June','July','August','September','October','November','December','January','February','March'];

    // Monthly fee amount from structure — handle both old (monthly) and new (one-time per month) formats
    const monthlyFeeAmt = structure
        ? structure.feeComponents
            .filter(c => c.frequency === 'monthly')
            .reduce((s, c) => s + c.amount, 0)
        : 0;

    // Per-month fee map: month ΓåÆ { baseFee, extraFees[] }
    const monthFeeMap = {};
    MONTHS.forEach(m => { monthFeeMap[m] = { baseFee: 0, extraFees: [] }; });

    if (structure) {
        structure.feeComponents.forEach(c => {
            if (c.frequency === 'monthly') {
                // Old format: same fee every month
                MONTHS.forEach(m => { monthFeeMap[m].baseFee = c.amount; });
            } else if (c.dueMonth && monthFeeMap[c.dueMonth] !== undefined) {
                if (c.name === 'Monthly Fee') {
                    monthFeeMap[c.dueMonth].baseFee = c.amount;
                } else {
                    monthFeeMap[c.dueMonth].extraFees.push({ name: c.name, amount: c.amount });
                }
            }
        });
    }

    // ── Bus fee: add to every month if student has a bus route ────────────────
    const busRoute = student.busRoute
        ? await BusRoute.findById(student.busRoute).select('routeName monthlyFee')
        : null;
    if (busRoute && busRoute.monthlyFee > 0) {
        MONTHS.forEach(m => {
            monthFeeMap[m].extraFees.push({ name: `Bus Fee (${busRoute.routeName})`, amount: busRoute.monthlyFee });
        });
    }

    // Effective monthly fee for presets (use most common base fee)
    const effectiveMonthlyFee = monthlyFeeAmt || (
        Object.values(monthFeeMap).map(m => m.baseFee).find(f => f > 0) || 0
    );

    const now = new Date();
    const currentMonthName = now.toLocaleString('en-IN', { month: 'long' }); // e.g. "April"
    const currentDay = now.getDate();

    // Build month-wise status
    const monthStatus = MONTHS.map(month => {
        const monthPayments = payments.filter(p => p.month === month);
        const paidAmt = monthPayments.reduce((s, p) => s + p.amountPaid, 0);
        const isPaid  = monthPayments.some(p => p.status === 'paid');
        const isPartial = !isPaid && paidAmt > 0;

        const monthIdx   = MONTHS.indexOf(month);
        const currentIdx = MONTHS.indexOf(currentMonthName);
        const isActive = monthIdx <= currentIdx;
        const isPast   = monthIdx < currentIdx;
        const isOverdue = !isPaid && (isPast || (monthIdx === currentIdx && currentDay > 5));

        const mf = monthFeeMap[month];
        const monthDue = mf ? mf.baseFee + mf.extraFees.reduce((s, e) => s + e.amount, 0) : 0;
        const extraFees = mf?.extraFees || [];

        return {
            month, monthDue, paidAmt, isPaid, isPartial,
            isActive, isOverdue,
            hasExtraFee: extraFees.length > 0,
            extraFees,
        };
    });

    res.json({ student, payments, totalPaid, totalDue, structure, monthStatus, monthlyFeeAmt: effectiveMonthlyFee, busRoute: busRoute || null });
};

const getFeeSummary = async (req, res) => {
    const { academicYear } = req.query;
    const filter = academicYear ? { academicYear } : {};
    const payments = await FeePayment.find(filter);

    const totalCollected = payments.reduce((s, p) => s + p.amountPaid, 0);
    const byMonth = {}, byMode = {};
    payments.forEach(p => {
        const k = p.month || 'General';
        byMonth[k] = (byMonth[k] || 0) + p.amountPaid;
        byMode[p.paymentMode] = (byMode[p.paymentMode] || 0) + p.amountPaid;
    });

    // Today's collection
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);
    const todayPayments = payments.filter(p => {
        const d = new Date(p.createdAt);
        return d >= todayStart && d <= todayEnd;
    });
    const todayCash   = todayPayments.filter(p => p.paymentMode === 'Cash').reduce((s, p) => s + p.amountPaid, 0);
    const todayOnline = todayPayments.filter(p => ['Online','UPI','Google Pay','PhonePe','Bank Transfer'].includes(p.paymentMode)).reduce((s, p) => s + p.amountPaid, 0);
    const todayTotal  = todayPayments.reduce((s, p) => s + p.amountPaid, 0);
    const todayCount  = todayPayments.length;

    res.json({ totalCollected, totalPayments: payments.length, byMonth, byMode,
               today: { total: todayTotal, cash: todayCash, online: todayOnline, count: todayCount } });
};

const getDefaulters = async (req, res) => {
    const { academicYear, className } = req.query;
    if (!academicYear) return res.status(400).json({ message: 'academicYear is required' });

    const MONTHS = ['April','May','June','July','August','September','October','November','December','January','February','March'];

    // Current month index in academic year
    const now = new Date();
    const currentMonthName = now.toLocaleString('en-IN', { month: 'long' });
    const currentDay  = now.getDate();
    const currentIdx  = MONTHS.indexOf(currentMonthName);

    // Months that are "due" — past the 5th of that month
    const dueMonths = MONTHS.filter((m, i) => {
        if (i < currentIdx) return true;                    // past months
        if (i === currentIdx && currentDay > 5) return true; // current month after 5th
        return false;
    });

    if (dueMonths.length === 0) return res.json([]);

    const studentFilter = { accountStatus: 'active' };
    if (className) studentFilter.class = className;
    const students = await Student.find(studentFilter).select('name class admissionNo UID');

    const payments   = await FeePayment.find({ academicYear });
    const structures = await FeeStructure.find({ academicYear });

    // Build per-class month fee map
    const classMonthFeeMap = {};
    structures.forEach(s => {
        if (!classMonthFeeMap[s.className]) classMonthFeeMap[s.className] = {};
        MONTHS.forEach(m => { classMonthFeeMap[s.className][m] = 0; });
        s.feeComponents.forEach(c => {
            if (c.frequency === 'monthly') {
                MONTHS.forEach(m => { classMonthFeeMap[s.className][m] += c.amount; });
            } else if (c.dueMonth && classMonthFeeMap[s.className][c.dueMonth] !== undefined) {
                classMonthFeeMap[s.className][c.dueMonth] += c.amount;
            }
        });
    });

    const defaulters = [];

    students.forEach(student => {
        const sp = payments.filter(p => p.student.toString() === student._id.toString());
        const monthFees = classMonthFeeMap[student.class] || {};

        // Find which due months are unpaid
        const unpaidMonths = dueMonths.filter(m => {
            const monthFee = monthFees[m] || 0;
            if (monthFee === 0) return false; // no fee for this month
            const paid = sp.filter(p => p.month === m).reduce((s, p) => s + p.amountPaid, 0);
            return paid < monthFee;
        });

        if (unpaidMonths.length === 0) return;

        const totalDue = unpaidMonths.reduce((sum, m) => {
            const paid = sp.filter(p => p.month === m).reduce((s, p) => s + p.amountPaid, 0);
            return sum + ((monthFees[m] || 0) - paid);
        }, 0);

        const totalPaid = sp.reduce((s, p) => s + p.amountPaid, 0);

        defaulters.push({
            student,
            totalPaid,
            unpaidMonths,
            monthCount: unpaidMonths.length,
            balance: totalDue,
        });
    });

    defaulters.sort((a, b) => b.balance - a.balance);
    res.json(defaulters);
};

// ─── UPI PAYMENT (Free — no gateway) ─────────────────────────────────────────
const Settings = require('../models/Settings');

// GET /api/fees/upi/info — returns school UPI ID + QR for student portal
const getUpiInfo = async (req, res) => {
    const settings = await Settings.findOne({});
    res.json({
        upiId:      settings?.upiId      || '',
        upiName:    settings?.upiName    || settings?.schoolName || '',
        upiQrCode:  settings?.upiQrCode  || '',
        schoolName: settings?.schoolName || 'Sardar Patel Public School',
    });
};

// POST /api/fees/upi/submit — student submits transaction ID after paying
// Creates payment records with status 'pending_upi' — admin must confirm
const submitUpiPayment = async (req, res) => {
    const { studentId, academicYear, months, monthAmounts, transactionId, paidBy, totalAmount } = req.body;
    if (!studentId || !academicYear || !transactionId || !months?.length)
        return res.status(400).json({ message: 'studentId, academicYear, months and transactionId are required' });

    const student = await Student.findById(studentId).select('name class admissionNo UID');
    if (!student) return res.status(404).json({ message: 'Student not found' });

    // Check for duplicate transaction ID
    const existing = await FeePayment.findOne({ transactionId });
    if (existing) return res.status(400).json({ message: 'This transaction ID has already been submitted' });

    const count = await FeePayment.countDocuments();
    const groupReceiptNo = String(count + 1).padStart(4, '0');

    const createdPayments = [];
    for (const m of months) {
        const amtForMonth = monthAmounts?.[m] || (totalAmount / months.length);
        const payment = await FeePayment.create({
            student: studentId, academicYear, month: m,
            totalAmount: amtForMonth, discount: 0, fine: 0, amountPaid: amtForMonth,
            paymentMode: 'UPI', transactionId,
            remarks: `UPI payment — pending admin confirmation`,
            paidBy: paidBy || student.name,
            collectedBy: studentId, collectedByModel: 'Student',
            status: 'pending_upi',
            groupReceiptNo,
        });
        createdPayments.push(payment);
    }

    res.status(201).json({ success: true, payments: createdPayments, count: createdPayments.length, groupReceiptNo });
};

// GET /api/fees/upi/pending — admin gets all pending UPI payments
const getPendingUpiPayments = async (req, res) => {
    const { academicYear } = req.query;
    const filter = { status: 'pending_upi' };
    if (academicYear) filter.academicYear = academicYear;

    const payments = await FeePayment.find(filter)
        .populate('student', 'name class admissionNo UID')
        .sort({ createdAt: -1 });

    // Group by groupReceiptNo
    const groups = {};
    payments.forEach(p => {
        const key = p.groupReceiptNo || p._id.toString();
        if (!groups[key]) groups[key] = [];
        groups[key].push(p);
    });

    res.json(Object.values(groups));
};

// PUT /api/fees/upi/confirm/:groupReceiptNo — admin confirms a UPI payment
const confirmUpiPayment = async (req, res) => {
    const { groupReceiptNo } = req.params;
    const payments = await FeePayment.find({ groupReceiptNo, status: 'pending_upi' });
    if (!payments.length) return res.status(404).json({ message: 'No pending payments found for this receipt' });

    for (const p of payments) {
        p.status = 'paid';
        p.remarks = `UPI payment confirmed by admin`;
        await p.save();
    }
    res.json({ success: true, confirmed: payments.length });
};

// PUT /api/fees/upi/reject/:groupReceiptNo — admin rejects a UPI payment
const rejectUpiPayment = async (req, res) => {
    const { groupReceiptNo } = req.params;
    await FeePayment.deleteMany({ groupReceiptNo, status: 'pending_upi' });
    res.json({ success: true, message: 'Payment rejected and removed' });
};

// GET /api/fees/class-fee-status — class teacher sees month-wise fee status of their class

const getClassFeeStatus = async (req, res) => {
    const { academicYear } = req.query;
    const teacherId = req.user._id;

    // Find the class where this teacher is classTeacher
    const cls = await Class.findOne({ classTeacher: teacherId });
    if (!cls) return res.status(403).json({ message: 'You are not assigned as a class teacher for any class.' });

    const MONTHS = ['April','May','June','July','August','September','October','November','December','January','February','March'];

    const now = new Date();
    const currentMonthName = now.toLocaleString('en-IN', { month: 'long' });
    const currentDay  = now.getDate();
    const currentIdx  = MONTHS.indexOf(currentMonthName);

    // Only months that are "active" (due date has arrived)
    const activeMonths = MONTHS.filter((m, i) => {
        if (i < currentIdx) return true;
        if (i === currentIdx && currentDay >= 1) return true;
        return false;
    });

    const students = await Student.find({ class: cls.className, accountStatus: 'active' }).select('name admissionNo UID class');
    if (!students.length) return res.json({ className: cls.className, months: activeMonths, students: [] });

    const filter = { student: { $in: students.map(s => s._id) } };
    if (academicYear) filter.academicYear = academicYear;
    const payments = await FeePayment.find(filter);

    const structure = academicYear
        ? await FeeStructure.findOne({ className: cls.className, academicYear })
        : null;

    // Build month fee map
    const monthFeeMap = {};
    MONTHS.forEach(m => { monthFeeMap[m] = 0; });
    if (structure) {
        structure.feeComponents.forEach(c => {
            if (c.frequency === 'monthly') {
                MONTHS.forEach(m => { monthFeeMap[m] += c.amount; });
            } else if (c.dueMonth && monthFeeMap[c.dueMonth] !== undefined) {
                monthFeeMap[c.dueMonth] += c.amount;
            }
        });
    }

    const result = students.map(student => {
        const sp = payments.filter(p => p.student.toString() === student._id.toString());
        const monthStatus = activeMonths.map(month => {
            const monthPayments = sp.filter(p => p.month === month);
            const paidAmt = monthPayments.reduce((s, p) => s + p.amountPaid, 0);
            const monthDue = monthFeeMap[month] || 0;
            const isPaid = monthDue > 0 ? paidAmt >= monthDue : monthPayments.some(p => p.status === 'paid');
            const isOverdue = !isPaid && (MONTHS.indexOf(month) < currentIdx || (MONTHS.indexOf(month) === currentIdx && currentDay > 5));
            return { month, isPaid, isOverdue, paidAmt, monthDue };
        });
        return { student, monthStatus };
    });

    // Sort: students with most overdue first
    result.sort((a, b) => {
        const aOverdue = a.monthStatus.filter(m => m.isOverdue).length;
        const bOverdue = b.monthStatus.filter(m => m.isOverdue).length;
        return bOverdue - aOverdue;
    });

    res.json({ className: cls.className, months: activeMonths, students: result });
};

// ─── DAILY COLLECTION REPORT ─────────────────────────────────────────────────
// GET /api/fees/daily?date=2025-04-12&academicYear=2025-26
const getDailyCollection = async (req, res) => {
    const { date, academicYear } = req.query;

    // Build date range — default to today
    const target = date ? new Date(date) : new Date();
    const start  = new Date(target); start.setHours(0, 0, 0, 0);
    const end    = new Date(target); end.setHours(23, 59, 59, 999);

    const filter = { createdAt: { $gte: start, $lte: end } };
    if (academicYear) filter.academicYear = academicYear;

    const payments = await FeePayment.find(filter)
        .populate('student', 'name class admissionNo UID')
        .populate('collectedBy', 'name')
        .sort({ createdAt: 1 });

    // Group by groupReceiptNo so multi-month payments appear as one entry
    const groups = {};
    payments.forEach(p => {
        const key = p.groupReceiptNo || p.receiptNo || String(p._id);
        if (!groups[key]) groups[key] = [];
        groups[key].push(p);
    });

    const entries = Object.values(groups).map(group => {
        const first = group[0];
        return {
            receiptNo:      first.groupReceiptNo || first.receiptNo,
            student:        first.student,
            months:         group.map(p => p.month || 'General').join(', '),
            monthCount:     group.length,
            totalAmount:    group.reduce((s, p) => s + p.totalAmount, 0),
            discount:       group.reduce((s, p) => s + (p.discount || 0), 0),
            fine:           group.reduce((s, p) => s + (p.fine || 0), 0),
            amountPaid:     group.reduce((s, p) => s + p.amountPaid, 0),
            paymentMode:    first.paymentMode,
            collectedByModel: first.collectedByModel,
            paidBy:         first.paidBy,
            createdAt:      first.createdAt,
        };
    });

    // Totals
    const totalCash    = entries.filter(e => e.paymentMode === 'Cash').reduce((s, e) => s + e.amountPaid, 0);
    const totalOnline  = entries.filter(e => e.paymentMode !== 'Cash').reduce((s, e) => s + e.amountPaid, 0);
    const totalAmount  = entries.reduce((s, e) => s + e.amountPaid, 0);
    const byAdmin      = entries.filter(e => e.collectedByModel === 'Admin').reduce((s, e) => s + e.amountPaid, 0);
    const byStudent    = entries.filter(e => e.collectedByModel === 'Student').reduce((s, e) => s + e.amountPaid, 0);
    const byMode       = {};
    entries.forEach(e => { byMode[e.paymentMode] = (byMode[e.paymentMode] || 0) + e.amountPaid; });

    res.json({ date: target.toISOString().split('T')[0], entries, totalAmount, totalCash, totalOnline, byAdmin, byStudent, byMode });
};

module.exports = {
    getFeeStructures, createFeeStructure, updateFeeStructure, deleteFeeStructure,
    collectFee, getPayments, deletePayment, getStudentFeeDetails, getFeeSummary, getDefaulters,
    getUpiInfo, submitUpiPayment, getPendingUpiPayments, confirmUpiPayment, rejectUpiPayment,
    getClassFeeStatus, getDailyCollection,
};