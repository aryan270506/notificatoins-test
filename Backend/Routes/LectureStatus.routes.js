// Routes/lectureStatus.routes.js
const express = require("express");
const router  = express.Router();
const LectureStatus = require("../Models/LectureStatus");
const Timetable     = require("../Models/Timetable");

// ── Helper: get ISO week-start (Monday) for a given date ──────────────────────
function getWeekStart(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();
  const day = d.getDay(); // 0=Sun
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust to Monday
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split("T")[0];
}

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/lecture-status?year=&division=&batch=&weekStart=
// Returns all status overrides for a given timetable + week.
// Both teacher and admin screens call this to overlay cancel/postpone badges.
// ══════════════════════════════════════════════════════════════════════════════
router.get("/", async (req, res) => {
  try {
    const { year, division, batch, weekStart } = req.query;
    if (!year || !division || !batch) {
      return res.status(400).json({ success: false, message: "year, division, batch required" });
    }

    const ws = weekStart || getWeekStart();

    const statuses = await LectureStatus.find({
      year,
      division: division.toUpperCase(),
      batch:    batch.toUpperCase(),
      weekStart: ws,
    }).lean();

    res.status(200).json({ success: true, data: statuses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/lecture-status/teacher/:teacherId?weekStart=
// Returns all status overrides for all slots taught by this teacher this week.
// Used by TimetableScreen (teacher side) to show cancel/postpone on their view.
// ══════════════════════════════════════════════════════════════════════════════
router.get("/teacher/:teacherId", async (req, res) => {
  try {
    const { teacherId } = req.params;
    const ws = req.query.weekStart || getWeekStart();

    const statuses = await LectureStatus.find({
      teacherId,
      weekStart: ws,
    }).lean();

    res.status(200).json({ success: true, data: statuses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PUT /api/lecture-status
// Teacher (or admin) sets status for a specific slot.
// Body: { year, division, batch, day, slotId, weekStart?, teacherId, subject,
//         status, postponedTo?: { date, time }, updatedBy, updatedByRole }
// ══════════════════════════════════════════════════════════════════════════════
router.put("/", async (req, res) => {
  try {
    const {
      year, division, batch, day, slotId,
      weekStart, teacherId, subject,
      status, postponedTo,
      updatedBy, updatedByRole,
    } = req.body;

    if (!year || !division || !batch || !day || !slotId || !teacherId || !status) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const ws = weekStart || getWeekStart();

    const doc = await LectureStatus.findOneAndUpdate(
      {
        year,
        division: division.toUpperCase(),
        batch:    batch.toUpperCase(),
        day,
        slotId,
        weekStart: ws,
      },
      {
        $set: {
          teacherId,
          subject,
          status,
          postponedTo: postponedTo || { date: null, time: null },
          updatedBy,
          updatedByRole,
        },
        $setOnInsert: {
          year,
          division: division.toUpperCase(),
          batch:    batch.toUpperCase(),
          day,
          slotId,
          weekStart: ws,
        },
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// DELETE /api/lecture-status  →  revert to "active"
// Body: { year, division, batch, day, slotId, weekStart? }
// ══════════════════════════════════════════════════════════════════════════════
router.delete("/", async (req, res) => {
  try {
    const { year, division, batch, day, slotId, weekStart } = req.body;
    const ws = weekStart || getWeekStart();

    await LectureStatus.findOneAndDelete({
      year,
      division: division.toUpperCase(),
      batch:    batch.toUpperCase(),
      day, slotId, weekStart: ws,
    });

    res.status(200).json({ success: true, message: "Status reset to active" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;