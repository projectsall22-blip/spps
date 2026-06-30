const Holiday = require('../models/Holiday');
const Settings = require('../models/Settings');

// Helper to get active academic year
const getActiveYear = async () => {
    const settings = await Settings.findOne();
    return settings ? settings.currentAcademicYear : '2025-26';
};

// @desc  Get all holidays for current academic year
// @route GET /api/holidays
// @access Private (all roles)
const getHolidays = async (req, res) => {
    try {
        const academicYear = await getActiveYear();
        const holidays = await Holiday.find({ academicYear })
            .sort({ date: 1 });
        res.status(200).json(holidays);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc  Add a holiday
// @route POST /api/holidays
// @access Private (admin only)
const addHoliday = async (req, res) => {
    try {
        const { title, date, endDate, type, description } = req.body;

        if (!title || !date) {
            return res.status(400).json({ message: 'Title and Date are required' });
        }

        const academicYear = await getActiveYear();

        const holiday = await Holiday.create({
            title,
            date: new Date(date),
            endDate: endDate ? new Date(endDate) : null,
            type: type || 'School',
            description: description || '',
            academicYear,
            createdBy: req.user._id
        });

        res.status(201).json({ message: 'Holiday added', holiday });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc  Delete a holiday
// @route DELETE /api/holidays/:id
// @access Private (admin only)
const deleteHoliday = async (req, res) => {
    try {
        const holiday = await Holiday.findByIdAndDelete(req.params.id);
        if (!holiday) {
            return res.status(404).json({ message: 'Holiday not found' });
        }
        res.status(200).json({ message: 'Holiday deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

module.exports = { getHolidays, addHoliday, deleteHoliday };