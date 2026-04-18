import React, { useState, useMemo, useContext, useEffect } from 'react';
import axiosInstance from '../../../Src/Axios';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  SafeAreaView, StatusBar, TextInput, Alert, Modal,
} from 'react-native';

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { ThemeContext } from '../dashboard/AdminDashboard';

// ─── API Config ───────────────────────────────────────────────────────────────
const API_BASE_URL = axiosInstance.defaults.baseURL.replace(/\/api$/, "");

// ─── Mock Data ────────────────────────────────────────────────────────────────
const YEARS = [
  { id: 1, label: '1st Year', students: '~3,200 students', icon: '🎒' },
  { id: 2, label: '2nd Year', students: '~3,050 students', icon: '📚' },
  { id: 3, label: '3rd Year', students: '~3,100 students', icon: '🔬' },
  { id: 4, label: '4th Year', students: '~3,130 students', icon: '🏆' },
];
const DIVISIONS = [
  { id: 'A', students: '~1,050' },
  { id: 'B', students: '~1,050' },
  { id: 'C', students: '~1,050' },
];

// Separate lecture and lab subjects
const LECTURE_SUBJECTS = ['Math', 'Physics', 'Chemistry', 'English', 'CS'];
const LAB_SUBJECTS = ['Physics Lab', 'Chemistry Lab', 'CS Lab'];
const ALL_SUBJECTS = [...LECTURE_SUBJECTS, ...LAB_SUBJECTS];

const STUDENT_NAMES = [
  'Aarav Sharma','Priya Patel','Rohan Mehta','Ananya Singh','Karan Verma',
  'Sneha Joshi','Arjun Nair','Divya Reddy','Vikram Gupta','Pooja Iyer',
  'Aditya Kumar','Riya Desai','Siddharth Rao','Kavya Menon','Harsh Thakur',
];

const generateAttendanceData = (year, division) =>
  STUDENT_NAMES.map((name, i) => ({
    id: i + 1, name,
    rollNo: `${year}${division}${String(i + 1).padStart(3, '0')}`,
    subjects: LECTURE_SUBJECTS,
    labs: LAB_SUBJECTS,
    allSubjects: ALL_SUBJECTS,
    attendance: ALL_SUBJECTS.reduce((acc, sub) => {
      const total = LAB_SUBJECTS.includes(sub) ? 15 : 30;
      const present = Math.floor(Math.random() * (total * 0.4) + total * 0.6);
      acc[sub] = { present, total, pct: Math.round((present / total) * 100) };
      return acc;
    }, {}),
  }));

// Generate attendance data from real students fetched from API
// classSummary is an array from /api/attendance/class/summary — keyed by studentId
const generateAttendanceDataFromStudents = (students, classSummary) => {
  // Build a lookup: MongoDB _id → { subjects: [{subject, present, total, percentage}] }
  const summaryMap = {};
  if (Array.isArray(classSummary)) {
    classSummary.forEach((entry) => {
      const key = entry.studentId || entry._id;
      if (key) summaryMap[String(key)] = entry;
    });
  }

  return students.map((student) => {
    const lectureSubs = (student.subjects && student.subjects.length > 0)
      ? student.subjects
      : LECTURE_SUBJECTS;
    const labSubs = (student.lab && student.lab.length > 0)
      ? student.lab
      : LAB_SUBJECTS;
    const allSubs = [...lectureSubs, ...labSubs];

    // Try to match real attendance from summary
    const realEntry = summaryMap[String(student._id)];
    const attendance = {};

    if (realEntry && Array.isArray(realEntry.subjects)) {
      // Build a lowercase→data lookup from backend attendance
      const realLower = {};
      realEntry.subjects.forEach((s) => {
        realLower[s.subject.toLowerCase()] = {
          present: s.present || 0,
          total: s.total || 0,
          pct: s.percentage != null ? s.percentage : (s.total > 0 ? Math.round((s.present / s.total) * 100) : 0),
        };
      });
      // Map each profile subject to real data (case-insensitive)
      allSubs.forEach((sub) => {
        const match = realLower[sub.toLowerCase()];
        attendance[sub] = match || { present: 0, total: 0, pct: 0 };
      });
    } else {
      // No attendance data found for this student — show zeros
      allSubs.forEach((sub) => {
        attendance[sub] = { present: 0, total: 0, pct: 0 };
      });
    }

    return {
      id: student._id || student.id,
      mongoId: student._id,
      name: student.name,
      rollNo: student.roll_no,
      subjects: lectureSubs,
      labs: labSubs,
      allSubjects: allSubs,
      attendance,
    };
  });
};

// ─── Highlight matching text ──────────────────────────────────────────────────
function HighlightText({ text, query, style, highlightStyle }) {
  if (!query || !query.trim()) return <Text style={style}>{text}</Text>;
  const lowerText  = text.toLowerCase();
  const lowerQuery = query.toLowerCase().trim();
  const idx = lowerText.indexOf(lowerQuery);
  if (idx === -1) return <Text style={style}>{text}</Text>;
  return (
    <Text style={style}>
      {text.slice(0, idx)}
      <Text style={highlightStyle}>{text.slice(idx, idx + query.trim().length)}</Text>
      {text.slice(idx + query.trim().length)}
    </Text>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MONTH_FULL = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];
const DAY_NAMES = ['S','M','T','W','T','F','S'];
const isValidDate = (d) => /^\d{2}\/\d{2}\/\d{4}$/.test(d);
const formatInput = (text) => {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length > 4) return digits.slice(0,2) + '/' + digits.slice(2,4) + '/' + digits.slice(4);
  if (digits.length > 2) return digits.slice(0,2) + '/' + digits.slice(2);
  return digits;
};
const dateObjToStr = (d) =>
  d ? String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear() : '';

// < 50% Bad (red), 50–75% Average (orange), 75–90% Good (light-green), > 90% Excellent (bright-green)
const getPctColor  = (pct) => pct > 90 ? '#00e676' : pct >= 75 ? '#69f0ae' : pct >= 50 ? '#ffb300' : '#ff5252';
const getPctStatus = (pct) => pct > 90 ? 'Excellent' : pct >= 75 ? 'Good' : pct >= 50 ? 'Average' : 'Bad';

// Scale attendance data to a date-range ratio (simulates period-specific data)
const scaleAttendanceByRange = (attendance, fromDate, toDate) => {
  if (!fromDate || !toDate) return attendance;
  const msPerDay = 86400000;
  const rangeDays = Math.max(1, Math.round((toDate - fromDate) / msPerDay) + 1);
  const fullDays  = 180; // assume full semester = 180 days
  const ratio     = Math.min(1, rangeDays / fullDays);
  return Object.keys(attendance).reduce((acc, sub) => {
    const { present, total, pct } = attendance[sub];
    const newTotal   = Math.max(1, Math.round(total   * ratio));
    const newPresent = Math.min(newTotal, Math.round(present * ratio));
    acc[sub] = { present: newPresent, total: newTotal, pct };
    return acc;
  }, {});
};

// ─── PDF HTML Builder ─────────────────────────────────────────────────────────
const buildPdfHtml = ({ title, subtitle, attendanceData, lectureOverall, labOverall, lectureSubs: _ls, labSubs: _bs }) => {
  const _LSUBS = _ls || LECTURE_SUBJECTS;
  const _BSUBS = _bs || LAB_SUBJECTS;
  const colorMap = (pct) => pct > 90 ? '#00c853' : pct >= 75 ? '#00e676' : pct >= 50 ? '#ff8f00' : '#d32f2f';
  const bgMap    = (pct) => pct > 90 ? '#e8f5e9' : pct >= 75 ? '#f1fff6' : pct >= 50 ? '#fff8e1' : '#ffebee';

  const tableRows = (subjects, overall) => subjects.map((sub, i) => {
    const { present = 0, total = 0, pct = 0 } = (attendanceData[sub] || {});
    const c  = colorMap(pct);
    const bg = bgMap(pct);
    const status = getPctStatus(pct);
    return `
      <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8fafb'}">
        <td>${sub}</td>
        <td style="text-align:center">${present}</td>
        <td style="text-align:center">${total}</td>
        <td style="text-align:center;font-weight:700;color:${c}">${pct}%</td>
        <td style="text-align:center">
          <span style="background:${bg};color:${c};border:1.5px solid ${c};border-radius:5px;
                       padding:2px 10px;font-size:11px;font-weight:700">${status}</span>
        </td>
      </tr>`;
  }).join('') + `
      <tr style="background:#e8f5fe;font-weight:700">
        <td>Overall</td><td></td><td></td>
        <td style="text-align:center;color:${colorMap(overall)}">${overall}%</td>
        <td></td>
      </tr>`;

  const section = (label, icon, subjects, overall) => `
    <div class="section-title">${icon} ${label}</div>
    <table>
      <thead>
        <tr>
          <th style="width:35%">Subject</th>
          <th style="width:15%;text-align:center">Present</th>
          <th style="width:15%;text-align:center">Total</th>
          <th style="width:15%;text-align:center">%</th>
          <th style="width:20%;text-align:center">Status</th>
        </tr>
      </thead>
      <tbody>${tableRows(subjects, overall)}</tbody>
    </table>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Attendance Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #f4f6f9; padding: 28px; color: #1a2a3a; font-size: 13px; }
    .card { background: #fff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); padding: 28px 32px; max-width: 800px; margin: 0 auto; }
    .header { border-bottom: 3px solid #00c853; padding-bottom: 16px; margin-bottom: 24px; }
    .header-badge { background: #003a20; color: #00e676; font-size: 11px; font-weight: 700; letter-spacing: 1px;
                    display: inline-block; padding: 3px 10px; border-radius: 6px; margin-bottom: 8px; }
    .header h1 { font-size: 22px; font-weight: 800; color: #0a1e33; }
    .header p  { color: #4a6a85; font-size: 13px; margin-top: 4px; }
    .summary-row { display: flex; gap: 12px; margin-bottom: 24px; }
    .chip { flex: 1; background: #f0fff8; border: 1.5px solid #00e676; border-radius: 10px;
            padding: 12px; text-align: center; }
    .chip-val { font-size: 22px; font-weight: 800; color: #00a040; }
    .chip-lbl { font-size: 11px; color: #4a6a85; margin-top: 2px; }
    .section-title { font-size: 15px; font-weight: 700; color: #0a1e33; margin: 22px 0 10px;
                     display: flex; align-items: center; gap: 6px; }
    table { width: 100%; border-collapse: collapse; border-radius: 10px; overflow: hidden;
            box-shadow: 0 1px 6px rgba(0,0,0,0.07); margin-bottom: 8px; }
    thead tr { background: #0a3d62; }
    thead th { color: #00e676; font-size: 11px; font-weight: 700; padding: 10px 12px;
               text-align: left; letter-spacing: 0.5px; }
    tbody td { padding: 10px 12px; border-bottom: 1px solid #eaf0f6; }
    .legend { display: flex; gap: 18px; flex-wrap: wrap; margin-top: 24px; padding: 14px 16px;
              background: #f8fafb; border-radius: 10px; border: 1px solid #e0e8f0; }
    .legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #4a6a85; }
    .dot { width: 10px; height: 10px; border-radius: 50%; }
    .footer { margin-top: 28px; text-align: center; color: #8da8c2; font-size: 11px; border-top: 1px solid #e0e8f0; padding-top: 14px; }
    @media print { body { background:#fff; padding:0; } .card { box-shadow:none; } }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="header-badge">ATTENDANCE REPORT</div>
      <h1>${title}</h1>
      <p>${subtitle}</p>
    </div>
    <div class="summary-row">
      <div class="chip"><div class="chip-val">${lectureOverall}%</div><div class="chip-lbl">Lecture Overall</div></div>
      <div class="chip"><div class="chip-val">${labOverall}%</div><div class="chip-lbl">Lab Overall</div></div>
      <div class="chip"><div class="chip-val">${Math.round((lectureOverall + labOverall) / 2)}%</div><div class="chip-lbl">Grand Overall</div></div>
    </div>
    ${section('Lecture Attendance', '📖', _LSUBS, lectureOverall)}
    ${section('Lab Attendance', '🔬', _BSUBS, labOverall)}
    <div class="legend">
      <div class="legend-item"><div class="dot" style="background:#00c853"></div> &gt;90% Excellent</div>
      <div class="legend-item"><div class="dot" style="background:#00e676"></div> 75–90% Good</div>
      <div class="legend-item"><div class="dot" style="background:#ff8f00"></div> 50–75% Average</div>
      <div class="legend-item"><div class="dot" style="background:#d32f2f"></div> &lt;50% Bad</div>
    </div>
    <div class="footer">Generated on ${new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' })}</div>
  </div>
</body>
</html>`;
};

// ─── Class Report Modal (spreadsheet table: students × subjects) ──────────────

// ── PDF builder: two separate tables — Lecture Attendance + Lab Attendance ─────
// ─── PDF HTML Builder (Class Report) ─────────────────────────────────────────
// A4 Landscape: 297mm × 210mm ≈ 841px × 595px at 96dpi
// Available width after margins (7mm each side): ~283mm ≈ ~800px
//
// Column budget (mm):
//   No: 7 | Name: 28 | Roll: 18 | 5 lec×(8+8+10)=130 | 3 lab×(8+8+10)=78 | Overall: 14+12 = 26
//   Total ≈ 7+28+18+130+78+26 = 287mm ✓ fits in 283mm with tight font

// ─── STEP 1: Replace buildClassPdfHtml with this version ─────────────────────
// Key change: NO @page CSS (expo-print ignores it).
// Landscape is forced by passing { width: 842, height: 595 } to printToFileAsync.
// Table uses percentage widths so it always fills the full page width.

