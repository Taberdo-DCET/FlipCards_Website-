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

  // Grab elements (selectors must exist on the page)
  const geminiBtn       = document.getElementById("geminiBtn");
  const geminiModal     = document.getElementById("geminiModal");
  const closeModal      = document.getElementById("closeGeminiModal");
  const dropZone        = document.getElementById("geminiDropZone");
  const fileInput       = document.getElementById("geminiFileInput");
  const flashcardsOutput= document.getElementById("geminiFlashcards");
  const usageContainer  = document.getElementById("geminiUsage");  // container
  let   usageCountEl    = document.getElementById("geminiUsageCount"); // numerator
  let   usageMaxEl      = document.getElementById("geminiUsageMax");   // denominator (we may create this)
  const gotoAddcardBtn  = document.getElementById("gotoAddcardBtn");
// --- Refill timer DOM & state ---
let usageTimerEl = null;
const REFILL_MS =  10*60*1000; // 30 minutes
let refillInterval = null;
let refillEndsAt = null; // a Date when the current 30-min window ends
let lastUsedCount = null; // to detect when a use was consumed so we can start a timer

// --- Restore an in-progress refill countdown (survives reloads) ---
try {
  const savedEndsAt = Number(localStorage.getItem("gemini_refill_ends_at") || 0);
  const now = Date.now();
  if (savedEndsAt > now) {
    const remaining = savedEndsAt - now;
    // Resume with the exact remaining time
    startRefillCountdown(remaining);
    console.log("♻️ [AIgeminibtn] Restored active countdown from localStorage.");
  }
} catch (e) {
  console.warn("⚠️ [AIgeminibtn] Could not restore countdown:", e);
}

  if (!geminiBtn)        console.warn("⚠️ [AIgeminibtn] #geminiBtn not found!");
  if (!geminiModal)      console.warn("⚠️ [AIgeminibtn] #geminiModal not found!");
  if (!dropZone)         console.warn("⚠️ [AIgeminibtn] #geminiDropZone not found!");
  if (!fileInput)        console.warn("⚠️ [AIgeminibtn] #geminiFileInput not found!");
  if (!flashcardsOutput) console.warn("⚠️ [AIgeminibtn] #geminiFlashcards not found!");
  if (!usageContainer)   console.warn("⚠️ [AIgeminibtn] #geminiUsage (container) not found!");
  if (!usageCountEl)     console.warn("⚠️ [AIgeminibtn] #geminiUsageCount (number) not found!");

  // Gate early if Firebase failed to init
  if (window.__FC_PARSECARDS_DISABLED__) {
    console.warn("⛔ [AIgeminibtn] Disabled because Firebase did not initialize.");
    if (dropZone) { dropZone.style.pointerEvents = "none"; dropZone.style.opacity = "0.5"; }
    if (fileInput) fileInput.disabled = true;
    if (usageCountEl) usageCountEl.textContent = "0";
    return;
  }

  // --------------------------
  // Usage UI helpers
  // --------------------------
  let currentMax = DEFAULT_MAX_USES; // will be updated from Firestore realtime
  let unsubscribeUsage = null;

  function ensureUsageUI() {
  if (usageContainer && !usageMaxEl) {
    usageContainer.innerHTML = `
      Uses left: <span id="geminiUsageCount">0</span> / <span id="geminiUsageMax">0</span>
      <div id="geminiUsageTimer" style="margin-top: 6px; font-size: 12px; opacity: 0.85;">Next refill: --:--</div>
    `;
    usageCountEl = document.getElementById("geminiUsageCount");
    usageMaxEl   = document.getElementById("geminiUsageMax");
    usageTimerEl = document.getElementById("geminiUsageTimer");
    console.log("🧰 [AIgeminibtn] Upgraded usage UI to dynamic max + timer.");
  } else if (!usageTimerEl) {
    // If UI was already upgraded previously, ensure timer exists
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
    if (!dropZone || !fileInput) return;
    dropZone.style.pointerEvents = enabled ? "auto" : "none";
    dropZone.style.opacity       = enabled ? "1" : "0.5";
    fileInput.disabled           = !enabled;
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
  // Clear persisted end time
try { localStorage.removeItem("gemini_refill_ends_at"); } catch {}

  console.log(`🛑 [AIgeminibtn] Refill countdown stopped (${reason}).`);
}

function startRefillCountdown(durationMs = REFILL_MS) {
  stopRefillCountdown("restarting");
  refillEndsAt = new Date(Date.now() + durationMs);
  renderTimer();
  // Persist across reloads
try { localStorage.setItem("gemini_refill_ends_at", String(refillEndsAt.getTime())); } catch {}

  refillInterval = setInterval(async () => {
    const now = Date.now();
    if (!refillEndsAt) return;
    if (now >= refillEndsAt.getTime()) {
      // Time to attempt a refill
      stopRefillCountdown("timer elapsed");
      console.log("⏰ [AIgeminibtn] 30 min elapsed → attempting 1 usage refill...");
      try {
        const ok = await refillOneUse();
        if (ok.moreToRefill) {
          // Still not at max; start another 30-min window
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

  // --------------------------------------------
  // Firestore helpers for per-user usage counter
  // --------------------------------------------
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
    // approved_emails/{email}/limits/parseusage
    return doc(db, COLLECTION, email, SUBCOLLECTION, DOC_ID);
  }

  async function ensureUsageDoc(email) {
    const ref  = usageDocRef(email);
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
      await ensureUsageDoc(email); // ensure presence once
      const ref = usageDocRef(email);

      if (unsubscribeUsage) { unsubscribeUsage(); unsubscribeUsage = null; }

      console.log("🔔 [AIgeminibtn] Binding realtime usage listener…");
      unsubscribeUsage = onSnapshot(
  ref,
  (snap) => {
    const d = snap.data() || {};
    const max  = Number(d.max ?? DEFAULT_MAX_USES);
    const used = Number(d.used ?? 0);
    const left = Math.max(0, max - used);

    updateUsageMax(max);
    updateUsageDisplayLeft(left);

    // Timer logic based on used transitions
    if (lastUsedCount === null) {
      lastUsedCount = used; // initialize on first hit
      console.log(`🧮 [AIgeminibtn] Initial usage state: used=${used}, left=${left}/${max}`);
    } else {
      if (used > lastUsedCount) {
  // A use was consumed. If NO active refill window, start one; otherwise keep the remaining time.
  if (!refillEndsAt && !refillInterval) {
    console.log(`➖ [AIgeminibtn] Usage consumed (was ${lastUsedCount}, now ${used}). Starting refill window.`);
    startRefillCountdown(REFILL_MS);
  } else {
    const secsLeft = refillEndsAt ? Math.max(0, (refillEndsAt.getTime() - Date.now()) / 1000 | 0) : 0;
    console.log(`➖ [AIgeminibtn] Usage consumed during active window — keeping remaining ${secsLeft}s.`);
  }
} else if (used < lastUsedCount) {
  // A refill happened elsewhere (another tab/server) — nothing special; window logic below handles it
  console.log(`➕ [AIgeminibtn] Usage refilled elsewhere (was ${lastUsedCount}, now ${used}).`);
}

      lastUsedCount = used;
    }

    if (left >= max) {
      // Full — stop timer and show "Full"
      stopRefillCountdown("at max");
      if (usageTimerEl) usageTimerEl.textContent = "Full";
    } else {
      // Not full — if no timer running (e.g., just opened modal mid-cycle), start one
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
    const ref   = usageDocRef(email);

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

      const max  = Number(data.max ?? DEFAULT_MAX_USES);
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
  const ref   = usageDocRef(email);

  const result = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) {
      // Safety: create baseline
      tx.set(ref, { max: DEFAULT_MAX_USES, used: 0, updatedAt: serverTimestamp() });
      return { ok: true, used: 0, max: DEFAULT_MAX_USES };
    }
    const data = snap.data() || {};
    const max  = Number(data.max ?? DEFAULT_MAX_USES);
    let used   = Number(data.used ?? 0);

    if (used <= 0) {
      // Already full — nothing to do
      return { ok: true, used, max };
    }

    used = Math.max(0, used - 1); // replenish one
    tx.set(ref, { used, max, updatedAt: serverTimestamp() }, { merge: true });
    return { ok: true, used, max };
  });

  const left = Math.max(0, result.max - result.used);
  const moreToRefill = left < result.max; // if still not full, we can keep refilling next cycle
  console.log(`✅ [AIgeminibtn] Refilled 1 usage via transaction. New used=${result.used}, left=${left}/${result.max}`);
  return { ok: true, moreToRefill };
}

  // --------------------------------------------
  // Flashcard processing (existing functionality)
  // --------------------------------------------
  function processTextToFlashcards(slideText) {
    console.log("🧠 [AIgeminibtn] Processing OCR text into flashcards...");
    const lines = slideText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const structuredData = [];
    const flashcards = [];

    for (let i = 0; i < lines.length - 1; i += 2) {
      let term = lines[i];
      let definition = lines[i + 1];

      if (/^[a-z]{3,30}$/.test(term)) {
        console.log("🔧 [AIgeminibtn] Auto-capitalized possible term:", term);
        term = term.charAt(0).toUpperCase() + term.slice(1);
      }

      if (!term || !definition || definition.split(" ").length < 3) {
        console.log("❌ [AIgeminibtn] Rejected pair:", term, "|", definition);
        continue;
      }

      flashcards.push(`
        <div class="card">
          <strong>Term:</strong> ${term}<br>
          <strong>Definition:</strong> ${definition}
        </div>
      `);

      structuredData.push({ term, definition });
    }

    if (flashcardsOutput) {
      flashcardsOutput.innerHTML = flashcards.join("");
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

  // ---------------------------------------------------
  // Modal open/close + bind/unbind realtime on open/close
  // ---------------------------------------------------
  if (geminiBtn && geminiModal) {
    geminiBtn.addEventListener("click", () => {
      console.log("🎯 [AIgeminibtn] Gemini button clicked → opening modal + binding usage realtime…");
      geminiModal.classList.add("show");
      ensureUsageUI();
      bindUsageRealtime();  // updates both left and /max in real time
    });
  }

  if (closeModal && geminiModal) {
    closeModal.addEventListener("click", () => {
      console.log("🧹 [AIgeminibtn] Closing modal & clearing flashcardsData.");
      geminiModal.classList.remove("show");
      localStorage.removeItem("flashcardsData");
      if (unsubscribeUsage) {
        console.log("🔕 [AIgeminibtn] Unbinding usage listener.");
        unsubscribeUsage();
        unsubscribeUsage = null;
      }
    });
  }

  // --------------------------------
  // Drop zone & file input handlers
  // --------------------------------
  if (dropZone && fileInput) {
    dropZone.addEventListener("click", () => {
      console.log("🖱️ [AIgeminibtn] Drop zone clicked → opening file dialog.");
      fileInput.click();
    });

    fileInput.addEventListener("change", guardedHandleFileUpload);

    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZone.classList.add("hover");
    });

    dropZone.addEventListener("dragleave", () => {
      dropZone.classList.remove("hover");
    });

    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZone.classList.remove("hover");
      const file = e.dataTransfer.files?.[0];
      if (file) {
        console.log("📥 [AIgeminibtn] File dropped:", file.name);
        fileInput.files = e.dataTransfer.files; // reuse same handler
        guardedHandleFileUpload();
      }
    });
  }

  // -------------------------------------------------
  // Guarded upload handler with Firestore usage gate
  // -------------------------------------------------
  async function guardedHandleFileUpload() {
    try {
      const file = fileInput?.files?.[0];
      if (!file) {
        console.warn("⚠️ [AIgeminibtn] No file selected.");
        return;
      }
      if (!/\.(jpg|jpeg|png)$/i.test(file.name)) {
        alert("Please upload a valid image file (.jpg, .jpeg, .png).");
        console.warn("⚠️ [AIgeminibtn] Invalid file type:", file.name);
        return;
      }

      // 1) Attempt to consume one use (transaction)
      const consume = await tryConsumeOneUse();
      if (!consume.ok) {
        console.log("⛔ [AIgeminibtn] Usage limit reached. Blocking processing.");
        updateUsageDisplayLeft(0);
        alert(`You’ve used all ${consume.max ?? currentMax} ParseCards slots.`);
        return;
      }

      // Update UI counter now (snapshot will also update shortly)
      updateUsageDisplayLeft(consume.left);

      // 2) Proceed with OCR → flashcards pipeline
      console.log("🔍 [AIgeminibtn] Beginning OCR using Tesseract on:", file.name);
      const reader = new FileReader();
      reader.onload = async function (e) {
        if (flashcardsOutput) {
          flashcardsOutput.innerHTML = `<p>Reading image and extracting text... Please wait...</p>`;
        }

        const imageDataUrl = e.target.result;

        try {
          const { createWorker } = Tesseract; // from lobby.html script include
          const worker = await createWorker({ logger: (m) => console.log("[Tesseract]", m) });

          await worker.load();
          await worker.loadLanguage("eng");
          await worker.initialize("eng");

          const { data: { text } } = await worker.recognize(imageDataUrl);
          await worker.terminate();

          console.log("📷 [AIgeminibtn] OCR extracted text:", text);

          if (!text || text.trim().length < 5) {
            if (flashcardsOutput) {
              flashcardsOutput.innerHTML = "<p>No text detected. Please try a clearer image or different format.</p>";
            }
            console.warn("⚠️ [AIgeminibtn] OCR produced too little text.");
            return;
          }

          processTextToFlashcards(text);
        } catch (ocrErr) {
          console.error("❌ [AIgeminibtn] OCR pipeline failed:", ocrErr);
          if (flashcardsOutput) {
            flashcardsOutput.innerHTML = "<p>OCR failed. Please try again later.</p>";
          }
        }
      };

      reader.onerror = (e) => {
        console.error("❌ [AIgeminibtn] FileReader error:", e);
        if (flashcardsOutput) {
          flashcardsOutput.innerHTML = "<p>Failed to read file.</p>";
        }
      };

      reader.readAsDataURL(file);
    } catch (err) {
      console.error("❌ [AIgeminibtn] guardedHandleFileUpload error:", err);
      alert("Something went wrong. Please try again.");
    }
  }

  // -------------------------------------------------------
  // Global helpers (kept for other UI)
  // -------------------------------------------------------
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
