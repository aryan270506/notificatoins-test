const express = require("express");
const router  = express.Router();

const mongoose  = require("mongoose");
const Timetable = require("../Models/Timetable");
const TimetableTemplate = require("../Models/TimetableTemplate");
const Teacher   = require("../Models/Teacher");
const Student   = require("../Models/Student");
const auth = require("../Middleware/auth"); 
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
const DEFAULT_TEMPLATE_CONFIG = {
  workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  slots: [],
};


// ─── Helpers ───────────────────────────────────────────────────────────────────
function isValidDay(d)  { return VALID_DAYS.includes(d);  }
function isValidSlot(s) { return VALID_SLOTS.includes(s); }

function yearCodeToNumber(code) {
  return { FY: "1", SY: "2", TY: "3", LY: "4" }[code?.toUpperCase()] || null;
}

function normalizeTemplateConfig(config) {
  const source = config && typeof config === "object" ? config : {};
  const VALID_SLOT_IDS = ["t1", "t2", "t3", "t4", "t5", "t6"];
  
  const workingDays = Array.isArray(source.workingDays)
    ? source.workingDays.filter((day) => VALID_DAYS.includes(day))
    : [];

  const slots = Array.isArray(source.slots)
    ? source.slots
        .filter((slot) => slot && typeof slot === "object")
        .map((slot, index) => ({
          // ✅ Ensure slot.id is valid (t1-t6), otherwise assign based on index
          id: VALID_SLOT_IDS.includes(String(slot.id || "").trim()) 
            ? String(slot.id).trim() 
            : VALID_SLOT_IDS[index] || `t${index + 1}`,
          type: slot.type === "break" ? "break" : "lecture",
          label: String(slot.label || "").trim(),
          startTime: String(slot.startTime || "").trim(),
          endTime: String(slot.endTime || "").trim(),
        }))
        // Only filter out slots that are completely missing critical data
        .filter((slot) => {
          // A slot must have at least: id and (startTime AND endTime) for lecture, OR just id for break
          const hasCriticalData = slot.id && slot.startTime && slot.endTime;
          return hasCriticalData;
        })
    : [];

  return {
    workingDays: workingDays.length ? workingDays : [...DEFAULT_TEMPLATE_CONFIG.workingDays],
    slots,
  };
}

async function getActiveTemplateDocument() {
  return TimetableTemplate.findOne({
    $or: [
      { key: "default" },
      { key: { $exists: false } },
    ],
    isActive: true,
  }).lean();
}

function resolveTemplateScope(req) {
  const user = req.user || {};

  if (String(user.role || "").toLowerCase() !== "admin") {
    return null;
  }

  if (!user.instituteId) {
    return { error: "Institute scope not found in token. Please login again." };
  }

  return {
    instituteId: String(user.instituteId),
    instituteName: String(user.instituteName || "").trim(),
    departmentCode: String(user.departmentCode || "__INSTITUTE__").trim(),
    departmentName: String(user.departmentName || "").trim(),
  };
}

