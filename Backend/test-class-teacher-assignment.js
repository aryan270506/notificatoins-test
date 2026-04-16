#!/usr/bin/env node
/**
 * Test Script: Class Teacher Assignment Flow
 * 
 * This script verifies that class teacher assignments are properly stored to the database.
 * Usage: node test-class-teacher-assignment.js
 */

const axios = require('axios');

// ─────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────
const BASE_URL = process.env.API_URL || 'http://localhost:5000/api';
const TIMEOUT = 5000;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT,
  validateStatus: () => true, // Don't throw on any status
});

// ─────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────
const log = (msg, type = 'info') => {
  const icons = { info: 'ℹ️ ', success: '✅', error: '❌', warn: '⚠️ ' };
  console.log(`${icons[type]} ${msg}`);
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ─────────────────────────────────────────────────────────────
// Test Suite
// ─────────────────────────────────────────────────────────────
async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('CLASS TEACHER ASSIGNMENT VERIFICATION TEST');
  console.log('='.repeat(60) + '\n');

  try {
    // Step 1: Get all teachers
    log('Fetching all teachers...', 'info');
    const teachersRes = await api.get('/teachers/all');
    
    if (!teachersRes.data?.success) {
      log('Failed to fetch teachers', 'error');
      log(`Response: ${JSON.stringify(teachersRes.data)}`, 'error');
      return;
    }

    const teachers = teachersRes.data.data || [];
    if (teachers.length === 0) {
      log('No teachers found in database', 'warn');
      return;
    }

    log(`Found ${teachers.length} teachers ✓`, 'success');

    // Step 2: Get first teacher for testing
    const testTeacher = teachers[0];
    log(`\nSelected teacher: ${testTeacher.name} (ID: ${testTeacher._id})`, 'info');

    // Step 3: Assign class teacher
    log(`Assigning as Class Teacher for 1st Year Division A...`, 'info');
    const assignRes = await api.post('/teachers/assign-class-teacher', {
      teacherId: testTeacher._id,
      year: '1st Year',
      division: 'A',
    });

    if (!assignRes.data?.success) {
      log(`Assignment failed: ${assignRes.data?.message || 'Unknown error'}`, 'error');
      log(`Response: ${JSON.stringify(assignRes.data)}`, 'error');
      return;
    }

    log(`Assignment successful! ✓`, 'success');
    log(`Message: ${assignRes.data.message}`, 'success');

    // Step 4: Wait a moment for DB to sync
    log(`\nWaiting for database sync...`, 'info');
    await delay(500);

    // Step 5: Verify assignment was saved - Method 1: Get all assignments
    log(`Verifying assignment via /class-teachers endpoint...`, 'info');
    const ctRes = await api.get('/teachers/class-teachers');
    
    if (!ctRes.data?.success) {
      log(`Failed to fetch class teachers`, 'error');
      return;
    }

    const assignments = ctRes.data.assignments || {};
    const key = '1st Year-A';
    
    if (assignments[key]) {
      log(`✓ Assignment FOUND in class-teachers endpoint`, 'success');
      log(`  Name: ${assignments[key].name}`, 'success');
      log(`  Assigned At: ${assignments[key].assignedAt}`, 'success');
    } else {
      log(`✗ Assignment NOT found in class-teachers endpoint`, 'error');
      log(`Available keys: ${Object.keys(assignments).join(', ')}`, 'warn');
    }

    // Step 6: Verify assignment was saved - Method 2: Get individual teacher
    log(`\nVerifying assignment via individual teacher endpoint...`, 'info');
    const singleRes = await api.get(`/teachers/${testTeacher._id}`);
    
    if (!singleRes.data?.success) {
      log(`Failed to fetch individual teacher`, 'error');
      return;
    }

    const teacher = singleRes.data.data;
    if (teacher.classTeacher?.year && teacher.classTeacher?.division) {
      log(`✓ Assignment FOUND in teacher record`, 'success');
      log(`  Year: ${teacher.classTeacher.year}`, 'success');
      log(`  Division: ${teacher.classTeacher.division}`, 'success');
      log(`  Assigned At: ${teacher.classTeacher.assignedAt}`, 'success');
    } else {
      log(`✗ Assignment NOT found in teacher record`, 'error');
      log(`Teacher classTeacher field:${JSON.stringify(teacher.classTeacher, null, 2)}`, 'warn');
    }

    // Step 7: Summary
    console.log('\n' + '='.repeat(60));
    log('TEST COMPLETE', 'success');
    console.log('='.repeat(60) + '\n');

    if (assignments[key] && teacher.classTeacher?.year) {
      log('✅ CLASS TEACHER ASSIGNMENT IS PROPERLY STORED TO DATABASE', 'success');
      console.log('\nThe assignment flow is working correctly:');
      console.log('  1. ✓ Teacher fetched from database');
      console.log('  2. ✓ Assignment POST request successful');
      console.log('  3. ✓ Assignment saved in teacher record');
      console.log('  4. ✓ Assignment retrievable from class-teachers endpoint');
    } else {
      log('❌ ASSIGNMENT NOT PROPERLY STORED', 'error');
      console.log('\nTroubleshooting steps:');
      console.log('  1. Check if backend server is running');
      console.log('  2. Verify MongoDB connection is active');
      console.log('  3. Check backend console for errors');
      console.log('  4. Ensure Teacher model has classTeacher schema');
    }

  } catch (err) {
    log(`\nCritical Error: ${err.message}`, 'error');
    log(`Make sure backend is running at ${BASE_URL}`, 'warn');
  }
}

// ─────────────────────────────────────────────────────────────
// Run Tests
// ─────────────────────────────────────────────────────────────
runTests().catch(console.error);
