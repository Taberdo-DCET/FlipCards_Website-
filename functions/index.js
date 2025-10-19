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
          const basePrompt = `You are an expert flashcard creator. Your task is to extract key information from the provided document and format it into a JSON array of flashcards.

**Instructions:**
1.  Identify ALL **terms** or **concepts**.
2.  For each term, provide its corresponding **definition** as found in the text.
3.  Do NOT create questions and answers. You MUST use the keys "term" and "definition".

**Your response MUST be a JSON array of objects. Each object must have the following exact structure:**
[
  {
    "term": "A key term from the document",
    "definition": "The definition for that term"
  }
]

Respond ONLY with the raw JSON array.`;

          switch (fileMimeType) {
            case "application/pdf":
              const pdfData = await pdf(fileBuffer);
              documentText = pdfData.text || "";
              break;

            case "application/vnd.openxmlformats-officedocument.presentationml.presentation": // .pptx
            // ADD THIS LINE
            case "application/vnd.openxmlformats-officedocument.wordprocessingml.document": // .docx
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

// You can add this function below your existing generateFlashcards function
exports.extractAndExplainTerms = onRequest(
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

      busboy.on("finish", async () => {
        try {
          if (!fileBuffer) return res.status(400).json({ message: "No file uploaded." });
          
          let documentText = "";
          // ✨ USE THE NEW PROMPT
          const extractionPrompt = `You are an expert academic assistant. Your first task is to analyze the overall subject of the provided document text. Identify **ALL** key terms, concepts, and formulas that are clearly defined or explained in the text.

**Step 1: Classify the Document**
Determine if the primary subject is 'mathematics' or another topic like 'history', 'science', 'literature', etc.

**Step 2: Generate JSON based on Classification**

---
**CONDITION A: If the subject is 'mathematics'**
Your response MUST be a JSON array where each object has the following structure:
- "term": The name of the mathematical formula, theorem, or concept.
- "explanation": A detailed explanation of what the concept is and its purpose, based ONLY on the document.
- "process_steps": An array of strings, where each string is a step in the process of applying the formula or solving a related problem. These steps should be clear and sequential.
- "subject": The string "mathematics".

---
**CONDITION B: If the subject is NOT 'mathematics'**
You are a localized tutor for Filipino students. Your response MUST be a JSON array where each object has the following structure:
- "term": The key term identified.
- "explanation": The detailed explanation based only on the document.
- "document_example": An example from the document. If none exists, this MUST be null.
- "ai_examples": An object with "general", "real_life_context", "filipino_context", and "filipino_context_tagalog" examples.
- "synonyms": An array of at least three relevant synonyms.
- "subject": A string representing the detected subject (e.g., "history", "science").

---
**Final Instruction:**
Based on your classification, choose ONE of the structures above and respond ONLY with the raw JSON array. Do not mix structures.`;

          switch (fileMimeType) {
            case "application/pdf":
              const pdfData = await pdf(fileBuffer);
              documentText = pdfData.text || "";
              break;
            case "application/vnd.openxmlformats-officedocument.wordprocessingml.document": // .docx
            case "application/vnd.openxmlformats-officedocument.presentationml.presentation": // .pptx
              documentText = await officeParser.parseOfficeAsync(fileBuffer);
              break;
            default:
              return res.status(400).json({ message: `Unsupported file type: ${fileMimeType}` });
          }

          if (!documentText.trim()) {
            throw new Error("Parsed document but no text was found.");
          }

          const promptParts = [extractionPrompt, "---", documentText];
          const result = await model.generateContent(promptParts);
          const aiText = result.response?.text?.() || "";

          let cleaned = aiText.replace(/```json/gi, "").replace(/```/g, "").trim();
          const i1 = cleaned.indexOf("["); 
          const i2 = cleaned.lastIndexOf("]");
          if (i1 !== -1 && i2 !== -1) cleaned = cleaned.slice(i1, i2 + 1);

          // ✨ RENAME THE OUTPUT VARIABLE FOR CLARITY
          const termsAndExplanations = JSON.parse(cleaned);
          return res.status(200).json(termsAndExplanations);

        } catch (err) {
          console.error("Process error:", err);
          return res.status(500).json({ message: "Failed to extract terms.", error: String(err?.message || err) });
        }
      });

      busboy.end(req.rawBody);
    });
  }
);