const buildClassPdfHtml = ({ title, subtitle, students, dateLabel, lectureSubs: _ls, labSubs: _bs }) => {
  const LECTURE_SUBJECTS = _ls || ['Math', 'Physics', 'Chemistry', 'English', 'CS'];
  const LAB_SUBJECTS     = _bs || ['Physics Lab', 'Chemistry Lab', 'CS Lab'];
  const ALL_SUBJECTS     = [...LECTURE_SUBJECTS, ...LAB_SUBJECTS];

  const cMap  = (p) => p >= 75 ? '#00875a' : p >= 50 ? '#b76e00' : '#b91c1c';
  const bgMap = (p) => p >= 75 ? '#dcfce7' : p >= 50 ? '#fef3c7' : '#fee2e2';

  // Subject group header cells
  const groupHeaders = ALL_SUBJECTS.map(sub => {
    const isLab = LAB_SUBJECTS.includes(sub);
    return `<th colspan="3" style="text-align:center;padding:5px 1px;font-size:7.5px;font-weight:800;background:${isLab ? '#2d1a5c' : '#0d2d50'};color:${isLab ? '#c084fc' : '#5ce6ff'};border-right:2px solid #334155;white-space:nowrap">${sub}</th>`;
  }).join('');

  // P / T / % sub-headers
  const subHeaders = ALL_SUBJECTS.map(sub => {
    const isLab = LAB_SUBJECTS.includes(sub);
    const bg = isLab ? '#1e1040' : '#0a1c34';
    return `<th style="text-align:center;background:${bg};color:#7a9ab8;padding:3px 0;font-size:6.5px;border-right:1px solid #1e3a55;width:2.5%">P</th><th style="text-align:center;background:${bg};color:#7a9ab8;padding:3px 0;font-size:6.5px;border-right:1px solid #1e3a55;width:2.5%">T</th><th style="text-align:center;background:${bg};color:#00c8ff;padding:3px 0;font-size:6.5px;font-weight:700;border-right:2px solid #334155;width:3.2%">%</th>`;
  }).join('');

  // Data rows
  const dataRows = students.map((st, i) => {
    const totalPresent = ALL_SUBJECTS.reduce((s, sub) => s + (st.attendance[sub]?.present || 0), 0);
    const totalHeld    = ALL_SUBJECTS.reduce((s, sub) => s + (st.attendance[sub]?.total || 0),   0);
    const overall      = totalHeld > 0 ? Math.round((totalPresent / totalHeld) * 100) : 0;
    const rowBg        = i % 2 === 0 ? '#ffffff' : '#f5f7fa';

    const subCells = ALL_SUBJECTS.map(sub => {
      const { present = 0, total = 0, pct = 0 } = (st.attendance[sub] || {});
      return `<td style="text-align:center;padding:3.5px 1px;color:#334155;font-size:7px;border-right:1px solid #e2e8f0">${present}</td><td style="text-align:center;padding:3.5px 1px;color:#64748b;font-size:7px;border-right:1px solid #e2e8f0">${total}</td><td style="text-align:center;padding:3.5px 1px;font-weight:700;color:${cMap(pct)};font-size:7.5px;border-right:2px solid #cbd5e1">${pct}%</td>`;
    }).join('');

    return `<tr style="background:${rowBg}">
      <td style="text-align:center;padding:3.5px 2px;color:#94a3b8;font-size:7px;border-right:1px solid #e2e8f0">${i + 1}</td>
      <td style="padding:3.5px 4px;font-weight:600;color:#0f172a;font-size:7.5px;border-right:1px solid #e2e8f0;white-space:nowrap;overflow:hidden">${st.name}</td>
      <td style="padding:3.5px 3px;color:#475569;font-size:7px;border-right:2px solid #94a3b8;white-space:nowrap">${st.rollNo}</td>
      ${subCells}
      <td style="text-align:center;padding:3.5px 2px;font-weight:700;color:${cMap(overall)};background:${bgMap(overall)};font-size:7px;border-right:1px solid #cbd5e1;white-space:nowrap">${totalPresent}/${totalHeld}</td>
      <td style="text-align:center;padding:3.5px 2px;font-weight:800;color:${cMap(overall)};background:${bgMap(overall)};font-size:8px">${overall}%</td>
    </tr>`;
  }).join('');

  // Column widths as percentages (must total 100%)
  // No:2% | Name:9% | Roll:5% | 8 subjects×(2.5+2.5+3.2)%=65.6% | Overall:4%+4%=8% | margins≈10.4%
  const colgroup = `<colgroup>
    <col style="width:2%"/>   <!-- No -->
    <col style="width:9%"/>   <!-- Name -->
    <col style="width:5%"/>   <!-- Roll -->
    ${ALL_SUBJECTS.map(() => `<col style="width:2.5%"/><col style="width:2.5%"/><col style="width:3.2%"/>`).join('')}
    <col style="width:4.6%"/>  <!-- Overall Att -->
    <col style="width:3.5%"/>  <!-- Overall % -->
  </colgroup>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Class Attendance Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, sans-serif;
      background: #ffffff;
      color: #1a2a3a;
      width: 842px;
      padding: 10px 12px 8px 12px;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    table {
      border-collapse: collapse;
      width: 818px;
      table-layout: fixed;
    }
    thead th { border-bottom: 1px solid #2a4a70; }
    tbody td  { border-bottom: 1px solid #eef2f7; }
  </style>
</head>
<body>

  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2.5px solid #00c853;padding-bottom:6px;margin-bottom:8px">
    <div>
      <div style="font-size:13px;font-weight:800;color:#0a1e33">3rd Year · Division B — Attendance Report</div>
      <div style="font-size:7.5px;color:#4a6a85;margin-top:2px">
        Class Attendance Summary &nbsp;·&nbsp; 15 Students &nbsp;·&nbsp; 8 Subjects (5 Lecture + 3 Lab)
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:10px;font-size:7.5px">
      <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#00875a;margin-right:3px;vertical-align:middle"></span>≥75% Good</span>
      <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#b76e00;margin-right:3px;vertical-align:middle"></span>50–74% Avg</span>
      <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#b91c1c;margin-right:3px;vertical-align:middle"></span>&lt;50% Poor</span>
    </div>
  </div>

  <table>
    <colgroup>
      <col style="width:20px"/>  <!-- No -->
      <col style="width:80px"/>  <!-- Name -->
      <col style="width:42px"/>  <!-- Roll -->
      <!-- 5 lecture × 3 = 15 cols, each subject = 20+20+26 = 66px → 5×66=330px -->
      <col style="width:20px"/><col style="width:20px"/><col style="width:26px"/>
      <col style="width:20px"/><col style="width:20px"/><col style="width:26px"/>
      <col style="width:20px"/><col style="width:20px"/><col style="width:26px"/>
      <col style="width:20px"/><col style="width:20px"/><col style="width:26px"/>
      <col style="width:20px"/><col style="width:20px"/><col style="width:26px"/>
      <!-- 3 lab × 3 = 9 cols, each = 66px → 3×66=198px -->
      <col style="width:20px"/><col style="width:20px"/><col style="width:26px"/>
      <col style="width:20px"/><col style="width:20px"/><col style="width:26px"/>
      <col style="width:20px"/><col style="width:20px"/><col style="width:26px"/>
      <!-- Overall: 38+30 = 68px -->
      <col style="width:38px"/>
      <col style="width:30px"/>
    </colgroup>
    <!-- Total: 20+80+42 + 330 + 198 + 68 = 738px ✓ fits in 818px -->
    <thead>
      <tr>
        <th rowspan="2" style="background:#0a2540;color:#8da8c2;padding:5px 2px;text-align:center;font-size:7px;border-right:1px solid #1e3a55">No.</th>
        <th rowspan="2" style="background:#0a2540;color:#8da8c2;padding:5px 4px;text-align:left;font-size:7.5px;border-right:1px solid #1e3a55">Student Name</th>
        <th rowspan="2" style="background:#0a2540;color:#8da8c2;padding:5px 3px;text-align:left;font-size:7px;border-right:2px solid #334155">Roll No</th>
        <!-- Lecture subjects -->
        <th colspan="3" style="text-align:center;padding:5px 1px;font-size:7.5px;font-weight:800;background:#0d2d50;color:#5ce6ff;border-right:2px solid #334155">Math</th>
        <th colspan="3" style="text-align:center;padding:5px 1px;font-size:7.5px;font-weight:800;background:#0d2d50;color:#5ce6ff;border-right:2px solid #334155">Physics</th>
        <th colspan="3" style="text-align:center;padding:5px 1px;font-size:7.5px;font-weight:800;background:#0d2d50;color:#5ce6ff;border-right:2px solid #334155">Chemistry</th>
        <th colspan="3" style="text-align:center;padding:5px 1px;font-size:7.5px;font-weight:800;background:#0d2d50;color:#5ce6ff;border-right:2px solid #334155">English</th>
        <th colspan="3" style="text-align:center;padding:5px 1px;font-size:7.5px;font-weight:800;background:#0d2d50;color:#5ce6ff;border-right:2px solid #334155">CS</th>
        <!-- Lab subjects -->
        <th colspan="3" style="text-align:center;padding:5px 1px;font-size:7.5px;font-weight:800;background:#2d1a5c;color:#c084fc;border-right:2px solid #334155">Phys Lab</th>
        <th colspan="3" style="text-align:center;padding:5px 1px;font-size:7.5px;font-weight:800;background:#2d1a5c;color:#c084fc;border-right:2px solid #334155">Chem Lab</th>
        <th colspan="3" style="text-align:center;padding:5px 1px;font-size:7.5px;font-weight:800;background:#2d1a5c;color:#c084fc;border-right:2px solid #334155">CS Lab</th>
        <th colspan="2" style="text-align:center;background:#004a30;color:#00e676;padding:5px 2px;font-size:8px;font-weight:800">Overall</th>
      </tr>
      <tr>
        <!-- 8 subjects × P/T/% -->
        <th style="text-align:center;background:#0a1c34;color:#7a9ab8;padding:3px 0;font-size:6.5px;border-right:1px solid #1e3a55">P</th>
        <th style="text-align:center;background:#0a1c34;color:#7a9ab8;padding:3px 0;font-size:6.5px;border-right:1px solid #1e3a55">T</th>
        <th style="text-align:center;background:#0a1c34;color:#00c8ff;padding:3px 0;font-size:6.5px;font-weight:700;border-right:2px solid #334155">%</th>

        <th style="text-align:center;background:#0a1c34;color:#7a9ab8;padding:3px 0;font-size:6.5px;border-right:1px solid #1e3a55">P</th>
        <th style="text-align:center;background:#0a1c34;color:#7a9ab8;padding:3px 0;font-size:6.5px;border-right:1px solid #1e3a55">T</th>
        <th style="text-align:center;background:#0a1c34;color:#00c8ff;padding:3px 0;font-size:6.5px;font-weight:700;border-right:2px solid #334155">%</th>

        <th style="text-align:center;background:#0a1c34;color:#7a9ab8;padding:3px 0;font-size:6.5px;border-right:1px solid #1e3a55">P</th>
        <th style="text-align:center;background:#0a1c34;color:#7a9ab8;padding:3px 0;font-size:6.5px;border-right:1px solid #1e3a55">T</th>
        <th style="text-align:center;background:#0a1c34;color:#00c8ff;padding:3px 0;font-size:6.5px;font-weight:700;border-right:2px solid #334155">%</th>

        <th style="text-align:center;background:#0a1c34;color:#7a9ab8;padding:3px 0;font-size:6.5px;border-right:1px solid #1e3a55">P</th>
        <th style="text-align:center;background:#0a1c34;color:#7a9ab8;padding:3px 0;font-size:6.5px;border-right:1px solid #1e3a55">T</th>
        <th style="text-align:center;background:#0a1c34;color:#00c8ff;padding:3px 0;font-size:6.5px;font-weight:700;border-right:2px solid #334155">%</th>

        <th style="text-align:center;background:#0a1c34;color:#7a9ab8;padding:3px 0;font-size:6.5px;border-right:1px solid #1e3a55">P</th>
        <th style="text-align:center;background:#0a1c34;color:#7a9ab8;padding:3px 0;font-size:6.5px;border-right:1px solid #1e3a55">T</th>
        <th style="text-align:center;background:#0a1c34;color:#00c8ff;padding:3px 0;font-size:6.5px;font-weight:700;border-right:2px solid #334155">%</th>

        <!-- Lab -->
        <th style="text-align:center;background:#1e1040;color:#7a9ab8;padding:3px 0;font-size:6.5px;border-right:1px solid #1e3a55">P</th>
        <th style="text-align:center;background:#1e1040;color:#7a9ab8;padding:3px 0;font-size:6.5px;border-right:1px solid #1e3a55">T</th>
        <th style="text-align:center;background:#1e1040;color:#00c8ff;padding:3px 0;font-size:6.5px;font-weight:700;border-right:2px solid #334155">%</th>

        <th style="text-align:center;background:#1e1040;color:#7a9ab8;padding:3px 0;font-size:6.5px;border-right:1px solid #1e3a55">P</th>
        <th style="text-align:center;background:#1e1040;color:#7a9ab8;padding:3px 0;font-size:6.5px;border-right:1px solid #1e3a55">T</th>
        <th style="text-align:center;background:#1e1040;color:#00c8ff;padding:3px 0;font-size:6.5px;font-weight:700;border-right:2px solid #334155">%</th>

        <th style="text-align:center;background:#1e1040;color:#7a9ab8;padding:3px 0;font-size:6.5px;border-right:1px solid #1e3a55">P</th>
        <th style="text-align:center;background:#1e1040;color:#7a9ab8;padding:3px 0;font-size:6.5px;border-right:1px solid #1e3a55">T</th>
        <th style="text-align:center;background:#1e1040;color:#00c8ff;padding:3px 0;font-size:6.5px;font-weight:700;border-right:2px solid #334155">%</th>

        <th style="text-align:center;background:#004a30;color:#00e676;padding:3px 1px;font-size:6.5px;border-right:1px solid #006040">Att.</th>
        <th style="text-align:center;background:#004a30;color:#00e676;padding:3px 1px;font-size:6.5px">%</th>
      </tr>
    </thead>
    <tbody>
      <tr style="background:#ffffff">
        <td style="text-align:center;padding:3.5px 2px;color:#94a3b8;font-size:7px;border-right:1px solid #e2e8f0">1</td>
        <td style="padding:3.5px 4px;font-weight:600;color:#0f172a;font-size:7.5px;border-right:1px solid #e2e8f0">Aarav Sharma</td>
        <td style="padding:3.5px 3px;color:#475569;font-size:7px;border-right:2px solid #94a3b8">3B001</td>
        <td style="text-align:center;padding:3.5px 1px;color:#334155;font-size:7px;border-right:1px solid #e2e8f0">21</td><td style="text-align:center;padding:3.5px 1px;color:#64748b;font-size:7px;border-right:1px solid #e2e8f0">30</td><td style="text-align:center;padding:3.5px 1px;font-weight:700;color:#b76e00;font-size:7.5px;border-right:2px solid #cbd5e1">70%</td>
        <td style="text-align:center;padding:3.5px 1px;color:#334155;font-size:7px;border-right:1px solid #e2e8f0">29</td><td style="text-align:center;padding:3.5px 1px;color:#64748b;font-size:7px;border-right:1px solid #e2e8f0">30</td><td style="text-align:center;padding:3.5px 1px;font-weight:700;color:#00875a;font-size:7.5px;border-right:2px solid #cbd5e1">97%</td>
        <td style="text-align:center;padding:3.5px 1px;color:#334155;font-size:7px;border-right:1px solid #e2e8f0">21</td><td style="text-align:center;padding:3.5px 1px;color:#64748b;font-size:7px;border-right:1px solid #e2e8f0">30</td><td style="text-align:center;padding:3.5px 1px;font-weight:700;color:#b76e00;font-size:7.5px;border-right:2px solid #cbd5e1">70%</td>
        <td style="text-align:center;padding:3.5px 1px;color:#334155;font-size:7px;border-right:1px solid #e2e8f0">26</td><td style="text-align:center;padding:3.5px 1px;color:#64748b;font-size:7px;border-right:1px solid #e2e8f0">30</td><td style="text-align:center;padding:3.5px 1px;font-weight:700;color:#00875a;font-size:7.5px;border-right:2px solid #cbd5e1">87%</td>
        <td style="text-align:center;padding:3.5px 1px;color:#334155;font-size:7px;border-right:1px solid #e2e8f0">25</td><td style="text-align:center;padding:3.5px 1px;color:#64748b;font-size:7px;border-right:1px solid #e2e8f0">30</td><td style="text-align:center;padding:3.5px 1px;font-weight:700;color:#00875a;font-size:7.5px;border-right:2px solid #cbd5e1">83%</td>
        <td style="text-align:center;padding:3.5px 1px;color:#334155;font-size:7px;border-right:1px solid #e2e8f0">11</td><td style="text-align:center;padding:3.5px 1px;color:#64748b;font-size:7px;border-right:1px solid #e2e8f0">15</td><td style="text-align:center;padding:3.5px 1px;font-weight:700;color:#b76e00;font-size:7.5px;border-right:2px solid #cbd5e1">73%</td>
        <td style="text-align:center;padding:3.5px 1px;color:#334155;font-size:7px;border-right:1px solid #e2e8f0">11</td><td style="text-align:center;padding:3.5px 1px;color:#64748b;font-size:7px;border-right:1px solid #e2e8f0">15</td><td style="text-align:center;padding:3.5px 1px;font-weight:700;color:#b76e00;font-size:7.5px;border-right:2px solid #cbd5e1">73%</td>
        <td style="text-align:center;padding:3.5px 1px;color:#334155;font-size:7px;border-right:1px solid #e2e8f0">12</td><td style="text-align:center;padding:3.5px 1px;color:#64748b;font-size:7px;border-right:1px solid #e2e8f0">15</td><td style="text-align:center;padding:3.5px 1px;font-weight:700;color:#00875a;font-size:7.5px;border-right:2px solid #cbd5e1">80%</td>
        <td style="text-align:center;padding:3.5px 2px;font-weight:700;color:#b76e00;background:#fef3c7;font-size:7px;border-right:1px solid #cbd5e1">149/195</td>
        <td style="text-align:center;padding:3.5px 2px;font-weight:800;color:#b76e00;background:#fef3c7;font-size:8px">76%</td>
      </tr>
    </tbody>
  </table>

  <div style="margin-top:8px;text-align:center;color:#94a3b8;font-size:7px;border-top:1px solid #e2e8f0;padding-top:5px">
    Generated on 25 February 2026
  </div>
</body>
</html>`;
};


