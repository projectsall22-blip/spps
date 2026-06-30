const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Class = require('../models/Class');
const Attendance = require('../models/Attendance');
const Announcement = require('../models/Announcement');
const Homework = require('../models/Homework');
const Exam = require('../models/Exam');
const Mark = require('../models/Mark');
const TeacherAssignment = require('../models/TeacherAssignment');
const Timetable = require('../models/Timetable');
const mongoose = require('mongoose');
const Settings = require('../models/Settings');

// @desc    Step 1: Get Admin Dashboard Analytics (The Big Numbers)
// @route   GET /api/admin/dashboard-stats
const getAdminStats = async (req, res) => {
    try {
        
        const settings = await Settings.findOne();
        const activeYear = settings ? settings.currentAcademicYear : "2025-26";

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [
            totalStudents,
            totalTeachers,
            totalClasses,
            presentToday,
            recentNotices,
            latestHomework
        ] = await Promise.all([
            Student.countDocuments({ accountStatus: 'active' }),
            Teacher.countDocuments({ isActive: true }),
            Class.countDocuments({}),
            Attendance.countDocuments({ date: today, status: 'Present', academicYear: activeYear }),
            Announcement.find({ isActive: true, academicYear: activeYear }).sort({ createdAt: -1 }).limit(3).select('title priority'),
            Homework.find({academicYear: activeYear}).sort({ createdAt: -1 }).limit(3).populate('classId', 'className').populate('subjectId', 'subjectName')
        ]);

        const attendancePercentage = totalStudents > 0 
            ? ((presentToday / totalStudents) * 100).toFixed(2) 
            : 0;

        res.status(200).json({
            overview: { totalStudents, totalTeachers, totalClasses, attendancePercentage, presentToday },
            recentActivity: { notices: recentNotices, homework: latestHomework }
        });
    } catch (error) {
        res.status(500).json({ message: "Stats Error", error: error.message });
    }
};

// @desc    Step 2: Admin Strategic Oversight (The School Pulse)
// @route   GET /api/admin/dashboard
const getAdminDashboard = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [totalStudents, totalTeachers, classStrength, todayAttendance] = await Promise.all([
            Student.countDocuments({ accountStatus: 'active' }),
            Teacher.countDocuments({ isActive: true }),
            Class.countDocuments({ academicYear: activeYear }), // ADD FILTER
            Attendance.countDocuments({ date: today, status: 'Present', academicYear: activeYear }), // ADD FILTER
            Announcement.find({ isActive: true }).sort({ createdAt: -1 }).limit(3),
            Homework.find({ academicYear: activeYear }) // ADD FILTER
                .sort({ createdAt: -1 })
                .limit(3)
                .populate('classId', 'className')
                .populate('subjectId', 'subjectName')
        ]);

        const allClasses = await Class.find().select('className');
        const markedClassIds = [...new Set(todayAttendance.map(a => a.classId.toString()))];
        
        const pendingAttendanceClasses = allClasses.filter(c => 
            !markedClassIds.includes(c._id.toString())
        ).map(c => c.className);

        res.status(200).json({
            strength: { totalStudents, totalTeachers, classStrength },
            todayActivity: {
                present: todayAttendance.filter(a => a.status === 'Present').length,
                absent: todayAttendance.filter(a => a.status === 'Absent').length,
                pendingClasses: pendingAttendanceClasses
            }
        });
    } catch (error) {
        res.status(500).json({ message: "Admin Dashboard Error", error: error.message });
    }
};

// @desc    Step 3: Teacher Operative Dashboard (The To-Do List)
// @route   GET /api/teacher/dashboard
const getTeacherDashboard = async (req, res) => {
    try {
        const teacherId = req.user._id;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const currentDay = days[today.getDay()];

        // 1. FETCH SYSTEM CONTEXT (The Session Guard)
        const settings = await Settings.findOne();
        const activeYear = settings ? settings.currentAcademicYear : "2024-2025";

        // 2. FETCH ASSIGNMENTS
        const assignments = await TeacherAssignment.find({ teacherId })
            .populate('classId', 'className')
            .populate('subjectId', 'subjectName');

        // 3. ATTENDANCE ALERTS (Now Session-Aware)
        const managedClasses = await Class.find({ classTeacher: teacherId });
        const managedClassIds = managedClasses.map(c => c._id.toString());

        // FIX: Added academicYear to the query
        const markedAttendanceRecords = await Attendance.find({ 
            date: today, 
            classId: { $in: managedClassIds },
            academicYear: activeYear // <--- THIS PREVENTS SESSION LEAKAGE
        });
        
        // Extract IDs of classes that ARE marked for THIS session today
        const markedClassIds = [...new Set(markedAttendanceRecords.map(a => a.classId.toString()))];
        
        // Only show alert if the class hasn't been marked in the CURRENT session
        const pendingAttendance = managedClasses
            .filter(c => !markedClassIds.includes(c._id.toString()))
            .map(c => c.className);

        // 4. TODAY'S SCHEDULE (Aggregation - already session aware from previous fixes)
        const todaySchedule = await Timetable.aggregate([
            { $match: { day: currentDay, academicYear: activeYear } },
            { $unwind: "$periods" },
            { $match: { "periods.teacherId": new mongoose.Types.ObjectId(teacherId) } },
            {
                $lookup: {
                    from: "classes",
                    localField: "classId",
                    foreignField: "_id",
                    as: "classDetails"
                }
            },
            {
                $lookup: {
                    from: "subjects",
                    localField: "periods.subjectId",
                    foreignField: "_id",
                    as: "subjectDetails"
                }
            },
            { $unwind: "$classDetails" },
            { $unwind: "$subjectDetails" },
            {
                $project: {
                    periodNumber: "$periods.periodNumber",
                    startTime: "$periods.startTime",
                    endTime: "$periods.endTime",
                    className: "$classDetails.className",
                    subjectName: "$subjectDetails.subjectName"
                }
            },
            { $sort: { startTime: 1 } }
        ]);

        // 5. MARKS ENTRY ALERTS (Session-Aware)
        const ongoingExams = await Exam.find({ status: 'Ongoing', academicYear: activeYear });
        const examIds = ongoingExams.map(e => e._id);
        const existingMarks = await Mark.find({ teacherId, examId: { $in: examIds }, academicYear: activeYear });
        const markedExamSubjectKeys = existingMarks.map(m => `${m.examId}-${m.subjectId}`);

        const pendingMarks = [];
        ongoingExams.forEach(exam => {
            assignments.forEach(asgn => {
                const key = `${exam._id}-${asgn.subjectId._id}`;
                if (!markedExamSubjectKeys.includes(key)) {
                    pendingMarks.push({
                        examName: exam.examName,
                        class: asgn.classId.className,
                        subject: asgn.subjectId.subjectName
                    });
                }
            });
        });

        // 6. RETURN DATA
        res.status(200).json({
            schedule: todaySchedule,
            alerts: {
                attendanceRequired: [...new Set(pendingAttendance)],
                marksEntryRequired: pendingMarks
            },
            myAssignments: assignments
        });

    } catch (error) {
        console.error("DASHBOARD_CRASH:", error);
        res.status(500).json({ message: "Teacher Dashboard Error", error: error.message });
    }
};



