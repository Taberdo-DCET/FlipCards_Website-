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
const AdmZip = require("adm-zip");
const { ImageAnnotatorClient } = require('@google-cloud/vision');
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

// ===== INITIALIZATION =====
admin.initializeApp();
const visionClient = new ImageAnnotatorClient();
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
1.  Identify ALL **terms** or **concepts** available in the document.
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
                // Keep PPTX handling simple for now (no image extraction here)
                documentText = await officeParser.parseOfficeAsync(fileBuffer);
                break;

              // --- START: New DOCX Handling ---
              case "application/vnd.openxmlformats-officedocument.wordprocessingml.document": // .docx
                console.log("Processing DOCX file...");
                // 1. Get main text using officeparser
                try {
                    documentText = await officeParser.parseOfficeAsync(fileBuffer);
                    console.log(`Initial text length from DOCX body: ${documentText?.length || 0}`);
                } catch (parseError) {
                    console.error("Error parsing DOCX body:", parseError);
                    documentText = ""; // Start with empty if body parsing fails
                }

                // 2. Extract and process images using AdmZip and Vision API
                let imageText = "";
                try {
                  const zip = new AdmZip(fileBuffer);
                  const zipEntries = zip.getEntries();
                  // Look for images in the standard 'word/media/' path
                  const imageEntries = zipEntries.filter(entry =>
                    entry.entryName.startsWith('word/media/') &&
                    /\.(jpe?g|png|gif)$/i.test(entry.entryName) // Filter for common image types
                  );

                  console.log(`Found ${imageEntries.length} potential image(s) in DOCX.`);

                  // Process images sequentially
                  for (const imgEntry of imageEntries) {
                    console.log(`Processing image: ${imgEntry.entryName}`);
                    const imageBuffer = imgEntry.getData(); // Get image data as buffer

                    if (!imageBuffer || imageBuffer.length === 0) {
                        console.log(`Skipping empty image buffer for ${imgEntry.entryName}`);
                        continue;
                    }

                    try {
                         // Prepare request for Vision API
                        const request = {
                            image: { content: imageBuffer.toString('base64') }, // Send as base64 string
                      
                        };

                        // *** THIS IS WHERE visionClient IS USED ***
                        const [result] = await visionClient.textDetection(request);
                        const detections = result.textAnnotations;

                        if (detections && detections.length > 0 && detections[0].description) {
                          const detectedText = detections[0].description;
                          console.log(`Detected text (${detectedText.length} chars) from ${imgEntry.entryName}`);
                          imageText += `\n\n--- Start Content From Image: ${imgEntry.entryName} ---\n${detectedText}\n--- End Content From Image ---\n\n`;
                        } else {
                            console.log(`No text detected by Vision API in image: ${imgEntry.entryName}`);
                        }
                    } catch (visionError) {
                        console.error(`Error processing image ${imgEntry.entryName} with Vision API:`, visionError.message || visionError);
                        imageText += `\n\n--- Error processing image ${imgEntry.entryName} with Vision API ---\n\n`;
                    }
                  } // end for loop

                } catch (zipError) {
                  console.error("Error reading DOCX as ZIP:", zipError);
                  imageText += "\n\n--- Error: Could not process embedded images in DOCX. ---\n\n";
                }

                // 3. Combine main text and image text
                if (imageText) {
                    documentText = (documentText || "") + imageText; // Ensure documentText is a string
                    console.log(`Total text length after adding image text: ${documentText.length}`);
                }
                break; // End of .docx case
              // --- END: New DOCX Handling ---
                case "text/plain":
              console.log("Processing plain text file (from Google Doc import)...");
              // The buffer already contains the plain text
              documentText = fileBuffer.toString('utf-8');
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
          let imageText = "";
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
            case "application/vnd.openxmlformats-officedocument.presentationml.presentation": // .pptx
              // Keep PPTX handling simple for Analyze tab for now
              documentText = await officeParser.parseOfficeAsync(fileBuffer);
              break;

            // --- START: ADDED DOCX Image Handling ---
            case "application/vnd.openxmlformats-officedocument.wordprocessingml.document": // .docx
              console.log("Processing DOCX file for explanation...");
              // 1. Get main text using officeparser
              try {
                  documentText = await officeParser.parseOfficeAsync(fileBuffer);
                  console.log(`Initial text length from DOCX body: ${documentText?.length || 0}`);
              } catch (parseError) {
                  console.error("Error parsing DOCX body:", parseError);
                  documentText = ""; // Start with empty if body parsing fails
              }

              // 2. Extract and process images using AdmZip and Vision API
              imageText = ""; // Assign here (NO 'let')
              try {
                const zip = new AdmZip(fileBuffer);
                const zipEntries = zip.getEntries();
                const imageEntries = zipEntries.filter(entry =>
                  entry.entryName.startsWith('word/media/') &&
                  /\.(jpe?g|png|gif)$/i.test(entry.entryName)
                );
                console.log(`Found ${imageEntries.length} potential image(s) in DOCX.`);

                for (const imgEntry of imageEntries) {
                  console.log(`Processing image: ${imgEntry.entryName}`);
                  const imageBuffer = imgEntry.getData();
                  if (!imageBuffer || imageBuffer.length === 0) continue;

                  try {
                      const request = { image: { content: imageBuffer.toString('base64') } };
                      const [result] = await visionClient.textDetection(request);
                      const detections = result.textAnnotations;
                      if (detections && detections.length > 0 && detections[0].description) {
                        const detectedText = detections[0].description;
                        console.log(`Detected text (${detectedText.length} chars) from ${imgEntry.entryName}`);
                        imageText += `\n\n--- Start Content From Image: ${imgEntry.entryName} ---\n${detectedText}\n--- End Content From Image ---\n\n`;
                      } else {
                        console.log(`No text detected in image: ${imgEntry.entryName}`);
                      }
                  } catch (visionError) {
                      console.error(`Error processing image ${imgEntry.entryName} with Vision API:`, visionError.message || visionError);
                      imageText += `\n\n--- Error processing image ${imgEntry.entryName} with Vision API. ---\n\n`;
                  }
                } // end for loop
              } catch (zipError) {
                console.error("Error reading DOCX as ZIP:", zipError);
                imageText += "\n\n--- Error: Could not process embedded images in DOCX. ---\n\n";
              }

              // 3. Combine main text and image text
              if (imageText) {
                  documentText = (documentText || "") + imageText; // Ensure documentText is a string
                  console.log(`Total text length after adding image text: ${documentText.length}`);
              }
              break; // End of .docx case
            // --- END: ADDED DOCX Image Handling ---
            default:
              return res.status(400).json({ message: `Unsupported file type: ${fileMimeType}` });
          }

          if (!documentText || !documentText.trim()) {
  console.log("No text content found after parsing document and images.");
  return res.status(400).json({ message: "No text content could be extracted from the uploaded file. Please ensure the file contains readable text." }); // <<<--- CHANGED LINE
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





// Function to handle text-based questions, potentially with images AND/OR a document
exports.askAIText = onRequest(
  { region: "us-central1", timeoutSeconds: 300, memory: "1Gi", secrets: [GEMINI_API_KEY] },
  async (req, res) => {
    cors(req, res, async () => {
      // Allow specific headers needed for CORS and content-type checks
      res.set('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        // Handle CORS preflight request.
        res.status(204).send('');
        return;
      }

      if (req.method !== "POST") {
        return res.status(405).send("Method Not Allowed");
      }

      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY.value());
      const selectedModelName = "gemini-2.5-pro"; // Or "gemini-2.5-flash" if preferred
      console.log(`Using model: ${selectedModelName}`);
      const model = genAI.getGenerativeModel({ model: selectedModelName });

      try {
        // --- Initialize variables ---
        let question = "";
        let history = [];
        let images = []; // Will hold images parsed from FormData OR JSON
        let docFileBuffer = null;
        let docMimeType = null;
        let hasDocFile = false; // Flag for document presence
        let hasImages = false; // Flag for image presence

        const contentType = (req.headers["content-type"] || "").toLowerCase();

        // --- Updated Content Type Handling ---
        if (contentType.includes("multipart/form-data")) {
            console.log("Processing multipart/form-data request (expecting text, optional history, optional file, optional images).");
            // Wrap Busboy processing in a Promise
            await new Promise((resolve, reject) => {
                 const busboy = Busboy({ headers: req.headers });
                 const fields = {};
                 const filePromises = []; // To wait for the file buffer
                 let tempImageParts = {}; // To temporarily store image field parts

                 busboy.on('field', (fieldname, val) => {
                     console.log(`Busboy field parsed: ${fieldname}`);
                     fields[fieldname] = val; // Store regular fields

                     // --- New: Capture image fields ---
                     if (fieldname.startsWith('imageBase64_')) {
                         const index = fieldname.split('_')[1];
                         tempImageParts[index] = { ...tempImageParts[index], base64Data: val };
                     } else if (fieldname.startsWith('imageMimeType_')) {
                         const index = fieldname.split('_')[1];
                         tempImageParts[index] = { ...tempImageParts[index], mimeType: val };
                     }
                     // --- End New ---
                 });

                 busboy.on('file', (fieldname, file, info) => {
                     const { filename, encoding, mimeType } = info;
                     console.log(`Receiving file: ${filename}, Field: ${fieldname}, Type: ${mimeType}`);
                     if (fieldname === 'file') { // Document file
                         docMimeType = mimeType;
                         hasDocFile = true; // Set doc flag
                         const chunks = [];
                         file.on('data', (chunk) => chunks.push(chunk));
                         const filePromise = new Promise((resolveFile, rejectFile) => {
                              file.on('end', () => {
                                  docFileBuffer = Buffer.concat(chunks);
                                  console.log(`Document file buffer created, size: ${docFileBuffer?.length || 0}`);
                                  resolveFile();
                              });
                              file.on('error', (err) => {
                                   console.error(`File stream error for ${filename}:`, err);
                                   rejectFile(err);
                              });
                         });
                         filePromises.push(filePromise);
                     } else {
                          console.warn(`Ignoring unexpected file field: ${fieldname}`);
                          file.resume(); // Discard the stream
                     }
                 });

                 busboy.on('close', async () => {
                    console.log("Busboy finished/closed.");
                    question = fields.question || "";
                    try {
                        // Use provided history, default to empty array if missing or invalid
                        history = JSON.parse(fields.history || '[]');
                        console.log(`Parsed history field, length: ${history.length}`);
                    } catch (e) {
                        history = []; console.error("Bad history format:", e, "Raw value:", fields.history);
                    }

                    // --- New: Assemble images from temp parts ---
                    const parsedImages = [];
                    Object.keys(tempImageParts).sort().forEach(index => {
                        if (tempImageParts[index] && tempImageParts[index].base64Data && tempImageParts[index].mimeType) {
                            parsedImages.push({
                                mimeType: tempImageParts[index].mimeType,
                                base64Data: tempImageParts[index].base64Data // Matches expected format later
                            });
                        } else {
                            console.warn(`Incomplete image parts found for index ${index}, skipping.`);
                        }
                    });
                    images = parsedImages; // Assign to main images array
                    hasImages = images.length > 0;
                    console.log(`Assembled ${images.length} images from FormData fields.`);
                    // --- End New ---

                    try {
                         await Promise.all(filePromises); // Wait for doc buffer if any
                         // Correct the hasDocFile flag if no file stream was processed or buffer failed
                         if (filePromises.length > 0 && (!docFileBuffer || docFileBuffer.length === 0)) {
                            console.warn("File stream finished but docFileBuffer is empty or missing.");
                            hasDocFile = false; // Correct flag if buffer failed
                         } else if (filePromises.length === 0) {
                            hasDocFile = false; // No file stream started
                         }
                         console.log("Finished processing fields and potential file. Has Doc Flag:", hasDocFile);
                         resolve(); // Resolve the main Busboy promise
                    } catch (fileError) {
                         console.error("Error processing file stream promise:", fileError);
                         reject(fileError);
                    }
                 });

                 busboy.on('error', (err) => {
                     console.error("Busboy error event:", err);
                     reject(err);
                 });

                 // --- FEED rawBody TO BUSBOY ---
                 console.log("Ending Busboy with req.rawBody");
                 if (req.rawBody) {
                     busboy.end(req.rawBody);
                 } else {
                     console.error("req.rawBody is not available. Ensure function is not consuming the stream elsewhere.");
                     reject(new Error("Request raw body is unavailable for Busboy processing."));
                 }
                 // --- END FEED ---

            }); // End of new Promise(busboy processing)
             console.log("Successfully processed FormData.");

        } else if (contentType.includes("application/json")) {
            // --- This part remains mostly the same, handling text-only ---
            console.log("Processing application/json request (text-only expected now).");
            if (!req.body) {
                return res.status(400).json({ message: "Empty JSON body received." });
            }
            question = req.body.question || "";
            history = req.body.history || [];
             // Ensure images array is empty for JSON path now
            images = [];
            hasImages = false;
            hasDocFile = false; // Explicitly false for JSON
            if (!Array.isArray(history)) {
                 console.warn("Received non-array history in JSON, resetting.");
                 history = [];
            }
            // --- End JSON Handling ---

        } else {
            console.error(`Unsupported Content-Type: ${contentType}`);
            return res.status(400).json({ message: `Unsupported Content-Type: ${contentType}` });
        }
        // --- End Updated Content Type Handling ---

        // --- Validation Check (uses updated flags) ---
        console.log("Running validation check. Q:", !!question, "Img:", hasImages, "Doc:", hasDocFile, "Hist len:", history.length);
        if (!question && !hasImages && !hasDocFile && history.length === 0) {
            console.error("Validation failed: Request lacks necessary content.");
            return res.status(400).json({ message: "Request lacks necessary content (question, images, document, or history)." });
        }
        console.log("Validation passed.");
        // --- End Validation Check ---

        let aiText = "";
        let documentTextContent = ""; // To store extracted text

        // --- Process Document if Present (No change needed here) ---
        if (hasDocFile && docFileBuffer) {
            console.log("Extracting text from document:", docMimeType);
            try {
                switch (docMimeType) {
                    case "application/pdf":
                        const pdfData = await pdf(docFileBuffer);
                        documentTextContent = pdfData.text || "";
                        break;
                    case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
                    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
                        documentTextContent = await officeParser.parseOfficeAsync(docFileBuffer);
                        // Add DOCX image extraction here if required for the prompt context
                        break;
                    default:
                        console.warn(`Unsupported document type for text extraction: ${docMimeType}`);
                        documentTextContent = `(Unsupported file type: ${docMimeType})`;
                }
                if (!documentTextContent.trim()) {
                     console.log("No text content extracted from the document.");
                     documentTextContent = "(Document contained no readable text)";
                } else {
                     console.log(`Extracted ${documentTextContent.length} characters from document.`);
                }
            } catch (extractionError) {
                 console.error("Error during document text extraction:", extractionError);
                 documentTextContent = `(Error extracting text from document: ${extractionError.message})`;
            }
        }
        // --- End Document Processing ---

        // --- Prepare for Gemini API Call (Updated Logic) ---
        const historyForChat = history.slice(0, -1); // History context for the API
        let messagePartsToSend = [];

        // 1. Create the combined text part
        let combinedText = question || ""; // Start with the user's typed question
        if (documentTextContent) {
            // Prepend document context if it was extracted
            const docContext = `\n\n--- Document Content Start ---\n${documentTextContent}\n--- Document Content End ---\n\n`;
            combinedText = docContext + combinedText;
            console.log("Prepended document content to the main text part.");
        }
        // Always add the text part (Gemini requires at least one text part)
        messagePartsToSend.push({ text: combinedText });

        // 2. Add image parts if any were parsed
        if (hasImages) {
            images.forEach(img => {
                // Ensure the image object has the required fields
                if (img.base64Data && img.mimeType) {
                    messagePartsToSend.push({
                        inlineData: {
                            mimeType: img.mimeType,
                            data: img.base64Data // Use the base64 data parsed earlier
                        }
                    });
                } else {
                    console.warn("Skipping invalid image object during message parts construction.");
                }
            });
            console.log(`Added ${images.length} image part(s) to the message.`);
        }

        // --- Now make the API call ---
        console.log(`Starting chat with ${historyForChat.length} previous messages. Sending ${messagePartsToSend.length} parts in current message.`);

        // Safety check: Ensure parts are not completely empty
         if (messagePartsToSend.length === 0 || (messagePartsToSend.length === 1 && !messagePartsToSend[0].text && !hasImages && !hasDocFile )) {
             console.error("Constructed messagePartsToSend is effectively empty. Aborting API call.");
             throw new Error("Cannot send an empty message to the AI. Check input parsing.");
         }

        const chat = model.startChat({ history: historyForChat });
        const result = await chat.sendMessage(messagePartsToSend); // Send the combined parts
        const response = await result.response;
        aiText = response.text() || "Sorry, I couldn't generate a response for the provided input.";
        // --- End Gemini API Call ---

        return res.status(200).json({ answer: aiText });

      } catch (err) {
        console.error("Ask AI Text error:", err);
        // Attempt to provide a more specific error message if possible
        let errorMessage = "Failed to get an answer from the AI.";
        if (err.message.includes("SAFETY")) {
            errorMessage = "The response was blocked due to safety settings. Please modify your request.";
        } else if (err.message.includes("400") || err.message.includes("Invalid")) {
             errorMessage = "There was an issue with the format of the request sent to the AI.";
        } else if (err.message.includes("raw body unavailable")) {
             errorMessage = "Internal server error processing the file upload.";
        }
        return res.status(500).json({ message: errorMessage, error: String(err?.message || err) });
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
- **AI Chat Tab:** Users can ask text-based questions and optionally upload images (JPEG, PNG) or documents (PDF, PPTX, DOCX) for context. The AI provides detailed answers based on the input.

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
FlipCards is a budget-friendly review website designed for students seeking affordable study tools. It offers lifetime access for a one-time low cost, with all future updates included. Users only need to purchase a single account slot.

**Lobby Features Explained:**

* **Flashcard Folders:** This is where you manage all your study sets.
    * **Your Flashcard Sets:** These are your private cards that you can edit or delete.
    * **Public Flashcard Sets:** Sets shared by other users in the community. You can "like" these to save them.
    * **Liked Flashcard Sets:** A collection of all the public sets you have liked for easy access.

* **Main Tools & Features:**
    * **FlipNotes:** A notepad for quickly jotting down notes, creating Annotations, and creating classrooms to share notes with other users. (See detailed explanation below if asked).
    * **Real-time Chat:** Study and communicate with other users.
    * **FlipTimer:** A Pomodoro-style timer to help manage study sessions.
    * **Leaderboards:** Compete with other users and track your rank.
    * **Leveling System:** Earn XP by using features (like asking/answering questions) to level up and unlock new badges for your profile.
    * **General Question Section:** A community space where you can:
        * **Ask Questions:** Click "Ask a Question", enter a category and your question, and submit it. Asking earns you XP.
        * **Answer Questions:** See questions asked by others. Type your answer directly on the question card and submit it.
        * **View Answers:** Click "See All Answers" on a question card to open a modal displaying all submitted answers, including who answered and their profile picture (if available).
        * **Like Answers:** You can "like" answers submitted by others. Liking an answer gives XP to the person who answered.
        * **Search/Filter:** Use the search bar to find questions by keyword or category.
        * **Refresh:** Click the refresh button if you don't see your newly added question or answer immediately.
        * **(Note:** Admins can verify answers, and users can delete their own questions/answers or admin can delete any).
    * **Members List:** See a list of other registered members online.
    * **Music:** A shared community playlist to listen to while you study. You can add Spotify embed codes.
    * **Profile & Socials:** View your profile (username, email, level, XP, badges, avatar, cover photo), edit your username, access achievements, logout, and find our social media links. Includes **Settings** where you can manage:
        * **Referral Code:**
            * **Set Your Code:** Go to Settings > Referral Code to set a unique referral code. **Important:** This code must be unique (the system checks) and **cannot be changed** once set. You'll be asked to confirm before saving.
            * **View Code & Points:** Once set, this section displays your unique code and the total "Points" you've earned from others using your code. Points are counted based on usage recorded in the system.
            * **See Rewards:** Click the "See Rewards" button to open a modal showing available subscription rewards (like Verified or Plus months) for different point thresholds (e.g., 20 Points, 50 Points).
            * **Claim Rewards:** The rewards modal explains the rules (like stacking Verified months or upgrading to Plus) and provides a button to message the Admin via Facebook to claim your reward by spending your points.
    * **Get Started / Add Sets:** Buttons (in the header and Folder section) to create new flashcard sets from either text or images.
    * **FlipCards AI:** A separate, powerful tool accessed via its dedicated button. It includes features like:
        * **Create Sets (File):** Generate flashcards by uploading PDF, DOCX, or PPTX files.
        * **Analyze File:** Get detailed explanations, examples, and synonyms from uploaded files.
        * **Summarizer:** Create concise summaries and paraphrased versions of documents.
        * **Ask AI (Image):** Upload a JPG image of a question to get an AI-generated answer.
        * **Ask AI (Text):** Type your question directly into a text area (supports multiline with Shift+Enter). The AI provides a detailed answer, using step-by-step solutions and LaTeX formatting for math problems. While the AI is processing a question on this tab, you cannot send another until it finishes.
    * **ParseCards:** An alternative tool for generating flashcards from JPG image files or text input. This is accessed via its dedicated button located in the Folder Section. Users can add multiple JPG files, see a preview, and then parse them into flashcards. There are guidelines on how to format images for best results.

* **Review Modes (How you study your flashcards):**
    1.  **Flashcard Mode:** The classic way to study. View the term and recall the definition. Includes Text-to-Speech.
    2.  **Match Mode:** A timed game to match terms with their definitions.
    3.  **Learn Mode:** A multiple-choice quiz based on definitions to help with memorization.
    4.  **Test Mode:** A written-exam style mode where you type the correct term for a given definition.
    5.  **Defidrop Mode:** A timed game where you choose the correct definition from multiple options. Can be played with others.
    6.  **Quibbl Mode:** A multiplayer game with live chat where you compete for high scores by earning stars.
    7.  **Pinpoint Mode:** An image-based learning mode, ideal for visual subjects like nursing or anatomy.
    8.  **Blitz Mode:** A fast-paced review mode where you quickly decide if the given definition is True or False.

**Detailed FlipNotes Explanation (Use if asked specifically about FlipNotes):**

FlipNotes is like your personal digital notebook integrated into FlipCards.

1.  **Accessing:** Click the document/notepad icon 📝 in the lobby. A large "FlipNotes" modal window appears.
2.  **Main Interface:**
    * **Top Bar:** Has the title, a "My Notes ▼" dropdown (to switch between personal notes and class notes), a "Create Class +" button, a search bar, a New Note "+" button, and a Close "×" button.
    * **Note List:** Shows your note cards. Pinned notes 📌 appear first (newest to oldest), then unpinned notes (oldest to newest).
3.  **Working with Note Cards (Main List):**
    * **Create:** Click the "+" button to add a new card.
    * **Title:** Type directly into the title field at the top of the card. Auto-saves.
    * **Preview:** Shows a snippet of the note content.
    * **Actions (Bottom of card):**
        * **Delete 🗑️:** Removes the note (with confirmation).
        * **Pin 📌:** Toggles pinning to the top.
        * **Color 🎨:** Opens a palette to change the card's background color.
        * **Add to Class <0xF0><0x9F><0xAA><0x82>:** Shares a copy to a selected class you own or co-own.
        * **Expand ⤢:** Opens the note in the detailed Note Preview Modal.
4.  **Editing & Viewing (Note Preview Modal):**
    * **Open/Close:** Opens via the Expand button, closes with "×" or Esc key.
    * **Top Bar:** Shows the full title, "How to Use" button, "Review Mode" button, and Close button.
    * **Editable Title:** An input field to edit the title. Auto-saves.
    * **Ribbon Toolbar:** Icons for rich content:
        * **Checklist ☑︎:** Toggles mode where "Enter key" adds a new checkbox item.
        * **Image 🖼️:** Insert JPG/PNG images at the cursor.
        * **PDF 📄:** Import PDF pages as images into the note.
        * **Undo 🔙 / Redo 🔜:** Works for text and drawing actions.
        * **Add Text Box T<0xE2><0x84><0x9C>:** Click, drag to create a resizable text box. Color palette available. Hover reveals edit ✏️ and delete 🗑️ icons.
        * **Highlighter 🖌️:** Select text, choose a color from the palette to highlight. Click again (or white swatch) to remove highlight.
        * **Draw ✏️:** Toggles drawing mode. Choose color, draw on canvas overlay. Undo/Redo works. Click button again to **SAVE** drawing as an image layer. Prompt appears if closing unsaved.
    * **Content Area:** Large editable space for text, images, checklists, text boxes, and drawings. Pastes as plain text.
    * **Review Mode:** Enlarges modal, hides ribbon, scales content for focused reading. Drawing/editing disabled. Exits back to normal view.
5.  **Class Integration:**
    * **Switching:** Use the "My Notes ▼" dropdown to view personal notes or enter a Class Info View.
    * **Creating Class:** Click "Create Class +", fill details (name, section required), add optional photo/description.
    * **Editing Class:** In class view, expand left nav, click "Configure" (if creator/co-creator) to edit details.
    * **Class Info View:**
        * **Left Sidenav:** Shows class photo (click to expand/collapse), member list, invite button, announcement/logs/leave/delete buttons (full text or icons depending on state). Members list shows avatar, name, badges (Creator, Co-Creator, Verified). Creator sees '⋮' options for others.
        * **Main Area:** Displays content based on right nav selection.
        * **Right Nav:** Icons to switch main view between Info (details), Shared Notes 📝, and Announcements 📣 (pulses yellow if unread).
    * **Managing Members (Creator/Co-Creator):** Use "+ Invite" button or '⋮' menu on members (Promote/Demote, Kick).
    * **Sharing Notes:** Use the "Add to Class <0xF0><0x9F><0xAA><0x82>" button on a personal note card.
    * **Viewing Shared Notes:** Switch to class view, click Shared Notes icon 📝. Cards are read-only, show author. Expand ⤢ opens read-only preview. Delete 🗑️ button available for creator/co-creators.
    * **Announcements:** View via Announcements icon 📣. Post via "Make Announcement" button (creator/co-creator). Delete via 🗑️ on card (creator only).
    * **Class Logs:** View history via Logs button (📜 icon or text). Red dot indicates unread entries.
    * **Leaving/Deleting Class:** Members click "Leave Class". Creator clicks "Delete Class" (permanent for all).
6.  **Saving & Syncing:** Changes auto-save. Synced to the cloud if logged in, otherwise saved locally in the browser.

**Your Rules:**
-   Answer concisely and directly based *only* on the features listed above.
-   If a user asks a question about how a specific *FlipCards AI tool* works in detail (like how the summarizer processes files or what file types Ask AI (Image) accepts), gently guide them. Say: "That's a feature on the dedicated FlipCards AI page! You can ask the AI assistant *on that page* for more specific details about how it works."
-   If a user asks a general knowledge question (e.g., "Who is the president?"), politely decline and state your purpose. Say something like: "I can only answer questions about the features in the FlipCards lobby. How can I help you navigate the site?"`;

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