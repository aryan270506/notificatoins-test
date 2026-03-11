// Routes/AssignmentRoutes.js
// Full CRUD for assignments — connected to Assignment model

const express    = require("express");
const router     = express.Router();
const Assignment = require("../Models/Assignment");

// ─────────────────────────────────────────────────────────────
// 1. CREATE ASSIGNMENT
//    POST /api/assignments
// ─────────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const {
      title, subject, unit, description,
      dueDate, dueTime,
      year, division, teacherId,
    } = req.body;

    if (!title || !subject) {
      return res.status(400).json({ success: false, message: "Title and subject are required." });
    }
    if (!year || !division) {
      return res.status(400).json({ success: false, message: "Year and division are required." });
    }

    const assignment = new Assignment({
      title,
      subject,
      unit:        unit        || "",
      description: description || "",
      dueDate:     dueDate     || "TBD",
      dueTime:     dueTime     || "",
      year,
      division,
      teacherId,
      status:      "ACTIVE",
      approved:    false,
      tag:         { label: "New", color: "#3B6EF5", icon: "information-circle-outline" },
      submissions: [],
    });

    await assignment.save();
    res.status(201).json({ success: true, message: "Assignment created.", data: assignment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 2. GET ALL ASSIGNMENTS (with optional filters)
//    GET /api/assignments?teacherId=&year=&division=&subject=&status=
// ─────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { teacherId, year, division, subject, status } = req.query;
    const filter = {};

    if (teacherId) filter.teacherId = teacherId;

    // Case-insensitive match for year — handles "FY"/"fy"/"1" variants
    if (year) {
      // Normalise numeric codes to text before querying
      const YEAR_MAP = { '1': 'FY', '2': 'SY', '3': 'TY', '4': 'LY' };
      const normYear = YEAR_MAP[year.trim()] ?? year.trim();
      filter.year = { $regex: new RegExp(`^${normYear}$`, 'i') };
    }

    // Case-insensitive match for division — handles "a"/"A" variants
    if (division) {
      filter.division = { $regex: new RegExp(`^${division.trim()}$`, 'i') };
    }

    if (subject) filter.subject = { $regex: new RegExp(`^${subject.trim()}$`, 'i') };
    if (status)  filter.status  = status;

    const assignments = await Assignment.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: assignments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 3. GET SINGLE ASSIGNMENT
//    GET /api/assignments/:id
// ─────────────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: "Not found." });
    res.json({ success: true, data: assignment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 4. UPDATE ASSIGNMENT
//    PUT /api/assignments/:id
// ─────────────────────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const allowed = [
      "title", "subject", "unit", "description",
      "dueDate", "dueTime",
      "status", "approved", "tag",
      "year", "division",
    ];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const assignment = await Assignment.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!assignment) return res.status(404).json({ success: false, message: "Not found." });
    res.json({ success: true, data: assignment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 5. APPROVE ASSIGNMENT
//    PATCH /api/assignments/:id/approve
// ─────────────────────────────────────────────────────────────
router.patch("/:id/approve", async (req, res) => {
  try {
    const assignment = await Assignment.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status:   "APPROVED",
          approved: true,
          tag: { label: "Approved", color: "#14B8A6", icon: "checkmark-circle-outline" },
        },
      },
      { new: true }
    );
    if (!assignment) return res.status(404).json({ success: false, message: "Not found." });
    res.json({ success: true, data: assignment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 6. RESTORE ASSIGNMENT (APPROVED → ACTIVE)
//    PATCH /api/assignments/:id/restore
// ─────────────────────────────────────────────────────────────
router.patch("/:id/restore", async (req, res) => {
  try {
    const assignment = await Assignment.findByIdAndUpdate(
      req.params.id,
      { $set: { status: "ACTIVE", approved: false, tag: null } },
      { new: true }
    );
    if (!assignment) return res.status(404).json({ success: false, message: "Not found." });
    res.json({ success: true, data: assignment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 7. ADD SUBMISSION
//    POST /api/assignments/:id/submissions
//    Body: { studentId, name, roll }
// ─────────────────────────────────────────────────────────────
router.post("/:id/submissions", async (req, res) => {
  try {
    const { studentId, name, roll } = req.body;
    if (!studentId || !name) {
      return res.status(400).json({ success: false, message: "studentId and name required." });
    }

    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: "Not found." });

    const alreadySubmitted = assignment.submissions.some(s => s.studentId === studentId);
    if (alreadySubmitted) {
      return res.status(409).json({ success: false, message: "Student already submitted." });
    }

    assignment.submissions.push({ studentId, name, roll, submittedAt: new Date() });

    // Auto-tag "All Submitted" once everyone in the class has submitted
    // (Since total is no longer stored, we check against division student count if available,
    //  otherwise just mark as "Submitted" generically)
    assignment.tag = {
      label: "Submitted",
      color: "#22C55E",
      icon:  "checkmark-circle-outline",
    };

    await assignment.save();
    res.json({ success: true, data: assignment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 8. DELETE ASSIGNMENT
//    DELETE /api/assignments/:id
// ─────────────────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const assignment = await Assignment.findByIdAndDelete(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: "Not found." });
    res.json({ success: true, message: "Assignment deleted." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 9. GET ASSIGNMENT STATS (for dashboard KPI)
//    GET /api/assignments/stats/summary?teacherId=
// ─────────────────────────────────────────────────────────────
router.get("/stats/summary", async (req, res) => {
  try {
    const { teacherId } = req.query;
    const filter = teacherId ? { teacherId } : {};

    const [active, approved, closed, all] = await Promise.all([
      Assignment.countDocuments({ ...filter, status: "ACTIVE"    }),
      Assignment.countDocuments({ ...filter, status: "APPROVED"  }),
      Assignment.countDocuments({ ...filter, status: "CLOSED"    }),
      Assignment.find(filter, "submissions status"),
    ]);

    res.json({
      success: true,
      data: { active, approved, closed, total: all.length },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;