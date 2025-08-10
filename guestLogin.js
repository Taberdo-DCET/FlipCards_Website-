// guestLogin.js
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  increment,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { app } from "./firebaseinit.js";

const auth = getAuth(app);
const db = getFirestore(app);

// UI refs
const guestBtn = document.getElementById("guestLoginBtn");
const surveyModal = document.getElementById("surveyModal");
const surveyForm = document.getElementById("surveyForm");
const surveyCancel = document.getElementById("surveyCancel");

// -------- Promotion tally config --------
const PROMO_COLLECTION = "Promotion";
const PROMO_DOC_ID = "DiscoverFlipCards"; // single doc that holds all counters

function keyFor(choice) {
  // Map labels to safe Firestore field keys
  switch (choice) {
    case "FB Page Post": return "fbPagePost";
    case "FB Group Post": return "fbGroupPost";
    case "Tiktok": return "tiktok";
    case "Recommended by a Friend": return "friend";
    default: return "unknown";
  }
}

// -------- Event wiring --------
guestBtn.addEventListener("click", () => {
  const blocked = localStorage.getItem("guestBlocked");
  if (blocked === "true") {
    // relies on showGuestModal already defined in index.html
    showGuestModal("⛔ Guest access is no longer available. Contact us to avail a slot.");
    return;
  }
  surveyModal.style.display = "flex";
});

surveyCancel?.addEventListener("click", () => {
  surveyModal.style.display = "none";
});

surveyForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Support MULTIPLE selections
  const checkedInputs = surveyForm.querySelectorAll('input[name="discovery"]:checked');
  if (checkedInputs.length === 0) {
    alert("Please select at least one option to continue.");
    return;
  }

  const choices = Array.from(checkedInputs).map(i => i.value);
  localStorage.setItem("guestDiscovery", JSON.stringify(choices)); // keep for redirect edge cases

  surveyModal.style.display = "none";
  proceedGuestLogin();
});

// -------- Flow helpers --------
function proceedGuestLogin() {
  if (!localStorage.getItem("guestStartTime")) {
    localStorage.setItem("guestStartTime", Date.now());
  }
  localStorage.setItem("guestBlocked", "false");

  signInAnonymously(auth)
    .then(async () => {
      // Read stored selections (array)
      const stored = localStorage.getItem("guestDiscovery");
      const selections = stored ? JSON.parse(stored) : [];

      // Build a single atomic update object with increment for EACH selected field
      const updatePayload = { lastUpdated: serverTimestamp() };
      if (Array.isArray(selections) && selections.length > 0) {
        for (const choice of selections) {
          const field = keyFor(choice);
          updatePayload[field] = increment(1);
        }
      } else {
        // fallback if something went wrong
        updatePayload["unknown"] = increment(1);
      }

      const docRef = doc(db, PROMO_COLLECTION, PROMO_DOC_ID);

      try {
        // Create or update in ONE call; won't reset other counters
        await setDoc(docRef, updatePayload, { merge: true });
      } catch (err) {
        console.error("Failed to record promotion tally:", err);
        // Non-blocking — still let the user in
      }

      // Go to lobby
      window.location.href = "lobby.html";
    })
    .catch((error) => {
      console.error("Anonymous sign-in failed:", error.message);
      showGuestModal("Something went wrong. Please try again.");
    });
}