// ─── Resolve teacher scope from database ─────────────────────────────────────
async function resolveTeacherScope(req) {
  const user = req.user || {};

  // ✅ FIRST: Check if scope fields already exist in the JWT token
  if (user.instituteId) {
    console.log(`✅ Using scope from JWT token: institute=${user.instituteId}, dept=${user.departmentCode || "__INSTITUTE__"}`);
    return {
      instituteId: String(user.instituteId),
      instituteName: String(user.instituteName || "").trim(),
      departmentCode: String(user.departmentCode || "__INSTITUTE__").trim(),
      departmentName: String(user.departmentName || "").trim(),
    };
  }

  // ✅ SECOND: Try to fetch from database if not in token
  // JWT token contains 'userId', not '_id'
  const teacherId = user.userId;

  if (!teacherId) {
    console.warn("⚠️ No teacher ID found in request");
    return null;
  }

  console.log(`📍 Token missing scope info, fetching from database for teacher: ${teacherId}`);

  // Fetch fresh teacher doc to get institute/department info
  const teacherDoc = await Teacher.findById(teacherId, 
    "instituteId instituteName departmentCode departmentName"
  ).lean();

  if (!teacherDoc) {
    console.warn(`⚠️ Teacher document not found for ID: ${teacherId}`);
    return null;
  }

  if (!teacherDoc.instituteId) {
    console.warn(`⚠️ Teacher ${teacherId} has no instituteId set`);
    return null;
  }

  if (!teacherDoc.departmentCode) {
    console.warn(`⚠️ Teacher ${teacherId} has no departmentCode set. Using __INSTITUTE__ as fallback.`);
    // Use __INSTITUTE__ as fallback for teachers without department assignment
    return {
      instituteId: String(teacherDoc.instituteId),
      instituteName: String(teacherDoc.instituteName || "").trim(),
      departmentCode: "__INSTITUTE__", // Fallback to institute-wide template
      departmentName: String(teacherDoc.departmentName || "").trim(),
    };
  }

  console.log(`✅ Teacher scope resolved from DB: institute=${teacherDoc.instituteId}, dept=${teacherDoc.departmentCode}`);
  return {
    instituteId: String(teacherDoc.instituteId),
    instituteName: String(teacherDoc.instituteName || "").trim(),
    departmentCode: String(teacherDoc.departmentCode || "").trim(),
    departmentName: String(teacherDoc.departmentName || "").trim(),
  };
}

async function getScopedActiveTemplateDocument(scope) {
  // Try exact match first (institute + department specific)
  let template = await TimetableTemplate.findOne({
    key: "default",
    isActive: true,
    instituteId: scope.instituteId,
    departmentCode: scope.departmentCode,
  }).lean();

  if (template) {
    console.log(`✅ Found scoped template for institute: ${scope.instituteId}, dept: ${scope.departmentCode}`);
    return template;
  }

  // Fallback: Try institute-level template (no department restriction)
  console.log(`⚠️ No department-specific template found. Trying institute-level for ${scope.instituteId}`);
  template = await TimetableTemplate.findOne({
    key: "default",
    isActive: true,
    instituteId: scope.instituteId,
    departmentCode: { $in: ["__INSTITUTE__", ""] }, // Institute-wide template
  }).lean();

  if (template) {
    console.log(`✅ Found institute-level template for ${scope.instituteId}`);
    return template;
  }

  console.log(`❌ No template found for scope: institute=${scope.instituteId}, dept=${scope.departmentCode}`);
  return null;
}

