const express = require("express");
const router = express.Router();
const Parent = require("../Models/Parent");

// 🔥 Upload Parents (JSON Array)
router.post("/upload", async (req, res) => {
  try {
    const parents = req.body;

    if (!Array.isArray(parents)) {
      return res.status(400).json({
        message: "Expected an array of parents"
      });
    }

    const inserted = await Parent.insertMany(parents, {
      ordered: false
    });

    res.status(201).json({
      message: "Parents uploaded successfully",
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