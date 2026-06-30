const Datesheet = require('../models/Datesheet');
const Exam = require('../models/Exam');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const Student = require('../models/Student');

// @desc    Create Datesheet Entry (with Time Conflict Check)
// @route   POST /api/datesheet/create
// @access  Private (Admin)
const createDatesheetEntry = async (req, res) => {
    try {
        const { examId, classId, subjectId, examDate, startTime, endTime, roomNumber, instructions } = req.body;

        // 1. Validation
        if (!examId || !classId || !subjectId || !examDate || !startTime || !endTime) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // 2. Verify Exam is in 'Scheduled' status
        const exam = await Exam.findById(examId);
        if (!exam) return res.status(404).json({ message: "Exam not found" });
        if (exam.status !== 'Scheduled') {
            return res.status(400).json({ message: "Can only create datesheets for Scheduled exams" });
        }

        // 3. Date Range Check
        const selectedDate = new Date(examDate);
        const examStart = new Date(exam.startDate);
        const examEnd = new Date(exam.endDate);
        
        if (selectedDate < examStart || selectedDate > examEnd) {
            return res.status(400).json({ 
                message: `Date must be between ${examStart.toLocaleDateString()} and ${examEnd.toLocaleDateString()}` 
            });
        }

        const targetYear = exam.academicYear; // Get the year from the exam

        const existingEntries = await Datesheet.find({ 
        classId, 
        examDate: selectedDate,
        academicYear: targetYear // ✅ ADD THIS LINE
        });

        for (let entry of existingEntries) {
            const entryStart = timeToMinutes(entry.startTime);
            const entryEnd = timeToMinutes(entry.endTime);
            const newStart = timeToMinutes(startTime);
            const newEnd = timeToMinutes(endTime);

            if ((newStart < entryEnd) && (entryStart < newEnd)) {
                return res.status(409).json({ 
                    message: `Conflict: This class already has an exam scheduled from ${entry.startTime} to ${entry.endTime}` 
                });
            }
        }

        // 5. Create Entry
        const entry = await Datesheet.create({
            examId,
            classId,
            subjectId,
            examDate: selectedDate,
            startTime,
            endTime,
            roomNumber: roomNumber || 'TBA',
            instructions: instructions || '',
            academicYear: exam.academicYear,
            createdBy: req.user._id
        });

        res.status(201).json({ message: "Datesheet entry created", entry });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "This subject is already scheduled for this class in this exam" });
        }
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Helper: Convert "HH:MM" to minutes
const timeToMinutes = (timeStr) => {
    const [hrs, mins] = timeStr.split(':').map(Number);
    return hrs * 60 + mins;
};

// @desc    Get Datesheet by Exam (Admin View)
// @route   GET /api/datesheet/exam/:examId
// @access  Private (Admin/Teacher)
const getDatesheetByExam = async (req, res) => {
    try {
        const { examId } = req.params;
        const { classId } = req.query; // Optional filter

        let query = { examId };
        if (classId) query.classId = classId;

        const entries = await Datesheet.find(query)
            .populate('classId', 'className')
            .populate('subjectId', 'subjectName subjectCode')
            .sort({ examDate: 1, startTime: 1 });

        res.status(200).json(entries);
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    Get Student's Personalized Datesheet
// @route   GET /api/datesheet/my-schedule/:examId
// @access  Private (Student)
const getMyDatesheet = async (req, res) => {
    try {
        const studentId = req.user._id;
        const { examId } = req.params;

        // 1. Find Student's Class
        const student = await Student.findById(studentId);
        if (!student) return res.status(404).json({ message: "Student not found" });

        // 2. Find Class ObjectId
        const targetClass = await Class.findOne({ className: student.class });
        if (!targetClass) return res.status(404).json({ message: "Class not found" });

        // 3. Fetch Datesheet
        const schedule = await Datesheet.find({ 
            examId, 
            classId: targetClass._id 
        })
        .populate('subjectId', 'subjectName subjectCode')
        .sort({ examDate: 1, startTime: 1 });

        res.status(200).json(schedule);
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    Delete Datesheet Entry
// @route   DELETE /api/datesheet/:id
// @access  Private (Admin)
const deleteDatesheetEntry = async (req, res) => {
    try {
        const entry = await Datesheet.findById(req.params.id);
        if (!entry) return res.status(404).json({ message: "Entry not found" });

        await Datesheet.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Entry removed" });
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    Update Datesheet Entry
// @route   PUT /api/datesheet/:id
// @access  Private (Admin)
const updateDatesheetEntry = async (req, res) => {
    try {
        const entry = await Datesheet.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        );
        res.status(200).json({ message: "Entry updated", entry });
    } catch (error) {
        res.status(500).json({ message: "Update failed" });
    }
};

module.exports = { 
    createDatesheetEntry, 
    getDatesheetByExam, 
    getMyDatesheet, 
    deleteDatesheetEntry,
    updateDatesheetEntry 
};