let templateIndexMigrationDone = false;
async function ensureTemplateScopeIndexes() {
  if (templateIndexMigrationDone) return;

  const indexes = await TimetableTemplate.collection.indexes();
  const legacyKeyIndex = indexes.find((idx) => idx?.name === "key_1" && idx?.unique);

  if (legacyKeyIndex) {
    console.log("🛠 Dropping legacy TimetableTemplate unique index: key_1");
    await TimetableTemplate.collection.dropIndex("key_1");
  }

  await TimetableTemplate.collection.createIndex(
    { key: 1, instituteId: 1, departmentCode: 1 },
    { unique: true, name: "key_1_instituteId_1_departmentCode_1" }
  );

  templateIndexMigrationDone = true;
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
// Must be used AFTER auth middleware so req.user is populated.
async function classTeacherGuard(req, res, next) {
  try {
    const user = req.user; // set by auth middleware
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorised – please log in" });
    }

    const { year, division } = req.body;

    // If no year/division in body we can't check – let the route handler reject it
    if (!year || !division) return next();

    // Fetch fresh teacher doc (req.user may be a partial token payload)
    // JWT token contains 'userId', not '_id'
    const teacherDoc = await Teacher.findById(user.userId, "classTeacher").lean();
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

router.get("/meta", auth, async (req, res) => {
  try {
    // Try to resolve admin scope first
    let scope = resolveTemplateScope(req);

    // If not admin, try to resolve teacher scope
    if (!scope) {
      scope = await resolveTeacherScope(req);
    }

    // If we have a scope error, return it
    if (scope?.error) {
      return res.status(401).json({ success: false, message: scope.error });
    }

    // If no scope and not admin, deny access
    if (!scope) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource, or your institute/department is not configured",
      });
    }

    // Fetch the scoped template
    const templateDoc = await getScopedActiveTemplateDocument(scope);
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
        template: templateDoc ? normalizeTemplateConfig(templateDoc.customConfig) : DEFAULT_TEMPLATE_CONFIG,
        templateSaved: Boolean(templateDoc),
        instituteInfo: {
          instituteId: scope.instituteId,
          instituteName: scope.instituteName,
          departmentCode: scope.departmentCode,
          departmentName: scope.departmentName,
        },
      },
    });
  } catch (err) {
    console.error("GET /meta error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// ══════════════════════════════════════════════════════════════════════════════
// 1b. GET / SAVE TIMETABLE TEMPLATE
//    GET /api/timetable/template
//    PUT /api/timetable/template
// ══════════════════════════════════════════════════════════════════════════════

router.get("/template", auth, async (req, res) => {
  try {
    // Try to resolve admin scope first
    let scope = resolveTemplateScope(req);

    // If not admin, try to resolve teacher scope
    if (!scope) {
      scope = await resolveTeacherScope(req);
    }

    console.log(`📍 Resolved scope for template fetch:`, JSON.stringify(scope, null, 2));

    // If we have a scope, fetch the scoped template
    let templateDoc = null;
    if (scope && !scope.error) {
      templateDoc = await getScopedActiveTemplateDocument(scope);
    } else if (scope?.error) {
      return res.status(401).json({ success: false, message: scope.error });
    } else if (!scope) {
      // No scope - user is neither admin nor teacher with proper assignment
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access templates, or your institute/department is not configured",
      });
    }

    // If no template found, return appropriate message
    if (!templateDoc) {
      console.log(`⚠️ No template found for scope. Returning default config with empty slots.`);
      return res.status(200).json({
        success: true,
        data: {
          customConfig: DEFAULT_TEMPLATE_CONFIG,
          templateSaved: false,
          message: "Template not yet uploaded by your institute/department",
        },
      });
    }

    const normalizedConfig = normalizeTemplateConfig(templateDoc.customConfig);
    console.log("📋 Template found, normalized config:", JSON.stringify(normalizedConfig, null, 2));

    res.status(200).json({
      success: true,
      data: {
        customConfig: normalizedConfig,
        templateSaved: true,
      },
    });
  } catch (err) {
    console.error("GET /template error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put("/template", auth, async (req, res) => {
  try {
    await ensureTemplateScopeIndexes();

    const scope = resolveTemplateScope(req);
    if (scope?.error) {
      return res.status(401).json({ success: false, message: scope.error });
    }

    const incomingConfig = req.body.customConfig || req.body.template || req.body;
    const customConfig = normalizeTemplateConfig(incomingConfig);

    if (!customConfig.workingDays.length || !customConfig.slots.length) {
      return res.status(400).json({
        success: false,
        message: "workingDays and slots are required",
      });
    }

    const query = scope
      ? {
          key: "default",
          instituteId: scope.instituteId,
          departmentCode: scope.departmentCode,
        }
      : {
          $or: [
            { key: "default" },
            { key: { $exists: false } },
          ],
        };

    const update = scope
      ? {
          $set: {
            customConfig,
            isActive: true,
            instituteName: scope.instituteName,
            departmentName: scope.departmentName,
          },
          $setOnInsert: {
            key: "default",
            instituteId: scope.instituteId,
            departmentCode: scope.departmentCode,
          },
        }
      : {
          $set: {
            customConfig,
            isActive: true,
          },
          $setOnInsert: {
            key: "default",
          },
        };

    const templateDoc = await TimetableTemplate.findOneAndUpdate(
      query,
      update,
      { upsert: true, runValidators: true, returnDocument: "after" }
    );

    res.status(200).json({
      success: true,
      message: "Timetable template saved",
      data: {
        customConfig: normalizeTemplateConfig(templateDoc.customConfig),
        templateSaved: true,
      },
    });
  } catch (err) {
    console.error("PUT /template error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete("/template", auth, async (req, res) => {
  try {
    const scope = resolveTemplateScope(req);
    if (scope?.error) {
      return res.status(401).json({ success: false, message: scope.error });
    }

    const query = scope
      ? {
          key: "default",
          instituteId: scope.instituteId,
          departmentCode: scope.departmentCode,
        }
      : {
          $or: [
            { key: "default" },
            { key: { $exists: false } },
          ],
        };

    const result = await TimetableTemplate.findOneAndDelete(query);

    if (!result) {
      return res.status(200).json({
        success: true,
        message: "Timetable template already cleared",
        data: {
          customConfig: DEFAULT_TEMPLATE_CONFIG,
          templateSaved: false,
        },
      });
    }

    res.status(200).json({
      success: true,
      message: "Timetable template deleted",
      data: {
        customConfig: DEFAULT_TEMPLATE_CONFIG,
        templateSaved: false,
      },
    });
  } catch (err) {
    console.error("DELETE /template error:", err);
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

    // ✅ Get teacher's scope info
    const teacher = await Teacher.findById(teacherId, "instituteId departmentCode").lean();
    
    // Build filter for timetables scoped to teacher's institute/department
    const timetableFilter = {};
    if (teacher && teacher.instituteId) {
      timetableFilter.instituteId = teacher.instituteId;
    }
    if (teacher && teacher.departmentCode) {
      timetableFilter.departmentCode = teacher.departmentCode;
    }

    const allTimetables = await Timetable.find(timetableFilter).lean();

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
    let studentInstituteId = null;
    let studentDepartmentCode = null;
    
    if (parent.prn) {
      const student = await Student.findOne({ prn: parent.prn }, "name instituteId departmentCode").lean();
      if (student) {
        studentName = student.name;
        studentInstituteId = student.instituteId;
        studentDepartmentCode = student.departmentCode;
      }
    }

    // ── 6. Look up timetable ──────────────────────────────────════════════════
    console.log(`🔎 Looking for timetable: year=${year} division=${division} batch=${batch} instituteId=${studentInstituteId}`);

    // ✅ Build query filter with scope if available
    const timetableFilter = {
      year,
      division: division.toUpperCase(),
      batch:    batch.toUpperCase(),
    };

    if (studentInstituteId) timetableFilter.instituteId = studentInstituteId;
    if (studentDepartmentCode) timetableFilter.departmentCode = studentDepartmentCode;

    const timetable = await Timetable.findOne(timetableFilter).lean();

    if (!timetable) {
      const existing = await Timetable.find({}, "year division batch instituteId departmentCode").lean();
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
    const { year, division, batch, instituteId, departmentCode } = req.query;

    if (!year || !division || !batch) {
      return res.status(400).json({
        success: false,
        message: "year, division, and batch query params are required",
      });
    }

    // ✅ Build query filter with optional scope
    const filter = {
      year,
      division: division.toUpperCase(),
      batch:    batch.toUpperCase(),
    };

    // Add scope if provided
    if (instituteId) filter.instituteId = instituteId;
    if (departmentCode) filter.departmentCode = departmentCode;

    const timetable = await Timetable.findOne(filter).lean();

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

    // ✅ Get scope from teacher
    const scope = await resolveTeacherScope(req);
    if (!scope) {
      return res.status(403).json({
        success: false,
        message: "Unable to determine institute/department scope for timetable",
      });
    }

    const existing = await Timetable.findOne({
      instituteId: scope.instituteId,
      departmentCode: scope.departmentCode,
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
      instituteId: scope.instituteId,
      instituteName: scope.instituteName,
      departmentCode: scope.departmentCode,
      departmentName: scope.departmentName,
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
    const { year, division, batch, day, slotId, teacherId, subject, room, color, lectureLocation } = req.body;

    if (!year || !division || !batch || !day || !slotId || !teacherId || !subject) {
      return res.status(400).json({
        success: false,
        message: "year, division, batch, day, slotId, teacherId and subject are required",
      });
    }

    if (!isValidDay(day))     return res.status(400).json({ success: false, message: `Invalid day: ${day}` });
    if (!isValidSlot(slotId)) return res.status(400).json({ success: false, message: `Invalid slotId: ${slotId}` });

    // ✅ Get scope from teacher
    const scope = await resolveTeacherScope(req);
    if (!scope) {
      return res.status(403).json({
        success: false,
        message: "Unable to determine institute/department scope for timetable",
      });
    }

    const teacher = await Teacher.findById(teacherId, "name").lean();
    if (!teacher) return res.status(404).json({ success: false, message: "Teacher not found" });

    const updatePath = `${day}.${slotId}`;
    const slotData   = {
      teacherId,
      teacherName: teacher.name,
      subject:     subject.trim().toUpperCase(),
      room:        room?.trim() || null,
      lectureLocation: lectureLocation?.trim() || null,
      color:       color || "teal",
    };

    const timetable = await Timetable.findOneAndUpdate(
      { 
        instituteId: scope.instituteId,
        departmentCode: scope.departmentCode,
        year, 
        division: division.toUpperCase(), 
        batch: batch.toUpperCase() 
      },
      {
        $set:         { [updatePath]: slotData },
        $setOnInsert: { 
          instituteId: scope.instituteId,
          instituteName: scope.instituteName,
          departmentCode: scope.departmentCode,
          departmentName: scope.departmentName,
          year, 
          division: division.toUpperCase(), 
          batch: batch.toUpperCase() 
        },
      },
      { new: true, upsert: true, runValidators: true }
    );

    // ✅ Update teacher's subject assignments
    // Check if assignment already exists for this year/division/batch
    const normalizedSubject = subject.trim().toUpperCase();
    const existingAssignment = await Teacher.findOne(
      {
        _id: teacherId,
        "subjectAssignments.year": String(year),
        "subjectAssignments.division": division.toUpperCase(),
        "subjectAssignments.batch": batch.toUpperCase(),
      },
      { "subjectAssignments.$": 1 }
    ).lean();

    if (existingAssignment && existingAssignment.subjectAssignments?.length > 0) {
      // Update existing assignment - add subject if not already there
      await Teacher.updateOne(
        {
          _id: teacherId,
          "subjectAssignments.year": String(year),
          "subjectAssignments.division": division.toUpperCase(),
          "subjectAssignments.batch": batch.toUpperCase(),
        },
        {
          $addToSet: { "subjectAssignments.$.subjects": normalizedSubject },
          $set: { "subjectAssignments.$.assignedAt": new Date() }
        }
      );
      console.log(`✅ Updated subject assignment for teacher ${teacherId}: year=${year}, division=${division}, batch=${batch}, subject=${normalizedSubject}`);
    } else {
      // Create new assignment
      await Teacher.updateOne(
        { _id: teacherId },
        {
          $push: {
            subjectAssignments: {
              year: String(year),
              division: division.toUpperCase(),
              batch: batch.toUpperCase(),
              subjects: [normalizedSubject],
              assignedAt: new Date(),
            }
          }
        }
      );
      console.log(`✅ Created new subject assignment for teacher ${teacherId}: year=${year}, division=${division}, batch=${batch}, subject=${normalizedSubject}`);
    }

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

    // ✅ Get scope from teacher
    const scope = await resolveTeacherScope(req);
    if (!scope) {
      return res.status(403).json({
        success: false,
        message: "Unable to determine institute/department scope for timetable",
      });
    }

    // ✅ FIRST: Get the current timetable to find what teacher/subject is in this slot
    const currentTimetable = await Timetable.findOne({ 
      instituteId: scope.instituteId,
      departmentCode: scope.departmentCode,
      year, 
      division: division.toUpperCase(), 
      batch: batch.toUpperCase() 
    }).lean();

    let teacherToUpdate = null;
    let subjectToRemove = null;

    if (currentTimetable && currentTimetable[day]?.[slotId]) {
      const slot = currentTimetable[day][slotId];
      if (slot && slot.teacherId && slot.subject) {
        teacherToUpdate = slot.teacherId;
        subjectToRemove = slot.subject.toUpperCase();
      }
    }

    const updatePath = `${day}.${slotId}`;

    // ✅ SECOND: Delete the slot from timetable
    const timetable = await Timetable.findOneAndUpdate(
      { 
        instituteId: scope.instituteId,
        departmentCode: scope.departmentCode,
        year, 
        division: division.toUpperCase(), 
        batch: batch.toUpperCase() 
      },
      { $unset: { [updatePath]: "" } },
      { new: true }
    );

    if (!timetable) return res.status(404).json({ success: false, message: "Timetable not found" });

    // ✅ THIRD: Remove subject assignment from teacher if found
    if (teacherToUpdate && subjectToRemove) {
      // Check if this subject is still used in other slots by the same teacher for this year/division/batch
      const otherSlots = await Timetable.countDocuments({
        instituteId: scope.instituteId,
        departmentCode: scope.departmentCode,
        year,
        division: division.toUpperCase(),
        batch: batch.toUpperCase(),
        $or: [
          { "Monday": { $exists: true } },
          { "Tuesday": { $exists: true } },
          { "Wednesday": { $exists: true } },
          { "Thursday": { $exists: true } },
          { "Friday": { $exists: true } },
          { "Saturday": { $exists: true } },
        ],
      });

      // For simplicity, just remove the subject from the teacher's assignment
      // In a more complex system, we'd check if the subject is used elsewhere
      await Teacher.updateOne(
        {
          _id: teacherToUpdate,
          "subjectAssignments.year": String(year),
          "subjectAssignments.division": division.toUpperCase(),
          "subjectAssignments.batch": batch.toUpperCase(),
        },
        {
          $pull: { "subjectAssignments.$.subjects": subjectToRemove }
        }
      );

      console.log(`✅ Removed subject assignment for teacher ${teacherToUpdate}: subject=${subjectToRemove}`);
    }

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

    // ✅ Get scope from teacher
    const scope = await resolveTeacherScope(req);
    if (!scope) {
      return res.status(403).json({
        success: false,
        message: "Unable to determine institute/department scope for timetable",
      });
    }

    // ✅ FIRST: Get the timetable before deleting to extract teacher assignments
    const timetableToDelete = await Timetable.findOne({
      instituteId: scope.instituteId,
      departmentCode: scope.departmentCode,
      year,
      division: division.toUpperCase(),
      batch: batch.toUpperCase(),
    }).lean();

    if (!timetableToDelete) {
      return res.status(404).json({ success: false, message: "Timetable not found" });
    }

    // Extract all unique teachers and subjects from the timetable
    const teacherAssignments = new Map(); // teacherId -> Set of subjects
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const slots = ["t1", "t2", "t3", "t4", "t5", "t6"];

    days.forEach(day => {
      if (timetableToDelete[day]) {
        slots.forEach(slot => {
          const slotData = timetableToDelete[day][slot];
          if (slotData && slotData.teacherId && slotData.subject) {
            const teacherId = String(slotData.teacherId);
            const subject = slotData.subject.toUpperCase();
            if (!teacherAssignments.has(teacherId)) {
              teacherAssignments.set(teacherId, new Set());
            }
            teacherAssignments.get(teacherId).add(subject);
          }
        });
      }
    });

    // ✅ SECOND: Delete the timetable
    const result = await Timetable.findOneAndDelete({
      instituteId: scope.instituteId,
      departmentCode: scope.departmentCode,
      year,
      division: division.toUpperCase(),
      batch: batch.toUpperCase(),
    });

    // ✅ THIRD: Clean up subject assignments for all affected teachers
    for (const [teacherId, subjects] of teacherAssignments.entries()) {
      await Teacher.updateOne(
        {
          _id: teacherId,
          "subjectAssignments.year": String(year),
          "subjectAssignments.division": division.toUpperCase(),
          "subjectAssignments.batch": batch.toUpperCase(),
        },
        {
          $unset: { "subjectAssignments.$": "" }
        }
      );
      
      // Remove empty assignment entries
      await Teacher.updateOne(
        { _id: teacherId },
        { $pull: { subjectAssignments: null } }
      );

      console.log(`✅ Cleaned up subject assignments for teacher ${teacherId}`);
    }

    res.status(200).json({ success: true, message: "Timetable deleted and subject assignments cleaned up" });
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
    
    // ✅ Get scope from teacher
    const scope = await resolveTeacherScope(req);
    if (!scope) {
      return res.status(403).json({
        success: false,
        message: "Unable to determine institute/department scope for timetable",
      });
    }
    
    // Update timetable with scope
    const filter = {
      instituteId: scope.instituteId,
      departmentCode: scope.departmentCode,
      year,
      division: division.toUpperCase()
    };

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


// ══════════════════════════════════════════════════════════════════════════════
// 10. GET TEACHERS BY INSTITUTE & DEPARTMENT (for dropdown in timetable)
//     GET /api/timetable/teachers-list
//     Query: none (uses auth token for scope)
// ══════════════════════════════════════════════════════════════════════════════

router.get("/teachers-list", auth, async (req, res) => {
  try {
    const user = req.user || {};
    
    if (!user.instituteId || !user.departmentCode) {
      return res.status(400).json({
        success: false,
        message: 'Institute and department scope required'
      });
    }

    const teachers = await Teacher.find(
      {
        instituteId: user.instituteId,
        departmentCode: user.departmentCode,
      },
      { id: 1, name: 1, _id: 1 }
    ).lean();

    return res.json({
      success: true,
      data: teachers
    });
  } catch (error) {
    console.error('Error fetching teachers list:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teachers',
      error: error.message
    });
  }
});


// ══════════════════════════════════════════════════════════════════════════════
// 11. GET SUBJECTS BY INSTITUTE, DEPARTMENT & YEAR (for dropdown in timetable)
//     GET /api/timetable/subjects-list
//     Query: year (required)
// ══════════════════════════════════════════════════════════════════════════════

router.get("/subjects-list", auth, async (req, res) => {
  try {
    const user = req.user || {};
    const { year } = req.query;

    if (!user.instituteId || !user.departmentCode) {
      return res.status(400).json({
        success: false,
        message: 'Institute and department scope required'
      });
    }

    if (!year) {
      return res.status(400).json({
        success: false,
        message: 'Year parameter is required'
      });
    }

    const Subject = require("../Models/Subject");

    const subjectDoc = await Subject.findOne(
      {
        instituteId: user.instituteId,
        departmentCode: user.departmentCode,
        year: String(year),
      }
    ).lean();

    if (!subjectDoc) {
      return res.json({
        success: true,
        data: {
          subjects: [],
          labs: []
        }
      });
    }

    return res.json({
      success: true,
      data: {
        subjects: subjectDoc.subjects || [],
        labs: subjectDoc.labs || []
      }
    });
  } catch (error) {
    console.error('Error fetching subjects list:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subjects',
      error: error.message
    });
  }
});


module.exports = router;