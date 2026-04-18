const express = require("express");
const router = express.Router();
const Subject = require("../Models/Subject");
const auth = require("../Middleware/auth");

// ─────────────────────────────────────────────────────────────────────────
// Helper: Extract admin's scope from JWT token
// ─────────────────────────────────────────────────────────────────────────
function resolveAdminScope(req) {
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

// ─────────────────────────────────────────────────────────────────────────
// GET SUBJECTS FOR A SPECIFIC YEAR (Scoped by Department)
// GET /api/subjects?year=1
// ─────────────────────────────────────────────────────────────────────────
router.get("/", auth, async (req, res) => {
  try {
    const { year } = req.query;

    // Validate year parameter
    if (!year) {
      return res.status(400).json({ error: "Year parameter is required" });
    }

    // Extract admin's scope from token
    const scope = resolveAdminScope(req);
    if (scope?.error) {
      return res.status(401).json(scope);
    }

    // Query subjects with admin's scope
    const subjectData = await Subject.findOne({
      year: String(year),
      instituteId: scope.instituteId,
      departmentCode: scope.departmentCode,
    }).lean();

    if (!subjectData) {
      return res.status(404).json({
        error: "No subjects found for this year in your department",
        year,
      });
    }

    // Return formatted response
    return res.status(200).json({
      success: true,
      data: {
        year: subjectData.year,
        subjects: subjectData.subjects || [],
        labs: subjectData.labs || [],
      },
    });
  } catch (error) {
    console.error("GET /subjects error:", error);
    return res.status(500).json({
      error: "Failed to fetch subjects",
      message: error.message,
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// GET SUBJECTS FOR ALL YEARS (Scoped by Department)
// GET /api/subjects/all
// ─────────────────────────────────────────────────────────────────────────
router.get("/all", auth, async (req, res) => {
  try {
    // Extract admin's scope from token
    const scope = resolveAdminScope(req);
    if (scope?.error) {
      return res.status(401).json(scope);
    }

    // Query all subjects for this department
    const subjectsData = await Subject.find({
      instituteId: scope.instituteId,
      departmentCode: scope.departmentCode,
    })
      .sort({ year: 1 })
      .lean();

    if (!subjectsData || subjectsData.length === 0) {
      return res.status(404).json({
        error: "No subjects found for your department",
      });
    }

    // Format response
    const formatted = subjectsData.map((item) => ({
      year: item.year,
      subjects: item.subjects || [],
      labs: item.labs || [],
    }));

    return res.status(200).json({
      success: true,
      data: formatted,
      count: formatted.length,
    });
  } catch (error) {
    console.error("GET /subjects/all error:", error);
    return res.status(500).json({
      error: "Failed to fetch subjects",
      message: error.message,
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// CREATE/UPDATE SUBJECTS FOR A YEAR (Admin Only - for configuration)
// POST /api/subjects
// Body: { year, subjects, labs }
// ─────────────────────────────────────────────────────────────────────────
router.post("/", auth, async (req, res) => {
  try {
    const { year, subjects, labs } = req.body;

    // Validate inputs
    if (!year || !Array.isArray(subjects)) {
      return res.status(400).json({
        error: "Year and subjects array are required",
      });
    }

    // Extract admin's scope from token
    const scope = resolveAdminScope(req);
    if (scope?.error) {
      return res.status(401).json(scope);
    }

    // Validate year format
    if (!["1", "2", "3", "4"].includes(String(year))) {
      return res.status(400).json({
        error: "Year must be 1, 2, 3, or 4",
      });
    }

    // Upsert subject configuration
    const result = await Subject.findOneAndUpdate(
      {
        year: String(year),
        instituteId: scope.instituteId,
        departmentCode: scope.departmentCode,
      },
      {
        year: String(year),
        subjects,
        labs: labs || [],
        instituteName: req.user?.instituteName || "",
        departmentName: req.user?.departmentName || "",
        instituteId: scope.instituteId,
        departmentCode: scope.departmentCode,
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Subjects configured successfully",
      data: {
        year: result.year,
        subjects: result.subjects,
        labs: result.labs,
      },
    });
  } catch (error) {
    console.error("POST /subjects error:", error);
    if (error.code === 11000) {
      return res.status(409).json({
        error: "Subject configuration for this year already exists",
      });
    }
    return res.status(500).json({
      error: "Failed to create/update subjects",
      message: error.message,
    });
  }
});

module.exports = router;
