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

const guestReferralModal = document.getElementById("guestReferralModal");
const guestReferralInput = document.getElementById("guestReferralCodeInput");
const submitGuestReferralBtn = document.getElementById("submitGuestReferral");
const skipGuestReferralBtn = document.getElementById("skipGuestReferral");

// -------- Promotion tally config --------
const PROMO_COLLECTION = "Promotion";
const PROMO_DOC_ID = "DiscoverFlipCards"; // single doc that holds all counters
const REFERRAL_COLLECTION = "Referral";
const REFERRAL_GUEST_DOC_ID = "Guest";

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
// -------- Event wiring --------
guestBtn.addEventListener("click", () => {
  const blocked = localStorage.getItem("guestBlocked");
  if (blocked === "true") {
    // relies on showGuestModal already defined in index.html
    showGuestModal("⛔ Guest access is no longer available. Contact us to avail a slot.");
    return;
  }
  surveyModal.classList.add('visible'); // Use class to show
});

surveyCancel?.addEventListener("click", () => {
  surveyModal.classList.remove('visible'); // Use class to hide
});

// 2. User submits the "How did you find us?" survey
// ▼▼▼ REPLACE THE OLD surveyForm SUBMIT LISTENER WITH THIS ▼▼▼
surveyForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const checkedInputs = surveyForm.querySelectorAll('input[name="discovery"]:checked');
  if (checkedInputs.length === 0) {
    alert("Please select at least one option to continue.");
    return;
  }

  // Save survey choices
  const choices = Array.from(checkedInputs).map(i => i.value);
  localStorage.setItem("guestDiscovery", JSON.stringify(choices));

  surveyModal.classList.remove('visible'); // Hide survey modal

  // --- CHECK IF REFERRAL ALREADY PROCESSED THIS SESSION ---
  if (sessionStorage.getItem('guestReferralProcessed') === 'true') {
    console.log("Guest referral already processed this session. Skipping modal."); // Debug log
    finalizeGuestLogin(); // Go straight to login
  } else {
    guestReferralModal.classList.add('visible'); // Show the referral modal
  }
  // --- END CHECK ---
});
// ▲▲▲ END REPLACEMENT ▲▲▲
// 3. User submits a referral code
submitGuestReferralBtn.addEventListener("click", () => {
    const referralCode = guestReferralInput.value.trim();
    if (referralCode) {
        localStorage.setItem("guestReferral", referralCode);
    }
    guestReferralModal.classList.remove('visible');
    finalizeGuestLogin();
});

// 4. User skips the referral step
skipGuestReferralBtn.addEventListener("click", () => {
    localStorage.removeItem("guestReferral"); // Ensure no old code is stored
    guestReferralModal.classList.remove('visible');
    finalizeGuestLogin();
});

// --- Final Login Function ---
async function finalizeGuestLogin() {
  if (!localStorage.getItem("guestStartTime")) {
    localStorage.setItem("guestStartTime", Date.now());
  }
  localStorage.setItem("guestBlocked", "false");

  try {
    await signInAnonymously(auth);

    // --- Save Survey Data ---
    const surveyChoices = JSON.parse(localStorage.getItem("guestDiscovery") || "[]");
    if (surveyChoices.length > 0) {
        const promoUpdate = { lastUpdated: serverTimestamp() };
        for (const choice of surveyChoices) {
            promoUpdate[keyFor(choice)] = increment(1);
        }
        const promoRef = doc(db, PROMO_COLLECTION, PROMO_DOC_ID);
        await setDoc(promoRef, promoUpdate, { merge: true });
    }

// --- [NEW] Save Referral Data ---
    const referralCode = localStorage.getItem("guestReferral");
    if (referralCode) {
        const referralUpdate = { [referralCode]: increment(1) };
        const referralRef = doc(db, REFERRAL_COLLECTION, REFERRAL_GUEST_DOC_ID);
        await setDoc(referralRef, referralUpdate, { merge: true });
        sessionStorage.setItem('guestReferralProcessed', 'true'); // <-- ADD THIS LINE
        console.log("Guest referral processed and flag set for this session."); // Debug log
    }
    // --- [END OF NEW CODE] ---

    // --- Clean up local storage and redirect ---
    localStorage.removeItem("guestDiscovery");
    localStorage.removeItem("guestReferral"); // <-- Also add this line for cleanup
    window.location.href = "lobby.html";

  } catch (error) {
    console.error("Anonymous sign-in failed:", error.message);
    showGuestModal("Something went wrong. Please try again.");
  }
}
