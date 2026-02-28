const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");

const Student = require("../Models/Student");
const Admin = require("../Models/Admin");
const Teacher = require("../Models/Teacher");
const Parent = require("../Models/Parent");

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "All fields required" });

    // ================= DUMMY ADMIN (remove after seeding DB) =================
    if (email === "1" && password === "123") {
      return res.json({ role: "admin", user: { email, name: "Super Admin" } });
    }

    // ================= CHECK STUDENT =================
    const student = await Student.findOne({ id: email });
    if (student) {
      const isMatch = await bcrypt.compare(password, student.password);
      if (isMatch)
        return res.json({ role: "student", user: student });
    }

    // ================= CHECK PARENT =================
    const parent = await Parent.findOne({ email: email });
    if (parent) {
      if (password.trim() === parent.password.trim())
        return res.json({ role: "parent", user: parent });
    }

    // ================= CHECK TEACHER =================
    const teacher = await Teacher.findOne({ id: email });
    if (teacher) {
      if (password === teacher.password)
        return res.json({ role: "teacher", user: teacher });
    }

    // ================= CHECK ADMIN =================
    const admin = await Admin.findOne({ email });
    if (admin) {
      if (password === admin.password)
        return res.json({ role: "admin", user: admin });
    }

    return res.status(400).json({ message: "Invalid ID or password" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;