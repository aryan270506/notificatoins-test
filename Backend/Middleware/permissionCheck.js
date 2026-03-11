const Permission = require("../Models/Permission");

/**
 * Middleware factory: checks if a given role has canUploadData permission.
 * Usage: router.post("/upload", checkUploadPermission("Student"), handler)
 */
const checkUploadPermission = (role) => {
  return async (req, res, next) => {
    try {
      const perm = await Permission.findOne({
        role: { $regex: new RegExp(`^${role}$`, "i") },
      });

      if (perm && perm.canUploadData === false) {
        console.log(`🚫 Upload denied for role: ${role} (committee permission)`);
        return res.status(403).json({
          message: `Upload access for ${role}s has been denied by the committee`,
        });
      }

      next();
    } catch (err) {
      console.error("Permission check error:", err.message);
      next(); // allow on error to avoid blocking
    }
  };
};

module.exports = { checkUploadPermission };