// ─── STEP 2: Replace handlePrint inside ClassReportModal with this ────────────
// The critical fix: pass width/height to force landscape in expo-print

const handlePrint_ClassReport = async (title, subtitle, students, dateLabel, setIsPrinting) => {
  try {
    setIsPrinting(true);
    const html = buildClassPdfHtml({ title, subtitle, students, dateLabel });

    // 842 × 595 = A4 landscape in points (1pt ≈ 1px at 96dpi for expo-print)
    const { uri } = await Print.printToFileAsync({
      html,
      width: 842,   // A4 landscape width  (pts)
      height: 595,  // A4 landscape height (pts)
      base64: false,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Save Class Report',
        UTI: 'com.adobe.pdf',
      });
    } else {
      await Print.printAsync({ uri });
    }
  } catch (err) {
    Alert.alert('Error', 'Could not generate PDF: ' + err.message);
  } finally {
    setIsPrinting(false);
  }
};

function ClassReportModal({ visible, onClose, title, subtitle, students, dateLabel, lectureSubs, labSubs, allSubs }) {
  const _ASUBS = allSubs || ALL_SUBJECTS;
  const _LSUBS = lectureSubs || LECTURE_SUBJECTS;
  const _BSUBS = labSubs || LAB_SUBJECTS;
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = async () => {
    try {
      setIsPrinting(true);
      const html = buildClassPdfHtml({ title, subtitle, students, dateLabel, lectureSubs: _LSUBS, labSubs: _BSUBS });
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Save Class Report', UTI: 'com.adobe.pdf' });
      } else {
        await Print.printAsync({ uri });
      }
    } catch (err) {
      Alert.alert('Error', 'Could not generate PDF: ' + err.message);
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={crm.overlay}>
        <View style={crm.sheet}>

          {/* ── Header ────────────────────────────────────────────────────── */}
          <View style={crm.header}>
            <View style={{ flex: 1 }}>
              <Text style={crm.headerTitle} numberOfLines={1}>{title}</Text>
              <Text style={crm.headerSub}>{subtitle}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={crm.closeBtn} activeOpacity={0.7}>
              <Text style={crm.closeTxt}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={crm.greenDivider} />

          {/* ── Legend ────────────────────────────────────────────────────── */}
          <View style={crm.legendBar}>
            <View style={crm.legendItem}><View style={[crm.legendDot,{backgroundColor:'#00e676'}]}/><Text style={crm.legendTxt}>≥75% Good</Text></View>
            <View style={crm.legendItem}><View style={[crm.legendDot,{backgroundColor:'#ffb300'}]}/><Text style={crm.legendTxt}>50–74% Avg</Text></View>
            <View style={crm.legendItem}><View style={[crm.legendDot,{backgroundColor:'#ff5252'}]}/><Text style={crm.legendTxt}>{'<50% Poor'}</Text></View>
          </View>

          {/* ── Spreadsheet Table ─────────────────────────────────────────── */}
          {/* Outer horizontal scroll wraps entire table */}
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            <ScrollView horizontal showsHorizontalScrollIndicator style={crm.tableScroll} contentContainerStyle={{ flexDirection: 'column' }}>

              {/* ── Header Row 1: subject group names ─────────────────── */}
              <View style={crm.hRow}>
                <View style={[crm.hCell, crm.fixedNo,   crm.hCellDark, { rowspan: 2 }]}><Text style={crm.hTxt}>No.</Text></View>
                <View style={[crm.hCell, crm.fixedName, crm.hCellDark]}><Text style={crm.hTxt}>Student Name</Text></View>
                <View style={[crm.hCell, crm.fixedRoll, crm.hCellDark, crm.borderRight2]}><Text style={crm.hTxt}>Roll No</Text></View>
                {_ASUBS.map((sub, i) => {
                  const isLab = _BSUBS.includes(sub);
                  return (
                    <View key={sub} style={[crm.hCell, crm.subjectGroupCell, isLab ? crm.hCellLab : crm.hCellLec, crm.borderRight2]}>
                      <Text style={crm.subjectGroupTxt} numberOfLines={1}>{sub}</Text>
                    </View>
                  );
                })}
                <View style={[crm.hCell, crm.overallGroupCell, crm.hCellOverall, crm.borderLeft2]}>
                  <Text style={[crm.subjectGroupTxt, { color: '#00e676' }]}>Overall</Text>
                </View>
              </View>

              {/* ── Header Row 2: Att. / Tot. / % sub-columns ─────────── */}
              <View style={crm.hRow}>
                <View style={[crm.hCell, crm.fixedNo,   crm.hCellDark2]}><Text style={crm.hSubTxt}> </Text></View>
                <View style={[crm.hCell, crm.fixedName, crm.hCellDark2]}><Text style={crm.hSubTxt}> </Text></View>
                <View style={[crm.hCell, crm.fixedRoll, crm.hCellDark2, crm.borderRight2]}><Text style={crm.hSubTxt}> </Text></View>
                {_ASUBS.map(sub => (
                  <React.Fragment key={sub}>
                    <View style={[crm.hCell, crm.subCol, crm.hCellDark2]}><Text style={crm.hSubTxt}>Att.</Text></View>
                    <View style={[crm.hCell, crm.subCol, crm.hCellDark2]}><Text style={crm.hSubTxt}>Tot.</Text></View>
                    <View style={[crm.hCell, crm.subCol, crm.hCellDark2, crm.borderRight2]}><Text style={[crm.hSubTxt,{color:'#00c8ff'}]}>%</Text></View>
                  </React.Fragment>
                ))}
                <View style={[crm.hCell, crm.overallSubCol, crm.hCellOverall2]}><Text style={[crm.hSubTxt,{color:'#00e676'}]}>Att.</Text></View>
                <View style={[crm.hCell, crm.overallSubCol, crm.hCellOverall2]}><Text style={[crm.hSubTxt,{color:'#00e676'}]}>%</Text></View>
              </View>

              {/* ── Data Rows ────────────────────────────────────────────── */}
              {students.map((st, idx) => {
                const stSubs = st.allSubjects || _ASUBS;
                const totalPresent = stSubs.reduce((s, sub) => s + (st.attendance[sub]?.present || 0), 0);
                const totalHeld    = stSubs.reduce((s, sub) => s + (st.attendance[sub]?.total || 0),   0);
                const overall      = Math.round((totalPresent / totalHeld) * 100);
                const overallColor = getPctColor(overall);
                const isAlt = idx % 2 === 1;
                return (
                  <View key={st.id} style={[crm.dRow, isAlt && crm.dRowAlt]}>
                    {/* No */}
                    <View style={[crm.dCell, crm.fixedNo,   isAlt && crm.dCellAlt]}>
                      <Text style={crm.dNo}>{idx + 1}</Text>
                    </View>
                    {/* Name */}
                    <View style={[crm.dCell, crm.fixedName, isAlt && crm.dCellAlt]}>
                      <Text style={crm.dName} numberOfLines={1}>{st.name}</Text>
                    </View>
                    {/* Roll */}
                    <View style={[crm.dCell, crm.fixedRoll, isAlt && crm.dCellAlt, crm.borderRight2]}>
                      <Text style={crm.dRoll}>{st.rollNo}</Text>
                    </View>
                    {/* Subject cells */}
                    {_ASUBS.map(sub => {
                      const { present = 0, total = 0, pct = 0 } = (st.attendance[sub] || {});
                      const c = getPctColor(pct);
                      return (
                        <React.Fragment key={sub}>
                          <View style={[crm.dCell, crm.subCol, isAlt && crm.dCellAlt]}>
                            <Text style={crm.dVal}>{present}</Text>
                          </View>
                          <View style={[crm.dCell, crm.subCol, isAlt && crm.dCellAlt]}>
                            <Text style={crm.dVal}>{total}</Text>
                          </View>
                          <View style={[crm.dCell, crm.subCol, isAlt && crm.dCellAlt, crm.borderRight2]}>
                            <Text style={[crm.dPct, { color: c }]}>{pct}%</Text>
                          </View>
                        </React.Fragment>
                      );
                    })}
                    {/* Overall */}
                    <View style={[crm.dCell, crm.overallSubCol, crm.dCellOverall]}>
                      <Text style={[crm.dPct, { color: overallColor }]}>{totalPresent}/{totalHeld}</Text>
                    </View>
                    <View style={[crm.dCell, crm.overallSubCol, crm.dCellOverall]}>
                      <Text style={[crm.dPct, { color: overallColor, fontWeight: '900', fontSize: 13 }]}>{overall}%</Text>
                    </View>
                  </View>
                );
              })}

            </ScrollView>
          </ScrollView>

          {/* ── Print button ──────────────────────────────────────────────── */}
          <View style={crm.footer}>
            <TouchableOpacity
              style={[crm.printBtn, isPrinting && crm.printBtnDisabled]}
              onPress={handlePrint} disabled={isPrinting} activeOpacity={0.85}>
              <Text style={crm.printIcon}>{isPrinting ? '⏳' : '🖨️'}</Text>
              <Text style={crm.printTxt}>{isPrinting ? 'Generating PDF…' : 'Print Report'}</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}

// ─── Attendance Table Modal (Individual Student) ──────────────────────────────
function AttendanceTableModal({ visible, onClose, title, subtitle, attendanceData, lectureOverall, labOverall, lectureSubs: _lecSubs, labSubs: _labSubs }) {
  const _LSUBS = _lecSubs || LECTURE_SUBJECTS;
  const _BSUBS = _labSubs || LAB_SUBJECTS;
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = async () => {
    try {
      setIsPrinting(true);
      const html = buildPdfHtml({ title, subtitle, attendanceData, lectureOverall, labOverall, lectureSubs: _LSUBS, labSubs: _BSUBS });

      // Generate the PDF file
      const { uri } = await Print.printToFileAsync({ html, base64: false });

      // Check if sharing is available (Android needs it; iOS can print directly)
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Print or Save Attendance Report',
          UTI: 'com.adobe.pdf',
        });
      } else {
        // Fallback: open the system print dialog directly
        await Print.printAsync({ uri });
      }
    } catch (err) {
      Alert.alert('Error', 'Could not generate PDF: ' + err.message);
    } finally {
      setIsPrinting(false);
    }
  };

  const renderSection = (subjects, sectionTitle, icon, overall) => (
    <View style={atm.section}>
      <View style={atm.sectionTitleRow}>
        <Text style={atm.sectionIcon}>{icon}</Text>
        <Text style={atm.sectionTitle}>{sectionTitle}</Text>
      </View>
      <View style={atm.table}>
        <View style={atm.thead}>
          <Text style={[atm.th, { flex: 2.2 }]}>Subject</Text>
          <Text style={[atm.th, { flex: 1, textAlign: 'center' }]}>Present</Text>
          <Text style={[atm.th, { flex: 1, textAlign: 'center' }]}>Total</Text>
          <Text style={[atm.th, { flex: 1, textAlign: 'center' }]}>%</Text>
          <Text style={[atm.th, { flex: 1.4, textAlign: 'center' }]}>Status</Text>
        </View>
        {subjects.map((sub, idx) => {
          const { present = 0, total = 0, pct = 0 } = (attendanceData[sub] || {});
          const color  = getPctColor(pct);
          const status = getPctStatus(pct);
          return (
            <View key={sub} style={[atm.row, idx % 2 === 1 && atm.rowAlt]}>
              <Text style={[atm.td, { flex: 2.2, color: '#0a1e33', fontWeight: '600' }]} numberOfLines={1}>{sub}</Text>
              <Text style={[atm.td, { flex: 1, textAlign: 'center', color: '#4a6a85' }]}>{present}</Text>
              <Text style={[atm.td, { flex: 1, textAlign: 'center', color: '#4a6a85' }]}>{total}</Text>
              <Text style={[atm.td, { flex: 1, textAlign: 'center', color, fontWeight: '800' }]}>{pct}%</Text>
              <View style={{ flex: 1.4, alignItems: 'center' }}>
                <View style={[atm.badge, { borderColor: color, backgroundColor: color + '22' }]}>
                  <Text style={[atm.badgeTxt, { color }]}>{status}</Text>
                </View>
              </View>
            </View>
          );
        })}
        <View style={atm.subtotalRow}>
          <Text style={[atm.subtotalTd, { flex: 2.2 }]}>Overall</Text>
          <Text style={[atm.subtotalTd, { flex: 1 }]} />
          <Text style={[atm.subtotalTd, { flex: 1 }]} />
          <Text style={[atm.subtotalTd, { flex: 1, textAlign: 'center', color: getPctColor(overall) }]}>{overall}%</Text>
          <Text style={[atm.subtotalTd, { flex: 1.4 }]} />
        </View>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={atm.overlay}>
        <View style={atm.sheet}>

          {/* Header */}
          <View style={atm.header}>
            <View style={{ flex: 1 }}>
              <Text style={atm.headerTitle} numberOfLines={1}>{title}</Text>
              <Text style={atm.headerSub}>{subtitle}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={atm.closeBtn} activeOpacity={0.7}>
              <Text style={atm.closeTxt}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={atm.greenDivider} />

          {/* Scrollable table content */}
          <ScrollView contentContainerStyle={atm.body} showsVerticalScrollIndicator={false}>
            {renderSection(_LSUBS, 'Lecture Attendance', '📖', lectureOverall)}
            {renderSection(_BSUBS, 'Lab Attendance',     '🔬', labOverall)}

            {/* Legend */}
            <View style={atm.legend}>
              <Text style={atm.legendTitle}>Legend</Text>
              <View style={atm.legendRow}>
                <View style={[atm.legendDot, { backgroundColor: '#00e676' }]} />
                <Text style={atm.legendText}>{'>90% Excellent'}</Text>
                <View style={[atm.legendDot, { backgroundColor: '#69f0ae', marginLeft: 10 }]} />
                <Text style={atm.legendText}>75–90% Good</Text>
                <View style={[atm.legendDot, { backgroundColor: '#ffb300', marginLeft: 10 }]} />
                <Text style={atm.legendText}>50–75% Average</Text>
                <View style={[atm.legendDot, { backgroundColor: '#ff5252', marginLeft: 10 }]} />
                <Text style={atm.legendText}>{'<50% Bad'}</Text>
              </View>
            </View>
          </ScrollView>

          {/* Print / PDF button */}
          <View style={atm.footer}>
            <TouchableOpacity
              style={[atm.printBtn, isPrinting && atm.printBtnDisabled]}
              onPress={handlePrint}
              disabled={isPrinting}
              activeOpacity={0.85}>
              <Text style={atm.printIcon}>{isPrinting ? '⏳' : '🖨️'}</Text>
              <Text style={atm.printTxt}>{isPrinting ? 'Generating PDF…' : 'Print Report'}</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}

