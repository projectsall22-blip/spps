const Attendance = require('../models/Attendance');
const TeacherAssignment = require('../models/TeacherAssignment');
const Class = require('../models/Class');
const mongoose = require('mongoose');
const Settings = require('../models/Settings');
const Notification = require('../models/Notification');
const { sendPushToUsers } = require('../utils/sendPushNotification');

// @desc    Mark or Update attendance for a whole class (Bulk)
// @route   POST /api/teacher/attendance/mark
// @access  Private (Teacher/Admin)
const markAttendance = async (req, res) => {
    try {
        const { classId, date, attendanceData } = req.body;

        // 1. Basic Validation
        if (!classId || !date || !attendanceData) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const [targetClass, settings] = await Promise.all([
            Class.findById(classId),
            require('../models/Settings').findOne() 
        ]);
        if (!targetClass) return res.status(404).json({ message: "Class not found." });

        const activeYear = settings ? settings.currentAcademicYear : "2025-26";

        // 2. Authority Check
        if (req.user.role === 'teacher' && targetClass.classTeacher?.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Access Denied: Only the official Class Teacher can mark attendance." });
        }

        // 3. Date Normalization & Window Check (3-day limit)
        const attendanceDate = new Date(date);
        attendanceDate.setHours(0, 0, 0, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(today.getDate() - 3);
        threeDaysAgo.setHours(0, 0, 0, 0);

        if (attendanceDate > today) return res.status(400).json({ message: "Cannot mark attendance for future dates." });
        if (attendanceDate < threeDaysAgo) return res.status(403).json({ message: "Deadline Expired: Attendance window is 3 days." });

        // 4. Hard-Lock Check (Prevent overwriting if already marked by teacher)
        const existingRecord = await Attendance.findOne({ classId, date: attendanceDate, academicYear: activeYear });
        if (existingRecord && req.user.role === 'teacher') {
            return res.status(403).json({ message: "Attendance for this date is already locked." });
        }

        const allStudentIds = attendanceData.map(r => r.studentId);
        const dateStrForNotif = attendanceDate.toLocaleDateString('en-GB');

        // 5. Cleanup Phase: Wipe old notifications for this specific day using metadata
        await Notification.deleteMany({
            recipient: { $in: allStudentIds },
            "metadata.type": 'attendance',
            "metadata.date": attendanceDate 
        });

        // 6. Attendance Upsert Phase (Bulk Write)
        const attendanceOps = attendanceData.map((record) => ({
            updateOne: {
                filter: { studentId: record.studentId, date: attendanceDate },
                update: {
                    $set: {
                        studentId: record.studentId,
                        classId: classId,
                        date: attendanceDate,
                        status: record.status,
                        markedBy: req.user._id,
                        academicYear: activeYear,
                        remarks: record.remarks || ""
                    }
                },
                upsert: true
            }
        }));

        await Attendance.bulkWrite(attendanceOps);

        // 7. Notification Creation Phase (Broadcast to all students in payload)
        const notifPromises = attendanceData.map(record => {
            const statusMessage = record.status === 'Absent' 
                ? `You were marked Absent on ${dateStrForNotif}.`
                : `You were marked Present on ${dateStrForNotif}.`;
            
            return Notification.create({
                recipient: new mongoose.Types.ObjectId(record.studentId), 
                recipientRole: 'student',
                title: 'Attendance Alert',
                message: statusMessage,
                link: '/student/attendance',
                metadata: { type: 'attendance', date: attendanceDate }
            });
        });

        await Promise.all(notifPromises);

        // 8. Push notifications to absent students' phones
        const absentStudentIds = attendanceData
            .filter(r => r.status === 'Absent')
            .map(r => r.studentId);

        if (absentStudentIds.length > 0) {
            await sendPushToUsers(absentStudentIds, {
                title: 'ΓÜá∩╕Å Attendance Alert',
                body:  `You were marked Absent on ${dateStrForNotif}.`,
                url:   '/student/attendance'
            });
        }

        // Also notify present students
        const presentStudentIds = attendanceData
            .filter(r => r.status === 'Present')
            .map(r => r.studentId);

        if (presentStudentIds.length > 0) {
            await sendPushToUsers(presentStudentIds, {
                title: 'Γ£à Attendance Marked',
                body:  `You were marked Present on ${dateStrForNotif}.`,
                url:   '/student/attendance'
            });
        }

        console.log(`Γ£à Attendance synced for Class ${targetClass.className} on ${dateStrForNotif}`);
        res.status(200).json({ message: "Attendance and Notifications synchronized." });

    } catch (error) {
        console.error("≡ƒÆÑ ATTENDANCE_ERROR:", error.message);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};



// @desc    Get logged-in student's attendance summary & history
// @route   GET /api/attendance/my-summary
const getMyAttendance = async (req, res) => {
    try {
        const studentId = req.user._id;

        // 1. FETCH CONTEXT
        const [settings, student] = await Promise.all([
            require('../models/Settings').findOne(),
            require('../models/Student').findById(studentId)
        ]);

        if (!student) return res.status(404).json({ message: "Student not found" });

        // Ensure the year string is clean and trimmed
        const activeYear = settings ? settings.currentAcademicYear.trim() : "2025-26";

        
        // 2. FIND CLASS
        const targetClass = await require('../models/Class').findOne({ className: student.class });

        // 3. DATE NORMALIZATION
        const month = req.query.month ? parseInt(req.query.month) - 1 : new Date().getMonth();
        const year = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();

        const startOfMonth = new Date(year, month, 1, 0, 0, 0);
        const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

        // 4. FETCH RECORDS (Strictly scoped to Current Session)
        const monthlyRecords = await Attendance.find({
            studentId: studentId,
            academicYear: activeYear, // <--- This ensures January 2025 data doesn't show in January 2026
            date: { $gte: startOfMonth, $lte: endOfMonth }
        })
        .populate('markedBy', 'name')
        .sort({ date: -1 });

        // 5. CALCULATE WORKING DAYS
        // We use the Student's Class Name to find how many days attendance was marked for that grade
        let totalWorkingDays = 0;
        if (targetClass) {
            const workingDaysData = await Attendance.distinct("date", {
                classId: targetClass._id,
                academicYear: activeYear,
                date: { $gte: startOfMonth, $lte: endOfMonth }
            });
            totalWorkingDays = workingDaysData.length;
        }

        // 6. AGGREGATE STATS
        const stats = {
            presentDays: 0,
            absentDays: 0,
            lateDays: 0,
            halfDays: 0,
            percentage: 0
        };

        monthlyRecords.forEach(rec => {
            if (rec.status === 'Present') stats.presentDays++;
            if (rec.status === 'Absent') stats.absentDays++;
            if (rec.status === 'Late') stats.lateDays++;
            if (rec.status === 'Half-day') stats.halfDays++;
        });

        // 7. CALCULATION (Denominator Guard)
        // If a student has records but the class working days check fails, 
        // we use the records length as a fallback to prevent 0% errors.
        const denominator = Math.max(totalWorkingDays, monthlyRecords.length);

        if (denominator > 0) {
            const attendanceScore = stats.presentDays + stats.lateDays + (stats.halfDays * 0.5);
            stats.percentage = ((attendanceScore / denominator) * 100).toFixed(1);
        }

        // 8. ARCHITECT LOG (Check your terminal!)
        console.log(`[Attendance Auth] Student: ${student.name} | Class: ${student.class} | Session: ${activeYear} | Found: ${monthlyRecords.length}`);

        res.status(200).json({
            monthlyStats: stats,
            dailyRecords: monthlyRecords,
            sessionInfo: {
                activeYear,
                totalWorkingDays: denominator
            }
        });

    } catch (error) {
        console.error("ATTENDANCE_SYNC_CRASH:", error);
        res.status(500).json({ message: "Server error during session fetch" });
    }
};

// @desc    Get attendance report for a class with Defaulter logic
// @route   GET /api/attendance/class-report/:classId
const getClassReport = async (req, res) => {
    try {
        const { classId } = req.params;
        const { academicYear } = req.query;

        const report = await Attendance.aggregate([
            { $match: { 
                classId: new mongoose.Types.ObjectId(classId),
                academicYear: academicYear 
            }},
            {
                $group: {
                    _id: "$studentId",
                    presentCount: {
                        $sum: { $cond: [{ $eq: ["$status", "Present"] }, 1, 0] }
                    },
                    totalCount: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: "students",
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
                    presentCount: 1,
                    totalCount: 1,
                    percentage: { 
                        $multiply: [{ $divide: ["$presentCount", "$totalCount"] }, 100] 
                    }
                }
            },
            { $sort: { percentage: 1 } } // Show lowest attendance first (Defaulters)
        ]);

        res.status(200).json(report);
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

const checkAttendanceStatus = async (req, res) => {
    try {
        const { classId, date } = req.query;

        if (!classId || !date) {
            return res.status(400).json({ message: "Class and Date required" });
        }

        const settings = await require('../models/Settings').findOne();
        const activeYear = settings ? settings.currentAcademicYear : "2025-26";

        const checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0);

        // We only need to find ONE record to know the day is locked
        const existing = await Attendance.findOne(
            { 
                classId,
                date: checkDate,
                academicYear: activeYear 

            });

        res.status(200).json({ 
            isMarked: !!existing // Returns true if exists, false otherwise
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};

// ADD THIS TO YOUR module.exports
module.exports = { markAttendance, getMyAttendance, getClassReport, checkAttendanceStatus };