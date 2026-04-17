const express = require("express");
const router = express.Router();
const Student = require("../Models/Student");
const Teacher = require("../Models/Teacher");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const { checkUploadPermission } = require("../Middleware/permissionCheck");
const auth = require("../Middleware/auth");

function resolveAdminScope(req) {
  const user = req.user || {};

  if (String(user.role || "").toLowerCase() !== "admin") {
    return { error: "Only admin users can upload student data." };
  }

  if (!user.instituteId) {
    return { error: "Institute scope not found in token. Please login again." };
  }

  if (!user.departmentCode) {
    return { error: "Department scope not found in token. Please login again." };
  }

  return {
    instituteId: String(user.instituteId),
    instituteName: String(user.instituteName || "").trim(),
    departmentCode: String(user.departmentCode || "__INSTITUTE__").trim(),
    departmentName: String(user.departmentName || "Institute").trim(),
  };
}

function resolveRequestScope(req) {
  const user = req.user || {};

  if (!user.instituteId) {
    return { error: "Institute scope not found in token. Please login again." };
  }

  if (!user.departmentCode) {
    return { error: "Department scope not found in token. Please login again." };
  }

  return {
    instituteId: String(user.instituteId),
    departmentCode: String(user.departmentCode).trim(),
  };
}

async function findScopedStudent(incomingId, scope) {
  let student = await Student.findOne({
    id: incomingId,
    instituteId: scope.instituteId,
    departmentCode: scope.departmentCode,
  });

  if (student) {
    return student;
  }

  const mongoose = require("mongoose");
  if (mongoose.Types.ObjectId.isValid(incomingId)) {
    student = await Student.findOne({
      _id: incomingId,
      instituteId: scope.instituteId,
      departmentCode: scope.departmentCode,
    });
    if (student) {
      return student;
    }
  }

  return Student.findOne({
    prn: incomingId,
    instituteId: scope.instituteId,
    departmentCode: scope.departmentCode,
  });
}

// 🔥 Upload students from frontend
router.post("/upload", auth, checkUploadPermission("Student"), async (req, res) => {
  try {
    const students = req.body; // frontend will send array
    const scope = resolveAdminScope(req);

    if (scope?.error) {
      return res.status(401).json({ success: false, message: scope.error });
    }

    if (!Array.isArray(students)) {
      return res.status(400).json({ message: "Expected array of students" });
    }

    // Strictly replace only this admin's institute+department students.
    await Student.deleteMany({
      instituteId: scope.instituteId,
      departmentCode: scope.departmentCode,
    });

    const formattedStudents = await Promise.all(
      students.map(async (student) => {
        const hashedPassword = await bcrypt.hash(student.password, 10);

        return {
          ...student,
          password: hashedPassword,
          instituteId: scope?.instituteId || null,
          instituteName: scope?.instituteName || null,
          departmentCode: scope?.departmentCode || null,
          departmentName: scope?.departmentName || null,
        };
      })
    );

    await Student.insertMany(formattedStudents, { ordered: false });

    res.status(200).json({
      message: "Students uploaded successfully",
      count: formattedStudents.length,
    });

  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate student ID/email exists in another scope. Please use unique records per upload.",
        error: error.message,
      });
    }

    res.status(500).json({ error: error.message });
  }
});

// 🔥 Get all students (with optional filters)
router.get("/", async (req, res) => {
  try {
    const { year, division, search } = req.query;
    const filter = {};

    if (year) filter.year = year;
    if (division) filter.division = division;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { id: { $regex: search, $options: "i" } },
        { prn: { $regex: search, $options: "i" } },
      ];
    }

    const students = await Student.find(filter).lean();

    return res.status(200).json({
      success: true,
      data: students,
      count: students.length,
    });
  } catch (error) {
    console.error("GET /students error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch students",
      error: error.message,
    });
  }
});

// 🔥 Get students by year+division (query params — used by admin reports)
router.get("/by-class", async (req, res) => {
  try {
    const { year, division } = req.query;
    if (!year || !division) {
      return res.status(400).json({ message: "year and division are required" });
    }
    const students = await Student.find({ year: String(year), division }).lean();
    return res.status(200).json(students);
  } catch (error) {
    console.error("GET /students/by-class error:", error);
    return res.status(500).json({ message: "Failed to fetch students", error: error.message });
  }
});

