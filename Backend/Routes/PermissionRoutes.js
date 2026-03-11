const express = require("express");
const router = express.Router();
const Permission = require("../Models/Permission");

// Default permissions — used to seed if no records exist
const DEFAULTS = [
  { role: "Admin",   canUploadData: true,  canLogin: true },
  { role: "Teacher", canUploadData: true,  canLogin: true },
  { role: "Student", canUploadData: false, canLogin: true },
  { role: "Parent",  canUploadData: false, canLogin: true },
];

// ─── GET /api/permissions — fetch all role permissions ────────────
router.get("/", async (req, res) => {
  try {
    let perms = await Permission.find().sort({ role: 1 });
    if (perms.length === 0) {
      perms = await Permission.insertMany(DEFAULTS);
    }

    // Convert Map → plain object so React can read it normally
    const result = perms.map(p => ({
      role: p.role,
      canLogin: p.canLogin,
      canUploadData: p.canUploadData,
      tabAccess: Object.fromEntries(p.tabAccess || new Map()),  // ← ADD THIS
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/permissions/:role — update a single role's permissions ──
router.put("/:role", async (req, res) => {
  try {
    const { role } = req.params;
    const { canLogin, canUploadData, tabAccess } = req.body;  // ← destructure tabAccess

    const validRoles = ["Admin", "Teacher", "Student", "Parent"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    // Build update object — only include fields that were sent
    const updateFields = {};
    if (canLogin    !== undefined) updateFields.canLogin    = canLogin;
    if (canUploadData !== undefined) updateFields.canUploadData = canUploadData;
    if (tabAccess   !== undefined) updateFields.tabAccess   = tabAccess;  // ← ADD THIS

    const perm = await Permission.findOneAndUpdate(
      { role },
      updateFields,
      { new: true, upsert: true }
    );

    console.log(`🔐 Permission updated: ${role}`, updateFields);
    res.json(perm);
  } catch (err) {
    console.error("❌ Error updating permission:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/permissions/check/:role — quick check for a specific role ──
// ─── GET /api/permissions/check/:role ──
// ─── GET /api/permissions/check/:role ──
router.get("/check/:role", async (req, res) => {
  try {
    const { role } = req.params;
    const perm = await Permission.findOne({ 
      role: { $regex: new RegExp(`^${role}$`, "i") } 
    });

    if (!perm) {
      return res.json({ canLogin: true, canUploadData: true, tabAccess: {} });
    }

    res.json({
      canLogin:      perm.canLogin,
      canUploadData: perm.canUploadData,
      tabAccess:     Object.fromEntries(perm.tabAccess || new Map()), // ← this line serves all roles
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;