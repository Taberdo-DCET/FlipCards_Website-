// ===== DEPENDENCIES =====
// Firebase SDKs
const functions = require("firebase-functions");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");

// Google Generative AI and file processing libraries
const { GoogleGenerativeAI } = require("@google/generative-ai");

const pdf = require("pdf-parse");
const Busboy = require("busboy");
const cors = require("cors")({ origin: true });

const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

// Define a secret named GEMINI_API_KEY (value comes from Secret Manager)
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

// ===== INITIALIZATION =====
// Initialize Firebase Admin SDK to manage users
admin.initializeApp();

// Initialize the Gemini AI Client with the secure key from Firebase config



// ===== CLOUD FUNCTIONS =====

/**
 * An HTTP function to generate flashcards from an uploaded PDF.
 * Triggered by a POST request from your website.
 */
exports.generateFlashcards = onRequest(
  { region: "us-central1", timeoutSeconds: 300, memory: "512Mi", secrets: [GEMINI_API_KEY] },
  async (req, res) => {
    cors(req, res, async () => {
      if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

      const ct = (req.headers["content-type"] || "").toLowerCase();

      // Simple JSON ping
      if (ct.includes("application/json")) {
        return res.status(200).json({
          ok: true,
          note: "Use multipart/form-data with a 'file' field to upload a PDF."
        });
      }

      // Require multipart for uploads
      if (!ct.includes("multipart/form-data")) {
        return res.status(400).json({ message: "Expected multipart/form-data with a 'file' field." });
      }

      // -------- Gemini init via Secret Manager (v2) --------
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY.value());
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });



      // -------- Your existing Busboy + PDF logic --------
      const busboy = Busboy({ headers: req.headers });
      let fileBuffer = null;

      busboy.on("file", (fieldname, file) => {
        const chunks = [];
        file.on("data", (c) => chunks.push(c));
        file.on("end", () => { fileBuffer = Buffer.concat(chunks); });
      });

      busboy.on("error", (err) => {
        console.error("Busboy error:", err);
        return res.status(500).json({ message: "File upload error." });
      });

      busboy.on("finish", async () => {
        try {
          if (!fileBuffer) return res.status(400).json({ message: "No file uploaded." });

          const data = await pdf(fileBuffer);
          const documentText = data.text || "";
          if (!documentText.trim()) {
            return res.status(500).json({ message: "PDF parsed but no text found." });
          }

          const prompt = `
            You are an expert study assistant.
            Convert the text below into a JSON array of flashcards.
            Each object must have "term" and "definition".
            Respond ONLY with raw JSON.
            ---
            ${documentText}
          `;

          const result = await model.generateContent(prompt);
          const aiText = result.response?.text?.() || "";

          // Clean + parse
          let cleaned = aiText.replace(/```json/gi, "").replace(/```/g, "").trim();
          const i1 = cleaned.indexOf("["); const i2 = cleaned.lastIndexOf("]");
          if (i1 !== -1 && i2 !== -1) cleaned = cleaned.slice(i1, i2 + 1);

          const flashcards = JSON.parse(cleaned);
          return res.status(200).json(flashcards);
        } catch (err) {
          console.error("Process error:", err);
          return res.status(500).json({ message: "Failed to generate flashcards.", error: String(err?.message || err) });
        }
      });

      busboy.end(req.rawBody);
    });
  }
);




/**
 * A scheduled function that runs every 2 hours to delete expired anonymous guest users.
 */
exports.autoDeleteExpiredGuests = onSchedule("every 2 hours", async (event) => {
  const now = Date.now();
  const fiveMinutesInMillis = 5 * 60 * 1000;

  try {
    const result = await admin.auth().listUsers();
    // Find anonymous users older than 5 minutes
    const expiredUsers = result.users.filter(user =>
      user.providerData.length === 0 &&
      (now - new Date(user.metadata.creationTime).getTime()) > fiveMinutesInMillis
    );

    const deletions = expiredUsers.map(user => {
      console.log(`Deleting guest: ${user.uid}`);
      return admin.auth().deleteUser(user.uid);
    });

    await Promise.all(deletions);
    console.log(`✅ Deleted ${deletions.length} expired anonymous users.`);
    return null;
  } catch (err) {
    console.error("❌ Error during deletion:", err);
    return null;
  }
});