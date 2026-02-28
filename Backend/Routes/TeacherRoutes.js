const express = require("express");
const router = express.Router();
const Teacher = require("../Models/Teacher");
const multer = require("multer");
const path = require("path");


// =====================================
// ✅ MULTER CONFIGURATION
// =====================================

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});


const upload = multer({
  storage: multer.memoryStorage(),
});


// =====================================
// ✅ 1. BULK UPLOAD TEACHERS
// =====================================

router.post("/upload", async (req, res) => {
  try {
    const teachers = req.body;

    if (!Array.isArray(teachers)) {
      return res.status(400).json({
        success: false,
        message: "Expected an array of teacher objects",
      });
    }

    const inserted = await Teacher.insertMany(teachers, { ordered: false });

    res.status(201).json({
      success: true,
      message: "Teachers uploaded successfully",
      count: inserted.length,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Upload failed",
      error: error.message,
    });
  }
});


// =====================================
// ✅ 2. GET ALL TEACHERS
// =====================================

router.get("/all", async (req, res) => {
  try {
    const teachers = await Teacher.find();

    res.status(200).json({
      success: true,
      data: teachers,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


// =====================================
// ✅ 3. GET SINGLE TEACHER (Sidebar Auto Fetch)
// =====================================

router.get("/:id", async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);

    if (!teacher) {
      return res.json({ success: false, message: "Teacher not found" });
    }

    res.json({
      success: true,
      data: teacher,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// =====================================
// ✅ 4. UPDATE PROFILE IMAGE (SIDEBAR)
// =====================================

router.put(
  "/profile/upload/:id",
  upload.single("profileImage"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No image uploaded",
        });
      }

      const teacher = await Teacher.findById(req.params.id);

      if (!teacher) {
        return res.status(404).json({
          success: false,
          message: "Teacher not found",
        });
      }

      teacher.profileImage = {
        data: req.file.buffer,
        contentType: req.file.mimetype,
      };

      await teacher.save();

      res.status(200).json({
        success: true,
        message: "Image stored in database",
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);


router.get("/profile/image/:id", async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);

    if (!teacher || !teacher.profileImage?.data) {
      return res.status(404).send("No image found");
    }

    res.set("Content-Type", teacher.profileImage.contentType);
    res.send(teacher.profileImage.data);

  } catch (err) {
    res.status(500).send("Server error");
  }
});

// =====================================
// ✅ 5. MARK ATTENDANCE
// =====================================

router.post("/attendance/mark", async (req, res) => {
  try {
    const { studentId, status, date, subject } = req.body;
    const Attendance = require("../Models/Attendance");

    const record = new Attendance({ studentId, status, date, subject });
    await record.save();

    res.status(201).json({
      success: true,
      message: "Attendance marked!",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


// =====================================
// ✅ 6. GET ATTENDANCE
// =====================================

router.get("/attendance/:studentId", async (req, res) => {
  try {
    const Attendance = require("../Models/Attendance");

    const records = await Attendance.find({
      studentId: req.params.studentId,
    });

    res.status(200).json({
      success: true,
      data: records,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


// =====================================
// ✅ 7. UPLOAD MARKSHEET
// =====================================

router.post("/marksheet/upload", async (req, res) => {
  try {
    const { studentId, subject, marks, totalMarks } = req.body;
    const Marksheet = require("../Models/Marksheet");

    const record = new Marksheet({
      studentId,
      subject,
      marks,
      totalMarks,
    });

    await record.save();

    res.status(201).json({
      success: true,
      message: "Marks uploaded!",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


// =====================================
// ✅ 8. GET MARKSHEET
// =====================================

router.get("/marksheet/:studentId", async (req, res) => {
  try {
    const Marksheet = require("../Models/Marksheet");

    const marks = await Marksheet.find({
      studentId: req.params.studentId,
    });

    res.status(200).json({
      success: true,
      data: marks,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


module.exports = router;