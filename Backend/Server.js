require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const studentsRoutes = require("./Routes/StudentsRoutes");
const TeacherRoutes = require("./Routes/TeacherRoutes");
const adminRoutes = require("./Routes/AdminRoutes");
const parentRoutes = require("./Routes/ParentRoutes");
const authRoutes = require("./Routes/AuthRoutes");
const MessagesRoutes = require("./Routes/MessagesRoutes");
const userRoutes = require("./Routes/UserRoutes");
const { initSocket } = require("./socket");
const http = require("http");

const app = express();
const server = http.createServer(app);  

// ✅ Proper CORS config
app.use(
  cors({
    origin: "*", // allow all (for development)
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// 🔥 VERY IMPORTANT for preflight
app.options("*", cors());

app.use(express.json({ limit: "10mb" }));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.log(err));

  app.use("/api/users", userRoutes);
app.use("/api/students", studentsRoutes);
app.use("/api/teachers", TeacherRoutes);
app.use("/api/admins", adminRoutes);
app.use("/api/parents", parentRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/messages", MessagesRoutes);
app.use("/uploads", express.static("uploads"));
app.get("/", (req, res) => {
  res.json({ message: "Server working 🚀" });
});

initSocket(server);

server.listen(5001, () => console.log("Server running on 5001"));