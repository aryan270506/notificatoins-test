const express = require("express");
const router = express.Router();
const Admin = require("../Models/Admin");
const SecurityLog = require("../Models/SecurityLog");
const { checkUploadPermission } = require("../Middleware/permissionCheck");

const buildSecurityFilter = (query) => {
  const { status, type, search } = query;
  const filter = {};

  if (status && status !== "All") filter.status = status;
  if (type && type !== "All Types") filter.type = type;

  const searchText = String(search || "").trim();
  if (searchText) {
    const rx = new RegExp(searchText, "i");
    filter.$or = [
      { action: rx },
      { actor: rx },
      { ip: rx },
      { route: rx },
      { method: rx },
    ];
  }

  return filter;
};

// ─────────────────────────────────────────────────────────────
// GET DASHBOARD STATISTICS
// GET /api/admins/dashboard/stats
// ─────────────────────────────────────────────────────────────
router.get("/dashboard/stats", async (req, res) => {
  try {
    const Student = require("../Models/Student");
    const Teacher = require("../Models/Teacher");
    const Parent = require("../Models/Parent");

    const [studentsCount, teachersCount, adminsCount, parentsCount] = await Promise.all([
      Student.countDocuments(),
      Teacher.countDocuments(),
      Admin.countDocuments(),
      Parent.countDocuments(),
    ]);

    const totalUsers = studentsCount + teachersCount + adminsCount + parentsCount;
    const staffCount = teachersCount + adminsCount;

    res.json({
      success: true,
      data: {
        totalUsers,
        students: studentsCount,
        faculty: teachersCount,
        staff: staffCount,
        admins: adminsCount,
        parents: parentsCount,
      },
    });
  } catch (error) {
    console.error("GET /admins/dashboard/stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard statistics",
      error: error.message,
    });
  }
});

// GET ALL ADMINS
router.get("/", async (req, res) => {
  try {
    const admins = await Admin.find({}).select("-password").lean();
    res.json({ success: true, data: admins, count: admins.length });
  } catch (error) {
    console.error("GET /admins error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/security-logs", async (req, res) => {
  try {
    const filter = buildSecurityFilter(req.query);
    const logs = await SecurityLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    res.json({
      success: true,
      logs,
      count: logs.length,
    });
  } catch (error) {
    console.error("GET /admins/security-logs error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch security logs",
    });
  }
});

router.get("/security-logs/summary", async (req, res) => {
  try {
    const filter = buildSecurityFilter(req.query);
    const logs = await SecurityLog.find(filter)
      .select("status type")
      .lean();

    const summary = {
      total: logs.length,
      success: logs.filter((l) => l.status === "Success").length,
      warning: logs.filter((l) => l.status === "Warning").length,
      failed: logs.filter((l) => l.status === "Failed").length,
      threats: logs.filter((l) => l.type === "Threat").length,
    };

    res.json(summary);
  } catch (error) {
    console.error("GET /admins/security-logs/summary error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch security logs summary",
    });
  }
});

// 🔥 Upload Admins (JSON Array)
router.post("/upload", checkUploadPermission("Admin"), async (req, res) => {
  try {
    const admins = req.body;

    if (!Array.isArray(admins)) {
      return res.status(400).json({
        message: "Expected an array of admins"
      });
    }

    const inserted = await Admin.insertMany(admins, {
      ordered: false
    });

    res.status(201).json({
      message: "Admins uploaded successfully",
      count: inserted.length
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Upload failed",
      error: error.message
    });
  }
});

// ─────────────────────────────────────────────────────────────
// ADD NEW INSTITUTE (with admin credentials)
// POST /api/admins/add-institute
// ─────────────────────────────────────────────────────────────
router.post("/add-institute", async (req, res) => {
  try {
    const {
      instituteName,
      instituteAddress,
      institutePhone,
      instituteEmail,
      adminId,
      adminEmail,
      adminPassword,
      branch
    } = req.body;

    if (!instituteName || !adminId || !adminEmail || !adminPassword || !branch) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: instituteName, adminId, adminEmail, adminPassword, branch"
      });
    }

    const existingAdminById = await Admin.findOne({ id: adminId });
    if (existingAdminById) {
      return res.status(409).json({
        success: false,
        message: "Admin ID already exists. Please use a different ID."
      });
    }

    const existingAdminByEmail = await Admin.findOne({ email: adminEmail });
    if (existingAdminByEmail) {
      return res.status(409).json({
        success: false,
        message: "Admin email already exists. Please use a different email."
      });
    }

    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const newAdmin = new Admin({
      id: adminId,
      email: adminEmail,
      password: hashedPassword,
      branch: branch,
      instituteName: instituteName,
      instituteAddress: instituteAddress || '',
      institutePhone: institutePhone || '',
      instituteEmail: instituteEmail || adminEmail,
      role: 'institute_admin'
    });

    await newAdmin.save();

    const SecurityLog = require("../Models/SecurityLog");
    await SecurityLog.create({
      actor: req.user?.id || 'System',
      action: `New institute created: ${instituteName}`,
      type: "Admin Action",
      status: "Success",
      ip: req.ip,
      route: "/api/admins/add-institute",
      method: "POST"
    });

    res.status(201).json({
      success: true,
      message: "Institute created successfully",
      data: {
        adminId: newAdmin.id,
        email: newAdmin.email,
        instituteName: newAdmin.instituteName,
        branch: newAdmin.branch,
        createdAt: newAdmin.createdAt
      }
    });
  } catch (error) {
    console.error("POST /admins/add-institute error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create institute",
      error: error.message
    });
  }
});

