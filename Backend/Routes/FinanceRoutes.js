const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

const StudentFinance = require('../Models/Finance');

// ── Multer: store uploaded receipts in /uploads/receipts ─────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'receipts');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const name = `receipt_${Date.now()}${ext}`;
    cb(null, name);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and PDF files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/student-finance/:studentId
// Fetch the full finance record for a student
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:studentId', async (req, res) => {
  try {
    const record = await StudentFinance.findOne({ studentId: req.params.studentId });

    if (!record) {
      return res.status(404).json({ success: false, message: 'Finance record not found' });
    }

    return res.status(200).json({ success: true, data: record });
  } catch (err) {
    console.error('[GET /student-finance]', err.message);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/student-finance/:studentId/payment
// Submit a new payment with an attached receipt file.
//
// Body (multipart/form-data):
//   amount        {number}  – total amount paid by student
//   tuitionFee    {number}  – total tuition fee for the year
//   financialAid  {number}  – financial aid received (optional, default 0)
//   description   {string}  – e.g. "Year 4 (2024-25) tuition payment"
//   date          {string}  – formatted date string
//   yearKey       {string}  – e.g. "Year 4 (2024-25)"
//   fileType      {string}  – "photo" | "pdf"
//   receipt       {file}    – the uploaded receipt
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:studentId/payment', upload.single('receipt'), async (req, res) => {
  try {
    const { studentId } = req.params;
    const {
      amount,
      tuitionFee,
      financialAid = 0,
      description,
      date,
      yearKey,
      fileType,
    } = req.body;

    // ── Basic validation ──────────────────────────────────────────────────
    if (!amount || !tuitionFee) {
      return res.status(400).json({
        success: false,
        message: 'amount and tuitionFee are required fields',
      });
    }

    if (!yearKey) {
      return res.status(400).json({ success: false, message: 'yearKey is required' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Receipt file is required' });
    }

    // ── Build the payment sub-document ────────────────────────────────────
    const newPayment = {
      amount:       Number(amount),
      tuitionFee:   Number(tuitionFee),
      financialAid: Number(financialAid),
      description:  description || `${yearKey} tuition payment`,
      date:         date || new Date().toLocaleDateString('en-IN'),
      id:           Date.now(),
      yearKey:      yearKey.trim(),
      status:       'pending',
      receipt: {
        fileName:    req.file.originalname,
        fileMimeType: req.file.mimetype,
        fileType:    fileType || (req.file.mimetype === 'application/pdf' ? 'pdf' : 'photo'),
        fileSize:    req.file.size,
        fileUrl:     `/uploads/receipts/${req.file.filename}`, // serve from express static
      },
    };

    // ── Helper to recalculate year row summary from payments ──────────────
    const recalcYearRow = (yearRow) => {
      // Use the latest payment's tuitionFee / financialAid as the year's values
      const latestPayment = yearRow.payments[yearRow.payments.length - 1];
      const tuition = latestPayment?.tuitionFee || 0;
      const aid     = latestPayment?.financialAid || 0;

      const approvedTotal = yearRow.payments
        .filter(p => p.status === 'approved')
        .reduce((s, p) => s + p.amount, 0);
      const pendingTotal = yearRow.payments
        .filter(p => p.status === 'pending')
        .reduce((s, p) => s + p.amount, 0);
      const totalPaid = approvedTotal + pendingTotal;
      const netOwed   = Math.max(0, tuition - aid);
      const remaining = Math.max(0, netOwed - approvedTotal);

      yearRow.tuition = tuition > 0 ? `₹${tuition.toLocaleString('en-IN')}` : yearRow.tuition;
      yearRow.aid     = aid > 0 ? `- ₹${aid.toLocaleString('en-IN')}` : yearRow.aid;
      yearRow.parent  = `₹${totalPaid.toLocaleString('en-IN')}`;
      yearRow.net     = remaining <= 0 ? '₹0' : `₹${remaining.toLocaleString('en-IN')}`;
    };

    // ── Upsert: find existing record or create a new one ──────────────────
    let financeRecord = await StudentFinance.findOne({ studentId });

    if (!financeRecord) {
      // Create fresh record with the target year row
      financeRecord = new StudentFinance({
        studentId,
        yearlyData: [
          {
            year:       yearKey.trim(),
            status:     'Pending',
            statusType: 'pending',
            payments:   [newPayment],
          },
        ],
      });
      // Recalculate summary for the new year row
      recalcYearRow(financeRecord.yearlyData[0]);
    } else {
      // Find the matching year row
      const yearRow = financeRecord.yearlyData.find(
        (y) => y.year === yearKey.trim()
      );

      if (yearRow) {
        yearRow.payments.push(newPayment);
        recalcYearRow(yearRow);
      } else {
        // First payment for a new academic year
        const newYearRow = {
          year:       yearKey.trim(),
          status:     'Pending',
          statusType: 'pending',
          payments:   [newPayment],
        };
        financeRecord.yearlyData.push(newYearRow);
        recalcYearRow(financeRecord.yearlyData[financeRecord.yearlyData.length - 1]);
      }
    }

    await financeRecord.save();

    return res.status(201).json({
      success:  true,
      message:  'Payment submitted successfully and is pending review',
      data:     newPayment,
    });
  } catch (err) {
    console.error('[POST /student-finance/payment]', err.message);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/student-finance/:studentId/payment/:paymentId/status
// Admin: approve or reject a submitted payment
//
// Body (JSON):
//   status  {string}  – "approved" | "rejected"
//   remarks {string}  – optional admin remarks
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:studentId/payment/:paymentId/status', async (req, res) => {
  try {
    const { studentId, paymentId } = req.params;
    const { status, remarks = '' } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'status must be "approved" or "rejected"',
      });
    }

    const financeRecord = await StudentFinance.findOne({ studentId });
    if (!financeRecord) {
      return res.status(404).json({ success: false, message: 'Finance record not found' });
    }

    // Find payment across all year rows
    let targetPayment = null;
    let parentYearRow = null;

    for (const yearRow of financeRecord.yearlyData) {
      const p = yearRow.payments.find((pay) => String(pay.id) === String(paymentId));
      if (p) {
        targetPayment = p;
        parentYearRow = yearRow;
        break;
      }
    }

    if (!targetPayment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    // Update payment status
    targetPayment.status       = status;
    targetPayment.adminRemarks = remarks;

    // Recalculate year-row summary after status change
    const approvedPayments = parentYearRow.payments.filter(p => p.status === 'approved');
    const totalPaid = approvedPayments.reduce((sum, p) => sum + p.amount, 0);

    // Use payment-level tuitionFee/financialAid for calculations (more reliable)
    const latestPayment = parentYearRow.payments[parentYearRow.payments.length - 1];
    const tuitionNum = latestPayment?.tuitionFee ||
      parseInt((parentYearRow.tuition || '').replace(/[^0-9]/g, '')) || 0;
    const aidNum = latestPayment?.financialAid ||
      parseInt((parentYearRow.aid || '').replace(/[^0-9]/g, '')) || 0;
    const netOwed = Math.max(0, tuitionNum - aidNum);
    const remaining = Math.max(0, netOwed - totalPaid);

    // Update year-row summary fields
    if (tuitionNum > 0) {
      parentYearRow.tuition = `₹${tuitionNum.toLocaleString('en-IN')}`;
    }
    if (aidNum > 0) {
      parentYearRow.aid = `- ₹${aidNum.toLocaleString('en-IN')}`;
    }
    parentYearRow.parent = `₹${totalPaid.toLocaleString('en-IN')}`;
    parentYearRow.net = remaining <= 0 ? '₹0' : `₹${remaining.toLocaleString('en-IN')}`;

    // Update bars so frontend progress indicators stay accurate
    const netOwedForBars = Math.max(0, tuitionNum - aidNum);
    parentYearRow.bars = {
      tuition: tuitionNum > 0 ? Math.min(100, Math.round((totalPaid   / tuitionNum)    * 100)) : 0,
      aid:     netOwedForBars > 0 ? Math.min(100, Math.round((totalPaid / netOwedForBars) * 100)) : 0,
    };

    // Update year-row status based on payments
    const hasPending  = parentYearRow.payments.some(p => p.status === 'pending');
    const hasApproved = parentYearRow.payments.some(p => p.status === 'approved');
    const allRejected = parentYearRow.payments.length > 0 &&
      parentYearRow.payments.every(p => p.status === 'rejected');

    if (status === 'approved' && totalPaid >= netOwed && netOwed > 0) {
      parentYearRow.status     = 'Paid Full';
      parentYearRow.statusType = 'paid';
    } else if (totalPaid > 0 && totalPaid < netOwed) {
      parentYearRow.status     = 'Partial';
      parentYearRow.statusType = 'partial';
    } else if (allRejected) {
      parentYearRow.status     = 'Rejected';
      parentYearRow.statusType = 'rejected';
    } else if (hasPending) {
      parentYearRow.status     = 'Pending';
      parentYearRow.statusType = 'pending';
    }

    await financeRecord.save();

    return res.status(200).json({
      success: true,
      message: `Payment ${status} successfully`,
      data:    targetPayment,
    });
  } catch (err) {
    console.error('[PATCH /student-finance/payment/status]', err.message);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/student-finance/:studentId/payment/:paymentId
// Remove a pending payment (students can only delete their own pending ones)
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:studentId/payment/:paymentId', async (req, res) => {
  try {
    const { studentId, paymentId } = req.params;

    const financeRecord = await StudentFinance.findOne({ studentId });
    if (!financeRecord) {
      return res.status(404).json({ success: false, message: 'Finance record not found' });
    }

    let deleted = false;
    for (const yearRow of financeRecord.yearlyData) {
      const idx = yearRow.payments.findIndex((p) => String(p.id) === String(paymentId));
      if (idx !== -1) {
        if (yearRow.payments[idx].status !== 'pending') {
          return res.status(400).json({
            success: false,
            message: 'Only pending payments can be deleted',
          });
        }
        yearRow.payments.splice(idx, 1);
        deleted = true;
        break;
      }
    }

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    await financeRecord.save();
    return res.status(200).json({ success: true, message: 'Payment deleted successfully' });
  } catch (err) {
    console.error('[DELETE /student-finance/payment]', err.message);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

module.exports = router;