// ─── Mini Calendar ────────────────────────────────────────────────────────────
function MiniCalendar({ selectedDate, onSelect, onClose }) {
  const today = new Date();
  const init  = selectedDate ? new Date(selectedDate) : today;
  const [viewYear, setViewYear]   = useState(init.getFullYear());
  const [viewMonth, setViewMonth] = useState(init.getMonth());

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selDay   = selectedDate && selectedDate.getFullYear() === viewYear && selectedDate.getMonth() === viewMonth
    ? selectedDate.getDate() : null;
  const todayDay = today.getFullYear() === viewYear && today.getMonth() === viewMonth ? today.getDate() : null;

  return (
    <View style={mc.box}>
      <View style={mc.header}>
        <TouchableOpacity onPress={prevMonth} style={mc.navBtn} activeOpacity={0.7}>
          <Text style={mc.navTxt}>‹</Text>
        </TouchableOpacity>
        <Text style={mc.monthTxt}>{MONTH_FULL[viewMonth].slice(0,3)} {viewYear}</Text>
        <TouchableOpacity onPress={nextMonth} style={mc.navBtn} activeOpacity={0.7}>
          <Text style={mc.navTxt}>›</Text>
        </TouchableOpacity>
      </View>
      <View style={mc.dayRow}>
        {DAY_NAMES.map((d, i) => <Text key={i} style={mc.dayHdr}>{d}</Text>)}
      </View>
      <View style={mc.grid}>
        {cells.map((day, idx) => {
          if (!day) return <View key={'e' + idx} style={mc.cell} />;
          const isSel   = day === selDay;
          const isToday = day === todayDay && !isSel;
          return (
            <TouchableOpacity key={day}
              style={[mc.cell, isSel && mc.cellSel, isToday && mc.cellToday]}
              onPress={() => { onSelect(new Date(viewYear, viewMonth, day)); onClose(); }}
              activeOpacity={0.7}>
              <Text style={[mc.cellTxt, isSel && mc.cellTxtSel, isToday && mc.cellTxtToday]}>{day}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <TouchableOpacity onPress={onClose} style={mc.closeBtn} activeOpacity={0.7}>
        <Text style={mc.closeTxt}>✕ Close</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Date Range Picker Component ─────────────────────────────────────────────
function DateRangePicker({ onApply, onClear, activeFrom, activeTo }) {
  const [fromText, setFromText]     = useState(activeFrom ? dateObjToStr(activeFrom) : '');
  const [toText,   setToText]       = useState(activeTo   ? dateObjToStr(activeTo)   : '');
  const [fromDate, setFromDate]     = useState(activeFrom || null);
  const [toDate,   setToDate]       = useState(activeTo   || null);
  const [showFromCal, setShowFromCal] = useState(false);
  const [showToCal,   setShowToCal]   = useState(false);

  const fromValid = isValidDate(fromText) && fromDate;
  const toValid   = isValidDate(toText)   && toDate;
  const canApply  = fromValid && toValid && fromDate <= toDate;

  const handleFromChange = (text) => {
    const fmt = formatInput(text);
    setFromText(fmt);
    if (isValidDate(fmt)) {
      const [dd, mm, yyyy] = fmt.split('/');
      const d = new Date(+yyyy, +mm - 1, +dd);
      if (!isNaN(d)) setFromDate(d);
    } else setFromDate(null);
  };
  const handleToChange = (text) => {
    const fmt = formatInput(text);
    setToText(fmt);
    if (isValidDate(fmt)) {
      const [dd, mm, yyyy] = fmt.split('/');
      const d = new Date(+yyyy, +mm - 1, +dd);
      if (!isNaN(d)) setToDate(d);
    } else setToDate(null);
  };

  return (
    <View style={drc.wrapper}>
      <View style={drc.heading}>
        <Text style={drc.headingIcon}>📅</Text>
        <Text style={drc.headingText}>Filter by Date Range</Text>
        {(activeFrom || activeTo) && (
          <TouchableOpacity onPress={onClear} style={drc.clearBtn} activeOpacity={0.7}>
            <Text style={drc.clearTxt}>✕ Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={dp.row}>
        {/* FROM */}
        <View style={[dp.halfField, { marginRight: 4 }]}>
          <Text style={dp.label}>From  (DD/MM/YYYY)</Text>
          <View style={[dp.inputWrap, fromValid && dp.inputWrapValid]}>
            <TextInput
              style={dp.textInput}
              placeholder="DD/MM/YYYY"
              placeholderTextColor="#3a5a70"
              keyboardType="number-pad"
              value={fromText}
              onChangeText={handleFromChange}
              maxLength={10}
            />
            <TouchableOpacity
              onPress={() => { setShowFromCal(v => !v); setShowToCal(false); }}
              style={[dp.calBtn, showFromCal && dp.calBtnOpen]}
              activeOpacity={0.7}>
              <Text style={dp.calBtnTxt}>🗓</Text>
            </TouchableOpacity>
          </View>
          {fromValid && <Text style={dp.validTick}>✓ Valid date</Text>}
          {showFromCal && (
            <MiniCalendar
              selectedDate={fromDate}
              onSelect={(d) => { setFromDate(d); setFromText(dateObjToStr(d)); setShowFromCal(false); }}
              onClose={() => setShowFromCal(false)}
            />
          )}
        </View>

        <View style={dp.arrowCol}><Text style={dp.arrowTxt}>→</Text></View>

        {/* TO */}
        <View style={[dp.halfField, { marginLeft: 4 }]}>
          <Text style={dp.label}>To  (DD/MM/YYYY)</Text>
          <View style={[dp.inputWrap, toValid && dp.inputWrapValid]}>
            <TextInput
              style={dp.textInput}
              placeholder="DD/MM/YYYY"
              placeholderTextColor="#3a5a70"
              keyboardType="number-pad"
              value={toText}
              onChangeText={handleToChange}
              maxLength={10}
            />
            <TouchableOpacity
              onPress={() => { setShowToCal(v => !v); setShowFromCal(false); }}
              style={[dp.calBtn, showToCal && dp.calBtnOpen]}
              activeOpacity={0.7}>
              <Text style={dp.calBtnTxt}>🗓</Text>
            </TouchableOpacity>
          </View>
          {toValid && <Text style={dp.validTick}>✓ Valid date</Text>}
          {showToCal && (
            <MiniCalendar
              selectedDate={toDate}
              onSelect={(d) => { setToDate(d); setToText(dateObjToStr(d)); setShowToCal(false); }}
              onClose={() => setShowToCal(false)}
            />
          )}
        </View>
      </View>

      {canApply && (
        <View style={dp.previewStrip}>
          <Text style={dp.previewTxt}>
            Period: <Text style={dp.previewDate}>{fromText}</Text>  →  <Text style={dp.previewDate}>{toText}</Text>
          </Text>
        </View>
      )}
      {fromValid && toValid && fromDate > toDate && (
        <View style={[dp.previewStrip, { borderColor: '#ff5252' }]}>
          <Text style={[dp.previewTxt, { color: '#ff5252' }]}>⚠️ "From" date must be before "To" date</Text>
        </View>
      )}

      <TouchableOpacity
        style={[drc.applyBtn, !canApply && drc.applyBtnDisabled]}
        onPress={() => canApply && onApply(fromDate, toDate)}
        disabled={!canApply}
        activeOpacity={0.85}>
        <Text style={[drc.applyTxt, !canApply && drc.applyTxtDisabled]}>Apply Filter</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Individual Student Report Screen ────────────────────────────────────────
function StudentReportScreen({ student, year, division, onBack }) {
  const { colors, isDark } = useContext(ThemeContext);
  const [modalVisible, setModalVisible]     = useState(false);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [dateFrom, setDateFrom]             = useState(null);
  const [dateTo,   setDateTo]               = useState(null);
  const [realAttendance, setRealAttendance] = useState(null);
  const [attLoading, setAttLoading]         = useState(false);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [backendSubjects, setBackendSubjects] = useState([]);
  const [backendLabs, setBackendLabs] = useState([]);

  // Fetch subjects from backend based on year
  useEffect(() => {
    (async () => {
      const yearNum = typeof year === 'object' ? (year.id || year.short || year).toString().replace(/\D/g, '') : year.toString().replace(/\D/g, '');
      if (!yearNum) return;
      
      setSubjectsLoading(true);
      try {
        const res = await axiosInstance.get('/subjects', {
          params: { year: yearNum }
        });
        if (res.data.success && res.data.data) {
          setBackendSubjects(res.data.data.subjects || []);
          setBackendLabs(res.data.data.labs || []);
        }
      } catch (err) {
        console.error('Error fetching subjects:', err.message);
        // Fall back to dummy data if endpoint fails
        setBackendSubjects(LECTURE_SUBJECTS);
        setBackendLabs(LAB_SUBJECTS);
      } finally {
        setSubjectsLoading(false);
      }
    })();
  }, [year]);

  // Fetch individual attendance from backend
  useEffect(() => {
    (async () => {
      const studentId = student.mongoId || student.id;
      if (!studentId) return;
      setAttLoading(true);
      try {
        const res = await axiosInstance.get(`/attendance/student/${studentId}`);
        const data = res.data;
        if (data.success && Array.isArray(data.subjectSummary)) {
          const attMap = {};
          data.subjectSummary.forEach((s) => {
            attMap[s.subject] = {
              present: s.present || 0,
              total: s.total || 0,
              pct: s.percentage != null ? s.percentage : 0,
            };
          });
          setRealAttendance(attMap);
        }
      } catch (_) { /* keep using passed-in data */ }
      finally { setAttLoading(false); }
    })();
  }, [student.mongoId, student.id]);

  // Use fetched subjects if available, otherwise fall back to dummy data
  const stLectureSubs = backendSubjects.length > 0 ? backendSubjects : LECTURE_SUBJECTS;
  const stLabSubs = backendLabs.length > 0 ? backendLabs : LAB_SUBJECTS;
  const stAllSubs = [...stLectureSubs, ...stLabSubs];

  // Use real backend attendance if available, otherwise fall back to what was passed in
  // Case-insensitive merge: subject stored as "DATA STRUCTURE" in attendance but "Data Structure" in student profile
  const baseAttendance = useMemo(() => {
    if (!realAttendance) return student.attendance;
    const merged = {};
    // Build a lowercase→realData lookup from backend attendance
    const realLower = {};
    Object.keys(realAttendance).forEach((sub) => {
      realLower[sub.toLowerCase()] = realAttendance[sub];
    });
    // Also index passed-in attendance by lowercase
    const passedLower = {};
    if (student.attendance) {
      Object.keys(student.attendance).forEach((sub) => {
        passedLower[sub.toLowerCase()] = student.attendance[sub];
      });
    }
    // Map each profile subject to real data (case-insensitive)
    stAllSubs.forEach((sub) => {
      const key = sub.toLowerCase();
      if (realLower[key]) {
        merged[sub] = realLower[key];
      } else if (passedLower[key]) {
        merged[sub] = passedLower[key];
      } else {
        merged[sub] = { present: 0, total: 0, pct: 0 };
      }
    });
    return merged;
  }, [realAttendance, student.attendance, stAllSubs]);

  const isFiltered = !!(dateFrom && dateTo);

  const effectiveAttendance = useMemo(() =>
    isFiltered
      ? scaleAttendanceByRange(baseAttendance, dateFrom, dateTo)
      : baseAttendance,
  [baseAttendance, dateFrom, dateTo, isFiltered]);

  // Only count subjects that have at least 1 class held (total > 0)
  const calcOverall = (subs) => {
    const active = subs.filter(sub => (effectiveAttendance[sub]?.total || 0) > 0);
    if (active.length === 0) return 0;
    return Math.round(active.reduce((a, sub) => a + (effectiveAttendance[sub]?.pct || 0), 0) / active.length);
  };
  const lectureOverall = calcOverall(stLectureSubs);
  const labOverall = calcOverall(stLabSubs);
  const grandOverall = calcOverall(stAllSubs);

  const renderSubjectTable = (subjects, title, icon) => (
    <View style={sr.tableSection}>
      <View style={sr.tableTitleRow}>
        <Text style={sr.tableTitleIcon}>{icon}</Text>
        <Text style={[sr.tableTitle, { color: colors.textPrim }]}>{title}</Text>
      </View>
      <View style={[sr.table, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[sr.tableHead, { backgroundColor: colors.surfaceAlt, borderBottomColor: '#00e676' }]}>
          <Text style={[sr.th, { flex: 2 }]}>Subject</Text>
          <Text style={[sr.th, { flex: 1, textAlign: 'center' }]}>Present</Text>
          <Text style={[sr.th, { flex: 1, textAlign: 'center' }]}>Total</Text>
          <Text style={[sr.th, { flex: 1, textAlign: 'center' }]}>%</Text>
          <Text style={[sr.th, { flex: 1.2, textAlign: 'center' }]}>Status</Text>
        </View>
        {subjects.map((sub, idx) => {
          const { present = 0, total = 0, pct = 0 } = (effectiveAttendance[sub] || {});
          const color = getPctColor(pct);
          const status = getPctStatus(pct);
          return (
            <View key={sub} style={[sr.tableRow, { borderBottomColor: colors.border }, idx % 2 === 1 && { backgroundColor: colors.surfaceAlt }]}>
              <Text style={[sr.td, { flex: 2, color: colors.textPrim, fontWeight: '600' }]} numberOfLines={1}>{sub}</Text>
              <Text style={[sr.td, { flex: 1, textAlign: 'center', color: colors.textSec }]}>{present}</Text>
              <Text style={[sr.td, { flex: 1, textAlign: 'center', color: colors.textSec }]}>{total}</Text>
              <Text style={[sr.td, { flex: 1, textAlign: 'center', color, fontWeight: '800' }]}>{pct}%</Text>
              <View style={{ flex: 1.2, alignItems: 'center' }}>
                <View style={[sr.statusBadge, { borderColor: color, backgroundColor: color + '22' }]}>
                  <Text style={[sr.statusText, { color }]}>{status}</Text>
                </View>
              </View>
            </View>
          );
        })}
        <View style={[sr.subtotalRow, { backgroundColor: colors.surfaceAlt, borderTopColor: colors.border }]}>
          <Text style={[sr.subtotalTd, { flex: 2, color: colors.textSec }]}>Overall {title.split(' ')[0]}</Text>
          <Text style={[sr.subtotalTd, { flex: 1 }]} />
          <Text style={[sr.subtotalTd, { flex: 1 }]} />
          <Text style={[sr.subtotalTd, { flex: 1, textAlign: 'center',
            color: getPctColor(title.includes('Lab') ? labOverall : lectureOverall) }]}>
            {title.includes('Lab') ? labOverall : lectureOverall}%
          </Text>
          <Text style={[sr.subtotalTd, { flex: 1.2 }]} />
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={s.topHeader}>
        <TouchableOpacity onPress={onBack} style={[s.headerIconBox, { backgroundColor: colors.surface, borderColor: colors.border }]} activeOpacity={0.7}>
          <Text style={[s.headerIconText, { color: '#00e676' }]}>←</Text>
        </TouchableOpacity>
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={[s.topHeaderTitle, { color: colors.textPrim }]} numberOfLines={1}>{student.name}</Text>
          <Text style={[s.topHeaderSub, { color: colors.textSec }]}>Roll: {student.rollNo} · {year.label} Div {division.id}</Text>
        </View>
      </View>
      <View style={s.greenDivider} />

      <View style={[drc.studentFilterBar, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[drc.toggleBtn, { backgroundColor: colors.surface, borderColor: colors.border }, (showDateFilter || isFiltered) && drc.toggleBtnActive]}
          onPress={() => setShowDateFilter(v => !v)}
          activeOpacity={0.8}>
          <Text style={drc.toggleIcon}>📅</Text>
          <Text style={[drc.toggleTxt, { color: colors.textSec }, (showDateFilter || isFiltered) && drc.toggleTxtActive]}>
            {isFiltered ? `${dateObjToStr(dateFrom)}  →  ${dateObjToStr(dateTo)}` : 'Filter by Period'}
          </Text>
          {isFiltered && (
            <TouchableOpacity onPress={() => { setDateFrom(null); setDateTo(null); setShowDateFilter(false); }} style={drc.inlineClear} activeOpacity={0.7}>
              <Text style={drc.inlineClearTxt}>✕</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[s.scrollContent, { paddingTop: 16, paddingBottom: 16 }]} showsVerticalScrollIndicator={false}>
        {showDateFilter && (
          <DateRangePicker
            activeFrom={dateFrom} activeTo={dateTo}
            onApply={(from, to) => { setDateFrom(from); setDateTo(to); setShowDateFilter(false); }}
            onClear={() => { setDateFrom(null); setDateTo(null); }}
          />
        )}
        {isFiltered && !showDateFilter && (
          <View style={drc.activeBadge}>
            <Text style={drc.activeBadgeIcon}>📅</Text>
            <Text style={drc.activeBadgeTxt}>
              Showing period: <Text style={drc.activeBadgeDate}>{dateObjToStr(dateFrom)}</Text> → <Text style={drc.activeBadgeDate}>{dateObjToStr(dateTo)}</Text>
            </Text>
          </View>
        )}

        {/* Student Info Card */}
        <View style={[sr.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[sr.avatarCircle, { backgroundColor: isDark ? '#003a20' : '#e6fff3', borderColor: '#00e676' }]}>
            <Text style={[sr.avatarText, { color: '#00e676' }]}>{student.name.charAt(0)}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={[sr.studentName, { color: colors.textPrim }]}>{student.name}</Text>
            <Text style={[sr.studentMeta, { color: colors.textSec }]}>Roll No: {student.rollNo}</Text>
            <Text style={[sr.studentMeta, { color: colors.textSec }]}>{year.label} · Division {division.id}</Text>
          </View>
        </View>

        {/* Grand Overall */}
        <View style={[sr.overallCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[sr.overallLabel, { color: colors.textSec }]}>Overall Attendance</Text>
          <Text style={[sr.overallValue, { color: getPctColor(grandOverall) }]}>{grandOverall}%</Text>
          <View style={[sr.overallBar, { backgroundColor: colors.border }]}>
            <View style={[sr.overallBarFill, { width: `${grandOverall}%`, backgroundColor: getPctColor(grandOverall) }]} />
          </View>
          <View style={sr.overallStats}>
            <View style={sr.overallStatItem}>
              <Text style={[sr.overallStatVal, { color: '#00e676' }]}>{lectureOverall}%</Text>
              <Text style={[sr.overallStatLbl, { color: colors.textSec }]}>Lectures</Text>
            </View>
            <View style={[sr.overallStatDivider, { backgroundColor: colors.border }]} />
            <View style={sr.overallStatItem}>
              <Text style={[sr.overallStatVal, { color: '#a78bfa' }]}>{labOverall}%</Text>
              <Text style={[sr.overallStatLbl, { color: colors.textSec }]}>Labs</Text>
            </View>
            <View style={[sr.overallStatDivider, { backgroundColor: colors.border }]} />
            <View style={sr.overallStatItem}>
              <Text style={[sr.overallStatVal, { color: '#00c8ff' }]}>{stAllSubs.length}</Text>
              <Text style={[sr.overallStatLbl, { color: colors.textSec }]}>Subjects</Text>
            </View>
          </View>
        </View>

        {renderSubjectTable(stLectureSubs, 'Lecture Attendance', '📖')}
        {renderSubjectTable(stLabSubs, 'Lab Attendance', '🔬')}

        {/* Legend */}
        <View style={[s.legend, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.legendTitle, { color: colors.textSec }]}>Legend</Text>
          <View style={s.legendRow}>
            <View style={[s.legendDot, { backgroundColor: '#00e676' }]} /><Text style={[s.legendText, { color: colors.textSec }]}>{'>90% Excellent'}</Text>
            <View style={[s.legendDot, { backgroundColor: '#69f0ae', marginLeft: 12 }]} /><Text style={[s.legendText, { color: colors.textSec }]}>75–90% Good</Text>
            <View style={[s.legendDot, { backgroundColor: '#ffb300', marginLeft: 12 }]} /><Text style={[s.legendText, { color: colors.textSec }]}>50–75% Average</Text>
            <View style={[s.legendDot, { backgroundColor: '#ff5252', marginLeft: 12 }]} /><Text style={[s.legendText, { color: colors.textSec }]}>{'<50% Bad'}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={[s.fixedFooter, { backgroundColor: colors.bg, borderTopColor: colors.border }]}>
        <TouchableOpacity style={s.printFooterBtn} onPress={() => setModalVisible(true)} activeOpacity={0.85}>
          <Text style={s.printFooterIcon}>📋</Text>
          <Text style={s.printFooterText}>View Report</Text>
        </TouchableOpacity>
      </View>

      <AttendanceTableModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={student.name}
        subtitle={isFiltered
          ? `Roll: ${student.rollNo}  ·  Period: ${dateObjToStr(dateFrom)} → ${dateObjToStr(dateTo)}`
          : `Roll: ${student.rollNo}  ·  ${year.label}  ·  Div ${division.id}`}
        attendanceData={effectiveAttendance}
        lectureOverall={lectureOverall}
        labOverall={labOverall}
        lectureSubs={stLectureSubs}
        labSubs={stLabSubs}
      />
    </SafeAreaView>
  );
}

// ─── Step 1: Year & Division ──────────────────────────────────────────────────
function SelectorScreen({ onContinue }) {
  const { colors, isDark } = useContext(ThemeContext);
  const [selectedYear, setSelectedYear]         = useState(null);
  const [selectedDivision, setSelectedDivision] = useState(null);
  const canContinue = selectedYear && selectedDivision;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View style={s.topHeader}>
        <View style={s.topHeaderLeft}>
          <View style={[s.headerIconBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[s.headerIconText, { color: '#00e676' }]}>☰</Text>
          </View>
          <View>
            <Text style={[s.topHeaderTitle, { color: colors.textPrim }]}>Attendance Report</Text>
            <Text style={[s.topHeaderSub, { color: colors.textSec }]}>Select year and division</Text>
          </View>
        </View>
        {canContinue && (
          <View style={s.selectedBadge}>
            <Text style={s.selectedBadgeText}>{selectedYear.id}yr · Div {selectedDivision.id}</Text>
          </View>
        )}
      </View>
      <View style={s.greenDivider} />

      <View style={s.selectorBody}>
        <View style={s.sectionHeader}>
          <View style={s.stepBadge}><Text style={s.stepNum}>1</Text></View>
          <Text style={[s.sectionTitle, { color: colors.textPrim }]}>Choose Academic Year</Text>
        </View>
        <View style={s.yearsGrid}>
          {YEARS.map((year) => {
            const isSel = selectedYear?.id === year.id;
            return (
              <TouchableOpacity key={year.id}
                style={[s.yearCard, { backgroundColor: colors.surface, borderColor: colors.border }, isSel && s.yearCardSel]}
                onPress={() => setSelectedYear(year)} activeOpacity={0.8}>
                <Text style={s.yearCardIcon}>{year.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.yearCardLabel, { color: colors.textSec }, isSel && s.yearCardLabelSel]}>{year.label}</Text>
                  <Text style={[s.yearCardStudents, { color: colors.textMuted }]}>{year.students}</Text>
                </View>
                {isSel && <View style={s.yearCardCheck}><Text style={s.yearCardCheckTxt}>✓</Text></View>}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={[s.sectionHeader, { marginTop: 16 }]}>
          <View style={s.stepBadge}><Text style={s.stepNum}>2</Text></View>
          <Text style={[s.sectionTitle, { color: colors.textPrim }]}>Choose Division</Text>
        </View>
        <View style={s.divisionsRow}>
          {DIVISIONS.map((div) => {
            const isSel = selectedDivision?.id === div.id;
            return (
              <TouchableOpacity key={div.id}
                style={[s.divCard, { backgroundColor: colors.surface, borderColor: colors.border }, isSel && s.divCardSel]}
                onPress={() => setSelectedDivision(div)} activeOpacity={0.8}>
                {isSel && <View style={s.divCheckBadge}><Text style={s.divCheckText}>✓</Text></View>}
                <View style={[s.divCircle, { backgroundColor: colors.surfaceAlt }, isSel && s.divCircleSel]}>
                  <Text style={[s.divLetter, { color: colors.textMuted }, isSel && s.divLetterSel]}>{div.id}</Text>
                </View>
                <Text style={[s.divLabel, { color: colors.textSec }, isSel && s.divLabelSel]}>Division</Text>
                <Text style={[s.divStudents, { color: colors.textMuted }]}>{div.students}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {canContinue && (
          <View style={s.selectedClassBox}>
            <Text style={s.selectedClassLabel}>SELECTED CLASS</Text>
            <Text style={s.selectedClassValue}>{selectedYear.label} · Division {selectedDivision.id}</Text>
          </View>
        )}
      </View>

      <View style={[s.footer, { backgroundColor: colors.bg, borderTopColor: colors.border }]}>
        <TouchableOpacity style={[s.viewBtn, { backgroundColor: colors.surface, borderColor: colors.border }, canContinue && s.viewBtnActive]}
          onPress={() => canContinue && onContinue(selectedYear, selectedDivision)}
          disabled={!canContinue} activeOpacity={0.85}>
          <Text style={[s.viewBtnText, { color: colors.textMuted }, canContinue && s.viewBtnTextActive]}>
            {canContinue
              ? 'View Report · ' + selectedYear.label + ' Div ' + selectedDivision.id + '  →'
              : 'Select Year & Division to Continue'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Class Report Screen ─────────────────────────────────────────────────────
function ClassReportScreen({ year, division, onBack, onStudentSelect }) {
  const { colors, isDark } = useContext(ThemeContext);

  // ── API fetch state ────────────────────────────────────────────────────────
  const [isLoading, setIsLoading]   = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [allData, setAllData]       = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const yearRaw = year.id || year.short || year;
        const yearNum = typeof yearRaw === 'number'
          ? yearRaw
          : parseInt(String(yearRaw).replace(/\D/g, '')) || { '1st': 1, '2nd': 2, '3rd': 3, '4th': 4 }[yearRaw] || yearRaw;
        const divisionId = typeof division === 'string' ? division : (division.id || division);

        // Fetch students and class attendance summary in parallel
        const [studentsRes, summaryRes] = await Promise.all([
          axiosInstance.get('/students/by-class', {
            params: { year: yearNum, division: divisionId }
          }),
          axiosInstance.get('/attendance/class/summary', {
            params: { year: yearNum, division: divisionId }
          }),
        ]);

        const students = studentsRes.data;
        const summaryData = summaryRes.data;
        const classSummary = summaryData.summary || [];

        if (!Array.isArray(students) || students.length === 0) {
          setAllData([]);
        } else {
          setAllData(generateAttendanceDataFromStudents(students, classSummary));
        }
      } catch (err) {
        setFetchError(err.message);
        setAllData([]);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [year.id, year.short, division]);
  // ──────────────────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery]       = useState('');
  const [modalVisible, setModalVisible]     = useState(false);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [dateFrom, setDateFrom]             = useState(null);
  const [dateTo,   setDateTo]               = useState(null);

  const isFiltered = !!(dateFrom && dateTo);

  // Apply date-range scaling first, then search filter
  const displayData = useMemo(() => {
    if (!isFiltered) return allData;
    return allData.map(st => ({
      ...st,
      attendance: scaleAttendanceByRange(st.attendance, dateFrom, dateTo),
    }));
  }, [allData, dateFrom, dateTo, isFiltered]);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return displayData;
    return displayData.filter(st =>
      st.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.rollNo.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [displayData, searchQuery]);

  // Derive dynamic subjects from the fetched/generated data
  const dynLectureSubs = allData.length > 0 && allData[0].subjects ? allData[0].subjects : LECTURE_SUBJECTS;
  const dynLabSubs = allData.length > 0 && allData[0].labs ? allData[0].labs : LAB_SUBJECTS;
  const dynAllSubs = allData.length > 0 && allData[0].allSubjects ? allData[0].allSubjects : ALL_SUBJECTS;

  const avgAttendance = displayData.length === 0 ? 0 : Math.round(
    displayData.reduce((a, st) => {
      const subs = st.allSubjects || dynAllSubs;
      const active = subs.filter(sub => (st.attendance[sub]?.total || 0) > 0);
      if (active.length === 0) return a;
      return a + active.reduce((b, sub) => b + (st.attendance[sub]?.pct || 0), 0) / active.length;
    }, 0) / displayData.length
  );

  // Build class-level subject averages for the modal
  const classAvg = useMemo(() =>
    dynAllSubs.reduce((acc, sub) => {
      const totalPresent = displayData.reduce((s, st) => s + (st.attendance[sub]?.present || 0), 0);
      const totalClasses = displayData.reduce((s, st) => s + (st.attendance[sub]?.total || 0),   0);
      const pct = totalClasses > 0 ? Math.round((totalPresent / totalClasses) * 100) : 0;
      acc[sub] = { present: totalPresent, total: totalClasses, pct };
      return acc;
    }, {}),
  [displayData, dynAllSubs]);

  const classLectureOverall = (() => {
    const active = dynLectureSubs.filter(sub => (classAvg[sub]?.total || 0) > 0);
    return active.length === 0 ? 0 : Math.round(active.reduce((a, sub) => a + (classAvg[sub]?.pct || 0), 0) / active.length);
  })();
  const classLabOverall = (() => {
    const active = dynLabSubs.filter(sub => (classAvg[sub]?.total || 0) > 0);
    return active.length === 0 ? 0 : Math.round(active.reduce((a, sub) => a + (classAvg[sub]?.pct || 0), 0) / active.length);
  })();

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View style={s.topHeader}>
        <TouchableOpacity onPress={onBack} style={[s.headerIconBox, { backgroundColor: colors.surface, borderColor: colors.border }]} activeOpacity={0.7}>
          <Text style={[s.headerIconText, { color: '#00e676' }]}>←</Text>
        </TouchableOpacity>
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={[s.topHeaderTitle, { color: colors.textPrim }]}>{year.label} · Division {typeof division === 'string' ? division : division.id}</Text>
          <Text style={[s.topHeaderSub, { color: colors.textSec }]}>
            {isLoading ? 'Fetching students…' : fetchError ? 'Attendance Report (fallback data)' : 'Attendance Report'}
          </Text>
        </View>
        {isLoading && <Text style={{ color: '#00e676', fontSize: 12 }}>⏳</Text>}
        {fetchError && !isLoading && (
          <TouchableOpacity
            onPress={() => {
              /* retry — just re-trigger the effect by changing a dep isn't easy here,
                 so we show a toast-style note; the fallback data is already loaded */
            }}
            style={{ backgroundColor: '#ff525222', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#ff5252' }}
          >
            <Text style={{ color: '#ff5252', fontSize: 10, fontWeight: '700' }}>⚠ Offline</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={s.greenDivider} />

      {/* Sticky Search Bar */}
      <View style={[sl.stickySearch, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
        <View style={[sl.searchWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={sl.searchIcon}>🔍</Text>
          <TextInput
            style={[sl.searchInput, { color: colors.textPrim }]}
            placeholder="Search by name or roll no..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={sl.clearBtn} activeOpacity={0.7}>
              <Text style={[sl.clearTxt, { color: colors.textMuted }]}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        {searchQuery.trim().length > 0 && (
          <Text style={[sl.searchResultCount, { color: colors.textSec }]}>
            {filteredData.length} result{filteredData.length !== 1 ? 's' : ''} for "{searchQuery.trim()}"
          </Text>
        )}

        <View style={drc.filterRow}>
          <TouchableOpacity
            style={[drc.toggleBtn, { backgroundColor: colors.surface, borderColor: colors.border }, (showDateFilter || isFiltered) && drc.toggleBtnActive]}
            onPress={() => setShowDateFilter(v => !v)}
            activeOpacity={0.8}>
            <Text style={drc.toggleIcon}>📅</Text>
            <Text style={[drc.toggleTxt, { color: colors.textSec }, (showDateFilter || isFiltered) && drc.toggleTxtActive]}>
              {isFiltered
                ? `${dateObjToStr(dateFrom)}  →  ${dateObjToStr(dateTo)}`
                : 'Filter by Period'}
            </Text>
            {isFiltered && (
              <TouchableOpacity onPress={() => { setDateFrom(null); setDateTo(null); setShowDateFilter(false); }} style={drc.inlineClear} activeOpacity={0.7}>
                <Text style={drc.inlineClearTxt}>✕</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {showDateFilter && (
          <DateRangePicker
            activeFrom={dateFrom}
            activeTo={dateTo}
            onApply={(from, to) => { setDateFrom(from); setDateTo(to); setShowDateFilter(false); }}
            onClear={() => { setDateFrom(null); setDateTo(null); }}
          />
        )}

        {isFiltered && !showDateFilter && (
          <View style={drc.activeBadge}>
            <Text style={drc.activeBadgeIcon}>📅</Text>
            <Text style={drc.activeBadgeTxt}>
              Showing period: <Text style={drc.activeBadgeDate}>{dateObjToStr(dateFrom)}</Text> → <Text style={drc.activeBadgeDate}>{dateObjToStr(dateTo)}</Text>
            </Text>
          </View>
        )}

        {/* Summary chips */}
        <View style={s.summaryRow}>
          <View style={[s.summaryChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[s.summaryVal, { color: '#00c8ff' }]}>{allData.length}</Text>
            <Text style={[s.summaryLbl, { color: colors.textSec }]}>Students</Text>
          </View>
          <View style={[s.summaryChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[s.summaryVal, { color: '#a78bfa' }]}>{dynAllSubs.length}</Text>
            <Text style={[s.summaryLbl, { color: colors.textSec }]}>Subjects</Text>
          </View>
          <View style={[s.summaryChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[s.summaryVal, { color: getPctColor(avgAttendance) }]}>{avgAttendance}%</Text>
            <Text style={[s.summaryLbl, { color: colors.textSec }]}>Avg</Text>
          </View>
        </View>

        <View style={[sl.hintBox, { backgroundColor: isDark ? '#001a0d' : '#e6fff3', borderColor: isDark ? '#003a20' : '#a3e9c0' }]}>
          <Text style={[sl.hintText, { color: isDark ? '#00b050' : '#1a7a40' }]}>💡 Tap a student name to view their individual report</Text>
        </View>

        {/* Student list */}
        {isLoading ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Text style={{ color: '#00e676', fontSize: 32 }}>⏳</Text>
            <Text style={{ color: colors.textSec, fontSize: 14, marginTop: 10 }}>Loading students from server…</Text>
          </View>
        ) : filteredData.length === 0 ? (
          <View style={sl.noResults}>
            <Text style={sl.noResultsIcon}>🔍</Text>
            <Text style={[sl.noResultsText, { color: colors.textSec }]}>No students found for "{searchQuery}"</Text>
          </View>
        ) : (
          filteredData.map((student, idx) => {
            const stSubs = student.allSubjects || dynAllSubs;
            const stLec = student.subjects || dynLectureSubs;
            const stLab = student.labs || dynLabSubs;
            const overall = Math.round(
              stSubs.reduce((a, sub) => a + (student.attendance[sub]?.pct || 0), 0) / stSubs.length
            );
            const lectureAvg = Math.round(
              stLec.reduce((a, sub) => a + (student.attendance[sub]?.pct || 0), 0) / stLec.length
            );
            const labAvg = Math.round(
              stLab.reduce((a, sub) => a + (student.attendance[sub]?.pct || 0), 0) / stLab.length
            );
            const color = getPctColor(overall);
            return (
              <TouchableOpacity
                key={student.id}
                style={[
                  sl.studentCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  idx % 2 === 0 && { backgroundColor: colors.surfaceAlt },
                ]}
                onPress={() => onStudentSelect(student)}
                activeOpacity={0.75}>
                <View style={[sl.avatarSmall, { backgroundColor: isDark ? '#003a20' : '#e6fff3', borderColor: '#00e676' }]}>
                  <Text style={[sl.avatarSmallText, { color: '#00e676' }]}>{student.name.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <HighlightText text={student.name} query={searchQuery}
                    style={[sl.studentCardName, { color: colors.textPrim }]}
                    highlightStyle={sl.highlightMatch}
                  />
                  <HighlightText text={student.rollNo} query={searchQuery}
                    style={[sl.studentCardRoll, { color: colors.textSec }]}
                    highlightStyle={sl.highlightMatchRoll}
                  />
                  <View style={sl.miniStats}>
                    <View style={sl.miniStat}>
                      <Text style={[sl.miniStatVal, { color: '#00e676' }]}>{lectureAvg}%</Text>
                      <Text style={[sl.miniStatLbl, { color: colors.textMuted }]}>Lec</Text>
                    </View>
                    <View style={sl.miniStat}>
                      <Text style={[sl.miniStatVal, { color: '#a78bfa' }]}>{labAvg}%</Text>
                      <Text style={[sl.miniStatLbl, { color: colors.textMuted }]}>Lab</Text>
                    </View>
                  </View>
                </View>
                <View style={sl.cardRight}>
                  <View style={[sl.overallBadge, { borderColor: color, backgroundColor: color + '22' }]}>
                    <Text style={[sl.overallText, { color }]}>{overall}%</Text>
                  </View>
                  <Text style={[sl.cardArrow, { color: colors.textMuted }]}>›</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* Legend */}
        <View style={[s.legend, { marginTop: 8, backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.legendTitle, { color: colors.textSec }]}>Legend</Text>
          <View style={s.legendRow}>
            <View style={[s.legendDot, { backgroundColor: '#00e676' }]} /><Text style={[s.legendText, { color: colors.textSec }]}>{'>90% Excellent'}</Text>
            <View style={[s.legendDot, { backgroundColor: '#69f0ae', marginLeft: 12 }]} /><Text style={[s.legendText, { color: colors.textSec }]}>75–90% Good</Text>
            <View style={[s.legendDot, { backgroundColor: '#ffb300', marginLeft: 12 }]} /><Text style={[s.legendText, { color: colors.textSec }]}>50–75% Average</Text>
            <View style={[s.legendDot, { backgroundColor: '#ff5252', marginLeft: 12 }]} /><Text style={[s.legendText, { color: colors.textSec }]}>{'<50% Bad'}</Text>
          </View>
        </View>

        <View style={{ height: 16 }} />
      </ScrollView>

      <View style={[s.fixedFooter, { backgroundColor: colors.bg, borderTopColor: colors.border }]}>
        <TouchableOpacity style={s.printFooterBtn} onPress={() => setModalVisible(true)} activeOpacity={0.85}>
          <Text style={s.printFooterIcon}>📋</Text>
          <Text style={s.printFooterText}>View Report</Text>
        </TouchableOpacity>
      </View>

      <ClassReportModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={`${year.label} · Division ${typeof division === 'string' ? division : division.id}`}
        subtitle={isFiltered
          ? `Period: ${dateObjToStr(dateFrom)} → ${dateObjToStr(dateTo)}  ·  ${allData.length} Students`
          : `Class Attendance Summary  ·  ${allData.length} Students`}
        students={displayData}
        dateLabel={isFiltered ? `${dateObjToStr(dateFrom)} → ${dateObjToStr(dateTo)}` : null}
        lectureSubs={dynLectureSubs}
        labSubs={dynLabSubs}
        allSubs={dynAllSubs}
      />
    </SafeAreaView>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function AttendanceReportFlow({ year: propYear, division: propDivision, onBack }) {
  // If year+division are passed in from Report.js, jump straight to the report screen.
  // Normalise shapes so ClassReportScreen always receives { id, label, ... } and { id }.
  const initYear     = propYear     ? { id: propYear.id ?? propYear.short, label: propYear.label, icon: propYear.icon ?? '' } : null;
  const initDivision = propDivision ? (typeof propDivision === 'string' ? { id: propDivision, students: '~1,050' } : propDivision) : null;
  const startScreen  = initYear && initDivision ? 'report' : 'selector';

  const [screen, setScreen]                     = useState(startScreen);
  const [selectedYear, setSelectedYear]         = useState(initYear);
  const [selectedDivision, setSelectedDivision] = useState(initDivision);
  const [selectedStudent, setSelectedStudent]   = useState(null);

  if (screen === 'studentreport' && selectedStudent) {
    return (
      <StudentReportScreen
        student={selectedStudent}
        year={selectedYear}
        division={selectedDivision}
        onBack={() => setScreen('report')}
      />
    );
  }

  if (screen === 'report') {
    return (
      <ClassReportScreen
        year={selectedYear}
        division={selectedDivision}
        onBack={() => {
          if (onBack) {
            // came from Report.js — go back to year/div picker
            onBack();
          } else {
            setScreen('selector');
          }
        }}
        onStudentSelect={(student) => {
          setSelectedStudent(student);
          setScreen('studentreport');
        }}
      />
    );
  }

  return (
    <SelectorScreen
      onContinue={(year, division) => {
        setSelectedYear(year);
        setSelectedDivision(division);
        setScreen('report');
      }}
    />
  );
}

// ─── Mini Calendar Styles ─────────────────────────────────────────────────────
const mc = StyleSheet.create({
  box: {
    backgroundColor: '#091624',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e3a55',
    padding: 6,
    marginTop: 4,
    width: 180,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 10,
  },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  navBtn:     { width: 20, height: 20, borderRadius: 4, backgroundColor: '#0f2540', alignItems: 'center', justifyContent: 'center' },
  navTxt:     { color: '#00e676', fontSize: 14, fontWeight: '700', lineHeight: 18 },
  monthTxt:   { color: '#ffffff', fontSize: 9, fontWeight: '700' },
  dayRow:     { flexDirection: 'row', marginBottom: 1 },
  dayHdr:     { flex: 1, textAlign: 'center', color: '#3a5a70', fontSize: 7, fontWeight: '700' },
  grid:       { flexDirection: 'row', flexWrap: 'wrap' },
  cell:       { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 3 },
  cellSel:    { backgroundColor: '#00e676' },
  cellToday:  { borderWidth: 1, borderColor: '#00e676' },
  cellTxt:    { color: '#b0cce0', fontSize: 9 },
  cellTxtSel: { color: '#060d1a', fontWeight: '800', fontSize: 9 },
  cellTxtToday: { color: '#00e676', fontWeight: '700', fontSize: 9 },
  closeBtn:   { marginTop: 4, alignItems: 'center', paddingVertical: 3, borderTopWidth: 1, borderTopColor: '#1a2f4a' },
  closeTxt:   { color: '#4a6a85', fontSize: 9 },
});

// ─── Date Picker Styles ───────────────────────────────────────────────────────
const dp = StyleSheet.create({
  row:          { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  halfField:    { flex: 1 },
  label:        { color: '#8da8c2', fontSize: 12, fontWeight: '600', marginBottom: 6 },
  inputWrap:    {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0d1f35', borderRadius: 10,
    borderWidth: 1, borderColor: '#1a2f4a',
    overflow: 'hidden', height: 52,
  },
  inputWrapValid: { borderColor: '#00e676' },
  textInput:    { flex: 1, color: '#ffffff', fontSize: 14, fontWeight: '600', paddingHorizontal: 10, letterSpacing: 1 },
  calBtn:       { paddingHorizontal: 11, height: 52, backgroundColor: '#0f2540', borderLeftWidth: 1, borderLeftColor: '#1a2f4a', alignItems: 'center', justifyContent: 'center' },
  calBtnOpen:   { backgroundColor: '#003a20', borderLeftColor: '#00e676' },
  calBtnTxt:    { fontSize: 16 },
  validTick:    { color: '#00e676', fontSize: 11, marginTop: 4 },
  arrowCol:     { paddingTop: 30, paddingHorizontal: 6, alignItems: 'center' },
  arrowTxt:     { color: '#00e676', fontSize: 16, fontWeight: '700' },
  previewStrip: {
    backgroundColor: '#001a0d', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: '#00e676', marginTop: 14,
  },
  previewTxt:   { color: '#8da8c2', fontSize: 12, textAlign: 'center' },
  previewDate:  { color: '#00e676', fontWeight: '700' },
});

// ─── Student List Styles ──────────────────────────────────────────────────────
const sl = StyleSheet.create({
  stickySearch: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
    backgroundColor: '#060d1a',
    borderBottomWidth: 1,
    borderBottomColor: '#0f2030',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d1f35',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1a3a55',
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon:    { fontSize: 16, marginRight: 8 },
  searchInput:   { flex: 1, color: '#ffffff', fontSize: 14 },
  clearBtn:      { padding: 4 },
  clearTxt:      { color: '#4a6a85', fontSize: 14, fontWeight: '700' },
  searchResultCount: { color: '#4a6a85', fontSize: 12, marginTop: 4, marginLeft: 2, marginBottom: 2 },
  highlightMatch:    { backgroundColor: '#00e67633', color: '#00e676', fontWeight: '800', borderRadius: 2 },
  highlightMatchRoll:{ backgroundColor: '#00c8ff22', color: '#00c8ff', fontWeight: '700', borderRadius: 2 },
  hintBox: {
    backgroundColor: '#001a0d',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#003a20',
  },
  hintText:      { color: '#00b050', fontSize: 12 },
  noResults:     { alignItems: 'center', paddingVertical: 40 },
  noResultsIcon: { fontSize: 36, marginBottom: 8 },
  noResultsText: { color: '#4a6a85', fontSize: 14 },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#0f2030',
    backgroundColor: '#080f1a',
  },
  studentCardAlt: { backgroundColor: '#0a1520' },
  avatarSmall: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#003a20',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#00e676',
  },
  avatarSmallText: { color: '#00e676', fontSize: 16, fontWeight: '800' },
  studentCardName: { color: '#ddeeff', fontSize: 14, fontWeight: '700' },
  studentCardRoll: { color: '#4a6a85', fontSize: 11, marginTop: 2 },
  miniStats:       { flexDirection: 'row', marginTop: 4, gap: 8 },
  miniStat:        { flexDirection: 'row', alignItems: 'center', gap: 3 },
  miniStatVal:     { fontSize: 11, fontWeight: '700' },
  miniStatLbl:     { color: '#4a6a85', fontSize: 10 },
  cardRight:       { alignItems: 'center', gap: 4 },
  overallBadge:    { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1 },
  overallText:     { fontSize: 13, fontWeight: '800' },
  cardArrow:       { color: '#4a6a85', fontSize: 20, fontWeight: '300' },
});

// ─── Student Report Screen Styles ─────────────────────────────────────────────
const sr = StyleSheet.create({
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d1f35',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1a3a55',
  },
  avatarCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#003a20',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#00e676',
  },
  avatarText:   { color: '#00e676', fontSize: 24, fontWeight: '800' },
  studentName:  { color: '#ffffff', fontSize: 17, fontWeight: '700' },
  studentMeta:  { color: '#4a6a85', fontSize: 12, marginTop: 2 },
  periodText:   { color: '#00e676', fontSize: 11, marginTop: 4, fontWeight: '600' },

  overallCard: {
    backgroundColor: '#090f1c',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1a2f4a',
    alignItems: 'center',
  },
  overallLabel: { color: '#8da8c2', fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  overallValue: { fontSize: 40, fontWeight: '900', marginBottom: 10 },
  overallBar:   { width: '100%', height: 8, backgroundColor: '#0d1f35', borderRadius: 4, overflow: 'hidden', marginBottom: 16 },
  overallBarFill: { height: '100%', borderRadius: 4 },
  overallStats: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  overallStatItem: { flex: 1, alignItems: 'center' },
  overallStatVal: { fontSize: 18, fontWeight: '800' },
  overallStatLbl: { color: '#4a6a85', fontSize: 11, marginTop: 2 },
  overallStatDivider: { width: 1, height: 36, backgroundColor: '#1a2f4a' },

  tableSection: { marginBottom: 20 },
  tableTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  tableTitleIcon: { fontSize: 18 },
  tableTitle:   { color: '#ffffff', fontSize: 15, fontWeight: '700' },

  table: {
    backgroundColor: '#090f1c',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1a2f4a',
  },
  tableHead: {
    flexDirection: 'row',
    backgroundColor: '#0a1e33',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#00e676',
  },
  th: { color: '#00e676', fontSize: 11, fontWeight: '700' },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#0d1f35',
  },
  tableRowAlt: { backgroundColor: '#080f1a' },
  td: { fontSize: 13 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, borderWidth: 1 },
  statusText:  { fontSize: 10, fontWeight: '700' },
  subtotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#0f1e30',
    borderTopWidth: 1,
    borderTopColor: '#1a3a55',
  },
  subtotalTd: { color: '#8da8c2', fontSize: 12, fontWeight: '700' },
});

// ─── Main App Styles ──────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#060d1a' },
  scrollContent:  { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },
  greenDivider:   { height: 2, backgroundColor: '#00e676', marginBottom: 4 },

  topHeader:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  topHeaderLeft:  { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  topHeaderTitle: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  topHeaderSub:   { color: '#4a6a85', fontSize: 12, marginTop: 2 },
  headerIconBox:  { width: 36, height: 36, borderRadius: 10, backgroundColor: '#0d1f35', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#1a2f4a' },
  headerIconText: { color: '#00e676', fontSize: 16, fontWeight: '700' },
  selectedBadge:  { backgroundColor: '#003a20', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#00e676' },
  selectedBadgeText: { color: '#00e676', fontSize: 11, fontWeight: '700' },

  selectorBody: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
    justifyContent: 'flex-start',
  },

  sectionHeader:  { flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 4 },
  stepBadge:      { width: 24, height: 24, borderRadius: 12, backgroundColor: '#00e676', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  stepNum:        { color: '#060d1a', fontWeight: '800', fontSize: 12 },
  sectionTitle:   { color: '#ffffff', fontSize: 15, fontWeight: '600' },

  yearsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  yearCard: {
    width: '48%',
    backgroundColor: '#0d1f35',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1a2f4a',
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    position: 'relative',
  },
  yearCardSel:      { borderColor: '#00e676', backgroundColor: '#001a0d' },
  yearCardIcon:     { fontSize: 22 },
  yearCardLabel:    { color: '#8da8c2', fontSize: 14, fontWeight: '600' },
  yearCardLabelSel: { color: '#00e676' },
  yearCardStudents: { color: '#4a6a85', fontSize: 10, marginTop: 1 },
  yearCardCheck:    { position: 'absolute', top: 6, right: 8, width: 18, height: 18, borderRadius: 9, backgroundColor: '#00e676', alignItems: 'center', justifyContent: 'center' },
  yearCardCheckTxt: { color: '#060d1a', fontSize: 10, fontWeight: '900' },

  divisionsRow:   { flexDirection: 'row', gap: 10, marginBottom: 12 },
  divCard:        { flex: 1, backgroundColor: '#0d1f35', borderRadius: 14, alignItems: 'center', paddingVertical: 16, borderWidth: 1, borderColor: '#1a2f4a', position: 'relative' },
  divCardSel:     { borderColor: '#00e676', backgroundColor: '#001a0d' },
  divCheckBadge:  { position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 10, backgroundColor: '#00e676', alignItems: 'center', justifyContent: 'center' },
  divCheckText:   { color: '#060d1a', fontSize: 10, fontWeight: '900' },
  divCircle:      { width: 48, height: 48, borderRadius: 24, backgroundColor: '#132840', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  divCircleSel:   { backgroundColor: '#004020' },
  divLetter:      { fontSize: 20, fontWeight: '700', color: '#3a6080' },
  divLetterSel:   { color: '#00e676' },
  divLabel:       { color: '#5a7a95', fontSize: 12, fontWeight: '500', marginBottom: 2 },
  divLabelSel:    { color: '#00e676' },
  divStudents:    { color: '#3a5a70', fontSize: 10 },

  selectedClassBox:   { backgroundColor: '#001a0d', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#00e676', borderStyle: 'dashed' },
  selectedClassLabel: { color: '#00e676', fontSize: 9, fontWeight: '700', letterSpacing: 1, marginBottom: 3 },
  selectedClassValue: { color: '#00e676', fontSize: 16, fontWeight: '700' },

  footer:           { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#0f2030', backgroundColor: '#060d1a' },
  viewBtn:          { backgroundColor: '#0d1f35', borderRadius: 12, paddingVertical: 15, alignItems: 'center', borderWidth: 1, borderColor: '#1a2f4a' },
  viewBtnActive:    { backgroundColor: '#00e676', borderColor: '#00e676' },
  viewBtnText:      { color: '#3a6080', fontSize: 14, fontWeight: '600' },
  viewBtnTextActive:{ color: '#060d1a', fontWeight: '800' },

  classBanner:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#001a0d', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, borderWidth: 1, borderColor: '#00e676', marginBottom: 18, gap: 10 },
  classBannerIcon:  { fontSize: 22 },
  classBannerText:  { color: '#00e676', fontSize: 16, fontWeight: '700' },
  dateRangeHeading: { color: '#ffffff', fontSize: 17, fontWeight: '700', marginBottom: 4, textAlign: 'center' },
  dateRangeSub:     { color: '#4a6a85', fontSize: 12, marginBottom: 16, textAlign: 'center' },

  fixedFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#0f2030',
    backgroundColor: '#060d1a',
  },

  summaryRow:       { flexDirection: 'row', gap: 10, marginBottom: 8 },
  summaryChip:      { flex: 1, backgroundColor: '#0d1f35', borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#1a2f4a' },
  summaryVal:       { fontSize: 20, fontWeight: '800' },
  summaryLbl:       { color: '#4a6a85', fontSize: 11, marginTop: 2 },

  legend:           { marginVertical: 16, backgroundColor: '#0d1f35', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#1a2f4a' },
  legendTitle:      { color: '#8da8c2', fontSize: 12, fontWeight: '700', marginBottom: 8 },
  legendRow:        { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  legendDot:        { width: 10, height: 10, borderRadius: 5 },
  legendText:       { color: '#8da8c2', fontSize: 12, marginLeft: 6 },

  printFooterBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#00e676', borderRadius: 12, paddingVertical: 15, gap: 10 },
  printFooterIcon:  { fontSize: 20 },
  printFooterText:  { color: '#060d1a', fontSize: 15, fontWeight: '800' },
});

// ─── Class Report Modal Styles (Spreadsheet Table) ───────────────────────────
const crm = StyleSheet.create({
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  sheet:        { backgroundColor: '#060d1a', borderTopLeftRadius: 22, borderTopRightRadius: 22,
                  borderWidth: 1, borderBottomWidth: 0, borderColor: '#1a3a55', maxHeight: '95%', flex: 1, marginTop: 40 },
  header:       { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 10, gap: 10 },
  headerTitle:  { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  headerSub:    { color: '#4a6a85', fontSize: 12, marginTop: 3 },
  closeBtn:     { width: 32, height: 32, borderRadius: 16, backgroundColor: '#0d1f35', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#1a3a55' },
  closeTxt:     { color: '#8da8c2', fontSize: 14, fontWeight: '700' },
  greenDivider: { height: 2, backgroundColor: '#00e676' },

  legendBar:    { flexDirection: 'row', gap: 14, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#0a1422', borderBottomWidth: 1, borderBottomColor: '#1a2f4a' },
  legendItem:   { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:    { width: 9, height: 9, borderRadius: 5 },
  legendTxt:    { color: '#8da8c2', fontSize: 11 },

  tableScroll:  { paddingVertical: 6 },

  // Header rows
  hRow:         { flexDirection: 'row' },
  hCell:        { alignItems: 'center', justifyContent: 'center', paddingVertical: 7, paddingHorizontal: 4,
                  borderRightWidth: 1, borderRightColor: '#1a3a55', borderBottomWidth: 1, borderBottomColor: '#1a3a55' },
  hCellDark:    { backgroundColor: '#0a2540' },
  hCellDark2:   { backgroundColor: '#091c30' },
  hCellLec:     { backgroundColor: '#0d2d50' },
  hCellLab:     { backgroundColor: '#1a1a40' },
  hCellOverall: { backgroundColor: '#003820' },
  hCellOverall2:{ backgroundColor: '#002810' },
  hTxt:         { color: '#8da8c2', fontSize: 10, fontWeight: '700', textAlign: 'center' },
  hSubTxt:      { color: '#5a7a95', fontSize: 9, fontWeight: '600', textAlign: 'center' },
  subjectGroupTxt: { color: '#5ce6ff', fontSize: 10, fontWeight: '700', textAlign: 'center' },

  borderRight2: { borderRightWidth: 2, borderRightColor: '#2d5a8a' },
  borderLeft2:  { borderLeftWidth: 2, borderLeftColor: '#006040' },

  // Fixed column widths
  fixedNo:          { width: 36 },
  fixedName:        { width: 130 },
  fixedRoll:        { width: 72 },
  subCol:           { width: 40 },
  subjectGroupCell: { width: 120 },  // 3 × 40
  overallGroupCell: { width: 90 },   // 2 × 45
  overallSubCol:    { width: 52 },

  // Data rows
  dRow:         { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#0f2030' },
  dRowAlt:      { backgroundColor: '#080f1a' },
  dCell:        { alignItems: 'center', justifyContent: 'center', paddingVertical: 9, paddingHorizontal: 3,
                  backgroundColor: '#060d1a', borderRightWidth: 1, borderRightColor: '#0f2030' },
  dCellAlt:     { backgroundColor: '#080f1a' },
  dCellOverall: { backgroundColor: '#041510' },
  dNo:          { color: '#4a6a85', fontSize: 11, textAlign: 'center' },
  dName:        { color: '#ddeeff', fontSize: 12, fontWeight: '700', textAlign: 'left', width: 122 },
  dRoll:        { color: '#7a9ab5', fontSize: 10, textAlign: 'center' },
  dVal:         { color: '#8da8c2', fontSize: 11, textAlign: 'center' },
  dPct:         { fontSize: 12, fontWeight: '800', textAlign: 'center' },

  footer:   { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#0f2030', backgroundColor: '#060d1a' },
  printBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#00e676', borderRadius: 12, paddingVertical: 14, gap: 10 },
  printBtnDisabled: { backgroundColor: '#1a4a30', opacity: 0.7 },
  printIcon: { fontSize: 19 },
  printTxt:  { color: '#060d1a', fontSize: 15, fontWeight: '800' },
});

// ─── Attendance Table Modal Styles ────────────────────────────────────────────
const atm = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: '#e0e8f0',
    maxHeight: '88%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
    gap: 10,
  },
  headerTitle: { color: '#0a1e33', fontSize: 16, fontWeight: '800' },
  headerSub:   { color: '#6b8aaa', fontSize: 12, marginTop: 3 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#f0f4f8',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#dce6f0',
  },
  closeTxt:    { color: '#4a6a85', fontSize: 14, fontWeight: '700' },
  greenDivider:{ height: 2, backgroundColor: '#00c853' },
  body:        { paddingHorizontal: 14, paddingTop: 16, paddingBottom: 10 },

  section:        { marginBottom: 22 },
  sectionTitleRow:{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  sectionIcon:    { fontSize: 17 },
  sectionTitle:   { color: '#0a1e33', fontSize: 14, fontWeight: '700' },

  table: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#dce6f0',
  },
  thead: {
    flexDirection: 'row',
    backgroundColor: '#0a3d62',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#00c853',
  },
  th:  { color: '#00e676', fontSize: 10, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eaf0f6',
  },
  rowAlt:     { backgroundColor: '#f8fafb' },
  td:         { fontSize: 12 },
  badge:      { borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2, borderWidth: 1 },
  badgeTxt:   { fontSize: 9, fontWeight: '700' },
  subtotalRow:{
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    backgroundColor: '#e8f5fe',
    borderTopWidth: 1,
    borderTopColor: '#c8dff0',
  },
  subtotalTd: { color: '#3a6080', fontSize: 11, fontWeight: '700' },

  legend:     { backgroundColor: '#f4f8fc', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#dce6f0', marginBottom: 8 },
  legendTitle:{ color: '#4a6a85', fontSize: 11, fontWeight: '700', marginBottom: 7 },
  legendRow:  { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  legendDot:  { width: 9, height: 9, borderRadius: 5 },
  legendText: { color: '#4a6a85', fontSize: 11, marginLeft: 5 },

  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0eaf4',
    backgroundColor: '#ffffff',
  },
  printBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00c853',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 10,
  },
  printBtnDisabled: { backgroundColor: '#b2dfdb', opacity: 0.7 },
  printIcon: { fontSize: 19 },
  printTxt:  { color: '#ffffff', fontSize: 15, fontWeight: '800' },
});

// ─── Date Range Component Styles ──────────────────────────────────────────────
const drc = StyleSheet.create({
  wrapper: {
    backgroundColor: '#091624',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#00e676',
    padding: 14,
    marginBottom: 12,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  headingIcon:  { fontSize: 16 },
  headingText:  { color: '#00e676', fontSize: 13, fontWeight: '700', flex: 1 },
  clearBtn:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: '#1a0a0a', borderWidth: 1, borderColor: '#ff5252' },
  clearTxt:     { color: '#ff5252', fontSize: 11, fontWeight: '700' },

  applyBtn:         { marginTop: 14, backgroundColor: '#00e676', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  applyBtnDisabled: { backgroundColor: '#0d2a1a', borderWidth: 1, borderColor: '#1a4a30' },
  applyTxt:         { color: '#060d1a', fontSize: 14, fontWeight: '800' },
  applyTxtDisabled: { color: '#2a6a40' },

  filterRow: {
    marginTop: 8,
    marginBottom: 2,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d1f35',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#1a2f4a',
    gap: 7,
  },
  toggleBtnActive:  { borderColor: '#00e676', backgroundColor: '#001a0d' },
  toggleIcon:       { fontSize: 14 },
  toggleTxt:        { color: '#8da8c2', fontSize: 12, fontWeight: '600', flex: 1 },
  toggleTxtActive:  { color: '#00e676' },

  inlineClear:      { paddingHorizontal: 6, paddingVertical: 2, backgroundColor: '#1a0808', borderRadius: 5, borderWidth: 1, borderColor: '#ff525255' },
  inlineClearTxt:   { color: '#ff5252', fontSize: 11, fontWeight: '700' },

  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#001a0d',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#00e67655',
    marginBottom: 10,
    gap: 6,
  },
  activeBadgeIcon: { fontSize: 13 },
  activeBadgeTxt:  { color: '#8da8c2', fontSize: 12, flex: 1 },
  activeBadgeDate: { color: '#00e676', fontWeight: '700' },

  studentFilterBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#060d1a',
    borderBottomWidth: 1,
    borderBottomColor: '#0f2030',
  },
});