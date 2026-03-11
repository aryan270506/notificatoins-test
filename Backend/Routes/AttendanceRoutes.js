// Routes/AttendanceRoutes.js
const express    = require("express");
const router     = express.Router();
const mongoose   = require("mongoose");
const Attendance = require("../Models/Attendance");

// ── helpers ──────────────────────────────────────────────────────────────────
const toMidnightUTC = (d) => {
  const dt = d ? new Date(d) : new Date();
  dt.setUTCHours(0, 0, 0, 0);
  return dt;
};
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// Normalize year: accept "FY"/"SY"/"TY" or "1"/"2"/"3" — always return DB format
const normalizeYear = (y) => {
  const map = { 'FY': '1', 'SY': '2', 'TY': '3' };
  return map[String(y).toUpperCase()] || String(y);
};

// populate shape expected by frontend sessionToRecord():
//   s.studentId.name        → student name
//   s.studentId.rollNumber  → roll number
//   s.studentId._id         → mongo id
const STUDENT_POPULATE = {
  path:   "students.studentId",
  select: "name rollNumber roll_no",
};


// ============================================================
// 1. CREATE — POST /api/attendance/mark
//
//  Body: {
//    teacherId, subject, year, division,
//    date?,          // optional ISO string, defaults to today
//    batch?,         // null / "Batch 1" / "Batch 2" / "Batch 3"
//    students: [ { studentId, status } ]
//  }
// ============================================================
router.post("/mark", async (req, res) => {
  try {
    const { teacherId, subject, year, division, batch, students, date } = req.body;

    if (!subject || !year || !division) {
      return res.status(400).json({
        success: false,
        message: "subject, year, and division are required",
      });
    }
    // teacherId is optional — only validate if provided
    if (teacherId && !isValidId(teacherId)) {
      return res.status(400).json({ success: false, message: "Invalid teacherId" });
    }
    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ success: false, message: "students array is required" });
    }
    for (const s of students) {
      if (!s.studentId || !isValidId(s.studentId)) {
        return res.status(400).json({ success: false, message: `Invalid studentId: ${s.studentId}` });
      }
      if (!["Present", "Absent"].includes(s.status)) {
        return res.status(400).json({
          success: false,
          message: `status must be 'Present' or 'Absent'. Got: ${s.status}`,
        });
      }
    }

    const sessionDate = toMidnightUTC(date);
    const normalizedYear = normalizeYear(year);

    // prevent duplicate — only scope to teacherId if provided
    const dupFilter = { subject, year: normalizedYear, division, batch: batch || null, date: sessionDate };
    if (teacherId) dupFilter.teacherId = teacherId;
    const existing = await Attendance.findOne(dupFilter);
    if (existing) {
      return res.status(409).json({
        success:   false,
        message:   "Attendance already marked for this session. Use PUT /update/:sessionId to edit.",
        sessionId: existing._id,
      });
    }

    const session = await Attendance.create({
      teacherId,
      subject,
      year: normalizedYear,
      division,
      batch:    batch || null,
      date:     sessionDate,
      students,
    });

    await session.populate(STUDENT_POPULATE);

    return res.status(201).json({
      success: true,
      message: "Attendance session created",
      session,
    });
  } catch (err) {
    console.error("[POST /attendance/mark]", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// ============================================================
// 2. UPDATE STATUSES — PUT /api/attendance/update/:sessionId
//
//  Body: { students: [ { studentId, status } ] }
// ============================================================
router.put("/update/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { students }  = req.body;

    if (!isValidId(sessionId)) {
      return res.status(400).json({ success: false, message: "Invalid sessionId" });
    }
    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ success: false, message: "students array is required" });
    }

    // Update each entry individually so we don't wipe other fields
    const session = await Attendance.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    const statusMap = {};
    students.forEach((s) => { statusMap[String(s.studentId)] = s.status; });

    session.students.forEach((entry) => {
      const newStatus = statusMap[String(entry.studentId)];
      if (newStatus === "Present" || newStatus === "Absent") {
        entry.status = newStatus;
      }
    });

    await session.save();
    await session.populate(STUDENT_POPULATE);

    res.json({ success: true, message: "Attendance updated", session });
  } catch (err) {
    console.error("[PUT /attendance/update]", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// ============================================================
// 3. GET BY TEACHER — GET /api/attendance/teacher/:teacherId
//    Returns { sessions: [...] }  ← shape expected by AttendanceRecord.js
//    Optional query: from, to, subject
// ============================================================
router.get("/teacher/:teacherId", async (req, res) => {
  try {
    const { teacherId } = req.params;

    if (!isValidId(teacherId)) {
      return res.status(400).json({ success: false, message: "Invalid teacherId" });
    }

    const { from, to, subject } = req.query;
    const filter = { teacherId: new mongoose.Types.ObjectId(teacherId) };
    if (subject) filter.subject = subject;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = toMidnightUTC(from);
      if (to)   filter.date.$lte = toMidnightUTC(to);
    }

    const sessions = await Attendance.find(filter)
      .sort({ createdAt: -1 })   // newest first; frontend uses createdAt for time display
      .populate(STUDENT_POPULATE);

    // ── Return { sessions } — the exact key AttendanceRecord.js destructures
    res.json({ success: true, count: sessions.length, sessions });
  } catch (err) {
    console.error("[GET /attendance/teacher]", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// ============================================================
// 4. GET SINGLE SESSION — GET /api/attendance/session/:sessionId
// ============================================================
router.get("/session/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!isValidId(sessionId)) {
      return res.status(400).json({ success: false, message: "Invalid sessionId" });
    }

    const session = await Attendance.findById(sessionId)
      .populate("teacherId", "name id")
      .populate(STUDENT_POPULATE);

    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    res.json({ success: true, session });
  } catch (err) {
    console.error("[GET /attendance/session]", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// ============================================================
// 5. DELETE SESSION — DELETE /api/attendance/session/:sessionId
// ============================================================
router.delete("/session/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!isValidId(sessionId)) {
      return res.status(400).json({ success: false, message: "Invalid sessionId" });
    }

    const deleted = await Attendance.findByIdAndDelete(sessionId);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    res.json({ success: true, message: "Session deleted successfully" });
  } catch (err) {
    console.error("[DELETE /attendance/session]", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// ============================================================
// 6. GET BY CLASS — GET /api/attendance/class
//    Query: year (req), division (req), subject?, from?, to?
// ============================================================
router.get("/class", async (req, res) => {
  try {
    const { year, division, subject, from, to } = req.query;

    if (!year || !division) {
      return res.status(400).json({ success: false, message: "year and division are required" });
    }

    const filter = { year: normalizeYear(year), division };
    if (subject) filter.subject = subject;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = toMidnightUTC(from);
      if (to)   filter.date.$lte = toMidnightUTC(to);
    }

    const sessions = await Attendance.find(filter)
      .sort({ date: -1 })
      .populate("teacherId", "name id")
      .populate(STUDENT_POPULATE);

    res.json({ success: true, count: sessions.length, sessions });
  } catch (err) {
    console.error("[GET /attendance/class]", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// ============================================================
// 7. CLASS SUMMARY (aggregated) — GET /api/attendance/class/summary
//    Query: year (req), division (req), subject?, from?, to?
// ============================================================
router.get("/class/summary", async (req, res) => {
  try {
    const { year, division, subject, from, to } = req.query;

    if (!year || !division) {
      return res.status(400).json({ success: false, message: "year and division are required" });
    }

    const matchStage = { year: normalizeYear(year), division };
    if (subject) matchStage.subject = subject;
    if (from || to) {
      matchStage.date = {};
      if (from) matchStage.date.$gte = toMidnightUTC(from);
      if (to)   matchStage.date.$lte = toMidnightUTC(to);
    }

    const summary = await Attendance.aggregate([
      { $match: matchStage },
      { $unwind: "$students" },
      {
        $group: {
          _id: { studentId: "$students.studentId", subject: "$subject" },
          present: { $sum: { $cond: [{ $eq: ["$students.status", "Present"] }, 1, 0] } },
          total:   { $sum: 1 },
        },
      },
      {
        $group: {
          _id:          "$_id.studentId",
          subjects:     {
            $push: {
              subject:    "$_id.subject",
              present:    "$present",
              total:      "$total",
              percentage: { $round: [{ $multiply: [{ $divide: ["$present", "$total"] }, 100] }, 0] },
            },
          },
          totalPresent: { $sum: "$present" },
          totalClasses: { $sum: "$total" },
        },
      },
      {
        $addFields: {
          overallPercentage: {
            $cond: [
              { $gt: ["$totalClasses", 0] },
              { $round: [{ $multiply: [{ $divide: ["$totalPresent", "$totalClasses"] }, 100] }, 0] },
              0,
            ],
          },
        },
      },
      {
        $lookup: {
          from: "students", localField: "_id", foreignField: "_id", as: "studentInfo",
        },
      },
      { $unwind: { path: "$studentInfo", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0, studentId: "$_id",
          name:              "$studentInfo.name",
          rollNumber:        "$studentInfo.roll_no",
          subjects:          1,
          totalPresent:      1,
          totalClasses:      1,
          overallPercentage: 1,
        },
      },
      { $sort: { rollNumber: 1 } },
    ]);

    res.json({ success: true, year, division, subject: subject || "all", count: summary.length, summary });
  } catch (err) {
    console.error("[GET /attendance/class/summary]", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// ============================================================
// 8. STUDENT ATTENDANCE — GET /api/attendance/student/:studentId
//    Query: subject?, year?, division?, from?, to?
// ============================================================
router.get("/student/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!isValidId(studentId)) {
      return res.status(400).json({ success: false, message: "Invalid studentId" });
    }

    const { subject, year, division, from, to } = req.query;
    const filter = { "students.studentId": new mongoose.Types.ObjectId(studentId) };
    if (subject)  filter.subject  = subject;
    if (year)     filter.year     = year;
    if (division) filter.division = division;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = toMidnightUTC(from);
      if (to)   filter.date.$lte = toMidnightUTC(to);
    }

    const records = await Attendance.find(filter)
      .sort({ date: -1 })
      .populate("teacherId", "name id");

    const subjectMap = {};
    for (const session of records) {
      const entry = session.students.find((s) => s.studentId.toString() === studentId);
      if (!entry) continue;
      const key = session.subject;
      if (!subjectMap[key]) {
        subjectMap[key] = { subject: key, present: 0, absent: 0, total: 0, sessions: [] };
      }
      subjectMap[key].total++;
      if (entry.status === "Present") subjectMap[key].present++;
      else subjectMap[key].absent++;
      subjectMap[key].sessions.push({
        sessionId: session._id,
        date:      session.date,
        year:      session.year,
        division:  session.division,
        teacher:   session.teacherId,
        status:    entry.status,
      });
    }

    const subjectSummary = Object.values(subjectMap).map((s) => ({
      ...s,
      percentage: s.total ? Math.round((s.present / s.total) * 100) : 0,
    }));

    const totalPresent = subjectSummary.reduce((a, s) => a + s.present, 0);
    const totalClasses = subjectSummary.reduce((a, s) => a + s.total,   0);

    res.json({
      success: true,
      studentId,
      overall: {
        present:    totalPresent,
        total:      totalClasses,
        percentage: totalClasses ? Math.round((totalPresent / totalClasses) * 100) : 0,
      },
      subjectSummary,
    });
  } catch (err) {
    console.error("[GET /attendance/student]", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;