// routes/subjectRooms.js
// ONE room per subject + year — shared by ALL divisions and ALL teachers.
// Subject name is always normalized to UPPERCASE before any DB operation.
// Supports text messages (JSON) AND file/image uploads (multipart/form-data).

const express  = require("express");
const router   = express.Router();
const Doubt    = require("../Models/Doubt");
const mongoose = require("mongoose");
const multer   = require("multer");
const path     = require("path");
const fs       = require("fs");
const auth = require("../middleware/auth"); 
const { sendNotificationToUsers } = require('../utils/pushNotificationService');
const { emitNotificationToUser } = require('../socket');

// ── Ensure uploads/chat directory exists ──────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, "../uploads/chat");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ── Multer config — ONLY used for multipart/form-data requests ────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 60);
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = [
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    // React Native sometimes sends octet-stream — accept and trust the filename
    "application/octet-stream",
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed: ${file.mimetype}`), false);
  }
};

const multerUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

// ── Smart middleware: run multer ONLY for multipart, skip for JSON ────────────
// This avoids multer consuming JSON bodies and leaving req.body empty.
const smartUpload = (req, res, next) => {
  const ct = (req.headers["content-type"] || "").toLowerCase();
  if (ct.includes("multipart/form-data")) {
    // multipart request — let multer parse body + file
    multerUpload.single("file")(req, res, (err) => {
      if (!err) return next();
      const msg =
        err.code === "LIMIT_FILE_SIZE"
          ? "File too large. Maximum is 20 MB."
          : err.message || "File upload error.";
      return res.status(400).json({ success: false, error: msg });
    });
  } else {
    // JSON / url-encoded request — express.json() already parsed req.body, skip multer
    next();
  }
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const normalizeSubject = (subject) =>
  subject ? subject.trim().toUpperCase().replace(/\s+/g, " ") : "";

const roomKey = (subject, year) => `${normalizeSubject(subject)}_${year}`;

const buildFileUrl = (req, filename) =>
  `${req.protocol}://${req.get("host")}/uploads/chat/${filename}`;

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/subject-rooms/by-subject?subject=X&year=Y
// ─────────────────────────────────────────────────────────────────────────────
router.get("/by-subject", async (req, res) => {
  try {
    const subject = normalizeSubject(req.query.subject);
    const { year } = req.query;

    if (!subject || !year)
      return res.status(400).json({ success: false, error: "subject and year are required." });

    const room = await Doubt.findOne({ subject, year }).lean();
    return res.status(200).json({ success: true, room: room || null });
  } catch (err) {
    console.error("GET /by-subject:", err);
    return res.status(500).json({ success: false, error: "Server error fetching room." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/subject-rooms/message
//
//  Case A — text only (Content-Type: application/json):
//    Body: { subject, year, division?, senderId, senderName, text, sender }
//    → express.json() parses req.body, multer is skipped, req.file = undefined
//
//  Case B — file upload (Content-Type: multipart/form-data):
//    Same fields as form fields + `file` field
//    → multer parses everything, req.body has all text fields, req.file has the file
// ─────────────────────────────────────────────────────────────────────────────
router.post("/message", smartUpload, async (req, res) => {
  try {
    // Debug — remove once confirmed working
    console.log("[POST /message] content-type:", req.headers["content-type"]);
    console.log("[POST /message] body :", req.body);
    console.log("[POST /message] file :", req.file?.originalname ?? "none");

    const subject    = normalizeSubject(req.body.subject);
    const year       = (req.body.year       || "").trim();
    const division   = (req.body.division   || "").trim();
    const senderId   = (req.body.senderId   || "").trim();
    const senderName = (req.body.senderName || "").trim();
    const sender     = (req.body.sender     || "student").trim();
    const text       = (req.body.text       || "").trim();

    // ── Validation ─────────────────────────────────────────────────────────
    if (!subject || !year)
      return res.status(400).json({ success: false, error: "subject and year are required." });
    if (!senderId)
      return res.status(400).json({ success: false, error: "senderId is required." });
    if (!text && !req.file)
      return res.status(400).json({ success: false, error: "text or a file is required." });

    const senderRole = ["student", "teacher"].includes(sender) ? sender : "student";

    // ── Find or create room ─────────────────────────────────────────────────
    let room = await Doubt.findOne({ subject, year });
    if (!room) {
      room = new Doubt({
        subject,
        year,
        teacherId: senderRole === "teacher" ? String(senderId) : null,
        messages:  [],
      });
    } else if (senderRole === "teacher" && !room.teacherId) {
      room.teacherId = String(senderId);
    }

    // ── Build message payload ───────────────────────────────────────────────
    const msgPayload = {
      sender:         senderRole,
      senderId:       String(senderId),
      senderName:     senderName || (senderRole === "teacher" ? "Teacher" : "Student"),
      senderDivision: String(division),
      text:           text || "",
    };

    if (req.file) {
      msgPayload.fileUrl  = buildFileUrl(req, req.file.filename);
      msgPayload.fileName = req.file.originalname;
      msgPayload.fileSize = req.file.size;
      msgPayload.mimeType = req.file.mimetype;
    }

    room.messages.push(msgPayload);
    await room.save();

    const savedMsg = room.messages[room.messages.length - 1];

    // ── Socket emit ─────────────────────────────────────────────────────────
    const io = req.app.get("io");
    if (io) io.to(roomKey(subject, year)).emit("new-message", savedMsg.toObject());

    return res.status(201).json({ success: true, room });
  } catch (err) {
    console.error("POST /message error:", err);
    return res.status(500).json({ success: false, error: "Server error sending message." });
  }
});

// When teacher replies to a doubt
router.post('/reply-doubt/:doubtId', auth, async (req, res) => {
  try {
    const { doubtId } = req.params;
    const { reply } = req.body;
    
    // Find doubt and add reply
    const doubt = await Doubt.findByIdAndUpdate(
      doubtId,
      {
        reply,
        status: 'resolved',
        resolvedBy: req.user.id,
        resolvedAt: new Date()
      },
      { new: true }
    ).populate('studentId');

    // Send notification to student
    const notificationData = {
      type: 'doubt_reply',
      title: '💡 Your Doubt Has Been Resolved',
      body: `Teacher has replied to your doubt about "${doubt.subject}"`,
      data: {
        screen: 'Doubts',
        doubtId: doubtId
      },
      priority: 'high'
    };

    await sendNotificationToUsers(
      doubt.studentId._id,
      'Student',
      notificationData
    );
    
    emitNotificationToUser(doubt.studentId._id, notificationData);

    res.json({
      success: true,
      message: 'Reply sent and student notified',
      doubt
    });

  } catch (error) {
    console.error('Error replying to doubt:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/subject-rooms/:roomId/messages/:messageId
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/:roomId/messages/:messageId", async (req, res) => {
  try {
    const { roomId, messageId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(roomId))
      return res.status(400).json({ success: false, error: "Invalid roomId." });
    if (!mongoose.Types.ObjectId.isValid(messageId))
      return res.status(400).json({ success: false, error: "Invalid messageId." });

    const room = await Doubt.findById(roomId);
    if (!room) return res.status(404).json({ success: false, error: "Room not found." });

    // Delete physical file if present
    const msg = room.messages.id(messageId);
    if (msg?.fileUrl) {
      const filename = path.basename(msg.fileUrl);
      fs.unlink(path.join(UPLOAD_DIR, filename), () => {});
    }

    const updated = await Doubt.findByIdAndUpdate(
      roomId,
      { $pull: { messages: { _id: new mongoose.Types.ObjectId(messageId) } } },
      { new: true }
    );

    const io = req.app.get("io");
    if (io) io.to(roomKey(updated.subject, updated.year)).emit("message-deleted", { messageId });

    return res.status(200).json({ success: true, room: updated });
  } catch (err) {
    console.error("DELETE /:roomId/messages/:messageId:", err);
    return res.status(500).json({ success: false, error: "Server error deleting message." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/subject-rooms/teacher-rooms?teacherId=xxx
// ─────────────────────────────────────────────────────────────────────────────
router.get("/teacher-rooms", async (req, res) => {
  try {
    const { teacherId } = req.query;
    if (!teacherId)
      return res.status(400).json({ success: false, error: "teacherId is required." });

    const rooms = await Doubt.find({
      $or: [
        { teacherId },
        { "messages.senderId": String(teacherId), "messages.sender": "teacher" },
      ],
    }).lean();

    return res.status(200).json({
      success: true,
      rooms: rooms.map((r) => ({ ...r, messageCount: r.messages.length })),
    });
  } catch (err) {
    console.error("GET /teacher-rooms:", err);
    return res.status(500).json({ success: false, error: "Server error fetching teacher rooms." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Legacy: GET /api/subject-rooms/:subject/:year/messages
// ─────────────────────────────────────────────────────────────────────────────
router.get("/:subject/:year/messages", async (req, res) => {
  try {
    const subject = normalizeSubject(decodeURIComponent(req.params.subject));
    const { year } = req.params;
    const room = await Doubt.findOne({ subject, year }).lean();
    return res.status(200).json({ success: true, messages: room?.messages || [] });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Server error." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Legacy: DELETE /api/subject-rooms/:subject/:year
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/:subject/:year", async (req, res) => {
  try {
    const subject = normalizeSubject(decodeURIComponent(req.params.subject));
    const { year } = req.params;
    const room = await Doubt.findOneAndDelete({ subject, year });
    if (!room) return res.status(404).json({ success: false, error: "Room not found." });
    return res.status(200).json({ success: true, message: `Room "${room.subject}" deleted.` });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Server error." });
  }
});

module.exports = router;