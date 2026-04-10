// Simple test to check if notification routes are working
// Run: node check-routes.js

const express = require('express');

console.log('🔍 Checking if NotificationRoutes.js exists and can be loaded...\n');

try {
  const notificationRoutes = require('./Routes/NotificationRoutes');
  console.log('✅ NotificationRoutes.js loaded successfully!');
  console.log('Type:', typeof notificationRoutes);
  
  // Check if it's an Express router
  if (notificationRoutes && notificationRoutes.stack) {
    console.log('✅ It is a valid Express Router');
    console.log('\n📋 Registered routes:');
    notificationRoutes.stack.forEach((layer) => {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
        console.log(`  ${methods} /api/notifications${layer.route.path}`);
      }
    });
  }
  
  console.log('\n✅ All checks passed! Routes should work.');
  
} catch (error) {
  console.error('❌ Error loading NotificationRoutes.js:');
  console.error(error.message);
  console.error('\nMake sure you have installed expo-server-sdk:');
  console.error('  npm install expo-server-sdk');
}
