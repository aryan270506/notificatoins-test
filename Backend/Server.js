require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const morgan = require('morgan');
const SecurityLog = require("./Models/SecurityLog");

// ─── Routes ───────────────────────────────────────────────────────
const studentsRoutes = require("./Routes/StudentsRoutes");
const TeacherRoutes = require("./Routes/TeacherRoutes");
const adminRoutes = require("./Routes/AdminRoutes");
const parentRoutes = require("./Routes/ParentRoutes");
const authRoutes = require("./Routes/AuthRoutes");
const MessagesRoutes = require("./Routes/MessagesRoutes");
const userRoutes = require("./Routes/UserRoutes");
const assignmentRoutes = require("./Routes/Assignmentroutes");
const attendanceRoutes = require("./Routes/AttendanceRoutes");
const examMarksRoutes = require("./Routes/Exammarksroutes");
const lectureStatusRoutes = require("./Routes/LectureStatus.routes");
const lessonPlannerRoutes = require("./Routes/Lessonplannerroutes");
const quizRoutes = require("./Routes/QuizRoutes");
const studentFinanceRoutes = require("./Routes/FinanceRoutes");
const timeTableRoutes = require("./Routes/TimeTableRoutes");
const StudentFinanceRoutes = require("./Routes/FinanceRoutes");
const aiDoubtRoutes = require('./Routes/AI-DoubtRoutes.js');
const subjectRoomsRoutes = require("./Routes/DoubtsRoutes");
const configurationRoutes = require("./Routes/ConfigurationRoutes");

const permissionRoutes = require("./Routes/PermissionRoutes");

// additional routes
const aiRoutes = require("./Routes/AiRoutes");
const notificationRoutes = require('./Routes/NotificationRoutes');

// ─── Socket ───────────────────────────────────────────────────────
const { initSocket } = require("./socket");

// ─── App Setup ─────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

// ─── CORS Configuration ────────────────────────────────────────────
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use(morgan(':method :url :status :response-time ms'));
// ✅ Preflight requests
app.options("*", cors());

// ─── Middleware ───────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

const inferLogType = (path) => {
  if (path.includes("/api/auth") || path.includes("/login") || path.includes("/logout")) return "Auth";
  if (path.includes("/api/admins") || path.includes("/api/users")) return "Security";
  if (path.includes("/api/messages") || path.includes("/api/attendance") || path.includes("/api/assignments")) return "System";
  return "System";
};

const inferLogStatus = (code) => {
  if (code >= 500) return "Failed";
  if (code >= 400) return "Warning";
  return "Success";
};

app.use((req, res, next) => {
  const method = req.method.toUpperCase();
  const shouldTrack = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
  const urlPath = req.originalUrl.split("?")[0];
  const skipPath = urlPath.startsWith("/api/admins/security-logs");

  if (!shouldTrack || skipPath) {
    return next();
  }

  const startedAt = Date.now();
  res.on("finish", () => {
    const actor =
      req.headers["x-user-email"] ||
      req.headers["x-user-id"] ||
      req.body?.email ||
      req.body?.id ||
      req.body?.teacherId ||
      req.body?.studentId ||
      "System";

    const forwarded = req.headers["x-forwarded-for"];
    const ip = Array.isArray(forwarded)
      ? forwarded[0]
      : String(forwarded || req.ip || "Unknown").split(",")[0].trim();

    SecurityLog.create({
      action: `${method} ${urlPath}`,
      actor: String(actor),
      ip,
      type: inferLogType(urlPath),
      status: inferLogStatus(res.statusCode),
      method,
      route: urlPath,
      metadata: {
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt,
      },
    }).catch((err) => {
      console.error("SecurityLog create failed:", err.message);
    });
  });

  next();
});

// Add logging middleware to debug routes
app.use((req, res, next) => {
  console.log(`📍 ${req.method} ${req.path}`);
  next();
});

// ─── Database Connection ──────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err);
    process.exit(1);
  });

// ─── API Routes ───────────────────────────────────────────────────
app.use("/api/users", userRoutes);
app.use("/api/students", studentsRoutes);
app.use("/api/teachers", TeacherRoutes);
app.use("/api/admins", adminRoutes);
app.use("/api/parents", parentRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/messages", MessagesRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/exam-marks", examMarksRoutes);
app.use("/api/lecture-status", lectureStatusRoutes);
app.use("/api/lesson-planner", lessonPlannerRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/student-finance", studentFinanceRoutes);
app.use("/api/timetable", timeTableRoutes);
app.use('/api/ai-doubts', aiDoubtRoutes);
app.use('/api/subject-rooms', subjectRoomsRoutes); // ← Subject chat rooms
app.use('/api/doubts', subjectRoomsRoutes); // ← Alias for doubts endpoints
app.use("/api/permissions", permissionRoutes);
app.use("/api/finance", StudentFinanceRoutes);
app.use("/api/ai", aiRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/configuration', configurationRoutes);
console.log('✅ Notification routes registered at /api/notifications');
console.log('✅ Configuration routes registered at /api/configuration');

// ─── Static Files ─────────────────────────────────────────────────
app.use("/uploads", express.static("uploads"));

// ─── Health Check ─────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ message: "Server working 🚀", timestamp: new Date() });
});

// Test route to verify server is working
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is running!', timestamp: new Date() });
});

// ─── 404 Handler ──────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ─── Error Handler ────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("❌ Error:", err);
  res.status(err.status || 500).json({ 
    error: err.message || "Internal server error",
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

// ─── Socket Initialization ────────────────────────────────────────
initSocket(server);

// ─── Server Startup ───────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);

  try {
    const axios = require("axios");
    const res = await axios.get("http://localhost:8000/health", { timeout: 5000 });
    if (res.data?.status === "healthy") {
      console.log("🤖 AI server is ready and connected on port 8000");
    } else {
      console.log("⚠️  AI server responded but status is unknown:", res.data);
    }
  } catch {
    console.log("⚠️  AI server is not running. Start it with: uvicorn main:app --host 0.0.0.0 --port 8000");
  }
  console.log("");
});