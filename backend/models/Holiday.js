const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, "Holiday name is required"],
        trim: true,
        maxLength: 100
    },
    date: {
        type: Date,
        required: [true, "Date is required"]
    },
    endDate: {
        type: Date,
        default: null  // null = single day holiday
    },
    type: {
        type: String,
        enum: ['National', 'Religious', 'School', 'Exam', 'Other'],
        default: 'School'
    },
    description: {
        type: String,
        default: ''
    },
    academicYear: {
        type: String,
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    }
}, { timestamps: true });

holidaySchema.index({ academicYear: 1, date: 1 });

module.exports = mongoose.model('Holiday', holidaySchema);