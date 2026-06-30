const mongoose = require('mongoose');

const busRouteSchema = new mongoose.Schema({
    routeName:   { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: '' },
    monthlyFee:  { type: Number, required: true, min: 0 },
    stops:       [{ type: String, trim: true }],
    isActive:    { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('BusRoute', busRouteSchema);