const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    schoolName: { type: String, default: "Sardar Patel Public School" },
    schoolSlogan: { type: String, default: "शिक्षार्थ आइए, सेवार्थ जाइए" }, // NEW
    schoolAddress: { type: String, default: "Enter School Address" },   // NEW
    contactNumber: { type: String, default: "0000000000" },
    schoolLogo: { type: String, default: "" },                           // NEW (Base64)
    currentAcademicYear: { type: String, default: "2025-26" },
    isRegistrationOpen: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