// GET ALL INSTITUTES
router.get("/institutes", async (req, res) => {
  try {
    const institutes = await Admin.find({ role: 'institute_admin' })
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: institutes,
      count: institutes.length
    });
  } catch (error) {
    console.error("GET /admins/institutes error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch institutes",
      error: error.message
    });
  }
});

router.get("/institutes/:id", async (req, res) => {
  try {
    const institute = await Admin.findOne({ 
      id: req.params.id,
      role: 'institute_admin' 
    }).select('-password').lean();

    if (!institute) {
      return res.status(404).json({
        success: false,
        message: "Institute not found"
      });
    }

    res.json({
      success: true,
      data: institute
    });
  } catch (error) {
    console.error("GET /admins/institutes/:id error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch institute",
      error: error.message
    });
  }
});

router.put("/institutes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      instituteName,
      instituteAddress,
      institutePhone,
      instituteEmail,
      branch,
      email
    } = req.body;

    const institute = await Admin.findOne({ id, role: 'institute_admin' });
    if (!institute) {
      return res.status(404).json({
        success: false,
        message: "Institute not found"
      });
    }

    if (email && email !== institute.email) {
      const existingEmail = await Admin.findOne({ email, _id: { $ne: institute._id } });
      if (existingEmail) {
        return res.status(409).json({
          success: false,
          message: "Email already in use by another admin"
        });
      }
    }

    const updatedInstitute = await Admin.findOneAndUpdate(
      { id, role: 'institute_admin' },
      {
        instituteName: instituteName || institute.instituteName,
        instituteAddress: instituteAddress || institute.instituteAddress,
        institutePhone: institutePhone || institute.institutePhone,
        instituteEmail: instituteEmail || institute.instituteEmail,
        branch: branch || institute.branch,
        email: email || institute.email
      },
      { new: true }
    ).select('-password');

    res.json({
      success: true,
      message: "Institute updated successfully",
      data: updatedInstitute
    });
  } catch (error) {
    console.error("PUT /admins/institutes/:id error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update institute",
      error: error.message
    });
  }
});

router.delete("/institutes/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deletedInstitute = await Admin.findOneAndDelete({ 
      id, 
      role: 'institute_admin' 
    });

    if (!deletedInstitute) {
      return res.status(404).json({
        success: false,
        message: "Institute not found"
      });
    }

    res.json({
      success: true,
      message: "Institute deleted successfully"
    });
  } catch (error) {
    console.error("DELETE /admins/institutes/:id error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete institute",
      error: error.message
    });
  }
});

router.post("/institutes/:id/reset-password", async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long"
      });
    }

    const institute = await Admin.findOne({ id, role: 'institute_admin' });
    if (!institute) {
      return res.status(404).json({
        success: false,
        message: "Institute not found"
      });
    }

    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    institute.password = hashedPassword;
    await institute.save();

    res.json({
      success: true,
      message: "Password reset successfully"
    });
  } catch (error) {
    console.error("POST /admins/institutes/:id/reset-password error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reset password",
      error: error.message
    });
  }
});

// CLASS TEACHER ASSIGNMENT ENDPOINTS
router.post("/class-teacher/assign", async (req, res) => {
  try {
    const { teacherId, year, division } = req.body;

    if (!teacherId || !year || !division) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: teacherId, year, division"
      });
    }

    const validYears = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
    if (!validYears.includes(year)) {
      return res.status(400).json({
        success: false,
        message: `Invalid year. Must be one of: ${validYears.join(", ")}`
      });
    }

    const validDivisions = ["A", "B", "C"];
    if (!validDivisions.includes(division)) {
      return res.status(400).json({
        success: false,
        message: `Invalid division. Must be one of: ${validDivisions.join(", ")}`
      });
    }

    const Teacher = require("../Models/Teacher");
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found"
      });
    }

    const existingAssignment = await Teacher.findOne({
      "classTeacher.year": year,
      "classTeacher.division": division,
      _id: { $ne: teacherId }
    });

    if (existingAssignment) {
      return res.status(409).json({
        success: false,
        message: `This class is already assigned to ${existingAssignment.name}. Please unassign first.`
      });
    }

    const updatedTeacher = await Teacher.findByIdAndUpdate(
      teacherId,
      {
        classTeacher: {
          year,
          division,
          assignedAt: new Date()
        }
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Class teacher assigned successfully",
      data: {
        teacherId: updatedTeacher._id,
        teacherName: updatedTeacher.name,
        year,
        division,
        assignedAt: updatedTeacher.classTeacher.assignedAt
      }
    });
  } catch (error) {
    console.error("POST /admins/class-teacher/assign error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to assign class teacher",
      error: error.message
    });
  }
});

