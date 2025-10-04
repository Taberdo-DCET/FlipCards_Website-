/**
 * AIgeminibtn.js — FULL FILE (ES Module)
 * Load with: <script type="module" src="AIgeminibtn.js"></script>
 * Relies on Tesseract being loaded globally from lobby.html.
 * Firestore path used: approved_emails/{email}/limits/parseusage
 */

console.log("✅ [AIgeminibtn] File loaded (module). Initializing...");

// -------------------------
// Firebase (CDN ESM imports)
// -------------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  runTransaction,
  serverTimestamp,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
let selectedFiles = [];
// -----------------------------------
// Your Firebase config (from console)
// -----------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyCndfcWksvEBhzJDiQmJj_zSRI6FSVNUC0",
  authDomain: "flipcards-7adab.firebaseapp.com",
  databaseURL: "https://flipcards-7adab-default-rtdb.firebaseio.com",
  projectId: "flipcards-7adab",
  storageBucket: "flipcards-7adab.firebasestorage.app",
  messagingSenderId: "836765717736",
  appId: "1:836765717736:web:ff749a40245798307b655d",
  measurementId: "G-M26MWQZBJ0",
};

let app, auth, db;
try {
  if (!firebaseConfig?.apiKey) throw new Error("Missing Firebase config");
  console.log("🧩 [AIgeminibtn] Initializing Firebase app...");
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  console.log("✅ [AIgeminibtn] Firebase initialized.");
} catch (e) {
  console.error("❌ [AIgeminibtn] Firebase init failed:", e);
  // Soft-disable feature if init fails
  window.__FC_PARSECARDS_DISABLED__ = true;
}

// -----------------------------------
// Constants for ParseCards slot usage
// -----------------------------------
const DEFAULT_MAX_USES = 3; // used only when creating the doc first time
const COLLECTION = "approved_emails";
const SUBCOLLECTION = "limits";
const DOC_ID = "parseusage";

