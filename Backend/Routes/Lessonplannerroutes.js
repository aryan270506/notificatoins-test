// Routes/LessonPlannerRoutes.js
// Base path: /api/lesson-planner
//
// ┌─────────────────────────────────────────────────────────────────────────┐
// │  ROUTE SUMMARY                                                          │
// │                                                                         │
// │  GET    /                  → list plans (filter by teacherId/year/div)  │
// │  GET    /:id               → single plan                                │
// │  POST   /                  → create plan (or upsert)                    │
// │  PUT    /:id               → full update (subject, topics list)         │
// │                                                                         │
// │  POST   /:id/topics        → add a topic                                │
// │  PUT    /:id/topics/:tid   → edit a topic title/unit                    │
// │  DELETE /:id/topics/:tid   → remove a topic                             │
// │                                                                         │
// │  POST   /:id/topics/:tid/subtopics          → add subtopic              │
// │  PATCH  /:id/topics/:tid/subtopics/:sid     → toggle subtopic completed │
// │  DELETE /:id/topics/:tid/subtopics/:sid     → remove subtopic           │
// │                                                                         │
// │  POST   /:id/resources          → add a link resource (JSON body)       │
// │  POST   /:id/resources/upload   → upload a file resource (multipart)    │
// │  DELETE /:id/resources/:rid     → remove a resource                     │
// │  GET    /:id/resources/:rid/download → stream/download a file           │
// └─────────────────────────────────────────────────────────────────────────┘

const express    = require("express");
const router     = express.Router();
const multer     = require("multer");
const path       = require("path");
const fs         = require("fs");
const LessonPlan = require("../Models/LessonPlan");

// ── Multer – store files in memory (saved to DB as buffer)
const UPLOAD_DIR = path.join(__dirname, "../uploads/lesson-resources");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.memoryStorage();
const upload  = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

// ─────────────────────────────────────────────────────────────
// Helper: find plan or respond 404
// ─────────────────────────────────────────────────────────────
async function findPlan(id, res) {
  const plan = await LessonPlan.findById(id);
  if (!plan) {
    res.status(404).json({ success: false, message: "Lesson plan not found" });
    return null;
  }
  return plan;
}

// ═════════════════════════════════════════════════════════════
// ROOT ROUTES  (no dynamic segment — must come first)
// ═════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────
// 1. LIST PLANS
//    GET /api/lesson-planner?teacherId=&year=&division=
// ─────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { teacherId, year, division } = req.query;
    const filter = {};
    if (teacherId) filter.teacherId = teacherId;
    if (year)      filter.year      = year;
    if (division)  filter.division  = division;

    const plans = await LessonPlan.find(filter).select("-resources.fileData");
    res.json({ success: true, data: plans });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 2. CREATE (or UPSERT) A PLAN
