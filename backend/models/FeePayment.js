const mongoose = require('mongoose');

const feePaymentSchema = new mongoose.Schema({
    student:      { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    academicYear: { type: String, required: true },
    month:        { type: String, default: '' },
    feeComponents: [{ name: String, amount: Number }],
    totalAmount:  { type: Number, required: true },
    discount:     { type: Number, default: 0 },
    fine:         { type: Number, default: 0 },
    amountPaid:   { type: Number, required: true },
    paymentMode:  { type: String, enum: ['Cash','Bank Transfer','Google Pay','PhonePe','Paytm','Online','UPI'], default: 'Cash' },
    transactionId:{ type: String, default: '' },
    receiptNo:    { type: String, unique: true },
    groupReceiptNo: { type: String, default: '' }, // shared across multi-month payments
    remarks:      { type: String, default: '' },
    paidBy:       { type: String, default: '' },
    collectedBy:  { type: mongoose.Schema.Types.ObjectId, refPath: 'collectedByModel' },
    collectedByModel: { type: String, enum: ['Admin','Student'], default: 'Admin' },
    status:       { type: String, enum: ['paid','partial','pending','pending_upi'], default: 'paid' },
}, { timestamps: true });

feePaymentSchema.index({ student: 1, academicYear: 1 });
feePaymentSchema.index({ createdAt: -1 });

feePaymentSchema.pre('save', async function () {
    if (!this.receiptNo) {
        const count = await this.constructor.countDocuments();
        this.receiptNo = String(count + 1).padStart(4, '0'); // 0001, 0002, 0003...
    }
});

module.exports = mongoose.model('FeePayment', feePaymentSchema);