const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middlewares/authMiddleware');
const asyncHandler = require('../utils/asyncHandler');
const {
    getFeeStructures, createFeeStructure, updateFeeStructure, deleteFeeStructure,
    collectFee, getPayments, deletePayment, getStudentFeeDetails, getFeeSummary, getDefaulters,
    getUpiInfo, submitUpiPayment, getPendingUpiPayments, confirmUpiPayment, rejectUpiPayment,
    getClassFeeStatus, getDailyCollection,
} = require('../controllers/feeController');

// Fee Structures (admin only)
router.get   ('/structure',        protect, authorize('admin'),           asyncHandler(getFeeStructures));
router.post  ('/structure',        protect, authorize('admin'),           asyncHandler(createFeeStructure));
router.put   ('/structure/:id',    protect, authorize('admin'),           asyncHandler(updateFeeStructure));
router.delete('/structure/:id',    protect, authorize('admin'),           asyncHandler(deleteFeeStructure));

// Payments — admin manual entry
router.post  ('/pay',              protect, authorize('admin'),           asyncHandler(collectFee));
router.get   ('/payments',         protect, authorize('admin','teacher'), asyncHandler(getPayments));
router.delete('/payments/:id',     protect, authorize('admin'),           asyncHandler(deletePayment));

// Reports
router.get   ('/summary',          protect, authorize('admin'),           asyncHandler(getFeeSummary));
router.get   ('/daily',            protect, authorize('admin'),           asyncHandler(getDailyCollection));
router.get   ('/defaulters',       protect, authorize('admin','teacher'), asyncHandler(getDefaulters));
router.get   ('/class-fee-status', protect, authorize('teacher'),         asyncHandler(getClassFeeStatus));

// Student ledger
router.get   ('/student/:studentId', protect, authorize('admin','student','teacher'), asyncHandler(getStudentFeeDetails));

// UPI Payment (free — no gateway)
router.get   ('/upi/info',              protect, authorize('student'),           asyncHandler(getUpiInfo));
router.post  ('/upi/submit',            protect, authorize('student'),           asyncHandler(submitUpiPayment));
router.get   ('/upi/pending',           protect, authorize('admin'),             asyncHandler(getPendingUpiPayments));
router.put   ('/upi/confirm/:groupReceiptNo', protect, authorize('admin'),       asyncHandler(confirmUpiPayment));
router.put   ('/upi/reject/:groupReceiptNo',  protect, authorize('admin'),       asyncHandler(rejectUpiPayment));

module.exports = router;