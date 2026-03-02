const express = require("express");
const router = express.Router();
const ActiveUser = require("../Models/ActiveUsers");

// ✅ Save user session with socket ID when they login
router.post("/register-session", async (req, res) => {
  try {
    const { userId, socketId, name, email, role, profilePhoto } = req.body;

    if (!userId || !socketId || !name || !email || !role) {
      return res.status(400).json({ message: "All fields required" });
    }

    // Check if user already logged in, if yes update the socket ID
    let activeUser = await ActiveUser.findOne({ userId });

    if (activeUser) {
      // Update existing session with new socket ID
      activeUser.socketId = socketId;
      activeUser.isOnline = true;
      activeUser.loginTime = new Date();
      activeUser.lastActivity = new Date();
      await activeUser.save();
      return res.json({ 
        message: "Session updated", 
        user: activeUser 
      });
    }

    // Create new session
    const newActiveUser = new ActiveUser({
      userId,
      socketId,
      name,
      email,
      role,
      profilePhoto,
    });

    await newActiveUser.save();

    res.json({ 
      message: "Session registered successfully", 
      user: newActiveUser 
    });
  } catch (error) {
    console.error("❌ Error registering session:", error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ Get all active/online users
router.get("/active-users", async (req, res) => {
  try {
    const activeUsers = await ActiveUser.find({ isOnline: true }).select(
      "userId socketId name email role profilePhoto loginTime"
    );

    res.json({ 
      count: activeUsers.length, 
      users: activeUsers 
    });
  } catch (error) {
    console.error("❌ Error fetching active users:", error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ Get specific user by userId
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await ActiveUser.findOne({ userId });

    if (!user) {
      return res.status(404).json({ message: "User not found in active sessions" });
    }

    res.json(user);
  } catch (error) {
    console.error("❌ Error fetching user:", error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ Logout user - set offline
router.post("/logout", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId required" });
    }

    const activeUser = await ActiveUser.findOne({ userId });

    if (!activeUser) {
      return res.status(404).json({ message: "User not found" });
    }

    activeUser.isOnline = false;
    await activeUser.save();

    res.json({ message: "User logged out successfully", user: activeUser });
  } catch (error) {
    console.error("❌ Error logging out user:", error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ Mark user offline when socket disconnects (do not delete entry)
router.post("/remove-session", async (req, res) => {
  try {
    const { socketId } = req.body;

    if (!socketId) {
      return res.status(400).json({ message: "socketId required" });
    }

    // find session and mark offline
    const user = await ActiveUser.findOne({ socketId });
    if (!user) {
      return res.status(404).json({ message: "Session not found" });
    }

    user.isOnline = false;
    user.lastActivity = new Date();
    await user.save();

    console.log(`⚠️ Marked user offline for socket: ${socketId}`);
    res.json({ message: "Session deactivated", user });
  } catch (error) {
    console.error("❌ Error deactivating session:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;