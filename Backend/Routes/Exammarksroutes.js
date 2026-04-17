// Routes/ExamMarksRoutes.js
const express   = require("express");
const router    = express.Router();
const ExamMarks = require("../Models/Exammarks");
const Student   = require("../Models/Student");
const Teacher   = require("../Models/Teacher");
const auth = require("../middleware/auth"); 
const { sendNotificationToUsers } = require('../utils/pushNotificationService');

// ─────────────────────────────────────────────────────────────────────────────
// 1. UPSERT marks sheet
//    POST /api/exam-marks/save
// ─────────────────────────────────────────────────────────────────────────────
router.post("/save", async (req, res) => {
  try {
    const {
      teacherId, examName, classType, division, year,
      subjectCode, subjectName, maxMarks, marks, batch,
      maxMarksTheory, maxMarksLab,
    } = req.body;

    if (!teacherId || !examName || !classType || !division || !year || !subjectCode) {
      return res.status(400).json({ success: false, message: "Missing required fields." });
    }
    if (!Array.isArray(marks) || marks.length === 0) {
      return res.status(400).json({ success: false, message: "Marks array is empty." });
    }

    for (const entry of marks) {
      if (entry.isAbsent) continue;
      if (entry.mark === "" || entry.mark === undefined) continue;
      const n = Number(entry.mark);
      if (isNaN(n) || n < 0 || n > maxMarks) {
        return res.status(400).json({
          success: false,
          message: `Invalid mark "${entry.mark}" for student ${entry.name}. Must be 0–${maxMarks}.`,
        });
      }
    }

    // Include batch in filter so Lab B1/B2 stay separate
    const filter = { teacherId, examName, classType, division, year, subjectCode, batch: batch || null };
    const update = { $set: { subjectName, maxMarks, marks, batch: batch || null, maxMarksTheory: maxMarksTheory || 0, maxMarksLab: maxMarksLab || 0 } };

    const doc = await ExamMarks.findOneAndUpdate(filter, update, {
      upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: "Marks saved successfully.",
      data: { id: doc._id, updatedAt: doc.updatedAt },
    });
  } catch (err) {
    console.error("ExamMarks save error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. GET saved marks sheet
//    GET /api/exam-marks
// ─────────────────────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { teacherId, examName, classType, division, year, subjectCode } = req.query;

    const query = {};
    if (teacherId)   query.teacherId   = teacherId;
    if (examName)    query.examName    = examName;
    if (classType)   query.classType   = classType;
    if (division)    query.division    = division;
    if (year)        query.year        = year;
    if (subjectCode) query.subjectCode = subjectCode;

    const docs = await ExamMarks.find(query).lean();
    res.status(200).json({ success: true, data: docs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. GET all exams for a teacher (exam list)
//    GET /api/exam-marks/my-exams
// ─────────────────────────────────────────────────────────────────────────────
router.get("/my-exams", async (req, res) => {
  try {
    const { teacherId } = req.query;
    if (!teacherId) return res.status(400).json({ success: false, message: "teacherId required." });

    // Get distinct exam names for this teacher
    const exams = await ExamMarks.aggregate([
      { $match: { teacherId } },
      { $group: {
          _id: "$examName",
          examName: { $first: "$examName" },
          totalSheets: { $sum: 1 },
          classTypes: { $push: "$classType" },
          createdAt: { $max: "$createdAt" },
        }
      },
      { $sort: { createdAt: -1 } },
    ]);

    res.status(200).json({ success: true, data: exams });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. GET subjects for a teacher
//    GET /api/exam-marks/subjects
// ─────────────────────────────────────────────────────────────────────────────
router.get("/subjects", async (req, res) => {
  try {
    const { teacherId, classType } = req.query;
    if (!teacherId) return res.status(400).json({ success: false, message: "teacherId required." });

    const teacher = await Teacher.findById(teacherId).lean();
    if (!teacher) return res.status(404).json({ success: false, message: "Teacher not found." });

    const subjectNames = teacher.subjects?.year1 ?? [];
    const courseCodes  = teacher.course_codes?.year1 ?? [];

    const subjects = subjectNames.map((name, i) => ({
      code: courseCodes[i] ?? `SUB-${i + 1}`,
      name,
    }));

    res.status(200).json({ success: true, data: subjects });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. GET students for exam entry
//    GET /api/exam-marks/students
// ─────────────────────────────────────────────────────────────────────────────
router.get("/students", async (req, res) => {
  try {
    const { year, division } = req.query;
    if (!year || !division) {
      return res.status(400).json({ success: false, message: "year and division are required." });
    }

    const students = await Student.find({ year, division })
      .select("id name roll_no prn")
      .sort("roll_no")
      .lean();

    const data = students.map(s => ({
      id:     s.id,
      name:   s.name,
      rollNo: s.roll_no,
      prn:    s.prn,
    }));

    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. SUMMARY stats for a teacher
//    GET /api/exam-marks/summary/:teacherId
// ─────────────────────────────────────────────────────────────────────────────
router.get("/summary/:teacherId", async (req, res) => {
  try {
    const { teacherId } = req.params;
    const all = await ExamMarks.find({ teacherId }).lean();

    const byExam = {};
    let totalStudents = 0;
    let totalAbsent   = 0;

    for (const doc of all) {
      byExam[doc.examName] = (byExam[doc.examName] ?? 0) + 1;
      totalStudents += doc.marks.length;
      totalAbsent   += doc.marks.filter(m => m.isAbsent).length;
    }

    res.status(200).json({
      success: true,
      data: { totalSheets: all.length, byExam, totalStudents, totalAbsent },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. GET all exam results for a specific student
//    GET /api/exam-marks/student-results?studentId=&year=&division=
//
//    Returns per-subject row with all exam results
// ─────────────────────────────────────────────────────────────────────────────
router.get("/student-results", async (req, res) => {
  try {
    const { studentId, year, division } = req.query;
    if (!studentId || !year || !division) {
      return res.status(400).json({
        success: false,
        message: "studentId, year and division are required.",
      });
    }

    console.log('[student-results] studentId:', studentId, 'year:', year, 'division:', division);

    const allSheets = await ExamMarks.find({ year, division }).lean();
    console.log('[student-results] total sheets found:', allSheets.length);

    if (!allSheets.length) return res.status(200).json({ success: true, data: [] });

    // Group sheets by subject+classType+batch
    // Each group accumulates marks AND maxMarks per exam type
    const subjectMap = {};

    for (const sheet of allSheets) {
      const studentEntry = sheet.marks.find(
        m => String(m.studentId).trim() === String(studentId).trim()
      );
      if (!studentEntry) continue;

      console.log('[student-results] matched:', sheet.subjectName, sheet.examType,
        '→ mark:', studentEntry.mark, '/ maxMarks:', sheet.maxMarks);

      const batch = sheet.batch ?? null;
      const key   = `${sheet.subjectCode.toUpperCase()}__${sheet.classType}__${batch || ''}`;

      if (!subjectMap[key]) {
        subjectMap[key] = {
          subjectCode: sheet.subjectCode,
          subjectName: sheet.subjectName,
          classType:   sheet.classType,
          batch,
          exams: {}, // will store exam results
          isAbsent: false,
        };
      }

      const markVal = studentEntry.isAbsent ? 0 : (Number(studentEntry.mark) || 0);
      const maxVal  = Number(sheet.maxMarks) || 0;

      // Store exam results dynamically
      subjectMap[key].exams[sheet.examName] = {
        obtained: markVal,
        max: maxVal,
      };

      if (studentEntry.isAbsent) subjectMap[key].isAbsent = true;
    }

    const results = Object.values(subjectMap).map(entry => {
      // Calculate total marks
      const internalMax = Object.values(entry.exams).reduce((sum, e) => sum + (e.max || 0), 0);
      const internal = Object.values(entry.exams).reduce((sum, e) => sum + (e.obtained || 0), 0);

      // Fallback: if no sheets saved yet, use classType default
      const effectiveMax = internalMax > 0
        ? internalMax
        : (entry.classType === "Lab" ? 50 : 40);

      const passThreshold = effectiveMax * 0.4;

      return {
        subjectCode: entry.subjectCode,
        subjectName: entry.subjectName,
        classType:   entry.classType,
        batch:       entry.batch,
        exams:       entry.exams, // all exam results
        internal,
        internalMax: effectiveMax,
        total:       internal,
        status: entry.isAbsent
          ? "ABSENT"
          : internalMax === 0
          ? "-"
          : internal >= passThreshold ? "PASS" : "FAIL",
      };
    });

    console.log('[student-results] subjects returned:', results.length);
    return res.status(200).json({ success: true, data: results });

  } catch (err) {
    console.error("student-results error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// When exam marks are published
router.post('/publish-marks', async (req, res) => {
  try {
    const { examId, marks } = req.body;
    
    // Save marks (existing code)
    // ...

    // Send notification to each student
    for (const mark of marks) {
      const notificationData = {
        type: 'exam_result',
        title: '📈 Exam Results Published',
        body: `Your exam results are now available. Check your performance!`,
        data: {
          screen: 'ExamResults',
          examId: examId
        },
        priority: 'high'
      };

      await sendNotificationToUsers(mark.studentId, 'Student', notificationData);
    }

    res.json({
      success: true,
      message: 'Marks published and students notified'
    });

  } catch (error) {
    console.error('Error publishing marks:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;