// 🔥 Get students by year and division with attendance summary
router.get("/year/:year/division/:division", async (req, res) => {
  try {
    const { year, division } = req.params;

    const validYears = ['1', '2', '3'];
    if (!validYears.includes(String(year))) {
      return res.status(400).json({ success: false, message: "Invalid year" });
    }

    const students = await Student.find({ year: String(year), division }).lean();

    // For each student, calculate overall attendance
    const Attendance = require("../Models/Attendance");

    const studentsWithAttendance = await Promise.all(
      students.map(async (student) => {
        // Find all sessions where this student appears
        const sessions = await Attendance.find({
          "students.studentId": student._id,
        });

        if (sessions.length === 0) {
          return {
            ...student,
            attendanceSummary: {
              overallPercentage: 0,
              totalAttended: 0,
              totalClasses: 0,
            },
          };
        }

        let totalAttended = 0;
        let totalClasses = 0;

        sessions.forEach((session) => {
          const entry = session.students.find(
            (s) => s.studentId.toString() === student._id.toString()
          );
          if (entry) {
            totalClasses++;
            if (entry.status === "Present") totalAttended++;
          }
        });

        const overallPercentage = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 0;

        return {
          ...student,
          attendanceSummary: {
            overallPercentage,
            totalAttended,
            totalClasses,
          },
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: studentsWithAttendance,
      count: studentsWithAttendance.length,
    });
  } catch (error) {
    console.error("GET /students/year/:year/division/:division error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch students",
      error: error.message,
    });
  }
});

// 🔥 Get subjects of logged-in student
router.get("/subjects/:id", async (req, res) => {
  try {
    const student = await Student.findOne({ id: req.params.id });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json(student);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🔥 Update student profile photo
router.put("/update-photo/:id", async (req, res) => {
  try {
    const { photo } = req.body;

    const student = await Student.findOneAndUpdate(
      { id: req.params.id },
      { profilePhoto: photo },
      { new: true }
    );

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json({
      message: "Profile photo updated",
      profilePhoto: student.profilePhoto,
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🔥 Remove a student from the authenticated teacher's division
router.put("/unassign-division/:id", auth, async (req, res) => {
  try {
    const incomingId = req.params.id;
    const scope = resolveRequestScope(req);

    if (scope?.error) {
      return res.status(401).json({ success: false, message: scope.error });
    }

    const student = await findScopedStudent(incomingId, scope);

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    student.division = null;
    student.batch = null;
    await student.save();

    const teachers = await Teacher.find({
      instituteId: scope.instituteId,
      departmentCode: scope.departmentCode,
    });

    for (const teacher of teachers) {
      let dirty = false;

      teacher.batches.forEach((batch) => {
        if (!Array.isArray(batch.students)) {
          return;
        }

        const before = batch.students.length;
        batch.students = batch.students.filter((entry) => String(entry.studentId) !== String(student.id));
        if (batch.students.length !== before) {
          dirty = true;
        }
      });

      if (dirty) {
        await teacher.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: "Student removed from division successfully",
      data: {
        _id: student._id,
        id: student.id,
        prn: student.prn,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to remove student from division",
      error: error.message,
    });
  }
});

// 🔥 Assign division to a single student (class teacher action)
router.put("/assign-division/:id", auth, async (req, res) => {
  try {
    const incomingId = req.params.id;
    const { division } = req.body;
    const scope = resolveRequestScope(req);

    if (typeof division !== "string" || !division.trim()) {
      return res.status(400).json({ success: false, message: "division is required" });
    }

    if (scope?.error) {
      return res.status(401).json({ success: false, message: scope.error });
    }

    let student = await Student.findOne({
      id: incomingId,
      instituteId: scope.instituteId,
      departmentCode: scope.departmentCode,
    });

    if (!student) {
      const mongoose = require("mongoose");
      if (mongoose.Types.ObjectId.isValid(incomingId)) {
        student = await Student.findOne({
          _id: incomingId,
          instituteId: scope.instituteId,
          departmentCode: scope.departmentCode,
        });
      }
    }

    if (!student) {
      student = await Student.findOne({
        prn: incomingId,
        instituteId: scope.instituteId,
        departmentCode: scope.departmentCode,
      });
    }

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    student.division = division.trim();
    await student.save();

    return res.status(200).json({
      success: true,
      message: `Division updated to ${student.division}`,
      data: {
        _id: student._id,
        id: student.id,
        prn: student.prn,
        division: student.division,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update student division",
      error: error.message,
    });
  }
});

// 🔥 Get student by ID (for refresh)
// 🔥 Get student by ID (keep this BELOW other routes)
router.get("/:id", async (req, res) => {
  try {
    const incomingId = req.params.id;
    console.log("[Student GET] Incoming ID:", incomingId);
    let student = await Student.findOne({ id: incomingId });
    if (student) {
      console.log("[Student GET] Found by custom id field.");
    } else {
      const mongoose = require("mongoose");
      try {
        if (mongoose.Types.ObjectId.isValid(incomingId)) {
          student = await Student.findById(incomingId);
          if (student) {
            console.log("[Student GET] Found by MongoDB _id.");
          }
        }
      } catch (e) {
        console.log("[Student GET] Error casting to ObjectId:", e);
      }
    }
    if (!student) {
      student = await Student.findOne({ prn: incomingId });
      if (student) {
        console.log("[Student GET] Found by PRN.");
      }
    }

    if (!student) {
      console.log("[Student GET] Student not found for ID:", incomingId);
      return res.status(404).json({ message: "Student not found" });
    }

    // Ensure subjects and lab arrays are always present
    if (!Array.isArray(student.subjects)) student.subjects = [];
    if (!Array.isArray(student.lab)) student.lab = [];

    res.json(student);
  } catch (error) {
    console.log("[Student GET] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 🔥 Receipt Upload Setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

// 🔥 Upload Receipt Route
router.post("/upload-receipt/:id", upload.single("receipt"), async (req, res) => {
  try {
    const { academicYear, tuitionFee, financialAid, amountPaid } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const student = await Student.findOne({ id: req.params.id });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    student.feeReceipts.push({
      academicYear,
      tuitionFee,
      financialAid,
      amountPaid,
      receiptPath: req.file.path,
    });

    await student.save();

    res.json({
      message: "Receipt uploaded & saved successfully",
      filePath: req.file.path,
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



module.exports = router;