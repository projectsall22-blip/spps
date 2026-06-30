const Timetable = require('../models/Timetable');
const Student = require('../models/Student');
const Class = require('../models/Class');
const mongoose = require('mongoose')
const Settings = require('../models/Settings');

// HELPER: Convert "HH:MM" to minutes for easy comparison
const timeToMinutes = (timeStr) => {
    const [hrs, mins] = timeStr.split(':').map(Number);
    return hrs * 60 + mins;
};

// HELPER: Check if two time slots overlap
const isOverlapping = (start1, end1, start2, end2) => {
    const s1 = timeToMinutes(start1);
    const e1 = timeToMinutes(end1);
    const s2 = timeToMinutes(start2);
    const e2 = timeToMinutes(end2);
    return s1 < e2 && s2 < e1; // Standard overlap logic
};

// @desc    Step 2: Create or Update Timetable with Conflict Validation
// @route   POST /api/timetable/save
const saveTimetable = async (req, res) => {
    try {
        const { classId, day, periods, academicYear } = req.body;

        // 1. Basic Validation
        if (!classId || !day || !periods || !academicYear) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        // 2. INTERNAL VALIDATION (Check if periods overlap within THIS class)
        for (let i = 0; i < periods.length; i++) {
            for (let j = i + 1; j < periods.length; j++) {
                if (isOverlapping(periods[i].startTime, periods[i].endTime, periods[j].startTime, periods[j].endTime)) {
                    return res.status(400).json({ 
                        message: `Internal Conflict: Period ${periods[i].periodNumber} and Period ${periods[j].periodNumber} overlap in time.` 
                    });
                }
            }
        }

        // 3. EXTERNAL VALIDATION (Cross-Class Sweep for Teachers)
        // Find all other classes for the SAME day and academic year
        const otherClassesTimetables = await Timetable.find({ 
            day, 
            academicYear, 
            classId: { $ne: classId } // Exclude current class
        }).populate('periods.teacherId', 'name');

        for (const newPeriod of periods) {
            // Only check conflicts if a teacher is assigned (ignore Breaks/Assembly)
            if (newPeriod.periodType === 'Class' && newPeriod.teacherId) {
                
                for (const otherTable of otherClassesTimetables) {
                    for (const existingPeriod of otherTable.periods) {
                        
                        // Check if it's the SAME teacher and the SAME time
                        if (
                            existingPeriod.teacherId && 
                            existingPeriod.teacherId._id.toString() === newPeriod.teacherId.toString() &&
                            isOverlapping(newPeriod.startTime, newPeriod.endTime, existingPeriod.startTime, existingPeriod.endTime)
                        ) {
                            return res.status(409).json({ 
                                message: `Teacher Conflict: ${existingPeriod.teacherId.name} is already assigned to another class during this time (${existingPeriod.startTime} - ${existingPeriod.endTime})` 
                            });
                        }
                    }
                }
            }
        }

        const sanitizedPeriods = periods.map(period => {
        const sanitized = { ...period };

        // If endTime is missing or placeholder, set it to startTime (non-breaking fallback)
        if (!sanitized.endTime || sanitized.endTime === '--:--' || sanitized.endTime === '') {
            sanitized.endTime = sanitized.startTime;
        }

        // Strip subjectId and teacherId for non-class periods to avoid ObjectId cast errors
        if (sanitized.periodType !== 'Class') {
            sanitized.subjectId = undefined;
            sanitized.teacherId = undefined;
        }

        return sanitized;
    });
        // 4. Save or Update (Upsert Logic)
        const timetable = await Timetable.findOneAndUpdate(
            { classId, day, academicYear },
            { classId, day, periods: sanitizedPeriods, academicYear, createdBy: req.user._id },
            { upsert: true, new: true }
        );

        res.status(200).json({ message: "Timetable saved successfully without conflicts", timetable });

    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};


const getMyTimetable = async (req, res) => {
    try {
        // 1. Identify the student from the token
        const student = await Student.findById(req.user._id);
        if (!student) return res.status(404).json({ message: "Student not found" });

        // 2. Fetch the Global Settings document to get the REAL current year
        // We do this BEFORE the timetable query
        const schoolSettings = await require('../models/Settings').findOne();
        const activeYear = schoolSettings ? schoolSettings.currentAcademicYear : "2025-26";

        // 3. Translate student's class string (e.g., "8") into the Class ObjectId
        const targetClass = await Class.findOne({ className: student.class });
        
        if (!targetClass) {
            return res.status(404).json({ message: `Infrastructure for Class ${student.class} not found` });
        }

        // 4. Fetch the schedule using the FETCHED activeYear variable
        const weekSchedule = await Timetable.find({ 
            classId: targetClass._id,
            academicYear: activeYear // <--- FIXED: Using the variable from step 2
        })
        .populate('periods.subjectId', 'subjectName')
        .populate('periods.teacherId', 'name')
        .sort({ day: 1 });

        // 5. Professional Day Sorting
        const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const sortedSchedule = weekSchedule.sort((a, b) => {
            return dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
        });

        // 6. Final Debug Log (Check your terminal after hitting the route)
        console.log(`Timetable fetched for Class ${student.class} in Session ${activeYear}. Found ${sortedSchedule.length} days.`);

        res.status(200).json(sortedSchedule);
    } catch (error) {
        console.error("TIMETABLE_ERROR:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};


const getTeacherAgenda = async (req, res) => {
    try {
        const teacherId = req.user._id;

        // Use Aggregation to pluck out only this teacher's periods from all classes
        const agenda = await Timetable.aggregate([
            { $unwind: "$periods" }, // Break the periods array into individual documents
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
                    day: 1,
                    academicYear: 1,
                    periodNumber: "$periods.periodNumber",
                    startTime: "$periods.startTime",
                    endTime: "$periods.endTime",
                    className: "$classDetails.className",
                    subjectName: "$subjectDetails.subjectName"
                }
            },
            { $sort: { day: 1, startTime: 1 } }
        ]);

        // Group by Day for a cleaner UI response
        const groupedAgenda = agenda.reduce((acc, curr) => {
            if (!acc[curr.day]) acc[curr.day] = [];
            acc[curr.day].push(curr);
            return acc;
        }, {});

        res.status(200).json(groupedAgenda);
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// @desc    Step 5: "Live Now" Dashboard Context
// @route   GET /api/timetable/live-status
const getLiveStatus = async (req, res) => {
    try {
        const now = new Date();
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const currentDay = days[now.getDay()];
        
        // Format current time as minutes from midnight (e.g., 08:30 -> 510)
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        let schedule = [];

        if (req.user.role === 'student') {
            const student = await Student.findById(req.user._id);
            const targetClass = await Class.findOne({ className: student.class });
            const todayDoc = await Timetable.findOne({ classId: targetClass._id, day: currentDay })
                .populate('periods.subjectId', 'subjectName');
            schedule = todayDoc ? todayDoc.periods : [];
        } 
        else if (req.user.role === 'teacher') {
            const todayDocs = await Timetable.find({ day: currentDay, "periods.teacherId": req.user._id })
                .populate('periods.subjectId', 'subjectName');
            // Extract only this teacher's periods for today
            schedule = todayDocs.flatMap(doc => doc.periods.filter(p => p.teacherId?.toString() === req.user._id.toString()));
        }

        // Find Current and Next Period
        let currentPeriod = null;
        let nextPeriod = null;

        const sortedSchedule = schedule.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

        for (let i = 0; i < sortedSchedule.length; i++) {
            const start = timeToMinutes(sortedSchedule[i].startTime);
            const end = timeToMinutes(sortedSchedule[i].endTime);

            if (currentMinutes >= start && currentMinutes < end) {
                currentPeriod = sortedSchedule[i];
                nextPeriod = sortedSchedule[i + 1] || null;
                break;
            }
            if (currentMinutes < start) {
                nextPeriod = sortedSchedule[i];
                break;
            }
        }

        res.status(200).json({
            day: currentDay,
            currentTime: `${now.getHours()}:${now.getMinutes()}`,
            currentPeriod,
            nextPeriod
        });

    } catch (error) {
        res.status(500).json({ message: "Status Error", error: error.message });
    }
};


// @desc    Get timetable for a specific class and day (Admin View)
// @route   GET /api/timetable/admin/fetch
const getTimetableForAdmin = async (req, res) => {
    try {
        const { classId, day, academicYear } = req.query;

        if (!classId || !day) {
            return res.status(400).json({ message: "Class and Day are required" });
        }

        const timetable = await Timetable.findOne({ 
            classId, 
            day, 
            academicYear: academicYear || settings.currentAcademicYear 
        });

        // If no timetable exists yet, return an empty array of periods
        if (!timetable) {
            return res.status(200).json({ periods: [] });
        }

        res.status(200).json(timetable);
    } catch (error) {
        res.status(500).json({ message: "Fetch error", error: error.message });
    }
};


// Update your exports
module.exports = { saveTimetable, getMyTimetable, getTeacherAgenda, getLiveStatus, getTimetableForAdmin };