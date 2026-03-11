const express = require("express");
const axios   = require("axios");
const multer  = require("multer");
const mammoth = require("mammoth");

// ✅ FIXED: point directly to the lib file — avoids the "pdfParse is not a function"
// bug caused by pdf-parse's default export resolving incorrectly on some Node versions.
const pdfParse = require("pdf-parse");

const router = express.Router();

// ── Multer ────────────────────────────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB

  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/octet-stream", // React Native sometimes sends this
    ];

    const ext = (file.originalname ?? "").split(".").pop()?.toLowerCase();
    const allowedExts = ["pdf", "doc", "docx"];

    console.log(`📎 File: ${file.originalname} | MIME: ${file.mimetype} | Ext: .${ext}`);

    if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: .${ext} (${file.mimetype})`));
    }
  },
});

// ── Text Extraction ───────────────────────────────────────────────────────────
async function extractText(file) {
  const { mimetype, buffer, originalname } = file;
  const ext = (originalname ?? "").split(".").pop()?.toLowerCase();

  // Always prefer extension over MIME — React Native MIME is unreliable
  const isPdf  = ext === "pdf"  || mimetype === "application/pdf";
  const isDocx = ext === "docx" || mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const isDoc  = ext === "doc"  || mimetype === "application/msword";

  console.log(`📂 Extracting: isPdf=${isPdf} | isDocx=${isDocx} | isDoc=${isDoc}`);

  // ── PDF ─────────────────────────────────────────────────────────────────────
  if (isPdf) {
    console.log("📄 Running pdf-parse...");

    // Validate it's actually a PDF before parsing (check magic bytes)
    const header = buffer.slice(0, 5).toString("ascii");
    if (!header.startsWith("%PDF")) {
      throw new Error("File does not appear to be a valid PDF (missing %PDF header).");
    }

    // ✅ Pass buffer directly — pdfParse(buffer) is the correct signature
    const data = await pdfParse(buffer);

    if (!data?.text?.trim()) {
      throw new Error(
        "PDF appears to be scanned/image-only. No text could be extracted. " +
        "Please upload a text-based PDF."
      );
    }

    const words = data.text.trim().split(/\s+/).length;
    console.log(`✅ PDF extracted: ${words} words across ${data.numpages} page(s)`);
    return data.text;
  }

  // ── DOCX / DOC ──────────────────────────────────────────────────────────────
  if (isDocx || isDoc) {
    console.log("📘 Running mammoth...");
    const result = await mammoth.extractRawText({ buffer });

    if (!result?.value?.trim()) {
      throw new Error("Could not extract text from Word document. The file may be empty or corrupted.");
    }

    const words = result.value.trim().split(/\s+/).length;
    console.log(`✅ DOCX extracted: ${words} words`);
    return result.value;
  }

  throw new Error(`Unsupported file format: .${ext}`);
}

// ── POST /api/ai/analyze ──────────────────────────────────────────────────────
router.post(
  "/analyze",

  // Step 1 — Multer
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        console.error("❌ Multer error:", err.message);
        return res.status(400).json({ error: err.message });
      }

      console.log("=== /api/ai/analyze ===");
      console.log("Content-Type :", req.headers["content-type"]);
      console.log(
        "File         :",
        req.file
          ? `${req.file.originalname} | ${req.file.mimetype} | ${(req.file.size / 1024).toFixed(1)} KB`
          : "❌ NOT RECEIVED"
      );

      if (!req.file) {
        return res.status(400).json({
          error: "No file received. Make sure the field name is 'file' and the request is multipart/form-data.",
        });
      }

      next();
    });
  },

  // Step 2 — Main handler
  async (req, res) => {
    try {

      // ── 1. Extract text ──────────────────────────────────────────────────
      let text;
      try {
        text = await extractText(req.file);
      } catch (extractErr) {
        console.error("❌ Extraction error:", extractErr.message);
        return res.status(422).json({ error: extractErr.message });
      }

      const trimmed   = text.trim();
      const wordCount = trimmed.split(/\s+/).length;
      const charCount = trimmed.length;

      console.log(`📊 Extracted: ${wordCount} words, ${charCount} chars`);

      if (!trimmed) {
        return res.status(422).json({ error: "No text could be extracted from the file." });
      }

      if (wordCount < 5) {
        return res.status(422).json({
          error: `Document is too short (${wordCount} words). Please upload a document with at least 5 words.`,
        });
      }

      // ── 2. Send to FastAPI ────────────────────────────────────────────────
      console.log(`🚀 Forwarding ${wordCount} words to FastAPI...`);

      let aiResponse;
      try {
        aiResponse = await axios.post(
          "http://localhost:8000/analyze",
          trimmed,
          {
            headers: { "Content-Type": "text/plain" },
            timeout: 30000000,
          }
        );
        console.log("✅ FastAPI response received");
      } catch (aiErr) {
        console.error("❌ FastAPI error:", {
          code   : aiErr.code,
          status : aiErr.response?.status,
          detail : aiErr.response?.data,
        });

        if (aiErr.code === "ECONNREFUSED") {
          return res.status(503).json({
            error: "AI service is offline. Make sure the Python server is running on port 8000.",
          });
        }
        if (aiErr.code === "ECONNABORTED") {
          return res.status(504).json({
            error: "AI service timed out. Try a shorter document.",
          });
        }
        if (aiErr.response) {
          return res.status(aiErr.response.status).json({
            error: aiErr.response.data?.detail ?? "AI service returned an error.",
          });
        }

        return res.status(500).json({ error: `AI service unreachable: ${aiErr.message}` });
      }

      // ── 3. Respond ────────────────────────────────────────────────────────
      return res.json({
        ...aiResponse.data,
        file_name         : req.file.originalname,
        extracted_preview : trimmed.slice(0, 300),
      });

    } catch (error) {
      console.error("❌ Unexpected server error:", error.message);
      return res.status(500).json({ error: error.message ?? "Analysis failed." });
    }
  }
);

module.exports = router;