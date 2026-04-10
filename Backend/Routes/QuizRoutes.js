// Routes/QuizRoutes.js
// ⚠️  Specific paths MUST come BEFORE wildcard /:id routes

const express = require("express");
const router  = express.Router();
const Quiz    = require("../Models/Quiz");
const { sendNotificationToClass } = require('../utils/pushNotificationService');
const { emitNotificationToUsers } = require('../socket');

// ─────────────────────────────────────────────────────────────
// 1. GET STATS  ← must be before /:id or Express matches "meta" as an id
//    GET /api/quizzes/meta/stats?teacherId=xxx
// ─────────────────────────────────────────────────────────────
router.get("/meta/stats", async (req, res) => {
  try {
    const filter = req.query.teacherId ? { teacherId: req.query.teacherId } : {};
    const [active, scheduled, completed] = await Promise.all([
      Quiz.countDocuments({ ...filter, status: "ACTIVE" }),
      Quiz.countDocuments({ ...filter, status: "SCHEDULED" }),
      Quiz.countDocuments({ ...filter, status: "COMPLETED" }),
    ]);
    res.json({
      success: true,
      data: { active, scheduled, completed, total: active + scheduled + completed },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// NORMALISATION HELPERS
// Quiz builder always saves year as "1"/"2"/"3"/"4"
// Student DB may store "FY"/"SY"/"TY"/"LY" or "1st Year" etc.
// All values are normalised to numeric strings before comparing.
// ─────────────────────────────────────────────────────────────
const YEAR_NORM = {
  // text label → numeric
  'FY': '1', 'FIRST': '1', '1ST': '1', '1ST YEAR': '1', 'FIRST YEAR': '1',
  'SY': '2', 'SECOND': '2', '2ND': '2', '2ND YEAR': '2', 'SECOND YEAR': '2',
  'TY': '3', 'THIRD': '3', '3RD': '3', '3RD YEAR': '3', 'THIRD YEAR': '3',
  'LY': '4', 'FOURTH': '4', '4TH': '4', '4TH YEAR': '4', 'FOURTH YEAR': '4',
};
function normaliseYear(raw) {
  if (!raw) return null;
  const s = String(raw).trim().toUpperCase();
  return YEAR_NORM[s] || s.replace(/[^0-9]/g, '') || s; // strip non-digits as last resort
}
function normaliseDivision(raw) {
  if (!raw) return null;
  return String(raw).trim().toUpperCase(); // "a" → "A"
}
// batch from roll_no comes as "A1","B2" etc.
// quiz subDiv is stored as "1","2","3","4" (the numeric part only)
function normaliseBatch(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  // Strip any leading letter(s) so "A1"→"1", "B2"→"2", "1"→"1"
  return s.replace(/^[A-Za-z]+/, '');
}

// ─────────────────────────────────────────────────────────────
// 1B. GET QUIZZES FOR STUDENT
//     GET /api/quizzes/student/:studentId
// ─────────────────────────────────────────────────────────────
router.get("/student/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;
    const { year, division, subDiv, showAll } = req.query;

    // Normalise all three student fields to the same format the quiz builder uses
    const sYear     = normaliseYear(year);
    const sDivision = normaliseDivision(division);
    const sBatch    = normaliseBatch(subDiv);   // "A1" → "1", "B2" → "2"

    console.log(`🔍 Student quiz fetch — raw: year=${year} div=${division} batch=${subDiv}`);
    console.log(`✅ Normalised         — year=${sYear}  div=${sDivision}  batch=${sBatch}`);

    // Fetch all quizzes then filter in-memory (avoids DB format dependency)
    const allQuizzes = await Quiz.find().sort({ createdAt: -1 }).lean();

    let quizzes;

    if (showAll === 'true' || (!sYear && !sDivision)) {
      // No usable filter info — show everything
      console.log('📢 No class info available, returning all quizzes');
      quizzes = allQuizzes;
    } else {
     quizzes = allQuizzes.filter(q => {
  const qYear = normaliseYear(q.year);
  const qDiv  = normaliseDivision(q.division);
  const qBatch = normaliseBatch(q.subDiv);

  // ── Year: quiz has a year set → student must match (MANDATORY) ─────────
  if (qYear) {
    if (!sYear || qYear !== sYear) return false;
  }

  // ── Division: quiz has a division set → student must match (MANDATORY) ─
  if (qDiv) {
    if (!sDivision || qDiv !== sDivision) return false;
  }

  // ── SubDiv: quiz has a subDiv set → student must match (OPTIONAL) ──────
  // If quiz has NO subDiv, it applies to ALL batches in that year+division
  if (qBatch) {
    if (!sBatch || qBatch !== sBatch) return false;
  }
  // If qBatch is null/empty → quiz is for entire division, include it ✅

  return true;
});

      console.log(`📋 DB total: ${allQuizzes.length}  →  after filter: ${quizzes.length}`);
      if (quizzes.length === 0) {
        console.log('⚠️  No matches. All quizzes in DB:',
          allQuizzes.map(q => ({
            title: q.title,
            year: q.year, yearN: normaliseYear(q.year),
            div: q.division,  divN: normaliseDivision(q.division),
            batch: q.subDiv,  batchN: normaliseBatch(q.subDiv),
          }))
        );
      }
    }

    // Attach submission status for this student
    const data = quizzes.map(q => {
      const submission = (q.submissions || []).find(s => s.studentId === studentId);
      return {
        _id:         q._id,
        title:       q.title,
        subject:     q.subject  || null,
        class:       q.class    || null,
        year:        q.year     || null,
        division:    q.division || null,
        subDiv:      q.subDiv   || null,
        questions:   q.questions || [],
        duration:    q.duration || 30,
        status:      q.status,
        submitted:   !!submission,
        score:       submission?.score    ?? null,
        totalMarks:  submission?.totalMarks ?? null,
        createdAt:   q.createdAt,
        startedAt:   q.startedAt   || null,
        completedAt: q.completedAt || null,
      };
    });

    res.json({ success: true, data, count: data.length });
  } catch (err) {
    console.error("GET /student/:studentId error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 2. GET ALL QUIZZES  (Teacher dashboard list)
//    GET /api/quizzes
// ─────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { teacherId, status, subject, year, division } = req.query;
    const filter = {};
    if (teacherId) filter.teacherId = teacherId;
    if (status)    filter.status    = status.toUpperCase();
    if (subject)   filter.subject   = { $regex: subject, $options: "i" };
    if (year)      filter.year      = year;
    if (division)  filter.division  = division;

    const quizzes = await Quiz.find(filter).sort({ createdAt: -1 }).lean();

    const data = quizzes.map(q => ({
      _id:         q._id,
      title:       q.title,
      subject:     q.subject  || null,
      class:       q.class    || null,
      year:        q.year     || null,
      division:    q.division || null,
      subDiv:      q.subDiv   || null,
      questions:   Array.isArray(q.questions) ? q.questions.length : 0,
      duration:    `${q.duration} min`,
      status:      q.status,
      // submissions is an array of submission objects
      submissions: Array.isArray(q.submissions) ? q.submissions.length : 0,
      total:       q.total       || 0,
      startedAt:   q.startedAt   || null,
      completedAt: q.completedAt || null,
      createdAt:   q.createdAt,
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error("GET /quizzes error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 3. CREATE QUIZ
//    POST /api/quizzes
// ─────────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const {
      title, teacherId, subject, year, division, subDiv,
      questions, duration, shuffle, autoGrade, lockBrowser, total,
    } = req.body;

    if (!title || !teacherId) {
      return res.status(400).json({ success: false, message: "title and teacherId are required." });
    }
    if (!questions || !questions.length) {
      return res.status(400).json({ success: false, message: "At least one question is required." });
    }

    const YEAR_MAP = { "1": "FY", "2": "SY", "3": "TY", "4": "LY" };
    const classStr = [
      year     ? YEAR_MAP[year] || `Y${year}` : null,
      division ? `${division}`                : null,
    ].filter(Boolean).join("-");

    const quiz = new Quiz({
      title,
      teacherId,
      subject:     subject     || null,
      year:        year        || null,
      division:    division    || null,
      subDiv:      subDiv      || null,
      class:       classStr    || null,
      questions,
      duration:    duration    || 30,
      shuffle:     shuffle     ?? true,
      autoGrade:   autoGrade   ?? true,
      lockBrowser: lockBrowser ?? false,
      total:       total       || 0,
      status:      "SCHEDULED",
    });

    await quiz.save();

    // Send notifications to students in the class
    const notificationData = {
      type: 'quiz',
      title: '📊 New Quiz Available',
      body: `${title} - ${subject}. Starts at ${new Date(startTime).toLocaleTimeString()}`,
      data: {
        screen: 'QuizPortal',
        quizId: quiz._id.toString()
      },
      priority: 'high',
      sound: 'default'
    };

    await sendNotificationToClass(year, division, notificationData);

    // Return shaped response matching what QuizSessionScreen expects
    res.status(201).json({
      success: true,
      data: {
        _id:         quiz._id,
        title:       quiz.title,
        subject:     quiz.subject,
        class:       quiz.class,
        questions:   quiz.questions.length,
        duration:    `${quiz.duration} min`,
        status:      quiz.status,
        submissions: 0,
        total:       quiz.total,
        startedAt:   null,
      },
    });
  } catch (err) {
    console.error("POST /quizzes error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 4. START QUIZ  ← specific path before /:id
//    PATCH /api/quizzes/:id/start
// ─────────────────────────────────────────────────────────────
router.patch("/:id/start", async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ success: false, message: "Quiz not found." });
    if (quiz.status === "COMPLETED") {
      return res.status(400).json({ success: false, message: "Quiz is already completed." });
    }

    quiz.status    = "ACTIVE";
    quiz.startedAt = new Date();
    await quiz.save();

    res.json({
      success: true,
      data: { _id: quiz._id, status: quiz.status, startedAt: quiz.startedAt },
    });
  } catch (err) {
    console.error("PATCH /:id/start error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 5. END QUIZ  ← specific path before /:id
//    PATCH /api/quizzes/:id/end
// ─────────────────────────────────────────────────────────────
router.patch("/:id/end", async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ success: false, message: "Quiz not found." });

    quiz.status      = "COMPLETED";
    quiz.completedAt = new Date();
    await quiz.save();

    res.json({
      success: true,
      data: { _id: quiz._id, status: quiz.status, completedAt: quiz.completedAt },
    });
  } catch (err) {
    console.error("PATCH /:id/end error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 6. GET QUIZ RESULTS
//    GET /api/quizzes/:id/results  ← specific sub-path before /:id GET
// ─────────────────────────────────────────────────────────────
router.get("/:id/results", async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ success: false, message: "Quiz not found." });

    const subs       = quiz.submissions || [];
    const count      = subs.length;
    const totalMarks = quiz.questions.reduce((a, q) => a + q.points, 0);
    const scores     = subs.map(s => s.score || 0);
    const avg        = count ? Math.round((scores.reduce((a, b) => a + b, 0) / count / (totalMarks || 1)) * 100) : 0;
    const high       = count ? Math.round((Math.max(...scores) / (totalMarks || 1)) * 100) : 0;
    const participation = quiz.total > 0 ? Math.round((count / quiz.total) * 100) : 0;

    const students = subs.map(s => ({
      studentId:   s.studentId,
      studentName: s.studentName,
      score:       s.score,
      totalMarks,
      percentage:  totalMarks > 0 ? Math.round((s.score / totalMarks) * 100) : 0,
      duration:    s.duration,
      status:      s.status,
      submittedAt: s.submittedAt,
    }));

    res.json({
      success: true,
      data: {
        quiz: {
          _id: quiz._id, title: quiz.title, subject: quiz.subject,
          class: quiz.class, duration: quiz.duration,
          questions: quiz.questions.length, status: quiz.status,
        },
        kpi: { avg, high, participation },
        students,
        total:     quiz.total,
        submitted: count,
      },
    });
  } catch (err) {
    console.error("GET /:id/results error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 7. GET SINGLE QUIZ  (Teacher edit / Student solve)
//    GET /api/quizzes/:id
// ─────────────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id, { "submissions.answers": 0 });
    if (!quiz) return res.status(404).json({ success: false, message: "Quiz not found." });
    res.json({ success: true, data: quiz });
  } catch (err) {
    console.error("GET /:id error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 8. STUDENT SUBMITS QUIZ
//    POST /api/quizzes/:id/submit
// ─────────────────────────────────────────────────────────────
router.post("/:id/submit", async (req, res) => {
  try {
    const { studentId, studentName, answers, duration } = req.body;
    if (!studentId) return res.status(400).json({ success: false, message: "studentId required." });

    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ success: false, message: "Quiz not found." });
    if (quiz.status !== "ACTIVE") {
      return res.status(400).json({ success: false, message: "Quiz is not currently active." });
    }

    const already = quiz.submissions.find(s => s.studentId === studentId);
    if (already) return res.status(400).json({ success: false, message: "Already submitted." });

   let score = 0;
let totalMarks = 0;
if (quiz.autoGrade && answers?.length) {
  quiz.questions.forEach((q, i) => {
    totalMarks += (q.points || 1);

    // Match answer by questionId (string _id or positional index string)
    const ans = answers.find(a =>
      a.questionId !== undefined && (
        String(a.questionId) === String(q._id) ||
        String(a.questionId) === String(i)
      )
    ) ?? answers[i];

    if (!ans) return;

    if (q.type === "mc") {
      const correctIdx = q.options.findIndex(o => o.correct);
      if (correctIdx === -1) return;

      const selected = ans.selectedOption;
      if (selected === null || selected === undefined) return;

      // The client sends the array index as selectedOption (see QuizFinal.js submitQuiz)
      // Compare as numbers first (index-based), then fall back to string id match
      const selectedNum = Number(selected);
      const matchByIndex = !isNaN(selectedNum) && selectedNum === correctIdx;

      const correctOpt = q.options[correctIdx];
      const correctId  = String(correctOpt.id ?? correctOpt._id ?? correctIdx);
      const matchById  = String(selected) === correctId;

      if (matchByIndex || matchById) score += (q.points || 1);

    } else if (q.type === "tf") {
      if (ans.tfAnswer !== null && ans.tfAnswer !== undefined &&
          Boolean(ans.tfAnswer) === Boolean(q.tfAnswer)) {
        score += (q.points || 1);
      }
    }
  });
}
    quiz.submissions.push({
      studentId,
      studentName: studentName || studentId,
      answers: answers || [],
      score,
      totalMarks,
      duration: duration || "",
      submittedAt: new Date(),
      status: "On Time",
    });

    await quiz.save();
    res.json({
      success: true,
      data: {
        score,
        totalMarks,
        percentage: totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0,
      },
    });
  } catch (err) {
    console.error("POST /:id/submit error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 9. UPDATE QUIZ (before starting)
//    PUT /api/quizzes/:id
// ─────────────────────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ success: false, message: "Quiz not found." });
    if (quiz.status === "ACTIVE") {
      return res.status(400).json({ success: false, message: "Cannot edit an active quiz." });
    }
    const allowed = ["title","subject","year","division","subDiv","class",
                     "questions","duration","shuffle","autoGrade","lockBrowser","total"];
    allowed.forEach(k => { if (req.body[k] !== undefined) quiz[k] = req.body[k]; });
    await quiz.save();
    res.json({ success: true, data: quiz });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 10. DELETE QUIZ
//     DELETE /api/quizzes/:id
// ─────────────────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    await Quiz.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Quiz deleted." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;