exports.summarizeDocument = onRequest(
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

      busboy.on("finish", async () => {
        try {
          if (!fileBuffer) return res.status(400).json({ message: "No file uploaded." });
          let documentText = "";

          const summarizerPrompt = `You are an expert academic assistant. Your task is to analyze the provided document text and create two distinct outputs.

          1.  **Summarize:** Create a concise summary of the entire document. This summary should capture the main ideas and key points in a single, well-written paragraph. **Important: Do not start your summary with phrases like "The document discusses..." or "This text analyzes...". Begin directly with the main point.**
          2.  **Paraphrase:** Rewrite the summary you just created in a different style while retaining the original meaning. This should also be a single paragraph.
          
          Your response MUST be a single JSON object with the following structure:
          - "summary": A string containing the paragraph of the original summary.
          - "paraphrased": A string containing the paragraph of the paraphrased version.
          
          Respond ONLY with the raw JSON object.`;

          switch (fileMimeType) {
            case "application/pdf":
              const pdfData = await pdf(fileBuffer);
              documentText = pdfData.text || "";
              break;
            case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
              documentText = await officeParser.parseOfficeAsync(fileBuffer);
              break;
            default:
              return res.status(400).json({ message: `Unsupported file type: ${fileMimeType}` });
          }

          if (!documentText.trim()) throw new Error("Parsed document but no text was found.");

          const promptParts = [summarizerPrompt, "---", documentText];
          const result = await model.generateContent(promptParts);
          const aiText = result.response?.text?.() || "";

          let cleaned = aiText.replace(/```json/gi, "").replace(/```/g, "").trim();
          const i1 = cleaned.indexOf("{"); 
          const i2 = cleaned.lastIndexOf("}");
          if (i1 !== -1 && i2 !== -1) cleaned = cleaned.slice(i1, i2 + 1);

          const summaryData = JSON.parse(cleaned);
          return res.status(200).json(summaryData);

        } catch (err) {
          console.error("Process error:", err);
          return res.status(500).json({ message: "Failed to generate summary.", error: String(err?.message || err) });
        }
      });

      busboy.end(req.rawBody);
    });
  }
);


exports.askAI = onRequest(
  { region: "us-central1", timeoutSeconds: 300, memory: "1Gi", secrets: [GEMINI_API_KEY] },
  async (req, res) => {
    cors(req, res, async () => {
      if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

      const ct = (req.headers["content-type"] || "").toLowerCase();
      if (!ct.includes("multipart/form-data")) {
        return res.status(400).json({ message: "Expected multipart/form-data with a 'file' field." });
      }

      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY.value());
      const model = genAI.getGenerativeModel({ model: "gemini-pro-latest" });

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

      busboy.on("finish", async () => {
        try {
          if (!fileBuffer) return res.status(400).json({ message: "No file uploaded." });

          const askAIPrompt = `You are an expert academic assistant. Your task is to identify and answer ALL questions present in the provided image.

**Step 1: Identify All Questions**
Scan the image and find every distinct question.

**Step 2: Generate a Response for Each Question**
For each question you find, generate a detailed answer.

- If a question is a **math problem**, your answer must be a detailed, step-by-step solution.
    - **Each step must be a separate section with a bolded heading**, like \`Step 1: Title of Step\`.
    - **Use LaTeX formatting for all mathematical equations and notations**. Enclose inline math with single dollar signs (\`$\`) and block equations with double dollar signs (\`$$\`).
    - The entire answer should be a single string formatted with Markdown and LaTeX.

- If a question is **general**, provide a clear, paragraph-based answer.

**Step 3: Format the Output**
Your response MUST be a single JSON object with a "responses" key, which contains an array of objects. Each object in the array represents one question and its answer.

The structure MUST be:
{
  "responses": [
    {
      "question_number": 1,
      "answer": "Your detailed answer to the first question."
    },
    {
      "question_number": 2,
      "answer": "Your detailed answer to the second question."
    }
  ]
}

Respond ONLY with the raw JSON object.`;
          
          // ✨ This part is different: we handle an image, not text.
          if (!fileMimeType.startsWith('image/')) {
            return res.status(400).json({ message: 'Unsupported file type. Please upload a JPG image.' });
          }

          const imagePart = {
            inlineData: {
              data: fileBuffer.toString("base64"),
              mimeType: fileMimeType,
            },
          };

          const promptParts = [askAIPrompt, imagePart];
          
          const result = await model.generateContent(promptParts);
          const aiText = result.response?.text?.() || "";

          let cleaned = aiText.replace(/```json/gi, "").replace(/```/g, "").trim();
          const i1 = cleaned.indexOf("{"); 
          const i2 = cleaned.lastIndexOf("}");
          if (i1 !== -1 && i2 !== -1) cleaned = cleaned.slice(i1, i2 + 1);

          const aiResponse = JSON.parse(cleaned);
          return res.status(200).json(aiResponse);

        } catch (err) {
          console.error("Ask AI Process error:", err);
          return res.status(500).json({ message: "Failed to get an answer from the AI.", error: String(err?.message || err) });
        }
      });

      busboy.end(req.rawBody);
    });
  }
);


