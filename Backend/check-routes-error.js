// Make sure all route imports are correct and are Express routers
// Check around line 140 in Server.js

// Should be:
app.use('/api/notifications', notificationRoutes);  // ✅ Correct
// app.use('/api/notifications', { someObject });   // ❌ Wrong

// Common issues:
// 1. Missing "module.exports = router;" at end of route file
// 2. Exporting an object instead of router
// 3. Wrong import syntax

// Fix: Ensure NotificationRoutes.js ends with:
// module.exports = router;

// And is imported as:
// const notificationRoutes = require('./Routes/NotificationRoutes');
