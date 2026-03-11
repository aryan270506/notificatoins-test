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

    // Get counts in parallel
    const [studentsCount, teachersCount, adminsCount, parentsCount] = await Promise.all([
      Student.countDocuments(),
      Teacher.countDocuments(),
      Admin.countDocuments(),
      Parent.countDocuments(),
    ]);

    // Calculate total active users (students + teachers + admins + parents)
    const totalUsers = studentsCount + teachersCount + adminsCount + parentsCount;

    // Calculate staff (teachers + admins)
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

module.exports = router;