// Function to handle text-based questions
exports.askAIText = onRequest(
  { region: "us-central1", timeoutSeconds: 120, memory: "1Gi", secrets: [GEMINI_API_KEY] },
  async (req, res) => {
    cors(req, res, async () => {
      // 1. Basic Request Validation
      if (req.method !== "POST") {
        return res.status(405).send("Method Not Allowed");
      }
      // Expecting JSON data
      if (!req.body || !req.body.question) {
        return res.status(400).json({ message: "Request body must be JSON and contain a 'question'." });
      }

      // 2. Initialize AI Model
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY.value());
      // Use a model suitable for chat/Q&A, like gemini-1.5-flash or gemini-pro-latest
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      try {
        const userQuestion = req.body.question;

        // 3. Define the AI's Persona and Task
        const askTextPrompt = `You are an expert academic assistant focused on **clear explanations and logical reasoning**. Your task is to answer the user's question accurately, showing the reasoning where applicable.

**Formatting Rules:**
-   If the question is a **math problem**:
    -   Provide a detailed, **step-by-step** solution.
    -   Each step MUST have a bolded heading (e.g., "**Step 1: State the formula**"). Explain the reasoning for each step briefly.
    -   Use **LaTeX** for all math notations ($inline$ or $$block$$).
    -   Format the entire response as a single Markdown string with LaTeX.
-   If the question is **general** (e.g., history, science, definition) and requires explanation:
    -   Break down the answer into logical points or steps if possible. Use bolded headings or bullet points for clarity.
    -   Provide a comprehensive answer using clear language. Use Markdown for formatting.
    -   If defining a term, include its core definition and perhaps a key example or context.

**General Guidelines:**
-   Ensure accuracy based on established knowledge.
-   Be clear and avoid unnecessary jargon.

User Question: "${userQuestion}"

Your Explained Answer:`;

        // 4. Generate Content
        const result = await model.generateContent(askTextPrompt);
        const aiText = result.response?.text?.() || "Sorry, I couldn't generate a response for that question.";

        // 5. Send Response
        // Respond with a simple JSON object containing the answer
        return res.status(200).json({ answer: aiText });

      } catch (err) {
        console.error("Ask AI Text error:", err);
        // Provide a generic error message
        return res.status(500).json({ message: "Failed to get an answer from the AI.", error: String(err?.message || err) });
      }
    });
  }
);