//    POST /api/lesson-planner
//    Body: { teacherId, year, division, type, subject?, topics? }
// ─────────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { teacherId, year, division, type, subject, topics } = req.body;

    if (!teacherId || !year || !division || !type) {
      return res.status(400).json({
        success: false,
        message: "teacherId, year, division, and type are required",
      });
    }

    const plan = await LessonPlan.findOneAndUpdate(
      { teacherId, year, division, type },
      {
        $setOnInsert: { teacherId, year, division, type },
        $set: {
          ...(subject !== undefined && { subject }),
          ...(topics  !== undefined && { topics  }),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({ success: true, data: plan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═════════════════════════════════════════════════════════════
// SUBTOPIC ROUTES  (most specific — register before shorter paths)
// ═════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────
// 3. ADD SUBTOPIC
//    POST /api/lesson-planner/:id/topics/:tid/subtopics
// ─────────────────────────────────────────────────────────────
router.post("/:id/topics/:tid/subtopics", async (req, res) => {
  try {
    const plan = await findPlan(req.params.id, res);
    if (!plan) return;

    const topic = plan.topics.id(req.params.tid);
    if (!topic) return res.status(404).json({ success: false, message: "Topic not found" });

    const { title } = req.body;
    if (!title) return res.status(400).json({ success: false, message: "title is required" });

    topic.subtopics.push({ title });
    await plan.save();

    res.status(201).json({ success: true, data: plan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 4. TOGGLE SUBTOPIC COMPLETED
//    PATCH /api/lesson-planner/:id/topics/:tid/subtopics/:sid
// ─────────────────────────────────────────────────────────────
router.patch("/:id/topics/:tid/subtopics/:sid", async (req, res) => {
  try {
    const plan = await findPlan(req.params.id, res);
    if (!plan) return;

    const topic = plan.topics.id(req.params.tid);
    if (!topic) return res.status(404).json({ success: false, message: "Topic not found" });

    const subtopic = topic.subtopics.id(req.params.sid);
    if (!subtopic) return res.status(404).json({ success: false, message: "Subtopic not found" });

    subtopic.completed = !subtopic.completed;
    await plan.save();

    res.json({ success: true, data: plan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 5. DELETE SUBTOPIC
//    DELETE /api/lesson-planner/:id/topics/:tid/subtopics/:sid
// ─────────────────────────────────────────────────────────────
router.delete("/:id/topics/:tid/subtopics/:sid", async (req, res) => {
  try {
    const plan = await findPlan(req.params.id, res);
    if (!plan) return;

    const topic = plan.topics.id(req.params.tid);
    if (!topic) return res.status(404).json({ success: false, message: "Topic not found" });

    topic.subtopics = topic.subtopics.filter(s => s._id.toString() !== req.params.sid);
    await plan.save();

    res.json({ success: true, data: plan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═════════════════════════════════════════════════════════════
// TOPIC ROUTES
// ═════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────
// 6. ADD A TOPIC
//    POST /api/lesson-planner/:id/topics
// ─────────────────────────────────────────────────────────────
router.post("/:id/topics", async (req, res) => {
  try {
    const plan = await findPlan(req.params.id, res);
    if (!plan) return;

    const { unit, title, subtopics = [] } = req.body;
    if (!unit || !title) {
      return res.status(400).json({ success: false, message: "unit and title are required" });
    }

    plan.topics.push({
      unit,
      title,
      subtopics: subtopics.map(s => ({ title: typeof s === "string" ? s : s.title })),
      order: plan.topics.length,
    });
    await plan.save();

    res.status(201).json({ success: true, data: plan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 7. EDIT A TOPIC
//    PUT /api/lesson-planner/:id/topics/:tid
// ─────────────────────────────────────────────────────────────
router.put("/:id/topics/:tid", async (req, res) => {
  try {
    const plan = await findPlan(req.params.id, res);
    if (!plan) return;

    const topic = plan.topics.id(req.params.tid);
    if (!topic) return res.status(404).json({ success: false, message: "Topic not found" });

    const { unit, title } = req.body;
    if (unit  !== undefined) topic.unit  = unit;
    if (title !== undefined) topic.title = title;
    await plan.save();

    res.json({ success: true, data: plan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 8. DELETE A TOPIC
//    DELETE /api/lesson-planner/:id/topics/:tid
// ─────────────────────────────────────────────────────────────
router.delete("/:id/topics/:tid", async (req, res) => {
  try {
    const plan = await findPlan(req.params.id, res);
    if (!plan) return;

    plan.topics = plan.topics.filter(t => t._id.toString() !== req.params.tid);
    await plan.save();

    res.json({ success: true, data: plan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═════════════════════════════════════════════════════════════
// RESOURCE ROUTES
// ═════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────
// 9. UPLOAD FILE RESOURCE  ← must be before /:id/resources
//    POST /api/lesson-planner/:id/resources/upload
//    multipart/form-data: field name "resource"
// ─────────────────────────────────────────────────────────────
router.post("/:id/resources/upload", upload.single("resource"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const plan = await findPlan(req.params.id, res);
    if (!plan) return;

    plan.resources.push({
      type:        "file",
      name:        req.file.originalname,
      fileData:    req.file.buffer,
      mimeType:    req.file.mimetype,
      size:        req.file.size,
      description: req.body.description || "",
    });
    await plan.save();

    const saved = plan.resources[plan.resources.length - 1];
    res.status(201).json({
      success: true,
      data: {
        _id:        saved._id,
        type:       saved.type,
        name:       saved.name,
        mimeType:   saved.mimeType,
        size:       saved.size,
        description: saved.description,
        uploadedAt: saved.uploadedAt,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 10. DOWNLOAD / STREAM A FILE RESOURCE  ← before /:id
//     GET /api/lesson-planner/:id/resources/:rid/download
// ─────────────────────────────────────────────────────────────
router.get("/:id/resources/:rid/download", async (req, res) => {
  try {
    const plan = await LessonPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: "Lesson plan not found" });

    const resource = plan.resources.id(req.params.rid);
    if (!resource || !resource.fileData) {
      return res.status(404).json({ success: false, message: "File not found" });
    }

    res.set({
      "Content-Type":        resource.mimeType,
      "Content-Disposition": `inline; filename="${resource.name}"`,
    });
    res.send(resource.fileData);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 11. ADD LINK RESOURCE
//     POST /api/lesson-planner/:id/resources
//     Body: { name, uri, description? }
// ─────────────────────────────────────────────────────────────
router.post("/:id/resources", async (req, res) => {
  try {
    const plan = await findPlan(req.params.id, res);
    if (!plan) return;

    const { name, uri, description } = req.body;
    if (!name || !uri) {
      return res.status(400).json({ success: false, message: "name and uri are required" });
    }

    plan.resources.push({ type: "link", name, uri, description: description || "" });
    await plan.save();

    res.status(201).json({ success: true, data: plan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 12. DELETE RESOURCE
//     DELETE /api/lesson-planner/:id/resources/:rid
// ─────────────────────────────────────────────────────────────
router.delete("/:id/resources/:rid", async (req, res) => {
  try {
    const plan = await findPlan(req.params.id, res);
    if (!plan) return;

    const resource = plan.resources.id(req.params.rid);
    if (resource && resource.type === "file" && resource.uri) {
      fs.unlink(resource.uri, () => {}); // fire and forget
    }

    plan.resources = plan.resources.filter(r => r._id.toString() !== req.params.rid);
    await plan.save();

    res.json({ success: true, message: "Resource removed", data: plan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═════════════════════════════════════════════════════════════
// PLAN ROUTES  (generic /:id — always last)
// ═════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────
// 13. FULL UPDATE PLAN
//     PUT /api/lesson-planner/:id
// ─────────────────────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const plan = await findPlan(req.params.id, res);
    if (!plan) return;

    const { subject, topics } = req.body;
    if (subject !== undefined) plan.subject = subject;
    if (topics  !== undefined) plan.topics  = topics;
    await plan.save();

    res.json({ success: true, data: plan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 14. GET SINGLE PLAN  ← MUST BE LAST (catches anything with /:id)
//     GET /api/lesson-planner/:id
// ─────────────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const plan = await findPlan(req.params.id, res);
    if (!plan) return;
    res.json({ success: true, data: plan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 15. GET STUDENT NOTES BY SUBJECT
//     GET /api/lesson-planner/student/:studentId/subject/:subject
// ─────────────────────────────────────────────────────────────
router.get("/student/:studentId/subject/:subject", async (req, res) => {
  try {
    const { subject } = req.params;
    // Find all lesson plans for this subject
    const plans = await LessonPlan.find({ subject: new RegExp(`^${decodeURIComponent(subject)}$`, "i") });
    if (!plans || plans.length === 0) {
      return res.status(404).json({ success: false, message: "No lesson plans found for subject" });
    }

    // Collect all resources and topics from all plans
    let resources = [];
    let topics = [];
    plans.forEach(plan => {
      if (plan.resources && plan.resources.length > 0) {
        resources = resources.concat(
          plan.resources.map(r => {
            let url = r.type === "file" ? `/api/lesson-planner/${plan._id}/resources/${r._id}/download` : r.uri;
            return {
              _id: r._id,
              name: r.name,
              type: r.type,
              url,
              size: r.size,
              uploadedAt: r.uploadedAt,
              mimeType: r.mimeType,
              description: r.description,
            };
          })
        );
      }
      if (plan.topics && plan.topics.length > 0) {
        topics = topics.concat(plan.topics);
      }
    });

    res.status(200).json({ success: true, resources, topics });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;