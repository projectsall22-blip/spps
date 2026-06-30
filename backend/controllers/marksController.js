const Mark = require('../models/Mark');
const Exam = require('../models/Exam');
const mongoose = require('mongoose');
const TeacherAssignment = require('../models/TeacherAssignment');
const Settings = require('../models/Settings');
const Notification = require('../models/Notification');
const Class = require('../models/Class'); 
const Subject = require('../models/Subject'); 
const { sendPushToRole } = require('../utils/sendPushNotification');
// Helper function to calculate Grade
const calculateGrade = (obtained, max) => {
    const percentage = (obtained / max) * 100;
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    if (percentage >= 33) return 'E';
    return 'F';
};

// CBSE grade from percentage (matches frontend gradeFromPercent)
const gradeFromPct = (p) => {
    if (p >= 91) return 'A1';
    if (p >= 81) return 'A2';
    if (p >= 71) return 'B1';
    if (p >= 61) return 'B2';
    if (p >= 51) return 'C1';
    if (p >= 41) return 'C2';
    if (p >= 33) return 'D';
    if (p >= 21) return 'E';
    return 'F';
};


const bulkEnterMarks = async (req, res) => {
    try {
        const { examId, subjectId, classId, academicYear, marksData } = req.body;

        // 1. Fetch the exam
        const exam = await Exam.findById(examId);
        if (!exam) return res.status(404).json({ message: "Exam not found" });

        // 2. THE LOCK GUARD (7 DAYS)
        const existingMark = await Mark.findOne({ examId, subjectId, classId });
        if (existingMark) {
            const now = new Date();
            const firstSubmission = new Date(existingMark.createdAt);
            const diffInDays = (now - firstSubmission) / (1000 * 60 * 60 * 24);

            if (diffInDays > 7) {
                return res.status(403).json({ 
                    message: "Access Denied: The 7-day editing window has expired." 
                });
            }
        }

        // 3. Preparation for Save — subject-wise max marks
        const bulkOps = marksData.map((record) => {
            // Check subjectMaxMarks map first, fall back to defaultMaxMarks
            const subjectIdStr = subjectId.toString();
            const subjectSpecificMax = exam.subjectMaxMarks && exam.subjectMaxMarks.get
                ? exam.subjectMaxMarks.get(subjectIdStr)
                : (exam.subjectMaxMarks || {})[subjectIdStr];

            const effectiveMax = subjectSpecificMax
                ? Number(subjectSpecificMax)
                : (exam.defaultMaxMarks || exam.maxMarks || 100);

            const grade = calculateGrade(record.marksObtained, effectiveMax);
            return {
                updateOne: {
                    filter: { studentId: record.studentId, examId, subjectId },
                    update: {
                        $set: {
                            ...record,
                            classId: classId,
                            maxMarks: effectiveMax,
                            grade,
                            teacherId: req.user._id,
                            academicYear
                        }
                    },
                    upsert: true
                }
            };
        });

        // 4. EXECUTE SAVE
        await Mark.bulkWrite(bulkOps);

        // 5. PREPARE HUMAN-READABLE NOTIFICATION (The Fix)
        // We do the lookups AFTER the save is successful
        const [targetClass, targetSubject] = await Promise.all([
            Class.findById(classId),
            Subject.findById(subjectId)
        ]);

        const className = targetClass ? targetClass.className : "Unknown Class";
        const subjectName = targetSubject ? targetSubject.subjectName : "Subject";

        // 6. CREATE NOTIFICATION
        await Notification.create({
            recipientRole: 'admin',
            title: 'Marks Updated',
            message: `Teacher ${req.user.name} submitted ${subjectName} marks for Class ${className}.`,
            link: '/admin/marks'
        });

        // 7. Push to admin
        await sendPushToRole('admin', {
            title: '≡ƒô¥ Marks Submitted',
            body:  `${req.user.name} submitted ${subjectName} marks for Class ${className}.`,
            url:   '/admin/marks'
        });

        res.status(200).json({ message: "Marks saved and Admin notified." });

    } catch (error) {
        console.error("BULK_MARK_ERROR:", error);
        // We send the specific error message to help you debug
        res.status(500).json({ message: error.message });
    }
};