exports.chatWithFlipCardsAI = onRequest(
  { region: "us-central1", timeoutSeconds: 60, memory: "1Gi", secrets: [GEMINI_API_KEY] },
  async (req, res) => {
    cors(req, res, async () => {
      // Basic request validation
      if (req.method !== "POST") {
        return res.status(405).send("Method Not Allowed");
      }
      if (!req.body.question) {
        return res.status(400).json({ message: "Request body must contain a 'question'." });
      }

      // Initialize AI model
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY.value());
      const model = genAI.getGenerativeModel({ model: "gemini-pro-latest" }); // Using gemini-pro-latest as per previous context

      try {
        const userQuestion = req.body.question;
        // The assistant's persona, features, and rules, including the shop link
        const chatPrompt = `You are "FlipCards AI Assistant," a friendly and helpful guide for the FlipCards AI website. Your only purpose is to answer questions about the website's features.

**Website Features:**
- **Create Sets Tab:** Users can upload PDF, PPTX, or DOCX files to instantly generate flashcards with a "term" and "definition".
- **Analyze File Tab:** Users can upload PDF, PPTX, or DOCX files to get detailed explanations of key concepts. For math files, it provides step-by-step solutions. For other topics, it gives Filipino-contextualized examples in both English and Tagalog, plus synonyms.
- **Summarizer Tab:** Users can upload PDF, PPTX, or DOCX files to get a concise summary and a paraphrased version.
- **Ask AI (Image) Tab:** Users can upload a JPG image of a question (including math problems) to get a detailed answer.
- **Ask AI (Text) Tab:** Users can enter a text question (including math problems) to get a detailed answer.

**Important Usage Note:**
- **Single Task Per Tab:** While the AI is processing a file upload (on Create Sets, Analyze File, Summarizer, or Ask AI Image tabs) or answering a text question (on Ask AI Text tab), you **cannot start a new task on that same tab**. The upload buttons or the send button will be temporarily disabled, and trying to initiate a new request will prompt you to wait until the current one finishes. This ensures each request completes properly before the next one begins. You *can*, however, switch to a different tab and start a task there if needed.

**Usage Limits & Subscriptions:**
- Free users have a limited number of daily uses shared across *all* AI features. To get more uses, users can buy subscriptions from the shop. The shop is located at: https://flipcards-7adab.web.app/shop

**Your Rules:**
- Answer concisely and directly.
- Only answer questions related to the functions of the FlipCards.ai website as described above.
- If a user asks about increasing their usage limits or getting more uses, inform them that they can purchase subscriptions from the shop. **Do NOT include the URL https://flipcards-7adab.web.app/shop in your text answer in this case.**
- If a user asks a question unrelated to the website's features, politely decline and state your purpose. For example, say: "I can only answer questions about how FlipCards AI works. How can I help you with one of its features?"
- Do not make up features.`;

        // Combine the base prompt with the user's specific question
        const finalPrompt = `${chatPrompt}\n\nUser Question: "${userQuestion}"`;

        // Generate the AI's response text
        const result = await model.generateContent(finalPrompt);
        let aiText = result.response?.text?.() || "Sorry, I couldn't come up with a response.";

        // --- Logic to detect shop mention and structure response ---
        const shopUrl = "https://flipcards-7adab.web.app/shop";
        const shopKeywords = ["subscription", "shop", "purchase", "usage limit", "more uses", "increase limit", "buy"];
        let shouldAddButton = false;

        // NEW: Check if the AI's response indicates the user should visit the shop
        if (shopKeywords.some(keyword => aiText.toLowerCase().includes(keyword)) || aiText.includes(shopUrl)) {
          shouldAddButton = true;
          // NEW: Remove the raw URL from the text response
          aiText = aiText.replace(shopUrl, "").trim();
          // NEW: Clean up potential trailing prepositions if URL was removed
          if (aiText.endsWith("at:") || aiText.endsWith("at")) {
             aiText = aiText.replace(/at:?$/, "").trim();
          }
          // NEW: Provide a default response if removing the URL left the text empty/short
          if (!aiText || aiText.length < 10) {
            aiText = "To get more uses, you can purchase subscriptions from the shop.";
          }
        }

        // NEW: Return structured JSON if the button should be added
        if (shouldAddButton) {
          return res.status(200).json({
            answer: aiText,
            actionButton: {
              text: "Visit Shop",
              url: shopUrl
            }
          });
        } else {
          // Return standard response if no button is needed
          return res.status(200).json({ answer: aiText });
        }
        // --- End of logic for shop button ---

      } catch (err) {
        console.error("Chat error:", err);
        return res.status(500).json({ message: "Failed to get a response from the AI." });
      }
    });
  }
);