// ----------------------------------
// DOM Ready
// ----------------------------------
window.addEventListener("DOMContentLoaded", () => {
  console.log("✅ [AIgeminibtn] DOMContentLoaded fired.");

  const geminiBtn = document.getElementById("geminiBtn");
  const geminiModal = document.getElementById("geminiModal");
  const closeModal = document.getElementById("closeGeminiModal");
  const fileInput = document.getElementById("geminiFileInput");
  const flashcardsOutput = document.getElementById("geminiFlashcards");
  const usageContainer = document.getElementById("geminiUsage");
  let usageCountEl = document.getElementById("geminiUsageCount");
  let usageMaxEl = document.getElementById("geminiUsageMax");
  const gotoAddcardBtn = document.getElementById("gotoAddcardBtn");
  const addFilesBtn = document.getElementById("addFilesBtn");
  const parseCardsBtn = document.getElementById("parseCardsBtn");
  const fileListContainer = document.getElementById("fileListContainer");

  let usageTimerEl = null;
  const REFILL_MS = 10 * 60 * 1000;
  let refillInterval = null;
  let refillEndsAt = null;
  let lastUsedCount = null;

  try {
    const savedEndsAt = Number(localStorage.getItem("gemini_refill_ends_at") || 0);
    const now = Date.now();
    if (savedEndsAt > now) {
      const remaining = savedEndsAt - now;
      startRefillCountdown(remaining);
      console.log("♻️ [AIgeminibtn] Restored active countdown from localStorage.");
    }
  } catch (e) {
    console.warn("⚠️ [AIgeminibtn] Could not restore countdown:", e);
  }

  if (!geminiBtn || !geminiModal || !fileInput || !addFilesBtn || !parseCardsBtn || !fileListContainer) {
    console.warn("⚠️ [AIgeminibtn] One or more essential UI elements are missing!");
  }

  if (window.__FC_PARSECARDS_DISABLED__) {
    console.warn("⛔ [AIgeminibtn] Disabled because Firebase did not initialize.");
    if (addFilesBtn) addFilesBtn.disabled = true;
    if (fileInput) fileInput.disabled = true;
    if (usageCountEl) usageCountEl.textContent = "0";
    return;
  }

  let currentMax = DEFAULT_MAX_USES;
  let unsubscribeUsage = null;

  function renderFileList() {
    if (!fileListContainer) return;
    fileListContainer.innerHTML = "";

    if (selectedFiles.length > 0) {
      selectedFiles.forEach((file, index) => {
        const fileItem = document.createElement("div");
        fileItem.className = "file-item";

        const fileName = document.createElement("span");
        fileName.className = "file-name";
        fileName.textContent = file.name;

        const removeBtn = document.createElement("button");
        removeBtn.className = "remove-file-btn";
        removeBtn.textContent = "✖";
        removeBtn.title = "Remove file";
        removeBtn.onclick = () => removeFile(index);

        fileItem.appendChild(fileName);
        fileItem.appendChild(removeBtn);
        fileListContainer.appendChild(fileItem);
      });
      parseCardsBtn.classList.remove("hidden");
    } else {
      parseCardsBtn.classList.add("hidden");
      fileListContainer.innerHTML = '<p style="color: #888; text-align: center; font-size: 14px;">No files selected.</p>';
    }
  }

  function removeFile(indexToRemove) {
    selectedFiles.splice(indexToRemove, 1);
    if (selectedFiles.length === 0) {
      fileInput.value = "";
    }
    renderFileList();
  }

  function handleFileSelection(event) {
    const newFiles = Array.from(event.target.files);
    const uniqueNewFiles = newFiles.filter(newFile =>
      !selectedFiles.some(existingFile => existingFile.name === newFile.name && existingFile.size === newFile.size)
    );
    selectedFiles.push(...uniqueNewFiles);
    renderFileList();
  }

  if (addFilesBtn && fileInput) {
    addFilesBtn.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", handleFileSelection);
  }

  if (parseCardsBtn) {
    parseCardsBtn.addEventListener("click", guardedHandleFileUpload);
  }

  // Find the event listener for the main button that opens the modal
if (geminiBtn && geminiModal) {
  geminiBtn.addEventListener("click", () => {
    // ▼▼▼ ADD THIS NEW BLOCK TO RESET THE UI ▼▼▼
    const addFilesBtn = document.getElementById("addFilesBtn");
    const fileListContainer = document.getElementById("fileListContainer");
    if (addFilesBtn && fileListContainer) {
      addFilesBtn.classList.remove("hidden");
      fileListContainer.classList.remove("hidden");
    }
    // ▲▲▲ END OF NEW BLOCK ▲▲▲

    // ... the rest of your function remains exactly the same
    console.log("🎯 [AIgeminibtn] Gemini button clicked → opening modal + binding usage realtime…");
    geminiModal.classList.add("show");
    ensureUsageUI();
    bindUsageRealtime();
  });
}

  if (closeModal && geminiModal) {
    closeModal.addEventListener("click", () => {
      console.log("🧹 [AIgeminibtn] Closing modal & clearing state.");
      geminiModal.classList.remove("show");
      localStorage.removeItem("flashcardsData");
      selectedFiles = [];
      renderFileList();
      fileInput.value = "";
      if (flashcardsOutput) flashcardsOutput.innerHTML = "";
      if (gotoAddcardBtn) gotoAddcardBtn.style.display = 'none';
const addFilesBtn = document.getElementById("addFilesBtn");
    const fileListContainer = document.getElementById("fileListContainer");
    if (addFilesBtn && fileListContainer) {
      addFilesBtn.classList.remove("hidden");
      fileListContainer.classList.remove("hidden");
    }
      if (unsubscribeUsage) {
        console.log("🔕 [AIgeminibtn] Unbinding usage listener.");
        unsubscribeUsage();
        unsubscribeUsage = null;
      }
    });
  }

  function ensureUsageUI() {
    if (usageContainer && !usageMaxEl) {
      usageContainer.innerHTML = `
      Uses left: <span id="geminiUsageCount">0</span> / <span id="geminiUsageMax">0</span>
      <div id="geminiUsageTimer" style="margin-top: 6px; font-size: 12px; opacity: 0.85;">Next refill: --:--</div>
    `;
      usageCountEl = document.getElementById("geminiUsageCount");
      usageMaxEl = document.getElementById("geminiUsageMax");
      usageTimerEl = document.getElementById("geminiUsageTimer");
      console.log("🧰 [AIgeminibtn] Upgraded usage UI to dynamic max + timer.");
    } else if (!usageTimerEl) {
      const probe = document.getElementById("geminiUsageTimer");
      if (probe) usageTimerEl = probe;
      else if (usageContainer) {
        const div = document.createElement("div");
        div.id = "geminiUsageTimer";
        div.style.marginTop = "6px";
        div.style.fontSize = "12px";
        div.style.opacity = "0.85";
        div.textContent = "Next refill: --:--";
        usageContainer.appendChild(div);
        usageTimerEl = div;
        console.log("🧰 [AIgeminibtn] Appended timer line under usage UI.");
      }
    }
  }

  function setUploadEnabled(enabled) {
    if (!addFilesBtn || !fileInput) return;
    addFilesBtn.disabled = !enabled;
    fileInput.disabled = !enabled;
    addFilesBtn.style.opacity = enabled ? "1" : "0.5";
    console.log(`🎛️ [AIgeminibtn] Upload UI ${enabled ? "ENABLED" : "DISABLED"}.`);
  }

  function updateUsageDisplayLeft(left) {
    if (usageCountEl) usageCountEl.textContent = Math.max(0, left);
    setUploadEnabled(left > 0);
    console.log(`🔢 [AIgeminibtn] Uses left updated in UI: ${left}`);
  }

  function updateUsageMax(max) {
    currentMax = Number(max || DEFAULT_MAX_USES);
    if (usageMaxEl) usageMaxEl.textContent = currentMax;
    console.log(`📏 [AIgeminibtn] Max uses updated in UI: ${currentMax}`);
  }

  function renderTimer() {
    if (!usageTimerEl) return;
    if (!refillEndsAt) {
      usageTimerEl.textContent = "Next refill: --:--";
      return;
    }
    const now = Date.now();
    const msLeft = Math.max(0, refillEndsAt.getTime() - now);
    const m = Math.floor(msLeft / 60000);
    const s = Math.floor((msLeft % 60000) / 1000);
    usageTimerEl.textContent = `Next refill: ${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function stopRefillCountdown(reason = "no reason") {
    if (refillInterval) {
      clearInterval(refillInterval);
      refillInterval = null;
    }
    refillEndsAt = null;
    renderTimer();
    try {
      localStorage.removeItem("gemini_refill_ends_at");
    } catch { }
    console.log(`🛑 [AIgeminibtn] Refill countdown stopped (${reason}).`);
  }

  function startRefillCountdown(durationMs = REFILL_MS) {
    stopRefillCountdown("restarting");
    refillEndsAt = new Date(Date.now() + durationMs);
    renderTimer();
    try {
      localStorage.setItem("gemini_refill_ends_at", String(refillEndsAt.getTime()));
    } catch { }

    refillInterval = setInterval(async () => {
      const now = Date.now();
      if (!refillEndsAt) return;
      if (now >= refillEndsAt.getTime()) {
        stopRefillCountdown("timer elapsed");
        console.log("⏰ [AIgeminibtn] 30 min elapsed → attempting 1 usage refill...");
        try {
          const ok = await refillOneUse();
          if (ok.moreToRefill) {
            startRefillCountdown(REFILL_MS);
          }
        } catch (e) {
          console.error("❌ [AIgeminibtn] Refill transaction failed:", e);
        }
      } else {
        renderTimer();
      }
    }, 1000);
    console.log("▶️ [AIgeminibtn] Refill countdown started: 30:00");
  }

  function getUserEmail() {
    return new Promise((resolve, reject) => {
      const current = auth?.currentUser;
      if (current?.email) {
        console.log("👤 [AIgeminibtn] Found user via auth.currentUser:", current.email);
        return resolve(current.email);
      }
      console.log("⏳ [AIgeminibtn] Waiting for onAuthStateChanged…");
      const unsub = onAuthStateChanged(auth, (user) => {
        unsub();
        if (user?.email) {
          console.log("👤 [AIgeminibtn] onAuthStateChanged user:", user.email);
          resolve(user.email);
        } else {
          console.error("❌ [AIgeminibtn] No signed-in user.");
          reject(new Error("No signed-in user"));
        }
      });
    });
  }

  function usageDocRef(email) {
    return doc(db, COLLECTION, email, SUBCOLLECTION, DOC_ID);
  }

  async function ensureUsageDoc(email) {
    const ref = usageDocRef(email);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      console.log("🆕 [AIgeminibtn] Creating initial usage doc for:", email);
      await setDoc(ref, { max: DEFAULT_MAX_USES, used: 0, updatedAt: serverTimestamp() });
      return { max: DEFAULT_MAX_USES, used: 0 };
    }
    return snap.data();
  }

  async function bindUsageRealtime() {
    try {
      const email = await getUserEmail();
      await ensureUsageDoc(email);
      const ref = usageDocRef(email);
      if (unsubscribeUsage) {
        unsubscribeUsage();
        unsubscribeUsage = null;
      }
      console.log("🔔 [AIgeminibtn] Binding realtime usage listener…");
      unsubscribeUsage = onSnapshot(
        ref,
        (snap) => {
          const d = snap.data() || {};
          const max = Number(d.max ?? DEFAULT_MAX_USES);
          const used = Number(d.used ?? 0);
          const left = Math.max(0, max - used);
          updateUsageMax(max);
          updateUsageDisplayLeft(left);
          if (lastUsedCount === null) {
            lastUsedCount = used;
            console.log(`🧮 [AIgeminibtn] Initial usage state: used=${used}, left=${left}/${max}`);
          } else {
            if (used > lastUsedCount) {
              if (!refillEndsAt && !refillInterval) {
                console.log(`➖ [AIgeminibtn] Usage consumed (was ${lastUsedCount}, now ${used}). Starting refill window.`);
                startRefillCountdown(REFILL_MS);
              } else {
                const secsLeft = refillEndsAt ? Math.max(0, (refillEndsAt.getTime() - Date.now()) / 1000 | 0) : 0;
                console.log(`➖ [AIgeminibtn] Usage consumed during active window — keeping remaining ${secsLeft}s.`);
              }
            } else if (used < lastUsedCount) {
              console.log(`➕ [AIgeminibtn] Usage refilled elsewhere (was ${lastUsedCount}, now ${used}).`);
            }
            lastUsedCount = used;
          }
          if (left >= max) {
            stopRefillCountdown("at max");
            if (usageTimerEl) usageTimerEl.textContent = "Full";
          } else {
            if (!refillInterval && !refillEndsAt) {
              console.log("ℹ️ [AIgeminibtn] Not full and no active timer — starting a new 30-min cycle.");
              startRefillCountdown(REFILL_MS);
            }
          }
          console.log(`📡 [AIgeminibtn] Realtime usage → used=${used}, max=${max}, left=${left}`);
        },
        (err) => {
          console.error("❌ [AIgeminibtn] onSnapshot error:", err);
        }
      );
    } catch (e) {
      console.error("❌ [AIgeminibtn] bindUsageRealtime failed:", e);
      updateUsageDisplayLeft(0);
    }
  }

  async function tryConsumeOneUse() {
    const email = await getUserEmail();
    const ref = usageDocRef(email);
    console.log("🔁 [AIgeminibtn] Starting Firestore transaction to consume one use...");
    const result = await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      let data;
      if (!snap.exists()) {
        console.log("ℹ️ [AIgeminibtn] Usage doc missing; creating with used=0.");
        data = { max: DEFAULT_MAX_USES, used: 0 };
        tx.set(ref, { ...data, updatedAt: serverTimestamp() });
      } else {
        data = snap.data();
      }
      const max = Number(data.max ?? DEFAULT_MAX_USES);
      const used = Number(data.used ?? 0);
      if (used >= max) {
        console.log("⛔ [AIgeminibtn] No uses left. Not incrementing.");
        return { ok: false, left: 0, max };
      }
      const newUsed = used + 1;
      tx.set(ref, { max, used: newUsed, updatedAt: serverTimestamp() }, { merge: true });
      console.log(`✅ [AIgeminibtn] Transaction incremented usage: ${used} -> ${newUsed}`);
      return { ok: true, left: Math.max(0, max - newUsed), max };
    });
    return result;
  }

  async function refillOneUse() {
    const email = await getUserEmail();
    const ref = usageDocRef(email);
    const result = await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) {
        tx.set(ref, { max: DEFAULT_MAX_USES, used: 0, updatedAt: serverTimestamp() });
        return { ok: true, used: 0, max: DEFAULT_MAX_USES };
      }
      const data = snap.data() || {};
      const max = Number(data.max ?? DEFAULT_MAX_USES);
      let used = Number(data.used ?? 0);
      if (used <= 0) {
        return { ok: true, used, max };
      }
      used = Math.max(0, used - 1);
      tx.set(ref, { used, max, updatedAt: serverTimestamp() }, { merge: true });
      return { ok: true, used, max };
    });
    const left = Math.max(0, result.max - result.used);
    const moreToRefill = left < result.max;
    console.log(`✅ [AIgeminibtn] Refilled 1 usage via transaction. New used=${result.used}, left=${left}/${result.max}`);
    return { ok: true, moreToRefill };
  }

  function processTextToFlashcards(slideText) {
    const addFilesBtn = document.getElementById("addFilesBtn");
  const fileListContainer = document.getElementById("fileListContainer");
  if (addFilesBtn && fileListContainer) {
    addFilesBtn.classList.add("hidden");
    fileListContainer.classList.add("hidden");
  }
    console.log("🧠 [AIgeminibtn] Processing OCR text with new multi-line logic...");
    const lines = slideText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 3);
    const structuredData = [];
    const flashcards = [];
    const isPotentialTerm = (line) => line.split(" ").length < 10 && !/[.,;]$/.test(line);
    let i = 0;
    while (i < lines.length) {
      const currentLine = lines[i];
      if (isPotentialTerm(currentLine)) {
        const term = currentLine;
        let definition = "";
        let nextIndex = i + 1;
        while (nextIndex < lines.length && !isPotentialTerm(lines[nextIndex])) {
          definition += lines[nextIndex] + " ";
          nextIndex++;
        }
        definition = definition.trim();
        if (definition) {
          structuredData.push({ term, definition });
          flashcards.push(
            `<div class="card"><strong>Term:</strong> ${term}<br><strong>Definition:</strong> ${definition}</div>`
          );
          console.log("✅ [AIgeminibtn] Matched card:", { term, definition });
        }
        i = nextIndex;
      } else {
        i++;
      }
    }
    if (flashcardsOutput) {
      if (flashcards.length > 0) {
        flashcardsOutput.innerHTML = flashcards.join("");
      } else {
        flashcardsOutput.innerHTML = "<p>Could not find any valid term/definition pairs. Please try a clearer image.</p>";
      }
    }
    localStorage.setItem("flashcardsData", JSON.stringify(structuredData));
    console.log(`📦 [AIgeminibtn] Stored ${structuredData.length} flashcards in localStorage.`);
    if (gotoAddcardBtn) {
      gotoAddcardBtn.style.display = flashcards.length > 0 ? "block" : "none";
      gotoAddcardBtn.onclick = () => {
        console.log("➡️ [AIgeminibtn] Navigating to addcard.html");
        window.location.href = "addcard.html";
      };
    }
  }

  async function guardedHandleFileUpload() {
    const parseBtn = document.getElementById("parseCardsBtn");
  if (parseBtn) {
    parseBtn.classList.add("parsing");
    parseBtn.disabled = true;
  }
    try {
      const files = selectedFiles;
      if (!files || files.length === 0) {
        console.warn("⚠️ [AIgeminibtn] No files selected for parsing.");
        return;
      }
      console.log(`[AIgeminibtn] Processing a batch of ${files.length} files.`);
      const consume = await tryConsumeOneUse();
      if (!consume.ok) {
        console.log("⛔ [AIgeminibtn] Usage limit reached. Blocking processing.");
        updateUsageDisplayLeft(0);
        alert(`You’ve used all ${consume.max ?? currentMax} ParseCards slots.`);
        return;
      }
      updateUsageDisplayLeft(consume.left);

      let allExtractedText = "";
      const flashcardsOutput = document.getElementById("geminiFlashcards");
      if (flashcardsOutput) {
        flashcardsOutput.innerHTML = `<p>Reading ${files.length} images... Please wait...</p>`;
      }
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`🔍 [AIgeminibtn] Processing file ${i + 1}/${files.length}: ${file.name}`);
        if (flashcardsOutput) {
          flashcardsOutput.innerHTML = `<p>Processing file ${i + 1} of ${files.length}: ${file.name}</p>`;
        }
        if (!/\.(jpg|jpeg|png)$/i.test(file.name)) {
          console.warn(`⚠️ [AIgeminibtn] Skipping invalid file type: ${file.name}`);
          continue;
        }
        const extractedText = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = async (e) => {
            try {
              const imageDataUrl = e.target.result;
              const { createWorker } = Tesseract;
              const worker = await createWorker({ logger: (m) => console.log(`[Tesseract File ${i + 1}]`, m) });
              await worker.load();
              await worker.loadLanguage("eng");
              await worker.initialize("eng");
              const { data: { text } } = await worker.recognize(imageDataUrl);
              await worker.terminate();
              resolve(text);
            } catch (ocrErr) {
              reject(ocrErr);
            }
          };
          reader.onerror = (e) => reject(new Error("FileReader error"));
          reader.readAsDataURL(file);
        });
        if (extractedText && extractedText.trim().length > 0) {
          allExtractedText += extractedText + "\n\n";
        }
      }
      console.log("📷 [AIgeminibtn] All files processed. Combined OCR text length:", allExtractedText.length);
      if (allExtractedText.trim().length < 5) {
        if (flashcardsOutput) {
          flashcardsOutput.innerHTML = "<p>No text detected across the selected images. Please try clearer images.</p>";
        }
        console.warn("⚠️ [AIgeminibtn] OCR produced too little text from the batch.");
        return;
      }
      processTextToFlashcards(allExtractedText);
      selectedFiles = [];
      renderFileList();
      fileInput.value = '';
    } catch (err) {
      console.error("❌ [AIgeminibtn] guardedHandleFileUpload error:", err);
      alert("Something went wrong during the process. Please try again.");
      if (document.getElementById("geminiFlashcards")) {
        document.getElementById("geminiFlashcards").innerHTML = "<p>An error occurred. Please refresh and try again.</p>";
      }
      selectedFiles = [];
      renderFileList();
      fileInput.value = '';
    }finally {
    // ▼▼▼ ADD THIS NEW "finally" BLOCK AT THE END ▼▼▼
    // This code will run whether the process succeeds or fails
    if (parseBtn) {
      parseBtn.classList.remove("parsing");
      parseBtn.disabled = false;
    }
    // ▲▲▲ END OF NEW BLOCK ▲▲▲
  }
  }

  window.openParsecardsModal = function () {
    console.log("🪟 [AIgeminibtn] openParsecardsModal() called.");
    const m = document.getElementById("parsecardsModal");
    if (!m) return console.warn("⚠️ [AIgeminibtn] #parsecardsModal not found.");
    m.classList.remove("hidden");
    m.classList.add("show");
  };

  const parseCloseBtn = document.querySelector(".close-modal");
  if (parseCloseBtn) {
    parseCloseBtn.addEventListener("click", () => {
      console.log("❎ [AIgeminibtn] Closing #parsecardsModal.");
      const modal = document.getElementById("parsecardsModal");
      if (!modal) return;
      modal.classList.remove("show");
      modal.classList.add("hidden");
    });
  } else {
    console.log("ℹ️ [AIgeminibtn] .close-modal button for parsecards not found (ok if modal not on this page).");
  }
});
