// At the top of Server.js, make sure you have:
const notificationRoutes = require('./Routes/NotificationRoutes');

// Then around line 140, it should be:
app.use('/api/notifications', notificationRoutes);

// NOT:
// app.use('/api/notifications', { sendNotificationToUsers });  // ❌ WRONG
// app.use(pushNotificationService);  // ❌ WRONG

// The issue is likely that line 140 is trying to use pushNotificationService as middleware
// Fix: Remove any app.use() calls with pushNotificationService
// pushNotificationService should only be imported and used inside route handlers