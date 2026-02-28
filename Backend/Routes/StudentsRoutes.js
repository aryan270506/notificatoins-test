const express = require("express");
const router = express.Router();
const Student = require("../Models/Student");
const bcrypt = require("bcryptjs");

// 🔥 Upload students from frontend
router.post("/upload", async (req, res) => {
  try {
    const students = req.body; // frontend will send array

    if (!Array.isArray(students)) {
      return res.status(400).json({ message: "Expected array of students" });
    }

    // Optional: Clear old data
    await Student.deleteMany();

    const formattedStudents = await Promise.all(
      students.map(async (student) => {
        const hashedPassword = await bcrypt.hash(student.password, 10);

        return {
          ...student,
          password: hashedPassword,
        };
      })
    );

    await Student.insertMany(formattedStudents);

    res.status(200).json({
      message: "Students uploaded successfully",
      count: formattedStudents.length,
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;