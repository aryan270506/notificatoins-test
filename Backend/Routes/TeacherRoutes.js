// Routes/TeacherRoutes.js
// ⚠️  Route ORDER matters in Express — specific paths must come before /:id

const express = require("express");
const router  = express.Router();
const Teacher = require("../Models/Teacher");
const multer  = require("multer");
const { checkUploadPermission } = require("../Middleware/permissionCheck");

// ── Multer (memory storage for profile images)
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed."), false);
    }
    cb(null, true);
  },
});

// ─────────────────────────────────────────────────────────────
// 1. BULK UPLOAD TEACHERS
//    POST /api/teachers/upload
// ─────────────────────────────────────────────────────────────
router.post("/upload", checkUploadPermission("Teacher"), async (req, res) => {
  try {
    const teachers = req.body;
    if (!Array.isArray(teachers)) {
      return res.status(400).json({ success: false, message: "Expected an array of teacher objects" });
    }
    const inserted = await Teacher.insertMany(teachers, { ordered: false });
    res.status(201).json({ success: true, message: "Teachers uploaded successfully", count: inserted.length });
  } catch (error) {
    res.status(500).json({ success: false, message: "Upload failed", error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 2. GET ALL TEACHERS
//    GET /api/teachers/all
// ─────────────────────────────────────────────────────────────
router.get("/all", async (req, res) => {
  try {
    // Exclude binary profileImage data from list view for performance
    const teachers = await Teacher.find({}, { "profileImage.data": 0 });

    const formatted = teachers.map(t => ({
      _id: t._id,
      id: t.id,
      name: t.name,
      years: t.years,
      divisions: t.divisions,
      subjects: t.subjects || {},
    }));

    res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 3. STATS — assignment summary for a teacher's dashboard
//    GET /api/teachers/stats?teacherId=
// ─────────────────────────────────────────────────────────────
router.get("/stats", async (req, res) => {
  try {
    // Delegate to Assignment model
    const Assignment = require("../Models/Assignment");
    const { teacherId } = req.query;
    const filter = teacherId ? { teacherId } : {};

    const [active, approved, closed, allAssignments] = await Promise.all([
      Assignment.countDocuments({ ...filter, status: "ACTIVE" }),
      Assignment.countDocuments({ ...filter, status: "APPROVED" }),
      Assignment.countDocuments({ ...filter, status: "CLOSED" }),
      Assignment.find(filter, "submissions total status"),
    ]);

    const pending = allAssignments.filter(
      a => a.status === "ACTIVE" && a.submissions.length >= a.total
    ).length;

    res.json({ success: true, data: { active, approved, closed, pending } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 4. UPLOAD PROFILE IMAGE  ← must be before /:id
//    PUT /api/teachers/profile/upload/:id
// ─────────────────────────────────────────────────────────────
router.put("/profile/upload/:id", upload.single("profileImage"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image uploaded" });
    }

    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) return res.status(404).json({ success: false, message: "Teacher not found" });

    teacher.profileImage = { data: req.file.buffer, contentType: req.file.mimetype };
    await teacher.save();

    res.status(200).json({ success: true, message: "Profile image updated." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 5. SERVE PROFILE IMAGE  ← must be before /:id
//    GET /api/teachers/profile/image/:id
// ─────────────────────────────────────────────────────────────
router.get("/profile/image/:id", async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher || !teacher.profileImage?.data) {
      return res.status(404).send("No image found");
    }
    res.set("Content-Type", teacher.profileImage.contentType);
    res.set("Cache-Control", "public, max-age=3600");
    res.send(teacher.profileImage.data);
  } catch (err) {
    res.status(500).send("Server error");
  }
});

// ─────────────────────────────────────────────────────────────
// 6. GET TEACHER BY SUBJECT, YEAR & DIVISION
//    GET /api/teachers/by-subject?subject=Math&year=1&division=A
// ─────────────────────────────────────────────────────────────
router.get("/by-subject", async (req, res) => {
  try {
    const { subject, year, division } = req.query;

    if (!subject || !year || !division) {
      return res.status(400).json({
        success: false,
        message: "subject, year, and division query parameters are required"
      });
    }

    // Convert year to string for mapping (e.g., "1" → "year1", "2" → "year2")
    const yearKey = `year${year}`;

    // Find a teacher that teaches this subject in this year and division
    // Use case-insensitive regex matching for the subject
    const subjectRegex = new RegExp(`^${subject}$`, 'i');
    
    const teacher = await Teacher.findOne({
      [`subjects.${yearKey}`]: { $regex: subjectRegex },
      years: { $in: [parseInt(year)] },
      divisions: { $in: [division] }
    }, { "profileImage.data": 0 }); // Exclude binary image data

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: `No teacher found for subject "${subject}" in Year ${year}, Division ${division}`
      });
    }

    res.status(200).json({
      success: true,
      teacher: {
        _id: teacher._id,
        id: teacher.id,
        name: teacher.name,
        years: teacher.years,
        divisions: teacher.divisions,
        subjects: teacher.subjects
      }
    });
  } catch (error) {
    console.error("GET /teachers/by-subject error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 7. UPLOAD MARKSHEET
//    POST /api/teachers/marksheet/upload
// ─────────────────────────────────────────────────────────────
router.post("/marksheet/upload", async (req, res) => {
  try {
    const { studentId, subject, marks, totalMarks } = req.body;
    const Marksheet = require("../Models/Marksheet");
    const record = new Marksheet({ studentId, subject, marks, totalMarks });
    await record.save();
    res.status(201).json({ success: true, message: "Marks uploaded!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 8. GET MARKSHEET  ← must be before /:id
//    GET /api/teachers/marksheet/:studentId
// ─────────────────────────────────────────────────────────────
router.get("/marksheet/:studentId", async (req, res) => {
  try {
    const Marksheet = require("../Models/Marksheet");
    const marks = await Marksheet.find({ studentId: req.params.studentId });
    res.status(200).json({ success: true, data: marks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 9. GET SINGLE TEACHER  ← LAST (wildcard)
//    GET /api/teachers/:id
// ─────────────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id, { "profileImage.data": 0 });
    if (!teacher) return res.json({ success: false, message: "Teacher not found" });
    res.json({ success: true, data: teacher });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;