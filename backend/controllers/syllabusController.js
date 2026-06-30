const Syllabus  = require('../models/Syllabus');
const Settings  = require('../models/Settings');
const Student   = require('../models/Student');
const Class     = require('../models/Class');

const getActiveYear = async () => {
    const s = await Settings.findOne();
    return s ? s.currentAcademicYear : '2025-26';
};

// ─────────────────────────────────────────────
// ADMIN: Get all syllabi (optionally filter by classId)
// GET /api/syllabus?classId=xxx
// ─────────────────────────────────────────────
const getAllSyllabus = async (req, res) => {
    try {
        const academicYear = await getActiveYear();
        const filter = { academicYear };
        if (req.query.classId) filter.classId = req.query.classId;

        const list = await Syllabus.find(filter)
            .populate('classId',   'className')
            .populate('subjectId', 'subjectName subjectCode')
            .sort({ 'classId.className': 1 });

        res.status(200).json(list);
    } catch (err) {
        res.status(500).json({ message: 'Server Error', error: err.message });
    }
};

// ─────────────────────────────────────────────
// ADMIN: Create or fully replace a syllabus
// POST /api/syllabus
// ─────────────────────────────────────────────
const createSyllabus = async (req, res) => {
    try {
        const { classId, subjectId, term, topics, notes } = req.body;

        if (!classId || !subjectId) {
            return res.status(400).json({ message: 'Class and Subject are required' });
        }

        const academicYear = await getActiveYear();

        // Upsert: if same class+subject+term+year exists, replace it
        const syllabus = await Syllabus.findOneAndUpdate(
            { classId, subjectId, academicYear, term: term || 'Full Year' },
            {
                classId, subjectId, academicYear,
                term:    term    || 'Full Year',
                topics:  topics  || [],
                notes:   notes   || '',
                createdBy: req.user._id
            },
            { upsert: true, new: true, runValidators: true }
        );

        res.status(200).json({ message: 'Syllabus saved', syllabus });
    } catch (err) {
        res.status(500).json({ message: 'Server Error', error: err.message });
    }
};

// ─────────────────────────────────────────────
// ADMIN: Update topics / notes on existing syllabus
// PUT /api/syllabus/:id
// ─────────────────────────────────────────────
const updateSyllabus = async (req, res) => {
    try {
        const { topics, notes, term } = req.body;

        const syllabus = await Syllabus.findByIdAndUpdate(
            req.params.id,
            { $set: { topics, notes, term } },
            { new: true, runValidators: true }
        );

        if (!syllabus) return res.status(404).json({ message: 'Syllabus not found' });

        res.status(200).json({ message: 'Syllabus updated', syllabus });
    } catch (err) {
        res.status(500).json({ message: 'Server Error', error: err.message });
    }
};

// ─────────────────────────────────────────────
// ADMIN: Delete a syllabus
// DELETE /api/syllabus/:id
// ─────────────────────────────────────────────
const deleteSyllabus = async (req, res) => {
    try {
        const syllabus = await Syllabus.findByIdAndDelete(req.params.id);
        if (!syllabus) return res.status(404).json({ message: 'Syllabus not found' });
        res.status(200).json({ message: 'Syllabus deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Server Error', error: err.message });
    }
};

// ─────────────────────────────────────────────
// STUDENT: Get syllabus for their own class
// GET /api/syllabus/my
// ─────────────────────────────────────────────
const getMySyllabus = async (req, res) => {
    try {
        const academicYear = await getActiveYear();

        // Find the student's class document
        const student = await Student.findById(req.user._id);
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const classDoc = await Class.findOne({ className: student.class });
        if (!classDoc) return res.status(404).json({ message: 'Class not found' });

        const list = await Syllabus.find({ classId: classDoc._id, academicYear })
            .populate('subjectId', 'subjectName subjectCode')
            .sort({ term: 1 });

        res.status(200).json(list);
    } catch (err) {
        res.status(500).json({ message: 'Server Error', error: err.message });
    }
};

// ─────────────────────────────────────────────
// TEACHER: Get syllabus for a specific class
// GET /api/syllabus/class/:classId
// ─────────────────────────────────────────────
const getSyllabusByClass = async (req, res) => {
    try {
        const academicYear = await getActiveYear();

        const list = await Syllabus.find({ classId: req.params.classId, academicYear })
            .populate('subjectId', 'subjectName subjectCode')
            .sort({ term: 1 });

        res.status(200).json(list);
    } catch (err) {
        res.status(500).json({ message: 'Server Error', error: err.message });
    }
};

// ─────────────────────────────────────────────
// ADMIN: Toggle a single topic's isCompleted status
// PATCH /api/syllabus/:id/topic/:topicId/toggle
// ─────────────────────────────────────────────
const toggleTopic = async (req, res) => {
    try {
        const syllabus = await Syllabus.findById(req.params.id);
        if (!syllabus) return res.status(404).json({ message: 'Syllabus not found' });

        const topic = syllabus.topics.id(req.params.topicId);
        if (!topic) return res.status(404).json({ message: 'Topic not found' });

        topic.isCompleted = !topic.isCompleted;
        await syllabus.save();

        res.status(200).json({ message: 'Topic updated', isCompleted: topic.isCompleted });
    } catch (err) {
        res.status(500).json({ message: 'Server Error', error: err.message });
    }
};

module.exports = {
    getAllSyllabus,
    createSyllabus,
    updateSyllabus,
    deleteSyllabus,
    getMySyllabus,
    getSyllabusByClass,
    toggleTopic
};