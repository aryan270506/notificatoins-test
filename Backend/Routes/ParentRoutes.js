const express = require("express");
const router  = express.Router();
const { checkUploadPermission } = require("../Middleware/permissionCheck");

const Student        = require("../Models/Student");
const Parent         = require("../Models/Parent");       // adjust path if different
const Timetable      = require("../Models/Timetable");
const StudentFinance = require("../Models/Finance");
const ExamMarks      = require("../Models/Exammarks");

// ══════════════════════════════════════════════════════════════════════════════
// 🔥 Upload Parents (JSON Array)
// POST /api/parents/upload
// ══════════════════════════════════════════════════════════════════════════════
router.post("/upload", checkUploadPermission("Parent"), async (req, res) => {
  try {
    const parents = req.body;

    if (!Array.isArray(parents)) {
      return res.status(400).json({
        message: "Expected an array of parents"
      });
    }

    const inserted = await Parent.insertMany(parents, {
      ordered: false
    });

    res.status(201).json({
      message: "Parents uploaded successfully",
      count: inserted.length
    });

  } catch (error) {
    console.error("POST /parents/upload error:", error);
    res.status(500).json({
      message: "Upload failed",
      error: error.message
    });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GET ALL PARENTS
// GET /api/parents/
// ══════════════════════════════════════════════════════════════════════════════
router.get("/", async (req, res) => {
  try {
    const parents = await Parent.find({}).select("-password").lean();
    res.json({ success: true, data: parents, count: parents.length });
  } catch (error) {
    console.error("GET /parents error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GET TIMETABLE FOR A PARENT  (via their child's roll_no)
// GET /api/parents/timetable/:parentId
//
// roll_no format:  FY-A2-36
//                  ^^  ^^  ^^
//                  |   |   └─ roll number (ignored for timetable lookup)
//                  |   └───── batch  (e.g. A2, B1)
//                  └───────── year   FY=1 | SY=2 | TY=3 | LY=4
// ══════════════════════════════════════════════════════════════════════════════

// ── Helper: decode year abbreviation ─────────────────────────────────────────
function parseYearFromCode(code) {
  const map = { FY: "1", SY: "2", TY: "3", LY: "4" };
  return map[code?.toUpperCase()] || null;
}

// ── Helper: parse roll_no → { year, division, batch } ────────────────────────
// Expects format:  FY-A2-36   or   SY-B3-07  etc.
function parseRollNo(roll_no) {
  if (!roll_no) return null;

  // Split on dash
  const parts = roll_no.split("-");
  // parts[0] = "FY"  parts[1] = "A2"  parts[2] = "36"
  if (parts.length < 2) return null;

  const yearCode  = parts[0].toUpperCase();             // "FY"
  const batchCode = parts[1].toUpperCase();             // "A2"

  const year      = parseYearFromCode(yearCode);        // "1"
  if (!year) return null;

  // Division is the leading letter(s) of the batch code
  // e.g. "A2" → division "A",  "B3" → division "B"
  const division  = batchCode.replace(/[^A-Z]/g, "");   // "A"
  const batch     = batchCode;                          // "A2"

  return { year, division, batch };
}

router.get("/subjects/:parentId", async (req, res) => {
  try {
    const { parentId } = req.params;

    // 🔥 IMPORTANT: you are using custom "id", not _id
    const parent = await Parent.findOne({ id: parentId }).lean();

    if (!parent) {
      return res.status(404).json({ message: "Parent not found" });
    }

    res.status(200).json({
      subjects: parent.subjects || [],
      labs: parent.lab || [],   // your field name is "lab", not "labs"
    });

  } catch (error) {
    console.error("GET /parents/subjects error:", error);
    res.status(500).json({ message: error.message });
  }
});

router.get("/timetable/:parentId", async (req, res) => {
  try {
    const { parentId } = req.params;

    // 🔥 Fix 1: Query by custom id
    const parent = await Parent.findOne({ id: parentId }).lean();

    if (!parent) {
      return res.status(404).json({ success: false, message: "Parent not found" });
    }

    // 🔥 Fix 2: Use parent's roll_no directly
    const parsed = parseRollNo(parent.roll_no);

    if (!parsed) {
      return res.status(400).json({
        success: false,
        message: `Cannot parse roll_no: "${parent.roll_no}"`,
      });
    }

    const { year, division, batch } = parsed;

    const timetable = await Timetable.findOne({
      year,
      division: division.toUpperCase(),
      batch: batch.toUpperCase(),
    }).lean();

    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: `No timetable found for Year ${year}, Division ${division}, Batch ${batch}`,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        studentName: parent.name,
        rollNo: parent.roll_no,
        year,
        division,
        batch,
        timetable,
      },
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/parents/finance/:parentId
// Returns the linked student's finance data for the parent to view
// ══════════════════════════════════════════════════════════════════════════════
router.get("/finance/:parentId", async (req, res) => {
  try {
    const { parentId } = req.params;

    // Look up parent by custom id first, then by MongoDB _id
    let parent = await Parent.findOne({ id: parentId }).lean();
    if (!parent) {
      parent = await Parent.findById(parentId).lean();
    }
    if (!parent) {
      return res.status(404).json({ success: false, message: "Parent not found" });
    }

    // Find the linked student using PRN
    let student = null;
    if (parent.prn) {
      student = await Student.findOne({ prn: parent.prn }).lean();
    }
    if (!student && parent.roll_no) {
      student = await Student.findOne({ roll_no: parent.roll_no }).lean();
    }
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Linked student not found. Ensure the parent account has a valid PRN or roll number.",
      });
    }

    // Query finance data using student's MongoDB _id (same key the student app uses)
    let record = await StudentFinance.findOne({ studentId: student._id.toString() });

    // Fallback: try with custom id field
    if (!record) {
      record = await StudentFinance.findOne({ studentId: student.id });
    }

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "No finance records found for the linked student.",
      });
    }

    return res.status(200).json({
      success: true,
      data: record,
      student: {
        name:   student.name,
        prn:    student.prn,
        branch: student.branch,
        year:   student.year,
        rollNo: student.roll_no,
      },
    });
  } catch (err) {
    console.error("[GET /parents/finance]", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/parents/child-info/:parentId
// Returns the linked student's profile information
// ══════════════════════════════════════════════════════════════════════════════
router.get("/child-info/:parentId", async (req, res) => {
  try {
    const { parentId } = req.params;

    let parent = await Parent.findOne({ id: parentId }).lean();
    if (!parent) parent = await Parent.findById(parentId).lean();
    if (!parent) {
      return res.status(404).json({ success: false, message: "Parent not found" });
    }

    // Find linked student via PRN or roll_no
    let student = null;
    if (parent.prn)     student = await Student.findOne({ prn: parent.prn }).lean();
    if (!student && parent.roll_no) student = await Student.findOne({ roll_no: parent.roll_no }).lean();
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Linked student not found.",
      });
    }

    return res.status(200).json({
      success: true,
      student: {
        _id:      student._id,
        id:       student.id,
        name:     student.name,
        email:    student.email,
        prn:      student.prn,
        rollNo:   student.roll_no,
        branch:   student.branch,
        division: student.division,
        year:     student.year,
        subjects: student.subjects || [],
        labs:     student.lab || [],
      },
    });
  } catch (err) {
    console.error("[GET /parents/child-info]", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/parents/exam-results/:parentId
// Returns all exam marks for the parent's linked student.
// Shows ALL enrolled subjects (from Student model); overlays marks when
// a teacher has entered them.  Subjects with no marks yet show as dashes.
// ══════════════════════════════════════════════════════════════════════════════
router.get("/exam-results/:parentId", async (req, res) => {
  try {
    const { parentId } = req.params;

    let parent = await Parent.findOne({ id: parentId }).lean();
    if (!parent) parent = await Parent.findById(parentId).lean();
    if (!parent) {
      return res.status(404).json({ success: false, message: "Parent not found" });
    }

    // Find the linked student
    let student = null;
    if (parent.prn)     student = await Student.findOne({ prn: parent.prn }).lean();
    if (!student && parent.roll_no) student = await Student.findOne({ roll_no: parent.roll_no }).lean();
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Linked student not found.",
      });
    }

    // ── 1. Build a base subject map from ALL enrolled subjects ──────────────
    //    student.subjects = ["Mathematics", "Physics", …]
    //    student.lab      = ["Physics Lab", …]
    const subjectMap = {};

    // Helper — add a subject placeholder (no marks yet)
    const ensureSubject = (name, classType) => {
      // Use the subject name as key (normalised)
      const key = name.trim().toLowerCase();
      if (!subjectMap[key]) {
        subjectMap[key] = {
          subjectCode: null,          // filled from ExamMarks if exists
          subjectName: name.trim(),
          classType:   classType,
          cat1: null, cat1Max: null,
          cat2: null, cat2Max: null,
          fet:  null, fetMax:  null,
        };
      }
    };

    (student.subjects || []).forEach((s) => ensureSubject(s, "Theory"));
    (student.lab      || []).forEach((s) => ensureSubject(s, "Lab"));

    // ── 2. Query all ExamMarks for this student's year & division ───────────
    //    This fetches ALL exam-mark docs that *could* relate to the student
    //    (including docs where the student may or may not have an entry).
    const allExams = await ExamMarks.find({
      year:     student.year,
      division: student.division,
    }).lean();

    // ── 3. Overlay actual marks onto the subject map ────────────────────────
    for (const doc of allExams) {
      // Find this student's entry in the marks array
      const entry = doc.marks.find((m) => m.rollNo === student.roll_no);
      if (!entry) continue; // student not in this doc

      // Try to match by subjectName first, then fall back to subjectCode
      const nameKey = doc.subjectName.trim().toLowerCase();
      const codeKey = doc.subjectCode.trim().toLowerCase();

      let target = subjectMap[nameKey] || subjectMap[codeKey];

      // If the subject isn't in the student's enrolled list (edge case),
      // create a new entry keyed by subjectCode
      if (!target) {
        subjectMap[codeKey] = {
          subjectCode: doc.subjectCode,
          subjectName: doc.subjectName,
          classType:   doc.classType,
          cat1: null, cat1Max: null,
          cat2: null, cat2Max: null,
          fet:  null, fetMax:  null,
        };
        target = subjectMap[codeKey];
      }

      // Fill in subject code from the exam doc
      if (!target.subjectCode) {
        target.subjectCode = doc.subjectCode;
      }

      const mark   = entry.isAbsent ? 0 : Number(entry.mark) || 0;
      const maxMrk = doc.maxMarks || 0;

      if (doc.examType === "CAT 1") {
        target.cat1    = mark;
        target.cat1Max = maxMrk;
      } else if (doc.examType === "CAT 2") {
        target.cat2    = mark;
        target.cat2Max = maxMrk;
      } else if (doc.examType === "FET") {
        target.fet    = mark;
        target.fetMax = maxMrk;
      }
    }

    // ── 4. Convert map → array and compute internal marks ───────────────────
    const subjects = Object.values(subjectMap).map((s) => {
      const cat1    = s.cat1    ?? null;
      const cat1Max = s.cat1Max ?? null;
      const cat2    = s.cat2    ?? null;
      const cat2Max = s.cat2Max ?? null;
      const fet     = s.fet     ?? null;
      const fetMax  = s.fetMax  ?? null;

      // Internal = average of CAT scores (if available)
      let internal    = null;
      let internalMax = null;
      if (cat1 !== null && cat2 !== null) {
        internal    = Math.round((cat1 + cat2) / 2);
        internalMax = cat1Max; // same scale
      } else if (cat1 !== null) {
        internal    = cat1;
        internalMax = cat1Max;
      } else if (cat2 !== null) {
        internal    = cat2;
        internalMax = cat2Max;
      }

      return {
        subjectCode: s.subjectCode || '-',
        subjectName: s.subjectName,
        classType:   s.classType,
        cat1, cat1Max,
        cat2, cat2Max,
        fet, fetMax,
        internal, internalMax,
      };
    });

    return res.status(200).json({
      success: true,
      student: {
        name:     student.name,
        prn:      student.prn,
        rollNo:   student.roll_no,
        branch:   student.branch,
        year:     student.year,
        division: student.division,
      },
      subjects,
    });
  } catch (err) {
    console.error("[GET /parents/exam-results]", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;