exports.chatWithLobbyAI = onRequest(
  { region: "us-central1", timeoutSeconds: 60, memory: "1Gi", secrets: [GEMINI_API_KEY] },
  async (req, res) => {
    cors(req, res, async () => {
      if (req.method !== "POST") {
        return res.status(405).send("Method Not Allowed");
      }
      if (!req.body.question) {
        return res.status(400).json({ message: "Request body must contain a 'question'." });
      }

      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY.value());
      const model = genAI.getGenerativeModel({ model: "gemini-pro-latest" });

      try {
        const userQuestion = req.body.question;
        
        const lobbyChatPrompt = `You are "FlipCards Lobby Assistant," a friendly and helpful guide for the main lobby of the FlipCards.ai website. Your primary purpose is to answer user questions about the features available in the lobby.

**About the Platform:**
FlipCards.ai is a budget-friendly review website designed for students seeking affordable study tools. It offers lifetime access for a one-time low cost, with all future updates included. Users only need to purchase a single account slot.

**Lobby Features Explained:**

* **Flashcard Folders:** This is where you manage all your study sets.
    * **Your Flashcard Sets:** These are your private cards that you can edit or delete.
    * **Public Flashcard Sets:** Sets shared by other users in the community. You can "like" these to save them.
    * **Liked Flashcard Sets:** A collection of all the public sets you have liked for easy access.

* **Main Tools & Features:**
    * **FlipNotes:** A notepad for quickly jotting down notes and creating Annotations on your notes and also creating classroom to share notes with other users.
    * **Real-time Chat:** Study and communicate with other users.
    * **FlipTimer:** A Pomodoro-style timer to help manage study sessions.
    * **Leaderboards:** Compete with other users and track your rank.
    * **Leveling System:** Earn XP to level up and unlock new badges for your profile.
    * **General Question Section:** A community space to ask and answer study-related questions.
    * **Members List:** See a list of other registered members online.
    * **Music:** A shared community playlist to listen to while you study.
    * **Profile & Socials:** View your profile, level, badges, and find our social media links.
    * **Get Started / Add Sets:** Buttons to create new flashcard sets from either text or images.
    * **FlipCards AI:** A separate, powerful tool for generating flashcards from files (PDF, DOCX, PPTX), summarizing documents, and answering questions. This is accessed via its dedicated button.
    *  **ParseCards:** An Alternative tool for generating flashcards from text input. This is accessed via its dedicated button located in Folder Section at the right of PinpPoint Mode Button.
    

* **Review Modes (How you study your flashcards):**
    1.  **Flashcard Mode:** The classic way to study. View the term and recall the definition.
    2.  **Match Mode:** A timed game to match terms with their definitions.
    3.  **Learn Mode:** A multiple-choice quiz based on definitions to help with memorization.
    4.  **Test Mode:** A written-exam style mode where you type the correct term for a given definition.
    5.  **Defidrop Mode:** A timed game where you choose the correct definition from multiple options. Can be played with others.
    6.  **Quibbl Mode:** A multiplayer game with live chat where you compete for high scores.
    7.  **Pinpoint Mode:** An image-based learning mode, ideal for visual subjects like nursing or anatomy.
    8. **Blitz Mode:** A fast-paced review mode where you quickly decide if the given definition is a True or False.

**Your Rules:**
- Answer concisely and directly based *only* on the features listed above.
- If a user asks a question about a feature of the *FlipCards AI tool* (like how the summarizer works or what file types it accepts), gently guide them. Say: "That's a feature of the FlipCards AI page! You can ask the AI assistant on that page for more specific details."
- If a user asks a general knowledge question (e.g., "Who is the president?"), politely decline and state your purpose. Say something like: "I can only answer questions about the features in the FlipCards lobby. How can I help you navigate the site?"`;

        const finalPrompt = `${lobbyChatPrompt}\n\nUser Question: "${userQuestion}"`;
        
        const result = await model.generateContent(finalPrompt);
        const aiText = result.response?.text?.() || "Sorry, I couldn't come up with a response.";

        return res.status(200).json({ answer: aiText });

      } catch (err) {
        console.error("Lobby Chat error:", err);
        return res.status(500).json({ message: "Failed to get a response from the AI." });
      }
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