  const express  = require('express');
  const router   = express.Router();
  const Doubt    = require('../Models/Doubt');
  const Student  = require('../Models/Student');
  const Teacher  = require('../Models/Teacher');
  const mongoose = require('mongoose');

  // ═══════════════════════════════════════════════════════════════════════════════
  //  STATUS MAPPING
  //  DB stores:   'OPEN' | 'RESOLVED'
  //  Frontend UI: 'PENDING' | 'IN REVIEW' | 'RESOLVED'
  //
  //  Mapping:
  //    DB 'OPEN'     → UI 'PENDING'   (no teacher reply yet)
  //    DB 'OPEN'     → UI 'IN REVIEW' (at least one teacher reply exists)
  //    DB 'RESOLVED' → UI 'RESOLVED'
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Derive the UI status from a doubt document.
   * - RESOLVED  → 'RESOLVED'
   * - OPEN with a teacher message → 'IN REVIEW'
   * - OPEN with no teacher message → 'PENDING'
   */
  function deriveUiStatus(doubt) {
    if (doubt.status === 'RESOLVED') return 'RESOLVED';
    const hasTeacherReply = (doubt.messages || []).some(
      (m) => m.sender === 'teacher'
    );
    return hasTeacherReply ? 'IN REVIEW' : 'PENDING';
  }

  /**
   * Attach a virtual `uiStatus` field to a plain doubt object.
   */
  function withUiStatus(doubt) {
    const obj = doubt.toObject ? doubt.toObject() : { ...doubt };
    obj.uiStatus = deriveUiStatus(obj);
    // Mirror as `status` so existing frontend code that reads `d.status` works
    obj.status   = obj.uiStatus;
    return obj;
  }

  // ── GET /api/doubts  ───────────────────────────────────────────────────────────
  // Returns ALL doubts (teacher dashboard).
  // Excludes doubts whose DB status is 'RESOLVED' so they disappear from teacher view.


  // ── POST /api/doubts  ──────────────────────────────────────────────────────────
  // Body: { studentId, subject, title, messageText, teacherId }
  router.post('/', async (req, res) => {
    try {
      const { studentId, subject, title, messageText, teacherId } = req.body;

      if (!studentId || !subject || !messageText) {
        return res.status(400).json({
          error: 'studentId, subject, and messageText are required.',
        });
      }

      const student = await Student.findById(studentId);
      if (!student) {
        return res.status(404).json({ error: 'Student not found.' });
      }

      // Resolve teacherId
      let resolvedTeacherId   = teacherId;
      let resolvedTeacherName = 'Faculty';

      if (!resolvedTeacherId) {
        const subjectRegex = new RegExp(`^${subject}$`, 'i');
        const teacher = await Teacher.findOne({
          years:     { $in: [parseInt(student.year)] },
          divisions: { $in: [student.division]       },
          $or: [
            { [`subjects.year${student.year}`]:     { $regex: subjectRegex } },
            { [`course_codes.year${student.year}`]: { $regex: subjectRegex } },
          ],
        });
        if (teacher) {
          resolvedTeacherId   = teacher._id.toString();
          resolvedTeacherName = teacher.name || 'Faculty';
        }
      }

      if (!resolvedTeacherId) {
        return res.status(400).json({
          error: 'Could not resolve a teacher for this subject.',
        });
      }

      const studentInitials = student.name
        ? student.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
        : 'ST';

      const doubt = new Doubt({
        studentId,
        studentName:     student.name,
        studentClass:    student.year    || '',
        division:        student.division || '',
        studentInitials,
        teacherId:       resolvedTeacherId,
        subject,
        title:           title || messageText.substring(0, 80),
        status:          'OPEN',
        messages: [{
          sender:   'student',
          senderId: studentId,
          text:     messageText,
        }],
      });

      await doubt.save();
      res.status(201).json({ success: true, doubt: withUiStatus(doubt) });
    } catch (err) {
      console.error('POST /doubts:', err);
      res.status(500).json({ error: 'Server error while creating doubt.' });
    }
  });

  // ── POST /api/doubts/broadcast  ───────────────────────────────────────────────
  // Body: { teacherId, subject, message }
  router.post('/broadcast', async (req, res) => {
    try {
      const { teacherId, subject, message } = req.body;

      if (!teacherId || !message) {
        return res.status(400).json({ error: 'teacherId and message are required.' });
      }

      // Find all open doubts for this teacher (optionally filtered by subject)
      const query = { teacherId, status: { $ne: 'RESOLVED' } };
      if (subject) query.subject = new RegExp(`^${subject}$`, 'i');

      const doubts = await Doubt.find(query);

      // Append the broadcast message to every matching doubt
      await Promise.all(
        doubts.map((d) => {
          d.messages.push({
            sender:   'teacher',
            senderId: teacherId,
            text:     `📢 Broadcast: ${message}`,
          });
          return d.save();
        })
      );

      res.status(200).json({
        success: true,
        message: `Broadcast sent to ${doubts.length} student(s).`,
        count:   doubts.length,
      });
    } catch (err) {
      console.error('POST /doubts/broadcast:', err);
      res.status(500).json({ error: 'Server error while sending broadcast.' });
    }
  });

  // ── POST /api/doubts/:doubtId/messages  ───────────────────────────────────────
  // Body: { sender, senderId, text }
  // sender must be 'student' or 'teacher'  (frontend was sending 'instructor' — fixed in DoubtSolveScreen)
  router.post('/:doubtId/messages', async (req, res) => {
    try {
      const { sender, senderId, text } = req.body;

      if (!sender || !text) {
        return res.status(400).json({ error: 'sender and text are required.' });
      }

      // Accept 'instructor' as an alias for 'teacher' to stay backward-compatible
      const normalizedSender = sender === 'instructor' ? 'teacher' : sender;

      if (!['student', 'teacher'].includes(normalizedSender)) {
        return res.status(400).json({
          error: "sender must be 'student' or 'teacher'.",
        });
      }

      const doubt = await Doubt.findById(req.params.doubtId);
      if (!doubt) return res.status(404).json({ error: 'Doubt not found.' });

      doubt.messages.push({
        sender:   normalizedSender,
        senderId: senderId || 'unknown',
        text,
      });

      await doubt.save();
      res.status(200).json({ success: true, doubt: withUiStatus(doubt) });
    } catch (err) {
      console.error('POST /doubts/:id/messages:', err);
      res.status(500).json({ error: 'Server error while adding message.' });
    }
  });

  // ── DELETE /api/doubts/:doubtId/messages/:messageId  ──────────────────────────
  router.delete('/:doubtId/messages/:messageId', async (req, res) => {
    try {
      const { doubtId, messageId } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(doubtId) ||
        !mongoose.Types.ObjectId.isValid(messageId)
      ) {
        return res.status(400).json({ error: 'Invalid doubtId or messageId.' });
      }

      const doubtObjId = new mongoose.Types.ObjectId(doubtId);
      const msgObjId   = new mongoose.Types.ObjectId(messageId);

      // Verify the message exists and belongs to a student
      const peek = await Doubt.findOne(
        { _id: doubtObjId, 'messages._id': msgObjId },
        { 'messages.$': 1 }
      );

      if (!peek || !peek.messages || peek.messages.length === 0) {
        return res.status(404).json({ error: 'Doubt or message not found.' });
      }

      const message = peek.messages[0];
      if (message.sender !== 'student') {
        return res.status(403).json({ error: 'Only student messages can be deleted.' });
      }

      const updated = await Doubt.findByIdAndUpdate(
        doubtObjId,
        { $pull: { messages: { _id: msgObjId } } },
        { new: true }
      );

      if (!updated) return res.status(404).json({ error: 'Doubt not found.' });

      res.status(200).json({
        success: true,
        message: 'Message deleted successfully.',
        doubt:   withUiStatus(updated),
      });
    } catch (err) {
      console.error('DELETE /doubts/:id/messages/:msgId:', err);
      res.status(500).json({ error: 'Server error while deleting message.' });
    }
  });

  // ── DELETE /api/doubts/:doubtId  ──────────────────────────────────────────────
  router.delete('/:doubtId', async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.doubtId)) {
        return res.status(400).json({ error: 'Invalid doubtId.' });
      }

      const doubt = await Doubt.findByIdAndDelete(req.params.doubtId);
      if (!doubt) return res.status(404).json({ error: 'Doubt not found.' });

      res.status(200).json({
        success: true,
        message: `Doubt "${doubt.title || doubt.subject}" deleted successfully.`,
      });
    } catch (err) {
      console.error('DELETE /doubts/:id:', err);
      res.status(500).json({ error: 'Server error while deleting doubt.' });
    }
  });

  // ── GET /api/doubts/student/:studentId  ───────────────────────────────────────
  // Returns ALL doubts for a student (including resolved — student can still see them)
  router.get('/student/:studentId', async (req, res) => {
    try {
      const doubts = await Doubt.find({ studentId: req.params.studentId })
        .sort({ updatedAt: -1 });

      res.status(200).json({
        success: true,
        doubts:  doubts.map(withUiStatus),
      });
    } catch (err) {
      console.error('GET /doubts/student/:id:', err);
      res.status(500).json({ error: 'Server error while fetching doubts.' });
    }
  });

  // ── GET /api/doubts/:doubtId  ─────────────────────────────────────────────────
  router.get('/:doubtId', async (req, res) => {
    try {
      if (req.params.doubtId === 'recent') {
        // Return recent doubts for user (limit 6, sorted by createdAt desc)
        const userId = req.query.userId;
        const filter = userId ? { user: userId } : {};
        const recentDoubts = await Doubt.find(filter)
          .sort({ createdAt: -1 })
          .limit(6);
        return res.status(200).json({ success: true, doubts: recentDoubts.map(withUiStatus) });
      }
      const doubt = await Doubt.findById(req.params.doubtId);
      if (!doubt) return res.status(404).json({ error: 'Doubt not found.' });
      res.status(200).json({ success: true, doubt: withUiStatus(doubt) });
    } catch (err) {
      console.error('GET /doubts/:id:', err);
      res.status(500).json({ error: 'Server error while fetching doubt.' });
    }
  });

  // ── PATCH /api/doubts/:doubtId/status  ────────────────────────────────────────
  // Body: { status }  — accepts both UI values and DB values
  // UI  values: 'PENDING' | 'IN REVIEW' | 'RESOLVED'
  // DB  values: 'OPEN'    | 'RESOLVED'
  router.patch('/:doubtId/status', async (req, res) => {
    try {
      const { status } = req.body;

      // Map UI status → DB status
      const uiToDb = {
        'PENDING':   'OPEN',
        'IN REVIEW': 'OPEN',
        'RESOLVED':  'RESOLVED',
        'OPEN':      'OPEN',       // pass-through
      };

      const dbStatus = uiToDb[status];
      if (!dbStatus) {
        return res.status(400).json({
          error: `status must be one of: PENDING, IN REVIEW, RESOLVED`,
        });
      }

      const doubt = await Doubt.findByIdAndUpdate(
        req.params.doubtId,
        { status: dbStatus },
        { new: true }
      );

      if (!doubt) return res.status(404).json({ error: 'Doubt not found.' });

      res.status(200).json({ success: true, doubt: withUiStatus(doubt) });
    } catch (err) {
      console.error('PATCH /doubts/:id/status:', err);
      res.status(500).json({ error: 'Server error while updating status.' });
    }
  });

  // ── GET /api/doubts  ───────────────────────────────────────────────────────────
