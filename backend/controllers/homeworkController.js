const Homework = require('../models/Homework');
const TeacherAssignment = require('../models/TeacherAssignment');
const Class = require('../models/Class');
const Student = require('../models/Student');
const HomeworkCompletion = require('../models/HomeworkCompletion');
const Settings = require('../models/Settings');

// @desc    Step 2: Create/Broadcast Homework (Post & Snap)
// @route   POST /api/homework/create
// @access  Private (Teacher/Admin)
const createHomework = async (req, res) => {
    try {
        const { title, description, imageUrl, classId, subjectId, academicYear, dueDate } = req.body;

        if (!title || !description || !classId || !subjectId || !academicYear || !dueDate) {
            return res.status(400).json({ message: "Please fill all required fields" });
        }

        // 2. THE STATIC HANDSHAKE (No year check needed)
        if (req.user.role === 'teacher') {
            const isAssigned = await TeacherAssignment.findOne({
                teacherId: req.user._id,
                classId: classId,
                subjectId: subjectId,
            });

            if (!isAssigned) {
                return res.status(403).json({ 
                    message: "Access Denied: You are not assigned to this Subject/Class." 
                });
            }
        }

        // 3. Create the Broadcast (Still includes academicYear for filtering the diary)
        const homework = await Homework.create({
            title,
            description,
            imageUrl: imageUrl || "", 
            classId,
            subjectId,
            teacherId: req.user._id,
            academicYear, // Critical: Students only see homework matching the global session year
            dueDate
        });

        res.status(201).json({ message: "Homework broadcasted successfully", homework });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};


// @desc    Step 4: Toggle Homework Completion Status (Parent Check)
// @route   POST /api/homework/toggle-status/:homeworkId
const toggleHomeworkStatus = async (req, res) => {
    try {
        const { homeworkId } = req.params;
        const studentId = req.user._id;

        // Check if completion record exists
        const existing = await HomeworkCompletion.findOne({ homeworkId, studentId });

        if (existing) {
            // If exists, user is "unchecking" the box
            await HomeworkCompletion.findByIdAndDelete(existing._id);
            return res.status(200).json({ status: "Pending", message: "Homework marked as Pending" });
        } else {
            // If not exists, user is "checking" the box
            await HomeworkCompletion.create({ homeworkId, studentId });
            return res.status(200).json({ status: "Completed", message: "Homework marked as Done" });
        }
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// @desc    Step 3 (Updated): Get Feed with "IsCompleted" Status
const getStudentHomework = async (req, res) => {
    try {
        const studentId = req.user._id;

        // 1. Find the student and the current system year
        const [student, settings] = await Promise.all([
            Student.findById(studentId),
            Settings.findOne()
        ]);

        const currentYear = settings ? settings.currentAcademicYear : "2025-26";

        // 2. Translate student's class name (e.g., "3") into the actual Class ObjectId
        const targetClass = await Class.findOne({ className: student.class });

        if (!targetClass) {
            return res.status(200).json([]); // Safety: If class doesn't exist, return empty
        }

        // 3. Fetch homework ONLY for this class AND this specific year
        const homeworkFeed = await Homework.find({ 
            classId: targetClass._id, 
            academicYear: currentYear, // <--- THE RESET FILTER
            status: 'Active' 
        })
        .populate('subjectId', 'subjectName')
        .populate('teacherId', 'name')
        .sort({ createdAt: -1 });

        // 4. Fetch all completions marked by this student
        const completions = await HomeworkCompletion.find({ studentId: studentId });
        const completedIds = completions.map(c => c.homeworkId.toString());

        // 5. Merge completion status into the feed
        const feedWithStatus = homeworkFeed.map(hw => ({
            ...hw._doc,
            isCompleted: completedIds.includes(hw._id.toString())
        }));

        res.status(200).json(feedWithStatus);
    } catch (error) {
        console.error("HOMEWORK_FEED_ERROR:", error);
        res.status(500).json({ message: "Failed to load homework feed", error: error.message });
    }
};

// @desc    Step 5: Admin Master Diary View
// @route   GET /api/homework/admin/diary/:classId
const getAdminDiary = async (req, res) => {
    try {
        const { classId } = req.params;
        const { date } = req.query; // e.g., 2024-12-25

        let query = { classId: classId };
        
        if (date) {
            const searchDate = new Date(date);
            searchDate.setHours(0,0,0,0);
            const nextDay = new Date(searchDate);
            nextDay.setDate(nextDay.getDate() + 1);
            
            query.createdAt = { $gte: searchDate, $lt: nextDay };
        }

        const diaryEntries = await Homework.find(query)
            .populate('subjectId', 'subjectName')
            .populate('teacherId', 'name')
            .sort({ createdAt: -1 });

        res.status(200).json(diaryEntries);
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};


const getTeacherHomeworkPosts = async (req, res) => {
    try {
        const teacherId = req.user._id;

        const posts = await Homework.find({ teacherId })
            .populate('classId', 'className')
            .populate('subjectId', 'subjectName')
            .sort({ createdAt: -1 }); // Newest first

        res.status(200).json(posts);
    } catch (error) {
        res.status(500).json({ message: "Failed to load your history", error: error.message });
    }
};

const deleteHomework = async (req, res) => {
    try {
        const homework = await Homework.findById(req.params.id);

        if (!homework) {
            return res.status(404).json({ message: "Homework not found" });
        }

        // SECURITY CHECK: Ensure only the owner (teacher) or an Admin can delete
        if (homework.teacherId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Not authorized to delete this post" });
        }

        // CLEANUP: Delete all "Completion" records linked to this homework
        const HomeworkCompletion = require('../models/HomeworkCompletion');
        await HomeworkCompletion.deleteMany({ homeworkId: req.params.id });

        // Final Deletion
        await Homework.findByIdAndDelete(req.params.id);

        res.status(200).json({ message: "Homework removed from all student diaries." });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};


module.exports = { 
    createHomework, 
    getStudentHomework, 
    toggleHomeworkStatus, 
    getAdminDiary,
    getTeacherHomeworkPosts,
    deleteHomework
};