const getStudentDashboard = async (req, res) => {
    try {
        const studentId = req.user._id;
        const studentClass = req.user.class; 
        const today = new Date();
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const currentDay = days[today.getDay()];

        const Settings = require('../models/Settings');
        const HomeworkCompletion = require('../models/HomeworkCompletion'); // <--- MUST IMPORT

        const settings = await Settings.findOne();
        const currentYear = settings ? settings.currentAcademicYear : "2025-26";
        const classObj = await Class.findOne({ className: studentClass });

        // 3. Parallel Fetching (I have added 'studentCompletions' and renamed 'allClassHomework')
        const [attendanceStats, allClassHomework, studentCompletions, recentMarks, todaySchedule, announcements] = await Promise.all([
            Attendance.aggregate([
                { $match: { studentId: new mongoose.Types.ObjectId(studentId), academicYear: currentYear }},
                { $group: { _id: null, total: { $sum: 1 }, present: { $sum: { $cond: [{ $eq: ["$status", "Present"] }, 1, 0] } } } }
            ]),
            // 1. Fetch ALL active homework for this class (No .limit(3) here, we need the full count)
            Homework.find({ classId: classObj?._id, academicYear: currentYear, status: 'Active' }),
            
            // 2. Fetch this student's completions
            HomeworkCompletion.find({ studentId }),

            Mark.find({ studentId, academicYear: currentYear }).populate('subjectId', 'subjectName').populate('examId', 'examName').sort({ createdAt: -1 }).limit(5),
            Timetable.findOne({ classId: classObj?._id, day: currentDay, academicYear: currentYear }).populate('periods.subjectId', 'subjectName').populate('periods.teacherId', 'name'),
            Announcement.find({
                targetAudience: { $in: ['Students', 'Everyone'] },
                isActive: true,
                academicYear: currentYear 
            }, ).sort({ createdAt: -1 }).limit(3)
        ]);
        
        // 4. THE CALCULATION LOGIC
        const completedIds = studentCompletions.map(c => c.homeworkId.toString());
        // We filter the 'allClassHomework' array to find only those NOT in 'completedIds'
        const pendingHomework = allClassHomework.filter(hw => !completedIds.includes(hw._id.toString()));

        const stats = attendanceStats[0] || { total: 0, present: 0 };
        const attendancePercentage = stats.total > 0 ? ((stats.present / stats.total) * 100).toFixed(2) : 0;

        res.status(200).json({
            profileSummary: {
                name: req.user.name,
                class: studentClass,
                attendancePercentage
            },
            academicFeed: {
                // Return the calculated pending count
                pendingHomeworkCount: pendingHomework.length, 
                recentMarks: recentMarks
            },
            today: {
                schedule: todaySchedule ? todaySchedule.periods : [],
                announcements: announcements
            }
        });
    } catch (error) {
        console.error("DASHBOARD_ERROR:", error); 
        res.status(500).json({ message: "Student Dashboard Error", error: error.message });
    }
};


// @desc    Step 5: Global Discovery (Admin Search Everything)
// @route   GET /api/admin/search
const globalSearch = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.length < 2) return res.status(400).json({ message: "Search query too short" });

        const searchRegex = new RegExp(q, 'i');

        // Parallel search in Students and Teachers
        const [students, teachers] = await Promise.all([
            Student.find({ 
                $or: [{ name: searchRegex }, { UID: searchRegex }],
                accountStatus: 'active' 
            }).select('name UID class').limit(5),
            Teacher.find({ 
                $or: [{ name: searchRegex }, { employeeCode: searchRegex }],
                isActive: true 
            }).select('name employeeCode email').limit(5)
        ]);

        res.status(200).json({
            results: {
                students,
                teachers,
                totalFound: students.length + teachers.length
            }
        });
    } catch (error) {
        res.status(500).json({ message: "Search Error", error: error.message });
    }
};

// Update exports
module.exports = { 
    getAdminStats, 
    getAdminDashboard, 
    getTeacherDashboard, 
    getStudentDashboard, 
    globalSearch 
};