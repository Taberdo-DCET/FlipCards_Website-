// ===== DEPENDENCIES =====
// Firebase SDKs
const functions = require("firebase-functions");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");

// Google Generative AI and file processing libraries
const { GoogleGenerativeAI } = require("@google/generative-ai");
const pdf = require("pdf-parse");
const officeParser = require("officeparser"); // 👈 Use officeparser
const Busboy = require("busboy");
const cors = require("cors")({ origin: true });

const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

// ===== INITIALIZATION =====
admin.initializeApp();

// ===== CLOUD FUNCTIONS =====
exports.generateFlashcards = onRequest(
  { region: "us-central1", timeoutSeconds: 300, memory: "1Gi", secrets: [GEMINI_API_KEY] },
  async (req, res) => {
    cors(req, res, async () => {
      if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

      const ct = (req.headers["content-type"] || "").toLowerCase();
      if (!ct.includes("multipart/form-data")) {
        return res.status(400).json({ message: "Expected multipart/form-data with a 'file' field." });
      }

      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY.value());
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const busboy = Busboy({ headers: req.headers });
      let fileBuffer = null;
      let fileMimeType = null;

      busboy.on("file", (fieldname, file, info) => {
        const { mimeType } = info;
        fileMimeType = mimeType;
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
          
          let documentText = "";
          const basePrompt = `You are an expert study assistant. Convert the provided content into a JSON array of flashcards. Each object must have "term" and "definition". Respond ONLY with raw JSON.`;

          switch (fileMimeType) {
            case "application/pdf":
              const pdfData = await pdf(fileBuffer);
              documentText = pdfData.text || "";
              break;

            case "application/vnd.openxmlformats-officedocument.presentationml.presentation": // .pptx
              // ✅ THIS IS THE FIX: Simpler parsing directly from the buffer
              documentText = await officeParser.parseOfficeAsync(fileBuffer);
              break;

            default:
              return res.status(400).json({ message: `Unsupported file type: ${fileMimeType}` });
          }

          if (!documentText.trim()) {
            throw new Error("Parsed document but no text was found.");
          }

          const promptParts = [basePrompt, "---", documentText];
          const result = await model.generateContent(promptParts);
          const aiText = result.response?.text?.() || "";

          let cleaned = aiText.replace(/```json/gi, "").replace(/```/g, "").trim();
          const i1 = cleaned.indexOf("["); 
          const i2 = cleaned.lastIndexOf("]");
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