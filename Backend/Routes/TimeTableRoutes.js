const express = require("express");
const router  = express.Router();

const mongoose  = require("mongoose");
const Timetable = require("../Models/Timetable");
const Teacher   = require("../Models/Teacher");
const Student   = require("../Models/Student");
const auth = require("../middleware/auth"); 
const { sendNotificationToClass } = require('../utils/pushNotificationService');

// ── Lazy-load Parent so we always get the fully-registered Mongoose model,
//    even if this file is required before the Parent model is registered. ──────
function getParentModel() {
  // If already registered, use it; otherwise require it fresh
  if (mongoose.modelNames().includes("Parent")) {
    return mongoose.model("Parent");
  }
  return require("../Models/Parent");
}


// ─── Constants ─────────────────────────────────────────────────────────────────
const VALID_DAYS  = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const VALID_SLOTS = ["t1","t2","t3","t4","t5","t6"];


// ─── Helpers ───────────────────────────────────────────────────────────────────
function isValidDay(d)  { return VALID_DAYS.includes(d);  }
function isValidSlot(s) { return VALID_SLOTS.includes(s); }

function yearCodeToNumber(code) {
  return { FY: "1", SY: "2", TY: "3", LY: "4" }[code?.toUpperCase()] || null;
}

// Maps the Teacher.classTeacher.year label → timetable year number
// e.g. "1st Year" → "1", "2nd Year" → "2"
const CLASS_TEACHER_YEAR_MAP = {
  "1st Year": "1",
  "2nd Year": "2",
  "3rd Year": "3",
  "4th Year": "4",
};

// ─── Middleware: only the class teacher of the target year+division may mutate ─
// Reads year & division from req.body (PUT/POST/DELETE routes).
// Must be used AFTER auth middleware so req.teacher is populated.
async function classTeacherGuard(req, res, next) {
  try {
    const teacher = req.teacher; // set by auth middleware
    if (!teacher) {
      return res.status(401).json({ success: false, message: "Unauthorised – please log in" });
    }

    const { year, division } = req.body;

    // If no year/division in body we can't check – let the route handler reject it
    if (!year || !division) return next();

    // Fetch fresh teacher doc (req.teacher may be a partial token payload)
    const teacherDoc = await Teacher.findById(teacher._id || teacher.id, "classTeacher").lean();
    if (!teacherDoc) {
      return res.status(401).json({ success: false, message: "Teacher account not found" });
    }

    const ct = teacherDoc.classTeacher;
    const isAssigned = ct && ct.year && ct.division;

    if (!isAssigned) {
      return res.status(403).json({
        success: false,
        message: "Access denied – you are not assigned as a class teacher",
      });
    }

    // Normalise the stored year label to a number string for comparison
    const ctYearNum = CLASS_TEACHER_YEAR_MAP[ct.year];
    const ctDiv     = ct.division.toUpperCase();

    if (ctYearNum !== String(year) || ctDiv !== division.toUpperCase()) {
      return res.status(403).json({
        success: false,
        message: `Access denied – you are the class teacher of Year ${ct.year} Division ${ct.division}, not Year ${year} Division ${division.toUpperCase()}`,
      });
    }

    next();
  } catch (err) {
    console.error("classTeacherGuard error:", err);
    res.status(500).json({ success: false, message: "Server error during authorisation" });
  }
}

// "FY-A2-36" → { year: "1", division: "A", batch: "A2" }
function parseRollNo(roll_no) {
  if (!roll_no) return null;
  const parts = roll_no.split("-");               // ["FY", "A2", "36"]
  if (parts.length < 2) return null;
  const year     = yearCodeToNumber(parts[0]);    // "1"
  if (!year) return null;
  const batchRaw = parts[1].toUpperCase();        // "A2"
  const division = batchRaw.replace(/[0-9]/g, ""); // "A"
  const batch    = batchRaw;                      // "A2"
  return { year, division, batch };
}


// ══════════════════════════════════════════════════════════════════════════════
// 1. GET METADATA
//    GET /api/timetable/meta
// ══════════════════════════════════════════════════════════════════════════════