// @desc    Get Class-wise Rank List (Step 5 - Analytics)
// @route   GET /api/marks/ranklist/:classId/:examId
const getClassRankList = async (req, res) => {
    try {
        const { classId, examId } = req.params;
        const mongoose = require('mongoose');

        // 1. CONVERT TO OBJECTID (Crucial for $match to work)
        const targetClassId = new mongoose.Types.ObjectId(classId);
        const targetExamId = new mongoose.Types.ObjectId(examId);

        const rankList = await Mark.aggregate([
            { 
                $match: { 
                    classId: targetClassId, 
                    examId: targetExamId 
                }
            },
            {
                $group: {
                    _id: "$studentId", // Calculate totals per student
                    totalObtained: { $sum: "$marksObtained" },
                    totalMax: { $sum: "$maxMarks" }
                }
            },
            {
                $lookup: {
                    from: "students", // Join with Student names
                    localField: "_id",
                    foreignField: "_id",
                    as: "studentInfo"
                }
            },
            { $unwind: "$studentInfo" },
            {
                $project: {
                    name: "$studentInfo.name",
                    UID: "$studentInfo.UID",
                    totalObtained: 1,
                    totalMax: 1,
                    percentage: { 
                        $multiply: [{ $divide: ["$totalObtained", "$totalMax"] }, 100] 
                    }
                }
            },
            { $sort: { totalObtained: -1 } } // Highest scores first
        ]);

        if (rankList.length === 0) {
            return res.status(404).json({ message: "No marks data found for this class and exam." });
        }

        const finalResults = rankList.map((item, index) => ({
            rank: index + 1,
            ...item,
            percentage: item.percentage.toFixed(2)
        }));

        res.status(200).json(finalResults);
    } catch (error) {
        console.error("RANKLIST_ERROR:", error);
        res.status(500).json({ message: "Failed to generate rank list" });
    }
};




// @desc    Get Student Report Card (Step 5)
// @route   GET /api/marks/report-card/:studentId/:examId
const getStudentReportCard = async (req, res) => {
    try {
        const { studentId, examId } = req.params;

        const marks = await Mark.find({ studentId, examId })
            .populate('subjectId', 'subjectName subjectCode')
            .populate('teacherId', 'name');

        if (marks.length === 0) return res.status(404).json({ message: "No marks found for this exam." });

        const totalObtained = marks.reduce((sum, m) => sum + m.marksObtained, 0);
        const totalMax = marks.reduce((sum, m) => sum + m.maxMarks, 0);
        const percentage = ((totalObtained / totalMax) * 100).toFixed(2);

        res.status(200).json({
            studentId,
            examId,
            totalObtained,
            totalMax,
            percentage,
            subjects: marks
        });
    } catch (error) {
        res.status(500).json({ message: "Report Card Error", error: error.message });
    }
};

// @desc    Get full result sheet for a class + exam (subject-wise breakdown per student)
// @route   GET /api/admin/results/sheet/:classId/:examId
const getExamResultSheet = async (req, res) => {
    try {
        const classId = new mongoose.Types.ObjectId(req.params.classId);
        const examId  = new mongoose.Types.ObjectId(req.params.examId);

        const marks = await Mark.find({ classId, examId })
            .populate('studentId', 'name UID admissionNo fatherName motherName address dateOfBirth class profileImage')
            .populate('subjectId', 'subjectName subjectCode');

        if (!marks.length) return res.status(404).json({ message: "No marks found for this exam and class." });

        // Build a map: studentId -> { student info, subjects[] }
        const studentMap = {};
        marks.forEach(m => {
            // Guard: skip if student was deleted
            if (!m.studentId) return;

            const sid = m.studentId._id.toString();
            if (!studentMap[sid]) {
                studentMap[sid] = {
                    studentId: sid,
                    name: m.studentId.name,
                    UID: m.studentId.UID,
                    admissionNo: m.studentId.UID,
                    fatherName: m.studentId.fatherName || '',
                    motherName: m.studentId.motherName || '',
                    address: m.studentId.address || '',
                    dob: m.studentId.dateOfBirth || null,
                    class: m.studentId.class || '',
                    profileImage: m.studentId.profileImage || '',
                    subjects: [],
                    totalObtained: 0,
                    totalMax: 0
                };
            }
            studentMap[sid].subjects.push({
                subjectName: m.subjectId?.subjectName || 'Unknown',
                subjectCode: m.subjectId?.subjectCode || '',
                marksObtained: m.marksObtained,
                maxMarks: m.maxMarks,
                grade: m.grade
            });
            studentMap[sid].totalObtained += m.marksObtained;
            studentMap[sid].totalMax      += m.maxMarks;
        });

        const results = Object.values(studentMap).map(s => ({
            ...s,
            percentage: ((s.totalObtained / s.totalMax) * 100).toFixed(2),
            overallGrade: calculateGrade(s.totalObtained, s.totalMax)
        })).sort((a, b) => b.totalObtained - a.totalObtained)
          .map((s, i) => ({ ...s, rank: i + 1 }));

        res.status(200).json(results);
    } catch (err) {
        console.error("RESULT_SHEET_ERROR:", err);
        res.status(500).json({ message: "Result sheet error", error: err.message });
    }
};

