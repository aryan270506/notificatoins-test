const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Student = require("../Models/Student");
const Admin = require("../Models/Admin");
const Teacher = require("../Models/Teacher");
const Parent = require("../Models/Parent");
const Permission = require("../Models/Permission");

// ─── Token Blacklist (for logout) ────────────────────────────────
const tokenBlacklist = new Set();

// ─── Helper function to generate JWT token ───────────────────────────
const generateToken = (user, role) => {
  const payload = {
    userId: user._id || user.id,
    email: user.email || user.id,
    role: role,
    name: user.name || "User"
  };

  console.log("🔑 Generating JWT Token with payload:", payload);

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "7d" // Token valid for 7 days
  });

  console.log("✅ Token generated successfully");
  console.log("📋 Token (first 50 chars):", token.substring(0, 50) + "...");

  return token;
};

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("\n📥 Login attempt:");
    console.log("   Email/ID:", email);
    console.log("   Password length:", password ? password.length : 0, "characters");

    if (!email || !password)
      return res.status(400).json({ message: "All fields required" });

    // ================= HELPER: Check role login permission =================
    const checkLoginPermission = async (roleName) => {
      const perm = await Permission.findOne({ role: { $regex: new RegExp(`^${roleName}$`, "i") } });
      if (perm && perm.canLogin === false) {
        return false;
      }
      return true; // allowed by default if no record
    };

    // ================= DUMMY ADMIN (remove after seeding DB) =================
    if (email === "1" && password === "123") {
      console.log("🔐 Dummy admin login detected");
      const user = { _id: "dummy_admin_001", id: "1", email, name: "Super Admin" };
      const token = generateToken(user, "admin");
      console.log("✅ Admin logged in successfully\n");
      return res.json({ role: "admin", user, token });
    }

    // ================= CHECK STUDENT (PRIORITY) =================
    // If user ID exists in both Student and Parent, fetch from Student
    const student = await Student.findOne({ id: email });
    if (student) {
      console.log("👤 Student found:", email);
      const isMatch = await bcrypt.compare(password, student.password);
      if (isMatch) {
        // Check if Student login is allowed by committee
        const canLogin = await checkLoginPermission("Student");
        if (!canLogin) {
          console.log("🚫 Student login denied by committee permission");
          return res.status(403).json({ message: "Login access for Students has been denied by the committee" });
        }
        console.log("🔐 Password matched for student");
        const token = generateToken(student, "student");
        console.log("✅ Student logged in successfully\n");
        return res.json({ role: "student", user: student, token });
      } else {
        console.log("❌ Password incorrect for student");
      }
    }

    // ================= CHECK PARENT (only if not a student) =================
    const parent = await Parent.findOne({ id: email });
    if (parent) {
      console.log("👥 Parent found:", email);
      if (password.trim() === parent.password.trim()) {
        // Check if Parent login is allowed by committee
        const canLogin = await checkLoginPermission("Parent");
        if (!canLogin) {
          console.log("🚫 Parent login denied by committee permission");
          return res.status(403).json({ message: "Login access for Parents has been denied by the committee" });
        }
        console.log("🔐 Password matched for parent");
        const token = generateToken(parent, "parent");
        console.log("✅ Parent logged in successfully\n");
        return res.json({ role: "parent", user: parent, token });
      } else {
        console.log("❌ Password incorrect for parent");
      }
    }

    // ================= CHECK TEACHER =================
    const teacher = await Teacher.findOne({ id: email });
    if (teacher) {
      console.log("👨‍🏫 Teacher found:", email);
      if (password === teacher.password) {
        // Check if Teacher login is allowed by committee
        const canLogin = await checkLoginPermission("Teacher");
        if (!canLogin) {
          console.log("🚫 Teacher login denied by committee permission");
          return res.status(403).json({ message: "Login access for Teachers has been denied by the committee" });
        }
        console.log("🔐 Password matched for teacher");
        const token = generateToken(teacher, "teacher");
        console.log("✅ Teacher logged in successfully\n");
        return res.json({ role: "teacher", user: teacher, token });
      } else {
        console.log("❌ Password incorrect for teacher");
      }
    }

    // ================= CHECK ADMIN =================
    const admin = await Admin.findOne({ email });
    if (admin) {
      console.log("🛡️  Admin found:", email);
      if (password === admin.password) {
        // Check if Admin login is allowed by committee
        const canLogin = await checkLoginPermission("Admin");
        if (!canLogin) {
          console.log("🚫 Admin login denied by committee permission");
          return res.status(403).json({ message: "Login access for Admins has been denied by the committee" });
        }
        console.log("🔐 Password matched for admin");
        const token = generateToken(admin, "admin");
        console.log("✅ Admin logged in successfully\n");
        return res.json({ role: "admin", user: admin, token });
      } else {
        console.log("❌ Password incorrect for admin");
      }
    }

    console.log("❌ Login failed - No user found with email/ID:", email);
    console.log("   Or password was incorrect\n");
    return res.status(400).json({ message: "Invalid ID or password" });

  } catch (error) {
    console.error("🔴 Login error:", error.message);
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ─── Verify Token Route ───────────────────────────────────────────
router.post("/verify-token", (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  console.log("🔍 Verifying token...");

  if (!token) {
    console.log("❌ No token provided\n");
    return res.status(401).json({ valid: false, message: "No token provided" });
  }

  // Check if token is blacklisted (user logged out)
  if (tokenBlacklist.has(token)) {
    console.log("❌ Token is blacklisted (user logged out)\n");
    return res.status(401).json({ valid: false, message: "Token has been revoked - please login again" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.log("❌ Token verification failed:", err.message);
      console.log("   Error name:", err.name, "\n");
      return res.status(401).json({ valid: false, message: "Invalid or expired token" });
    }

    console.log("✅ Token verified successfully");
    console.log("   User:", user, "\n");
    res.json({ valid: true, user });
  });
});

// ─── Logout Route ─────────────────────────────────────────────────
router.post("/logout", (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  console.log("🚪 Logout request received");

  if (!token) {
    console.log("⚠️  No token provided for logout\n");
    return res.status(400).json({ message: "No token provided" });
  }

  // Add token to blacklist
  tokenBlacklist.add(token);
  console.log("📛 Token added to blacklist");
  console.log("✅ User logged out successfully\n");
  
  res.json({ message: "Logged out successfully", token_revoked: true });
});

module.exports = router;