router.get("/meta", async (req, res) => {
  try {
    const teachers = await Teacher.find({}, "_id id name subjects").lean();

    const studentAgg = await Student.aggregate([
      {
        $group: {
          _id: { year: "$year", division: "$division" },
          subjects: { $addToSet: "$subjects" },
          labs:     { $addToSet: "$lab" },
        },
      },
      { $sort: { "_id.year": 1, "_id.division": 1 } },
    ]);

    const yearDivisionData = studentAgg.map((doc) => ({
      year:     doc._id.year,
      division: doc._id.division,
      subjects: [...new Set(doc.subjects.flat())].sort(),
      labs:     [...new Set(doc.labs.flat())].sort(),
      all:      [...new Set([...doc.subjects.flat(), ...doc.labs.flat()])].sort(),
    }));

    const years     = [...new Set(studentAgg.map((d) => d._id.year))].sort();
    const divisions = [...new Set(studentAgg.map((d) => d._id.division))].sort();

    res.status(200).json({
      success: true,
      data: {
        teachers: teachers.map((t) => ({
          _id:      t._id,
          id:       t.id,
          name:     t.name,
          subjects: t.subjects || {},
        })),
        yearDivisionData,
        years,
        divisions,
      },
    });
  } catch (err) {
    console.error("GET /meta error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// ══════════════════════════════════════════════════════════════════════════════
// 2. GET SUBJECTS + LABS
//    GET /api/timetable/subjects?year=1&division=A
// ══════════════════════════════════════════════════════════════════════════════

router.get("/subjects", async (req, res) => {
  try {
    const { year, division } = req.query;

    if (!year || !division) {
      return res.status(400).json({
        success: false,
        message: "year and division query params are required",
      });
    }

    const students = await Student.find(
      { year, division: division.toUpperCase() },
      "subjects lab"
    ).lean();

    if (!students.length) {
      return res.status(404).json({
        success: false,
        message: `No students found for year ${year}, division ${division}`,
      });
    }

    const subjects = [...new Set(students.flatMap((s) => s.subjects || []))].sort();
    const labs     = [...new Set(students.flatMap((s) => s.lab     || []))].sort();

    res.status(200).json({
      success: true,
      data: {
        subjects,
        labs,
        all: [...subjects, ...labs],
      },
    });
  } catch (err) {
    console.error("GET /subjects error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// ══════════════════════════════════════════════════════════════════════════════
// 3. GET TIMETABLE FOR A SPECIFIC TEACHER
//    GET /api/timetable/teacher/:teacherId
// ══════════════════════════════════════════════════════════════════════════════

router.get("/teacher/:teacherId", async (req, res) => {
  try {
    const { teacherId } = req.params;

    const allTimetables = await Timetable.find({}).lean();

    const DAYS  = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const SLOTS = ["t1","t2","t3","t4","t5","t6"];

    const SLOT_TIMES = {
      t1: { start: "10:30", end: "11:30" },
      t2: { start: "11:30", end: "12:30" },
      t3: { start: "13:15", end: "14:15" },
      t4: { start: "14:15", end: "15:15" },
      t5: { start: "15:30", end: "16:30" },
      t6: { start: "16:30", end: "17:30" },
    };

    const results = [];

    allTimetables.forEach((tt) => {
      DAYS.forEach((day) => {
        if (!tt[day]) return;
        SLOTS.forEach((slotId) => {
          const slot = tt[day][slotId];
          if (!slot) return;
          if (String(slot.teacherId) !== String(teacherId)) return;

          results.push({
            id:          `${tt._id}-${day}-${slotId}`,
            timetableId: tt._id,
            year:        tt.year,
            division:    tt.division,
            batch:       tt.batch,
            day,
            slotId,
            subject:     slot.subject,
            room:        slot.room,
            color:       slot.color,
            teacherName: slot.teacherName,
            ...SLOT_TIMES[slotId],
          });
        });
      });
    });

    res.status(200).json({ success: true, data: results });
  } catch (err) {
    console.error("GET /teacher/:teacherId error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// ══════════════════════════════════════════════════════════════════════════════
// 4. GET TIMETABLE FOR PARENT
//    GET /api/timetable/parent/:parentId
// ══════════════════════════════════════════════════════════════════════════════

router.get("/parent/:parentId", async (req, res) => {
  try {
    const { parentId } = req.params;

    // ── 1. Validate ObjectId to avoid CastError ───────────────────────────────
    if (!mongoose.Types.ObjectId.isValid(parentId)) {
      return res.status(400).json({ success: false, message: "Invalid parent ID format" });
    }

    // ── 2. Get the Parent model safely at call-time ───────────────────────────
    const Parent = getParentModel();

    // ── 3. Find parent ────────────────────────────────────────────────────────
    const parent = await Parent.findOne({ _id: parentId }).lean();
    if (!parent) {
      return res.status(404).json({ success: false, message: "Parent not found" });
    }

    console.log("🔍 Parent found:", parent.name, "| roll_no:", parent.roll_no, "| prn:", parent.prn);

    // ── 3. Get roll_no from parent document directly ──────────────────────────
    const roll_no = parent.roll_no;
    if (!roll_no) {
      return res.status(400).json({
        success: false,
        message: "Parent account has no roll_no set. Please contact admin.",
      });
    }

    // ── 4. Parse roll_no → year / division / batch ────────────────────────────
    const parsed = parseRollNo(roll_no);
    console.log("📋 Parsed roll_no:", parsed);

    if (!parsed) {
      return res.status(400).json({
        success: false,
        message: `Cannot parse roll_no "${roll_no}". Expected format: FY-A2-36`,
      });
    }

    const { year, division, batch } = parsed;

    // ── 5. Optionally resolve student name via PRN ────────────────────────────
    let studentName = parent.name; // fallback to parent name
    if (parent.prn) {
      const student = await Student.findOne({ prn: parent.prn }, "name").lean();
      if (student) studentName = student.name;
    }

    // ── 6. Look up timetable ──────────────────────────────────════════════════
    console.log(`🔎 Looking for timetable: year=${year} division=${division} batch=${batch}`);

    const timetable = await Timetable.findOne({
      year,
      division: division.toUpperCase(),
      batch:    batch.toUpperCase(),
    }).lean();

    if (!timetable) {
      const existing = await Timetable.find({}, "year division batch").lean();
      console.log("📚 Timetables in DB:", JSON.stringify(existing, null, 2));

      return res.status(404).json({
        success: false,
        message: `No timetable found for Year ${year}, Division ${division}, Batch ${batch}`,
      });
    }

    // ── 7. Respond ────────────────────────────────────────────────────────────
    res.status(200).json({
      success: true,
      data: {
        studentName,
        rollNo:   roll_no,
        year,
        division,
        batch,
        timetable,
      },
    });

  } catch (err) {
    console.error("GET /timetable/parent/:parentId error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});



// ══════════════════════════════════════════════════════════════════════════════
// 4b. DEBUG – list ALL timetables in DB (remove in production)
//     GET /api/timetable/debug/all
// ══════════════════════════════════════════════════════════════════════════════

router.get("/debug/all", async (req, res) => {
  try {
    const all = await Timetable.find({}, "year division batch").lean();
    res.status(200).json({ success: true, count: all.length, data: all });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// 5. GET TIMETABLE for a year + division + batch
//    GET /api/timetable?year=1&division=A&batch=A1
// ══════════════════════════════════════════════════════════════════════════════

router.get("/", async (req, res) => {
  try {
    const { year, division, batch } = req.query;

    if (!year || !division || !batch) {
      return res.status(400).json({
        success: false,
        message: "year, division, and batch query params are required",
      });
    }

    const timetable = await Timetable.findOne({
      year,
      division: division.toUpperCase(),
      batch:    batch.toUpperCase(),
    }).lean();

    if (!timetable) {
      return res.status(200).json({
        success: true,
        data:    null,
        message: "No timetable found – you can create one via POST /api/timetable",
      });
    }

    res.status(200).json({ success: true, data: timetable });
  } catch (err) {
    console.error("GET / error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// ══════════════════════════════════════════════════════════════════════════════
// 6. CREATE empty timetable
//    POST /api/timetable
// ══════════════════════════════════════════════════════════════════════════════

router.post("/", auth, classTeacherGuard, async (req, res) => {
  try {
    const { year, division, batch, academicYear } = req.body;

    if (!year || !division || !batch) {
      return res.status(400).json({
        success: false,
        message: "year, division, and batch are required",
      });
    }

    const existing = await Timetable.findOne({
      year,
      division: division.toUpperCase(),
      batch:    batch.toUpperCase(),
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Timetable already exists for this year/division/batch",
        data:    existing,
      });
    }

    const timetable = await Timetable.create({
      year,
      division:     division.toUpperCase(),
      batch:        batch.toUpperCase(),
      academicYear: academicYear || null,
    });

    res.status(201).json({ success: true, message: "Timetable created", data: timetable });
  } catch (err) {
    console.error("POST / error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// ══════════════════════════════════════════════════════════════════════════════
// 7. ASSIGN / UPDATE a single slot
//    PUT /api/timetable/slot
// ══════════════════════════════════════════════════════════════════════════════

router.put("/slot", auth, classTeacherGuard, async (req, res) => {
  try {
    const { year, division, batch, day, slotId, teacherId, subject, room, color } = req.body;

    if (!year || !division || !batch || !day || !slotId || !teacherId || !subject) {
      return res.status(400).json({
        success: false,
        message: "year, division, batch, day, slotId, teacherId and subject are required",
      });
    }

    if (!isValidDay(day))     return res.status(400).json({ success: false, message: `Invalid day: ${day}` });
    if (!isValidSlot(slotId)) return res.status(400).json({ success: false, message: `Invalid slotId: ${slotId}` });

    const teacher = await Teacher.findById(teacherId, "name").lean();
    if (!teacher) return res.status(404).json({ success: false, message: "Teacher not found" });

    const updatePath = `${day}.${slotId}`;
    const slotData   = {
      teacherId,
      teacherName: teacher.name,
      subject:     subject.trim().toUpperCase(),
      room:        room?.trim() || null,
      color:       color || "teal",
    };

    const timetable = await Timetable.findOneAndUpdate(
      { year, division: division.toUpperCase(), batch: batch.toUpperCase() },
      {
        $set:         { [updatePath]: slotData },
        $setOnInsert: { year, division: division.toUpperCase(), batch: batch.toUpperCase() },
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({ success: true, message: `Slot ${day} / ${slotId} updated`, data: timetable });
  } catch (err) {
    console.error("PUT /slot error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// ══════════════════════════════════════════════════════════════════════════════
// 8. DELETE / CLEAR a single slot
//    DELETE /api/timetable/slot
// ══════════════════════════════════════════════════════════════════════════════

router.delete("/slot", auth, classTeacherGuard, async (req, res) => {
  try {
    const { year, division, batch, day, slotId } = req.body;

    if (!year || !division || !batch || !day || !slotId) {
      return res.status(400).json({
        success: false,
        message: "year, division, batch, day, and slotId are required",
      });
    }

    if (!isValidDay(day))     return res.status(400).json({ success: false, message: `Invalid day: ${day}` });
    if (!isValidSlot(slotId)) return res.status(400).json({ success: false, message: `Invalid slotId: ${slotId}` });

    const updatePath = `${day}.${slotId}`;

    const timetable = await Timetable.findOneAndUpdate(
      { year, division: division.toUpperCase(), batch: batch.toUpperCase() },
      { $unset: { [updatePath]: "" } },
      { new: true }
    );

    if (!timetable) return res.status(404).json({ success: false, message: "Timetable not found" });

    res.status(200).json({ success: true, message: `Slot ${day} / ${slotId} cleared`, data: timetable });
  } catch (err) {
    console.error("DELETE /slot error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// ══════════════════════════════════════════════════════════════════════════════
// 9. DELETE entire timetable
//    DELETE /api/timetable
// ══════════════════════════════════════════════════════════════════════════════

router.delete("/", auth, classTeacherGuard, async (req, res) => {
  try {
    const { year, division, batch } = req.body;

    if (!year || !division || !batch) {
      return res.status(400).json({
        success: false,
        message: "year, division, and batch are required",
      });
    }

    const result = await Timetable.findOneAndDelete({
      year,
      division: division.toUpperCase(),
      batch:    batch.toUpperCase(),
    });

    if (!result) return res.status(404).json({ success: false, message: "Timetable not found" });

    res.status(200).json({ success: true, message: "Timetable deleted" });
  } catch (err) {
    console.error("DELETE / error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// ══════════════════════════════════════════════════════════════════════════════
// 10. GENERATE PDF (HTML/CSS - No External Files)
//     POST /api/timetable/generate-pdf
// ══════════════════════════════════════════════════════════════════════════════

router.post("/generate-pdf", async (req, res) => {
  const puppeteer = require('puppeteer');
  const fs = require('fs');
  const path = require('path');

  try {
    const { year, division, batch, academicYear } = req.body;

    if (!year || !division || !batch) {
      return res.status(400).json({
        success: false,
        message: "year, division, and batch are required",
      });
    }

    // Fetch timetable from database
    const timetable = await Timetable.findOne({
      year,
      division: division.toUpperCase(),
      batch: batch.toUpperCase(),
    }).lean();

    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: "Timetable not found",
      });
    }

    // Prepare grid data
    const grid = {};
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    days.forEach((day) => {
      if (timetable[day]) {
        grid[day] = {};
        ["t1", "t2", "t3", "t4", "t5", "t6"].forEach((slot) => {
          const slotData = timetable[day][slot];
          if (slotData && slotData.subject) {
            grid[day][slot] = {
              subject: slotData.subject,
              teacher: slotData.teacherName || "",
              room: slotData.room || "",
              color: slotData.color || "teal",
            };
          }
        });
      }
    });

    // Define time slots
    const timeSlots = [
      { id: 't1', label: '10:30-11:30', name: 'Lecture 1' },
      { id: 't2', label: '11:30-12:30', name: 'Lecture 2' },
      { id: 'lunch', label: '12:30-1:15', name: 'LUNCH', isBreak: true },
      { id: 't3', label: '1:15-2:15', name: 'Lecture 3' },
      { id: 't4', label: '2:15-3:15', name: 'Lecture 4' },
      { id: 'break', label: '3:15-3:30', name: 'BREAK', isBreak: true },
      { id: 't5', label: '3:30-4:30', name: 'Lecture 5' },
      { id: 't6', label: '4:30-5:30', name: 'Lecture 6' },
    ];

    // Color mappings
    const bgColors = {
      teal: '#e0f7f4',
      blue: '#ddeeff',
      purple: '#ede8ff',
      orange: '#fff3e0',
      green: '#e2f7ea',
      pink: '#fce7f3',
    };

    // Generate HTML
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Helvetica', 'Arial', sans-serif;
      padding: 30px;
      background: #fff;
    }
    
    .header {
      text-align: center;
      margin-bottom: 25px;
    }
    
    .title {
      font-size: 22px;
      font-weight: bold;
      color: #1a2130;
      margin-bottom: 8px;
    }
    
    .subtitle {
      font-size: 13px;
      color: #4a5568;
      margin-bottom: 5px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    
    th {
      background: #1a6fd4;
      color: #fff;
      padding: 12px 8px;
      font-size: 11px;
      font-weight: 600;
      border: 1px solid #d1d9e0;
      text-align: center;
    }
    
    td {
      border: 1px solid #d1d9e0;
      padding: 10px 8px;
      text-align: center;
      font-size: 10px;
      min-height: 60px;
      vertical-align: middle;
    }
    
    .day-cell {
      background: #eef1f5;
      font-weight: bold;
      color: #1a2130;
      font-size: 11px;
    }
    
    .break-cell {
      background: #f9fafb;
      color: #9aa5b4;
      font-weight: bold;
      font-size: 10px;
    }
    
    .subject-name {
      font-weight: bold;
      font-size: 11px;
      color: #1a2130;
      margin-bottom: 4px;
    }
    
    .teacher-name {
      font-size: 9px;
      color: #4a5568;
      margin-bottom: 3px;
    }
    
    .room-name {
      font-size: 9px;
      color: #6b7280;
    }
    
    .empty-cell {
      color: #d1d9e0;
      font-size: 14px;
    }
    
    .footer {
      text-align: center;
      font-size: 9px;
      color: #9aa5b4;
      margin-top: 15px;
    }
    
    /* Color backgrounds */
    .bg-teal { background: #e0f7f4; }
    .bg-blue { background: #ddeeff; }
    .bg-purple { background: #ede8ff; }
    .bg-orange { background: #fff3e0; }
    .bg-green { background: #e2f7ea; }
    .bg-pink { background: #fce7f3; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">Class Timetable - Year ${year} | Division ${division.toUpperCase()} | Batch ${batch.toUpperCase()}</div>
    ${academicYear ? `<div class="subtitle">Academic Year: ${academicYear}</div>` : ''}
  </div>
  
  <table>
    <thead>
      <tr>
        <th style="width: 100px;">Day / Time</th>
        ${timeSlots.map(slot => `
          <th style="width: 120px;">
            ${slot.label}<br>
            <span style="font-size: 9px; font-weight: normal;">${slot.name}</span>
          </th>
        `).join('')}
      </tr>
    </thead>
    <tbody>
      ${days.map(day => {
        const dayData = grid[day] || {};
        return `
          <tr>
            <td class="day-cell">${day}</td>
            ${timeSlots.map(slot => {
              if (slot.isBreak) {
                return `<td class="break-cell">${slot.name}</td>`;
              }
              
              const slotData = dayData[slot.id];
              if (slotData) {
                const bgClass = `bg-${slotData.color || 'teal'}`;
                return `
                  <td class="${bgClass}">
                    <div class="subject-name">${slotData.subject}</div>
                    <div class="teacher-name">${slotData.teacher}</div>
                    ${slotData.room ? `<div class="room-name">${slotData.room}</div>` : ''}
                  </td>
                `;
              } else {
                return `<td class="empty-cell">—</td>`;
              }
            }).join('')}
          </tr>
        `;
      }).join('')}
    </tbody>
  </table>
  
  <div class="footer">
    Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} 
    at ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
  </div>
</body>
</html>
    `;

    // Generate PDF from HTML
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    // Generate unique temporary filename
    const timestamp = Date.now();
    const filename = `timetable_${year}_${division}_${batch}.pdf`;
    const tempDir = path.join(__dirname, "..", "temp");
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const outputPath = path.join(tempDir, `pdf_${timestamp}.pdf`);
    
    await page.pdf({
      path: outputPath,
      format: 'A4',
      landscape: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      },
      printBackground: true
    });
    
    await browser.close();

    // Send PDF as download
    res.download(outputPath, filename, (err) => {
      // Clean up temp PDF file after download
      try {
        fs.unlinkSync(outputPath);
      } catch (e) {
        console.error("Failed to delete temp PDF file:", e);
      }

      if (err) {
        console.error("PDF download error:", err);
      }
    });

  } catch (err) {
    console.error("POST /generate-pdf error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to generate PDF: " + err.message 
    });
  }
});


// ══════════════════════════════════════════════════════════════════════════════
// 11. GENERATE PDF – GET alias (for mobile React Native Linking.openURL)
//     GET /api/timetable/generate-pdf-get?year=1&division=A&batch=A1&academicYear=2024-25
// ══════════════════════════════════════════════════════════════════════════════

router.get("/generate-pdf-get", async (req, res) => {
  const puppeteer = require("puppeteer");
  const fs        = require("fs");
  const path      = require("path");

  try {
    const { year, division, batch, academicYear } = req.query;

    if (!year || !division || !batch) {
      return res.status(400).json({
        success: false,
        message: "year, division, and batch query params are required",
      });
    }

    // Fetch timetable from database
    const timetable = await Timetable.findOne({
      year,
      division: division.toUpperCase(),
      batch:    batch.toUpperCase(),
    }).lean();

    if (!timetable) {
      return res.status(404).json({ success: false, message: "Timetable not found" });
    }

    // Build grid
    const grid = {};
    const days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    days.forEach((day) => {
      if (!timetable[day]) return;
      grid[day] = {};
      ["t1","t2","t3","t4","t5","t6"].forEach((slot) => {
        const s = timetable[day][slot];
        if (s && s.subject) {
          grid[day][slot] = {
            subject: s.subject,
            teacher: s.teacherName || "",
            room:    s.room || "",
            color:   s.color || "teal",
          };
        }
      });
    });

    const timeSlots = [
      { id: "t1",    label: "10:30-11:30", name: "Lecture 1"  },
      { id: "t2",    label: "11:30-12:30", name: "Lecture 2"  },
      { id: "lunch", label: "12:30-1:15",  name: "LUNCH",  isBreak: true },
      { id: "t3",    label: "1:15-2:15",   name: "Lecture 3"  },
      { id: "t4",    label: "2:15-3:15",   name: "Lecture 4"  },
      { id: "break", label: "3:15-3:30",   name: "BREAK",  isBreak: true },
      { id: "t5",    label: "3:30-4:30",   name: "Lecture 5"  },
      { id: "t6",    label: "4:30-5:30",   name: "Lecture 6"  },
    ];

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Helvetica','Arial',sans-serif; padding:30px; background:#fff; }
    .header { text-align:center; margin-bottom:25px; }
    .title  { font-size:22px; font-weight:bold; color:#1a2130; margin-bottom:8px; }
    .subtitle { font-size:13px; color:#4a5568; margin-bottom:5px; }
    table { width:100%; border-collapse:collapse; margin-bottom:20px; }
    th { background:#1a6fd4; color:#fff; padding:12px 8px; font-size:11px; font-weight:600; border:1px solid #d1d9e0; text-align:center; }
    td { border:1px solid #d1d9e0; padding:10px 8px; text-align:center; font-size:10px; min-height:60px; vertical-align:middle; }
    .day-cell   { background:#eef1f5; font-weight:bold; color:#1a2130; font-size:11px; }
    .break-cell { background:#f9fafb; color:#9aa5b4; font-weight:bold; font-size:10px; }
    .subject-name { font-weight:bold; font-size:11px; color:#1a2130; margin-bottom:4px; }
    .teacher-name { font-size:9px; color:#4a5568; margin-bottom:3px; }
    .room-name    { font-size:9px; color:#6b7280; }
    .empty-cell   { color:#d1d9e0; font-size:14px; }
    .footer       { text-align:center; font-size:9px; color:#9aa5b4; margin-top:15px; }
    .bg-teal   { background:#e0f7f4; }
    .bg-blue   { background:#ddeeff; }
    .bg-purple { background:#ede8ff; }
    .bg-orange { background:#fff3e0; }
    .bg-green  { background:#e2f7ea; }
    .bg-pink   { background:#fce7f3; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">Class Timetable – Year ${year} | Division ${division.toUpperCase()} | Batch ${batch.toUpperCase()}</div>
    ${academicYear ? `<div class="subtitle">Academic Year: ${academicYear}</div>` : ""}
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:100px;">Day / Time</th>
        ${timeSlots.map(s => `<th style="width:120px;">${s.label}<br><span style="font-size:9px;font-weight:normal;">${s.name}</span></th>`).join("")}
      </tr>
    </thead>
    <tbody>
      ${days.map(day => {
        const dayData = grid[day] || {};
        return `<tr>
          <td class="day-cell">${day}</td>
          ${timeSlots.map(slot => {
            if (slot.isBreak) return `<td class="break-cell">${slot.name}</td>`;
            const s = dayData[slot.id];
            if (s) return `<td class="bg-${s.color || "teal"}">
              <div class="subject-name">${s.subject}</div>
              <div class="teacher-name">${s.teacher}</div>
              ${s.room ? `<div class="room-name">${s.room}</div>` : ""}
            </td>`;
            return `<td class="empty-cell">—</td>`;
          }).join("")}
        </tr>`;
      }).join("")}
    </tbody>
  </table>
  <div class="footer">Generated on ${new Date().toLocaleString()}</div>
</body>
</html>`;

    const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox","--disable-setuid-sandbox"] });
    const page    = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      landscape: true,
      margin: { top: "20px", right: "20px", bottom: "20px", left: "20px" },
      printBackground: true,
    });

    await browser.close();

    const filename = `timetable_year${year}_${division.toUpperCase()}_${batch.toUpperCase()}.pdf`;

    res.setHeader("Content-Type",        "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length",      pdfBuffer.length);
    res.end(pdfBuffer);

  } catch (err) {
    console.error("GET /generate-pdf-get error:", err);
    res.status(500).json({ success: false, message: "Failed to generate PDF: " + err.message });
  }
});


// When timetable is updated
// ─── Only the class teacher of that year+division can update ────────────────
router.put('/update-timetable', auth, classTeacherGuard, async (req, res) => {
  try {
    const { year, division, changes } = req.body;
    
    // Update timetable (existing code)
    // ...

    // Send notification to all students in the class
    const notificationData = {
      type: 'timetable',
      title: '📅 Timetable Updated',
      body: 'Your class schedule has been updated. Check the new timetable.',
      data: {
        screen: 'Timetable',
        year,
        division
      },
      priority: 'high'
    };

    await sendNotificationToClass(year, division, notificationData);

    res.json({
      success: true,
      message: 'Timetable updated and students notified'
    });

  } catch (error) {
    console.error('Error updating timetable:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


module.exports = router;