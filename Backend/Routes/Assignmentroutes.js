// Routes/AssignmentRoutes.js
// Full CRUD for assignments — connected to Assignment model
// Supports: resource attachments, per-submission AI scores, teacher verification

const express    = require("express");
const router     = express.Router();
const multer     = require("multer");
const path       = require("path");
const fs         = require("fs");
const Assignment = require("../Models/Assignment");

/* ─── Multer — resource uploads (teacher-attached images + docs) ─────────── */
const UPLOADS_DIR = path.join(__dirname, "../uploads/assignment-resources");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const resourceStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename:    (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}_${safe}`);
  },
});

const resourceUpload = multer({
  storage: resourceStorage,
  limits:  { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg", "image/png", "image/gif", "image/webp",
      "application/octet-stream",
    ];
    const ext = (file.originalname ?? "").split(".").pop()?.toLowerCase();
    const okExt = ["pdf","doc","docx","jpg","jpeg","png","gif","webp"].includes(ext);
    if (allowed.includes(file.mimetype) || okExt) cb(null, true);
    else cb(new Error(`Unsupported file type: .${ext}`));
  },
});

/* ─── Multer — student submission files ──────────────────────────────────── */
const SUBMISSIONS_DIR = path.join(__dirname, "../uploads/submissions");
if (!fs.existsSync(SUBMISSIONS_DIR)) fs.mkdirSync(SUBMISSIONS_DIR, { recursive: true });

const submissionUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/octet-stream",
    ];
    const ext = (file.originalname ?? "").split(".").pop()?.toLowerCase();
    const okExt = ["pdf", "doc", "docx"].includes(ext);
    if (allowed.includes(file.mimetype) || okExt) cb(null, true);
    else cb(new Error(`Unsupported file type: .${ext}`));
  },
});

/* ─── Helper: derive resource type from mime / ext ──────────────────────── */
const resourceType = (mime, name) => {
  if (mime?.startsWith("image/")) return "image";
  const ext = (name ?? "").split(".").pop()?.toLowerCase();
  if (["jpg","jpeg","png","gif","webp"].includes(ext)) return "image";
  return "document";
};

/* ═══════════════════════════════════════════════════════════════════════════
   1. CREATE ASSIGNMENT  (with optional resource files)
   POST /api/assignments
   Content-Type: multipart/form-data  OR  application/json
═══════════════════════════════════════════════════════════════════════════ */
router.post("/", resourceUpload.array("resources", 10), async (req, res) => {
  try {
    const {
      title, subject, unit, description,
      dueDate, dueTime,
      year, division, teacherId,
    } = req.body;

    if (!title || !subject)
      return res.status(400).json({ success: false, message: "Title and subject are required." });
    if (!year || !division)
      return res.status(400).json({ success: false, message: "Year and division are required." });

    const resources = (req.files ?? []).map(f => ({
      name:     f.originalname,
      url:      `/uploads/assignment-resources/${f.filename}`,
      mimeType: f.mimetype,
      size:     f.size,
      type:     resourceType(f.mimetype, f.originalname),
    }));

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
      resources,
      submissions: [],
    });

    await assignment.save();
    res.status(201).json({ success: true, message: "Assignment created.", data: assignment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   2. GET ALL ASSIGNMENTS  (with optional filters)
   GET /api/assignments?teacherId=&year=&division=&subject=&status=
═══════════════════════════════════════════════════════════════════════════ */
router.get("/", async (req, res) => {
  try {
    const { teacherId, year, division, subject, status } = req.query;
    const filter = {};

    if (teacherId) filter.teacherId = teacherId;

    if (year) {
      const YEAR_MAP = { '1': 'FY', '2': 'SY', '3': 'TY', '4': 'LY' };
      const normYear = YEAR_MAP[year.trim()] ?? year.trim();
      filter.year = { $regex: new RegExp(`^${normYear}$`, 'i') };
    }
    if (division)
      filter.division = { $regex: new RegExp(`^${division.trim()}$`, 'i') };
    if (subject)
      filter.subject  = { $regex: new RegExp(`^${subject.trim()}$`, 'i') };
    if (status)
      filter.status   = status;

    const assignments = await Assignment.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: assignments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   3. GET SINGLE ASSIGNMENT
   GET /api/assignments/:id
═══════════════════════════════════════════════════════════════════════════ */
router.get("/:id", async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment)
      return res.status(404).json({ success: false, message: "Not found." });
    res.json({ success: true, data: assignment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   4. UPDATE ASSIGNMENT  (with optional new resource files)
   PUT /api/assignments/:id
   Content-Type: multipart/form-data  OR  application/json
═══════════════════════════════════════════════════════════════════════════ */
router.put("/:id", resourceUpload.array("resources", 10), async (req, res) => {
  try {
    const allowed = [
      "title", "subject", "unit", "description",
      "dueDate", "dueTime",
      "status", "approved", "tag",
      "year", "division",
    ];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    if (req.files?.length > 0) {
      const newResources = req.files.map(f => ({
        name:     f.originalname,
        url:      `/uploads/assignment-resources/${f.filename}`,
        mimeType: f.mimetype,
        size:     f.size,
        type:     resourceType(f.mimetype, f.originalname),
      }));

      const assignment = await Assignment.findByIdAndUpdate(
        req.params.id,
        { $set: updates, $push: { resources: { $each: newResources } } },
        { new: true, runValidators: true }
      );
      if (!assignment)
        return res.status(404).json({ success: false, message: "Not found." });
      return res.json({ success: true, data: assignment });
    }

    const assignment = await Assignment.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!assignment)
      return res.status(404).json({ success: false, message: "Not found." });
    res.json({ success: true, data: assignment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   4b. DELETE A SINGLE RESOURCE FROM AN ASSIGNMENT
   DELETE /api/assignments/:id/resources/:resourceId
═══════════════════════════════════════════════════════════════════════════ */
router.delete("/:id/resources/:resourceId", async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment)
      return res.status(404).json({ success: false, message: "Not found." });

    const resource = assignment.resources.id(req.params.resourceId);
    if (resource) {
      const filePath = path.join(__dirname, "..", resource.url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      resource.deleteOne();
      await assignment.save();
    }
    res.json({ success: true, data: assignment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   5. APPROVE ASSIGNMENT  (whole assignment)
   PATCH /api/assignments/:id/approve
═══════════════════════════════════════════════════════════════════════════ */
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
    if (!assignment)
      return res.status(404).json({ success: false, message: "Not found." });
    res.json({ success: true, data: assignment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   6. RESTORE ASSIGNMENT  (APPROVED → ACTIVE)
   PATCH /api/assignments/:id/restore
═══════════════════════════════════════════════════════════════════════════ */
router.patch("/:id/restore", async (req, res) => {
  try {
    const assignment = await Assignment.findByIdAndUpdate(
      req.params.id,
      { $set: { status: "ACTIVE", approved: false, tag: null } },
      { new: true }
    );
    if (!assignment)
      return res.status(404).json({ success: false, message: "Not found." });
    res.json({ success: true, data: assignment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   7. ADD SUBMISSION  (student submits with file upload)
   POST /api/assignments/:id/submissions
   Content-Type: multipart/form-data
   Fields: studentId, name, roll, comment,
           fileName, aiPercent, similarityPercent, analysisAvailable
   File:   file  (the student's PDF / DOCX)
═══════════════════════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════════════════════
   7. ADD SUBMISSION  (student submits — file stored as base64 in DB)
   POST /api/assignments/:id/submissions
   Content-Type: multipart/form-data
   Fields: studentId, name, roll, comment,
           fileName, aiPercent, similarityPercent, analysisAvailable
   File:   file  (PDF / DOCX — stored as base64 in MongoDB, no disk write)
═══════════════════════════════════════════════════════════════════════════ */
router.post("/:id/submissions", submissionUpload.single("file"), async (req, res) => {
  console.log('📥 Content-Type:', req.headers['content-type']);
  console.log('📥 req.body:', req.body);
  console.log('📥 req.file:', req.file?.originalname);

  try {
    const {
      studentId, name, roll, comment,
      fileName, aiPercent, similarityPercent, analysisAvailable,
    } = req.body;

    if (!studentId || !name)
      return res.status(400).json({ success: false, message: "studentId and name required." });

    const assignment = await Assignment.findById(req.params.id);
    if (!assignment)
      return res.status(404).json({ success: false, message: "Not found." });

    const alreadySubmitted = assignment.submissions.some(s => s.studentId === studentId);
    if (alreadySubmitted)
      return res.status(409).json({ success: false, message: "Student already submitted." });

    // ── Build fileUrl from buffer (memoryStorage — no filename property) ──
    let fileUrl      = "";
    let savedFileName = fileName || "";

    if (req.file) {
      const base64   = req.file.buffer.toString("base64");
      fileUrl        = `data:${req.file.mimetype};base64,${base64}`;
      savedFileName  = req.file.originalname;
    }

    assignment.submissions.push({
      studentId,
      name,
      roll:              roll    || "",
      comment:           comment || "",
      fileName:          savedFileName,
      fileUrl,
      aiPercent:         aiPercent         != null ? Number(aiPercent)         : null,
      similarityPercent: similarityPercent != null ? Number(similarityPercent) : null,
      analysisAvailable: analysisAvailable === "true" || analysisAvailable === true,
      verificationStatus: "pending",
      submittedAt: new Date(),
    });

    assignment.tag = {
      label: "Has Submissions",
      color: "#22C55E",
      icon:  "checkmark-circle-outline",
    };

    await assignment.save();
    res.json({ success: true, data: assignment });
  } catch (err) {
    console.error("Submission error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   8. VERIFY / REJECT individual student submission  (teacher action)
   PATCH /api/assignments/:id/submissions/:submissionId/verify
   Body: { action: "verified" | "rejected", teacherNote?: string }
═══════════════════════════════════════════════════════════════════════════ */
router.patch("/:id/submissions/:submissionId/verify", async (req, res) => {
  try {
    const { action, teacherNote } = req.body;
    if (!["verified", "rejected"].includes(action))
      return res.status(400).json({ success: false, message: "action must be 'verified' or 'rejected'." });

    const assignment = await Assignment.findById(req.params.id);
    if (!assignment)
      return res.status(404).json({ success: false, message: "Not found." });

    const submission = assignment.submissions.id(req.params.submissionId);
    if (!submission)
      return res.status(404).json({ success: false, message: "Submission not found." });

    submission.verificationStatus = action;
    submission.teacherNote        = teacherNote || "";
    submission.verifiedAt         = new Date();

    await assignment.save();
    res.json({ success: true, data: assignment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   9. DELETE ASSIGNMENT
   DELETE /api/assignments/:id
═══════════════════════════════════════════════════════════════════════════ */
router.delete("/:id", async (req, res) => {
  try {
    const assignment = await Assignment.findByIdAndDelete(req.params.id);
    if (!assignment)
      return res.status(404).json({ success: false, message: "Not found." });

    // Clean up any uploaded submission files for this assignment
    // (optional but keeps disk clean)
    res.json({ success: true, message: "Assignment deleted." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   10. STATS
   GET /api/assignments/stats/summary?teacherId=
═══════════════════════════════════════════════════════════════════════════ */
router.get("/stats/summary", async (req, res) => {
  try {
    const { teacherId } = req.query;
    const filter = teacherId ? { teacherId } : {};

    const [active, approved, closed, all] = await Promise.all([
      Assignment.countDocuments({ ...filter, status: "ACTIVE"   }),
      Assignment.countDocuments({ ...filter, status: "APPROVED" }),
      Assignment.countDocuments({ ...filter, status: "CLOSED"   }),
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