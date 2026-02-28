const express = require("express");
const router = express.Router();
const Admin = require("../Models/Admin");

// 🔥 Upload Admins (JSON Array)
router.post("/upload", async (req, res) => {
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