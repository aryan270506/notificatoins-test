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
    name: user.name || "User",
    instituteId: user.instituteId || null,
    instituteName: user.instituteName || null,
    departmentId: user.departmentId || null,
    departmentCode: user.departmentCode || null,
    departmentName: user.departmentName || null,
    adminType: user.adminType || null,
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
    // If user ID exists in Student, allow either student-password or parent-password login.
    const student = await Student.findOne({ id: email });
    if (student) {
      console.log("👤 Student found:", email);
      const isStudentPasswordMatch = await bcrypt.compare(password, student.password).catch(() => false);
      if (isStudentPasswordMatch) {
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
      }

      const parentPass = student.parent_pass || student.parents_pass || "";
      const isParentPasswordMatch =
        typeof parentPass === "string" && parentPass.length > 0 && password.trim() === parentPass.trim();

      if (isParentPasswordMatch) {
        // Check if Parent login is allowed by committee
        const canLogin = await checkLoginPermission("Parent");
        if (!canLogin) {
          console.log("🚫 Parent login denied by committee permission");
          return res.status(403).json({ message: "Login access for Parents has been denied by the committee" });
        }

        const parentProfile = await Parent.findOne({ id: student.id }).lean();
        const parentUser = {
          _id: String(student.id),
          id: String(student.id),
          name: parentProfile?.name || `${student.name}'s Parent`,
          email: parentProfile?.email || student.email,
          prn: student.prn || null,
          roll_no: student.roll_no || null,
          branch: student.branch || null,
          division: student.division || null,
          year: student.year || null,
          instituteId: student.instituteId || null,
          instituteName: student.instituteName || null,
          departmentCode: student.departmentCode || null,
          departmentName: student.departmentName || null,
        };

        console.log("🔐 Password matched for parent");
        const token = generateToken(parentUser, "parent");
        console.log("✅ Parent logged in successfully\n");
        return res.json({ role: "parent", user: parentUser, token });
      }

      console.log("❌ Password incorrect for student/parent");
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
    // 1) Institute/legacy admin login (email OR id)
    const admin = await Admin.findOne({
      $or: [{ email }, { id: email }]
    });

    if (admin) {
      console.log("🛡️  Institute/legacy admin found:", email);
      const isAdminPasswordMatch =
        (await bcrypt.compare(password, admin.password).catch(() => false)) ||
        password === admin.password;

      if (isAdminPasswordMatch) {
        const canLogin = await checkLoginPermission("Admin");
        if (!canLogin) {
          console.log("🚫 Admin login denied by committee permission");
          return res.status(403).json({ message: "Login access for Admins has been denied by the committee" });
        }

        console.log("🔐 Password matched for institute/legacy admin");
        const normalizedAdminUser = {
          ...admin.toObject(),
          name: admin.instituteName || "Admin",
          adminType: admin.role || "institute_admin",
          instituteId: admin._id,
          instituteName: admin.instituteName || "",
          departmentId: null,
          departmentCode: "__INSTITUTE__",
          departmentName: "Institute",
        };
        const token = generateToken(normalizedAdminUser, "admin");
        console.log("✅ Admin logged in successfully\n");
        return res.json({ role: "admin", user: normalizedAdminUser, token });
      }

      console.log("❌ Password incorrect for institute/legacy admin");
    }

    // 2) Department admin login (nested inside institute_admin.departments[])
    const instituteWithDepartment = await Admin.findOne({
      role: "institute_admin",
      $or: [
        { "departments.adminId": email },
        { "departments.adminEmail": email }
      ]
    });

    if (instituteWithDepartment) {
      const department = (instituteWithDepartment.departments || []).find(
        (d) => d.adminId === email || d.adminEmail === email
      );

      if (department) {
        console.log("🏢 Department admin found:", email);
        const isDepartmentPasswordMatch =
          (await bcrypt.compare(password, department.adminPassword).catch(() => false)) ||
          password === department.adminPassword;

        if (isDepartmentPasswordMatch) {
          const canLogin = await checkLoginPermission("Admin");
          if (!canLogin) {
            console.log("🚫 Admin login denied by committee permission");
            return res.status(403).json({ message: "Login access for Admins has been denied by the committee" });
          }

          const departmentAdminUser = {
            _id: department._id,
            id: department.adminId,
            email: department.adminEmail,
            role: "department_admin",
            adminType: "department_admin",
            name: department.departmentName || "Department Admin",
            departmentId: department._id,
            departmentName: department.departmentName,
            departmentCode: department.departmentCode,
            instituteId: instituteWithDepartment._id,
            instituteName: instituteWithDepartment.instituteName,
            isActive: department.isActive
          };

          console.log("🔐 Password matched for department admin");
          const token = generateToken(departmentAdminUser, "admin");
          console.log("✅ Department admin logged in successfully\n");
          return res.json({ role: "admin", user: departmentAdminUser, token });
        }

        console.log("❌ Password incorrect for department admin");
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