router.put("/class-teacher/update/:teacherId", async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { year, division } = req.body;

    if (!year || !division) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: year, division"
      });
    }

    const validYears = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
    if (!validYears.includes(year)) {
      return res.status(400).json({
        success: false,
        message: `Invalid year. Must be one of: ${validYears.join(", ")}`
      });
    }

    const validDivisions = ["A", "B", "C"];
    if (!validDivisions.includes(division)) {
      return res.status(400).json({
        success: false,
        message: `Invalid division. Must be one of: ${validDivisions.join(", ")}`
      });
    }

    const Teacher = require("../Models/Teacher");
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found"
      });
    }

    const existingAssignment = await Teacher.findOne({
      "classTeacher.year": year,
      "classTeacher.division": division,
      _id: { $ne: teacherId }
    });

    if (existingAssignment) {
      return res.status(409).json({
        success: false,
        message: `This class is already assigned to ${existingAssignment.name}. Please unassign first.`
      });
    }

    const updatedTeacher = await Teacher.findByIdAndUpdate(
      teacherId,
      {
        classTeacher: {
          year,
          division,
          assignedAt: new Date()
        }
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Class teacher updated successfully",
      data: {
        teacherId: updatedTeacher._id,
        teacherName: updatedTeacher.name,
        year,
        division,
        assignedAt: updatedTeacher.classTeacher.assignedAt
      }
    });
  } catch (error) {
    console.error("PUT /admins/class-teacher/update error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update class teacher",
      error: error.message
    });
  }
});

router.delete("/class-teacher/unassign/:teacherId", async (req, res) => {
  try {
    const { teacherId } = req.params;

    const Teacher = require("../Models/Teacher");
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found"
      });
    }

    if (!teacher.classTeacher.year || !teacher.classTeacher.division) {
      return res.status(400).json({
        success: false,
        message: "This teacher has no class assignment to unassign"
      });
    }

    const updatedTeacher = await Teacher.findByIdAndUpdate(
      teacherId,
      {
        classTeacher: {
          year: null,
          division: null,
          assignedAt: null
        }
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Class teacher unassigned successfully",
      data: {
        teacherId: updatedTeacher._id,
        teacherName: updatedTeacher.name
      }
    });
  } catch (error) {
    console.error("DELETE /admins/class-teacher/unassign error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to unassign class teacher",
      error: error.message
    });
  }
});

router.get("/class-teacher/assignments", async (req, res) => {
  try {
    const Teacher = require("../Models/Teacher");
    const assignments = await Teacher.find({
      "classTeacher.year": { $ne: null },
      "classTeacher.division": { $ne: null }
    }).select("id name classTeacher").lean();

    const groupedAssignments = {};
    const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
    const DIVISIONS = ["A", "B", "C"];

    YEARS.forEach(year => {
      groupedAssignments[year] = {};
      DIVISIONS.forEach(div => {
        groupedAssignments[year][div] = null;
      });
    });

    assignments.forEach(teacher => {
      const { year, division } = teacher.classTeacher;
      if (groupedAssignments[year]) {
        groupedAssignments[year][division] = {
          teacherId: teacher._id,
          teacherName: teacher.name,
          year,
          division,
          assignedAt: teacher.classTeacher.assignedAt
        };
      }
    });

    res.status(200).json({
      success: true,
      data: {
        totalAssignments: assignments.length,
        assignments: groupedAssignments,
        list: assignments
      }
    });
  } catch (error) {
    console.error("GET /admins/class-teacher/assignments error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch class teacher assignments",
      error: error.message
    });
  }
});

router.get("/class-teacher/byYear/:year/:division", async (req, res) => {
  try {
    const { year, division } = req.params;

    const validYears = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
    if (!validYears.includes(year)) {
      return res.status(400).json({
        success: false,
        message: `Invalid year. Must be one of: ${validYears.join(", ")}`
      });
    }

    const validDivisions = ["A", "B", "C"];
    if (!validDivisions.includes(division)) {
      return res.status(400).json({
        success: false,
        message: `Invalid division. Must be one of: ${validDivisions.join(", ")}`
      });
    }

    const Teacher = require("../Models/Teacher");
    const assignment = await Teacher.findOne({
      "classTeacher.year": year,
      "classTeacher.division": division
    }).select("id name classTeacher").lean();

    if (!assignment) {
      return res.status(200).json({
        success: true,
        data: null,
        message: `No class teacher assigned for ${year} - Division ${division}`
      });
    }

    res.status(200).json({
      success: true,
      data: {
        teacherId: assignment._id,
        teacherName: assignment.name,
        year,
        division,
        assignedAt: assignment.classTeacher.assignedAt
      }
    });
  } catch (error) {
    console.error("GET /admins/class-teacher/byYear error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch class teacher assignment",
      error: error.message
    });
  }
});

module.exports = router;