// Returns active (non-resolved) doubts for the card grid,
// PLUS a `stats` object that includes resolved count for the stat chips.
router.get('/', async (req, res) => {
  try {
    // 1. All doubts — used only for counting (never sent as full objects)
    const allDoubts = await Doubt.find({}, { messages: 1, status: 1 }).lean();

    // 2. Active doubts — shown as cards (resolved hidden from grid)
    // 2. All doubts — resolved ones show with a resolved banner on the card
    const activeDoubts = await Doubt.find({})
      .sort({ updatedAt: -1 });

    // 3. Build stats from ALL doubts
    const stats = {
      total:    allDoubts.length,
      resolved: allDoubts.filter(d => d.status === 'RESOLVED').length,
      pending:  0,
      review:   0,
      urgent:   0,
    };

    // Derive pending / review from active doubts
    activeDoubts.forEach(d => {
      const ui = deriveUiStatus(d);
      if (ui === 'PENDING')   stats.pending++;
      if (ui === 'IN REVIEW') stats.review++;
      // priority lives on active doubts only
      if (d.priority === 'HIGH') stats.urgent++;
    });

    res.status(200).json({
      success: true,
      doubts:  activeDoubts.map(withUiStatus),
      stats,                                    // ← NEW field
    });
  } catch (err) {
    console.error('GET /doubts:', err);
    res.status(500).json({ error: 'Server error while fetching doubts.' });
  }
});

  module.exports = router;