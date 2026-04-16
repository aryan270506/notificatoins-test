// Routes/TeacherRoutes.js
// ⚠️  Route ORDER matters in Express — specific paths must come before /:id

const express = require("express");
const router  = express.Router();
const Teacher = require("../Models/Teacher");
const multer  = require("multer");
const { checkUploadPermission } = require("../Middleware/permissionCheck");

const YEAR_ALIASES_BY_NUMBER = {
  "1": ["1", "1st Year", "First Year", "FY"],
  "2": ["2", "2nd Year", "Second Year", "SY"],
  "3": ["3", "3rd Year", "Third Year", "TY"],
  "4": ["4", "4th Year", "Fourth Year", "LY"],
};

function normalizeYearToNumber(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const upper = raw.toUpperCase();
  if (["FY", "FIRST YEAR"].includes(upper) || upper.startsWith("1ST YEAR")) return "1";
  if (["SY", "SECOND YEAR"].includes(upper) || upper.startsWith("2ND YEAR")) return "2";
  if (["TY", "THIRD YEAR"].includes(upper) || upper.startsWith("3RD YEAR")) return "3";
  if (["LY", "FOURTH YEAR"].includes(upper) || upper.startsWith("4TH YEAR")) return "4";

  const firstDigit = raw.match(/[1-4]/);
  return firstDigit ? firstDigit[0] : null;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildClassStudentFilter(classTeacher) {
  const mappedYear = normalizeYearToNumber(classTeacher?.year);
  const rawYear = String(classTeacher?.year || "").trim();
  const division = String(classTeacher?.division || "").trim();

  const yearCandidates = new Set();
  if (rawYear) yearCandidates.add(rawYear);
  if (mappedYear) {
    YEAR_ALIASES_BY_NUMBER[mappedYear].forEach((y) => yearCandidates.add(y));
  }

  return {
    year: { $in: [...yearCandidates] },
    division: new RegExp(`^${escapeRegex(division)}$`, "i"),
  };
}

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
      return res.status(400).json({
        success: false,
        message: "Expected an array of teacher objects",
      });
    }

    let successCount = 0;
    const errors = [];

    for (const t of teachers) {
      try {
        // ✅ Normalize + Add Defaults (VERY IMPORTANT)
        const teacherData = {
          id: t.id,
          name: t.name,
          password: t.password,

          branch: t.branch ,
          years: t.years,
          divisions: t.divisions,
          subDivisions: t.subDivisions ,

          subjects: t.subjects || {
            theory: { year1: [] },
            lab: { year1: [] },
          },
        };

        // ❌ Skip if required fields missing
        if (!teacherData.id || !teacherData.name || !teacherData.password) {
          throw new Error("Missing required fields (id, name, password)");
        }

        // ✅ Prevent duplicate (IMPORTANT)
        const exists = await Teacher.findOne({ id: teacherData.id });
        if (exists) {
          throw new Error("Duplicate teacher id");
        }

        const newTeacher = new Teacher(teacherData);
        await newTeacher.save();

        successCount++;
      } catch (err) {
        errors.push({
          id: t.id || "unknown",
          error: err.message,
        });
      }
    }

    res.status(201).json({
      success: true,
      message: "Upload processed",
      count: successCount,
      failed: errors.length,
      errors,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Upload failed",
      error: error.message,
    });
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
  branch: t.branch,
  years: t.years,
  divisions: t.divisions,
  subDivisions: t.subDivisions,
  subjects: t.subjects,
  classTeacher: t.classTeacher,
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

    const yearKey = `year${year}`;
    const subjectRegex = new RegExp(`^${subject}$`, "i");

    const teacher = await Teacher.findOne(
      {
        [`subjects.${yearKey}`]: { $regex: subjectRegex },
        years: { $in: [parseInt(year)] },
        divisions: { $in: [division] },
      },
      { "profileImage.data": 0 }
    );

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: `No teacher found for subject "${subject}" in Year ${year}, Division ${division}`,
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
        subjects: teacher.subjects,
      },
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
// 9. GET ALL CLASS TEACHER ASSIGNMENTS  ← must be before /:id
//    GET /api/teachers/class-teachers
//
//    Returns a flat map:
//    { assignments: { "1st Year-A": { name, teacherId }, ... } }
//    Used by the committee dashboard to render the CT grid.
// ─────────────────────────────────────────────────────────────
router.get("/class-teachers", async (req, res) => {
  try {
    // Only fetch teachers who actually have a classTeacher assignment
    const assigned = await Teacher.find(
      {
        "classTeacher.year":     { $ne: null },
        "classTeacher.division": { $ne: null },
      },
      { name: 1, id: 1, "classTeacher": 1 }
    );

    // Build the { "1st Year-A": { name, teacherId, assignedAt } } map
    const assignments = {};
    assigned.forEach(t => {
      const key = `${t.classTeacher.year}-${t.classTeacher.division}`;
      assignments[key] = {
        name:       t.name,
        teacherId:  t._id,
        assignedAt: t.classTeacher.assignedAt,
      };
    });

    res.status(200).json({ success: true, assignments });
  } catch (error) {
    console.error("GET /teachers/class-teachers error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 10. ASSIGN CLASS TEACHER  ← must be before /:id
//     POST /api/teachers/assign-class-teacher
//
//     Body: { teacherId, year, division }
//
//     Logic:
//       1. Validate year + division values.
//       2. Clear the classTeacher field from whoever currently
//          holds that year+division slot (if anyone).
//       3. Set classTeacher on the newly chosen teacher.
//
//     This guarantees exactly one CT per year+division at all times.
// ─────────────────────────────────────────────────────────────
router.post("/assign-class-teacher", async (req, res) => {
  try {
    const { teacherId, year, division } = req.body;

    // ── Validation ──────────────────────────────────────────
    const VALID_YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

    if (!teacherId || !year || !division) {
      return res.status(400).json({
        success: false,
        message: "teacherId, year, and division are required.",
      });
    }
    if (!VALID_YEARS.includes(year)) {
      return res.status(400).json({
        success: false,
        message: `year must be one of: ${VALID_YEARS.join(", ")}`,
      });
    }
    // 🔄 Division validation removed - now admin-configurable
    // Just ensure it's a non-empty string
    if (typeof division !== "string" || division.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "division must be a non-empty string",
      });
    }

    // ── Confirm the target teacher exists ───────────────────
    const newCT = await Teacher.findById(teacherId);
    if (!newCT) {
      return res.status(404).json({ success: false, message: "Teacher not found." });
    }

    // ── Step 1: Clear the slot from its current holder ──────
    // (skip if the same teacher is being re-assigned — still update assignedAt)
    await Teacher.updateMany(
      {
        _id: { $ne: newCT._id },           // not the incoming teacher
        "classTeacher.year":     year,
        "classTeacher.division": division,
      },
      {
        $set: {
          "classTeacher.year":       null,
          "classTeacher.division":   null,
          "classTeacher.assignedAt": null,
        },
      }
    );

    // ── Step 2: Assign the slot to the new teacher ──────────
    newCT.classTeacher = { year, division, assignedAt: new Date() };
    await newCT.save();

    res.status(200).json({
      success: true,
      message: `${newCT.name} assigned as Class Teacher for ${year} Division ${division}.`,
      data: {
        teacherId: newCT._id,
        name:      newCT.name,
        year,
        division,
        assignedAt: newCT.classTeacher.assignedAt,
      },
    });
  } catch (error) {
    console.error("POST /teachers/assign-class-teacher error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 11. REMOVE CLASS TEACHER ASSIGNMENT  ← must be before /:id
//     DELETE /api/teachers/class-teachers/:teacherId
//
//     Clears the classTeacher field from a specific teacher.
//     Useful if a committee wants to unassign without replacing.
// ─────────────────────────────────────────────────────────────
router.delete("/class-teachers/:teacherId", async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.teacherId);
    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher not found." });
    }

    const wasYear = teacher.classTeacher?.year;
    const wasDiv  = teacher.classTeacher?.division;

    teacher.classTeacher = { year: null, division: null, assignedAt: null };
    await teacher.save();

    res.status(200).json({
      success: true,
      message: wasYear
        ? `Class teacher assignment for ${wasYear} Div ${wasDiv} has been removed.`
        : "No active assignment found.",
    });
  } catch (error) {
    console.error("DELETE /teachers/class-teachers/:teacherId error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 12. GET SINGLE TEACHER  ← LAST (wildcard)
//     GET /api/teachers/:id
//
//     Looks up teacher by either MongoDB _id or custom id field.
//     Also returns classTeacher so the Teacher's own dashboard
//     can display "You are Class Teacher of X Year Div Y".
// ─────────────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🔍 Teacher lookup - id: ${id}`);
    
    // Try to find by MongoDB _id first, then by custom id field
    let teacher = await Teacher.findById(id, { "profileImage.data": 0 });
    
    if (!teacher) {
      console.log(`📋 Not found by _id, trying by id field...`);
      teacher = await Teacher.findOne({ id }, { "profileImage.data": 0 });
    }
    
    if (!teacher) {
      console.log(`❌ Teacher not found for id: ${id}`);
      return res.status(404).json({ success: false, message: "Teacher not found" });
    }
    
    // Ensure classTeacher object exists with proper structure
    if (!teacher.classTeacher) {
      teacher.classTeacher = { year: null, division: null, assignedAt: null };
    }
    
    console.log(`✅ Teacher found:`, teacher.name, 'ClassTeacher:', teacher.classTeacher);
    res.json({ success: true, data: teacher });
  } catch (err) {
    console.error(`🔴 GET /teachers/:id error:`, err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ─────────────────────────────────────────────────────────────
// DEBUG: Find teacher by name
//        GET /api/teachers/debug/by-name?name=Deepika
// ─────────────────────────────────────────────────────────────
router.get("/debug/by-name", async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) {
      return res.status(400).json({ message: "name query param required" });
    }
    const teacher = await Teacher.findOne(
      { name: { $regex: name, $options: "i" } },
      { "profileImage.data": 0 }
    );
    res.json({ success: true, data: teacher });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// DEBUG: Assign class teacher by name
//        POST /api/teachers/debug/assign-by-name
//        Body: { name, year, division }
// ─────────────────────────────────────────────────────────────
router.post("/debug/assign-by-name", async (req, res) => {
  try {
    const { name, year, division } = req.body;
    if (!name || !year || !division) {
      return res.status(400).json({ message: "name, year, and division required" });
    }

    const teacher = await Teacher.findOne({ name: { $regex: name, $options: "i" } });
    if (!teacher) {
      return res.status(404).json({ message: `Teacher "${name}" not found` });
    }

    // Clear old assignment for this year+division
    await Teacher.updateMany(
      { _id: { $ne: teacher._id }, "classTeacher.year": year, "classTeacher.division": division },
      { $set: { "classTeacher.year": null, "classTeacher.division": null, "classTeacher.assignedAt": null } }
    );

    // Assign to this teacher
    teacher.classTeacher = { year, division, assignedAt: new Date() };
    await teacher.save();

    res.json({ 
      success: true, 
      message: `✅ ${teacher.name} assigned as class teacher for ${year} ${division}`,
      data: teacher 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 15. GET STUDENTS FOR CLASS TEACHER
//     GET /api/teachers/:teacherId/students-for-class
//
//     Logic: Fetch all students for the class teacher's assigned year+division
// ─────────────────────────────────────────────────────────────
router.get("/:teacherId/students-for-class", async (req, res) => {
  try {
    const { teacherId } = req.params;

    // Get teacher and check if they are a class teacher
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher not found" });
    }

    if (!teacher.classTeacher?.year || !teacher.classTeacher?.division) {
      return res.status(400).json({
        success: false,
        message: "This teacher is not assigned as a class teacher",
      });
    }

    const Student = require("../Models/Student");
    const classFilter = buildClassStudentFilter(teacher.classTeacher);
    const students = await Student.find(classFilter, {
      // Return only the fields the frontend needs — excludes password, etc.
      _id: 1, id: 1, name: 1, email: 1,
      roll_no: 1, prn: 1, division: 1, year: 1, batch: 1,
    }).lean();

    res.status(200).json({
      success: true,
      data: students,
      classInfo: { year: teacher.classTeacher.year, division: teacher.classTeacher.division },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch students",
      error: error.message,
    });
  }
});

// ─────────────────────────────────────────────────────────────
// 15b. ASSIGN BATCH — replaces students in a fixed batch (A/B/C)
//      PUT /api/teachers/:teacherId/assign-batch
//
//      Body: { batch: "A"|"B"|"C", studentIds: ["252141001", ...] }
//
//      This is the primary batch-management endpoint used by the new UI.
//      It does two things atomically:
//        1. Updates the Student documents — sets student.batch field
//        2. Syncs the Teacher.batches array (upsert by batchName)
// ─────────────────────────────────────────────────────────────
router.put("/:teacherId/assign-batch", async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { batch, studentIds } = req.body;

    if (!['A', 'B', 'C'].includes(batch)) {
      return res.status(400).json({ success: false, message: "batch must be 'A', 'B', or 'C'" });
    }
    if (!Array.isArray(studentIds)) {
      return res.status(400).json({ success: false, message: "studentIds must be an array" });
    }

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher not found" });
    }

    const Student = require("../Models/Student");

    // ── 1. Sync Student documents ───────────────────────────────
    // Clear all students currently in this batch (for this teacher's class)
    const classFilter = buildClassStudentFilter(teacher.classTeacher);

    // Unassign everyone in this batch within the class
    await Student.updateMany(
      { ...classFilter, batch },
      { $set: { batch: null } }
    );

    // Assign selected students to this batch
    if (studentIds.length > 0) {
      await Student.updateMany(
        { ...classFilter, id: { $in: studentIds } },
        { $set: { batch } }
      );
    }

    // ── 2. Sync Teacher.batches array ───────────────────────────
    // Fetch full details for the selected students
    const students = await Student.find(
      { ...classFilter, id: { $in: studentIds } },
      { id: 1, name: 1, email: 1 }
    ).lean();

    const studentDetails = students.map(s => ({
      studentId:    s.id,
      studentName:  s.name,
      studentEmail: s.email,
    }));

    // Upsert: update existing batch entry or add new one
    const existingBatchIdx = teacher.batches.findIndex(b => b.batchName === batch);
    if (existingBatchIdx >= 0) {
      teacher.batches[existingBatchIdx].students = studentDetails;
    } else {
      teacher.batches.push({ batchName: batch, students: studentDetails, createdAt: new Date() });
    }

    await teacher.save();

    res.status(200).json({
      success: true,
      message: `Batch ${batch} updated with ${studentIds.length} student(s).`,
      data: teacher.batches,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to assign batch", error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 16. CREATE BATCH (legacy — kept for compatibility)
router.post("/:teacherId/create-batch", async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { batchName } = req.body;
    const studentIds = Array.isArray(req.body?.studentIds) ? req.body.studentIds : [];

    if (!batchName) {
      return res.status(400).json({
        success: false,
        message: "batchName is required",
      });
    }

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher not found" });
    }

    // Fetch student details.
    // The frontend sends the student's custom `id` field (e.g. "252141001"),
    // NOT MongoDB _ids. Query by the `id` field accordingly.
    const Student = require("../Models/Student");
    const students = await Student.find({ id: { $in: studentIds } }).lean();

    const studentDetails = students.map((s) => ({
      studentId: s.id,
      studentName: s.name,
      studentEmail: s.email,
    }));

    // Add batch to teacher
    teacher.batches.push({
      batchName,
      students: studentDetails,
      createdAt: new Date(),
    });

    await teacher.save();

    res.status(201).json({
      success: true,
      message: "Batch created successfully",
      data: teacher.batches,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create batch",
      error: error.message,
    });
  }
});

// ─────────────────────────────────────────────────────────────
// 17. GET TEACHER BATCHES
//     GET /api/teachers/:teacherId/batches
// ─────────────────────────────────────────────────────────────
router.get("/:teacherId/batches", async (req, res) => {
  try {
    const { teacherId } = req.params;

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher not found" });
    }

    res.status(200).json({
      success: true,
      data: teacher.batches,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch batches",
      error: error.message,
    });
  }
});

// ─────────────────────────────────────────────────────────────
// 18. DELETE BATCH
//     DELETE /api/teachers/:teacherId/batch/:batchId
// ─────────────────────────────────────────────────────────────
router.delete("/:teacherId/batch/:batchId", async (req, res) => {
  try {
    const { teacherId, batchId } = req.params;

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher not found" });
    }

    teacher.batches = teacher.batches.filter((b) => b._id.toString() !== batchId);
    await teacher.save();

    res.status(200).json({
      success: true,
      message: "Batch deleted successfully",
      data: teacher.batches,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete batch",
      error: error.message,
    });
  }
});

// ─────────────────────────────────────────────────────────────
// 19. UPDATE BATCH
//     PUT /api/teachers/:teacherId/batch/:batchId
//
//     Body: { batchName, studentIds }
// ─────────────────────────────────────────────────────────────
router.put("/:teacherId/batch/:batchId", async (req, res) => {
  try {
    const { teacherId, batchId } = req.params;
    const { batchName, studentIds } = req.body;

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher not found" });
    }

    const batch = teacher.batches.find((b) => b._id.toString() === batchId);
    if (!batch) {
      return res.status(404).json({ success: false, message: "Batch not found" });
    }

    // Update batch name if provided
    if (batchName) {
      batch.batchName = batchName;
    }

    // Update students if provided
    if (studentIds && Array.isArray(studentIds)) {
      const Student = require("../Models/Student");
      // studentIds sent from frontend are custom `id` strings, not MongoDB _ids
      const students = await Student.find({ id: { $in: studentIds } }).lean();

      batch.students = students.map((s) => ({
        studentId: s.id,
        studentName: s.name,
        studentEmail: s.email,
      }));
    }

    await teacher.save();

    res.status(200).json({
      success: true,
      message: "Batch updated successfully",
      data: teacher.batches,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update batch",
      error: error.message,
    });
  }
});

module.exports = router;