// @desc    Get combined final result across multiple exams for a class
// @route   GET /api/admin/results/final/:classId?examIds=id1,id2,...
const getFinalResult = async (req, res) => {
    try {
        const classId  = new mongoose.Types.ObjectId(req.params.classId);
        const examIds  = (req.query.examIds || '').split(',').filter(Boolean).map(id => new mongoose.Types.ObjectId(id));

        if (!examIds.length) return res.status(400).json({ message: "Provide at least one examId." });

        const marks = await Mark.find({ classId, examId: { $in: examIds } })
            .populate('studentId', 'name UID fatherName motherName address dateOfBirth class profileImage')
            .populate('subjectId', 'subjectName subjectCode')
            .populate('examId', 'examName examType term component maxMarks');

        if (!marks.length) return res.status(404).json({ message: "No marks found for selected exams." });

        // Map component key -> which term1/term2 field it fills
        const COMPONENT_FIELD = {
            periodicTest:  'periodicTest',
            noteBooks:     'noteBooks',
            subEnrichment: 'subEnrichment',
            finalExam:     null, // goes into halfYearlyExam (T1) or yearlyExam (T2)
        };

        const studentMap = {};

        marks.forEach(m => {
            if (!m.studentId || !m.subjectId || !m.examId) return;

            const sid      = m.studentId._id.toString();
            const subCode  = m.subjectId.subjectCode || m.subjectId.subjectName;
            const term     = m.examId.term || 'Term-1';          // "Term-1" | "Term-2"
            const compKey  = m.examId.component || m.examId.examType; // e.g. "periodicTest"
            const termKey  = term === 'Term-2' ? 'term2' : 'term1';

            // Init student
            if (!studentMap[sid]) {
                studentMap[sid] = {
                    studentId: sid,
                    name:        m.studentId.name,
                    UID:         m.studentId.UID,
                    admissionNo: m.studentId.UID,
                    fatherName:  m.studentId.fatherName  || '',
                    motherName:  m.studentId.motherName  || '',
                    address:     m.studentId.address     || '',
                    dob:         m.studentId.dateOfBirth || null,
                    class:       m.studentId.class       || '',
                    profileImage: m.studentId.profileImage || '',
                    subjectMap:  {},
                    grandObtained: 0,
                    grandMax:      0,
                };
            }

            // Init subject
            if (!studentMap[sid].subjectMap[subCode]) {
                studentMap[sid].subjectMap[subCode] = {
                    subjectName: m.subjectId.subjectName,
                    subjectCode: subCode,
                    term1: { periodicTest: null, noteBooks: null, subEnrichment: null, halfYearlyExam: null, total: 0, maxTotal: 0 },
                    term2: { periodicTest: null, noteBooks: null, subEnrichment: null, yearlyExam: null,     total: 0, maxTotal: 0 },
                };
            }

            const sub  = studentMap[sid].subjectMap[subCode];
            const tObj = sub[termKey];

            // Place marks into the right column
            if (compKey === 'periodicTest')  { tObj.periodicTest  = m.marksObtained; }
            else if (compKey === 'noteBooks')     { tObj.noteBooks     = m.marksObtained; }
            else if (compKey === 'subEnrichment') { tObj.subEnrichment = m.marksObtained; }
            else if (compKey === 'finalExam') {
                if (termKey === 'term1') tObj.halfYearlyExam = m.marksObtained;
                else                    tObj.yearlyExam     = m.marksObtained;
            } else {
                // Legacy / unknown component — treat as final exam column
                if (termKey === 'term1') tObj.halfYearlyExam = m.marksObtained;
                else                    tObj.yearlyExam     = m.marksObtained;
            }

            // Accumulate term total
            tObj.total    += m.marksObtained;
            tObj.maxTotal += m.maxMarks;

            // Grand totals
            studentMap[sid].grandObtained += m.marksObtained;
            studentMap[sid].grandMax      += m.maxMarks;
        });

        const results = Object.values(studentMap).map(s => {
            const subjects = Object.values(s.subjectMap).map(sub => {
                // Compute grades per term
                const t1pct = sub.term1.maxTotal > 0 ? (sub.term1.total / sub.term1.maxTotal) * 100 : 0;
                const t2pct = sub.term2.maxTotal > 0 ? (sub.term2.total / sub.term2.maxTotal) * 100 : 0;
                return {
                    subjectName: sub.subjectName,
                    subjectCode: sub.subjectCode,
                    term1: { ...sub.term1, grade: sub.term1.maxTotal > 0 ? gradeFromPct(t1pct) : '—' },
                    term2: { ...sub.term2, grade: sub.term2.maxTotal > 0 ? gradeFromPct(t2pct) : '—' },
                };
            });

            return {
                studentId:    s.studentId,
                name:         s.name,
                UID:          s.UID,
                admissionNo:  s.admissionNo,
                fatherName:   s.fatherName,
                motherName:   s.motherName,
                address:      s.address,
                dob:          s.dob,
                class:        s.class,
                profileImage: s.profileImage,
                subjects,
                totalObtained: s.grandObtained,
                totalMax:      s.grandMax,
                percentage:    s.grandMax > 0 ? ((s.grandObtained / s.grandMax) * 100).toFixed(2) : '0.00',
                overallGrade:  calculateGrade(s.grandObtained, s.grandMax),
            };
        }).sort((a, b) => b.totalObtained - a.totalObtained)
          .map((s, i) => ({ ...s, rank: i + 1 }));

        res.status(200).json(results);
    } catch (err) {
        console.error("FINAL_RESULT_ERROR:", err);
        res.status(500).json({ message: "Final result error", error: err.message });
    }
};

module.exports = { bulkEnterMarks, getClassRankList, getStudentReportCard, getExamResultSheet, getFinalResult };