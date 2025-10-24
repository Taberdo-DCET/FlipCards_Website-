import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  limit
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { storage } from "./firebaseStorageInit.js";

const auth = getAuth();
const db = getFirestore();
let currentUser = null;

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
});

document.addEventListener("DOMContentLoaded", () => {
  const openSettingsBtn = document.getElementById("openSettingsBtn");
const settingsModal = document.getElementById("settingsModal");
const closeSettingsModalBtn = document.getElementById("closeSettingsModalBtn");
const referralCodeInput = document.getElementById("referralCodeInput");
const setReferralCodeBtn = document.getElementById("setReferralCodeBtn");

// Re-using your existing confirm modal selectors
const confirmModal = document.getElementById("customConfirmModal"); // Make sure this ID is correct
const confirmMessage = document.getElementById("confirmMessage"); // Make sure this ID is correct
const confirmBtn = document.getElementById("confirmBtn"); // Make sure this ID is correct
const cancelBtn = document.getElementById("cancelBtn");
const userReferralCodeDisplay = document.getElementById("userReferralCodeDisplay");
const userReferralCodeSpan = document.getElementById("userReferralCodeSpan");
const referralCounterSpan = document.getElementById("referralCounterSpan");
  const profileBtn = document.querySelector(".music-icon.profile");
  const profileModal = document.getElementById("profileModal");
  const modalBox = document.querySelector(".profile-box");
  const dragHandle = document.getElementById("profileDragHandle");
  const avatarInput = document.getElementById("avatarInput");
  const coverInput = document.getElementById("coverInput");
  const closeBtn = document.querySelector(".close-profile-modal");
  const logoutBtn = document.getElementById("logoutBtn");
const usernameModal = document.getElementById("usernameModal");
  const usernameInput = document.getElementById("usernameInput");
  const confirmUsernameBtn = document.getElementById("confirmUsernameBtn");
  const cancelUsernameBtn = document.getElementById("cancelUsernameBtn");
   const customAlertModal = document.getElementById("customAlertModal");
  const customAlertMessage = document.getElementById("customAlertMessage");
  const customAlertOkBtn = document.getElementById("customAlertOkBtn");
  const showRewardsBtn = document.getElementById("showRewardsBtn");
const rewardsModal = document.getElementById("rewardsModal");
const closeRewardsModalBtn = document.getElementById("closeRewardsModalBtn");

  async function checkAndDisableReferralUI() {
  if (!currentUser) return;

  // Show loading state
  referralCodeInput.disabled = true;
  setReferralCodeBtn.disabled = true;
  setReferralCodeBtn.textContent = "Loading...";

  const referralDocRef = doc(db, "ReferralCodeChoice", currentUser.email);
  const docSnap = await getDoc(referralDocRef);

  // ▼▼▼ REPLACE THE OLD if/else BLOCK WITH THIS ▼▼▼
if (docSnap.exists()) {
  const data = docSnap.data();
  const userCode = data.code || "N/A";

  // Update input and button
  referralCodeInput.value = userCode;
  referralCodeInput.disabled = true;
  setReferralCodeBtn.disabled = true;
  setReferralCodeBtn.textContent = "Code Set";

  // Fetch count and update display area
  const referralCount = await getReferralCount(userCode);
  userReferralCodeSpan.textContent = userCode;
  referralCounterSpan.textContent = `Points: ${referralCount}`;
  userReferralCodeDisplay.classList.remove("hidden"); // Show the display area

} else {
  // Reset input and button
  referralCodeInput.value = "";
  referralCodeInput.disabled = false;
  setReferralCodeBtn.disabled = false;
  setReferralCodeBtn.textContent = "Set Code";

  // Hide the display area
  userReferralCodeDisplay.classList.add("hidden");
  userReferralCodeSpan.textContent = "";
  referralCounterSpan.textContent = "Points: 0";
}
// ▲▲▲ END OF REPLACEMENT ▲▲▲
}
  // Helper function to show the custom alert
  function showAlert(message, type = 'default') { // type can be 'success' or 'error'
    const alertContent = customAlertModal.querySelector('.custom-alert-content');
    
    // Always clear previous color classes
    alertContent.classList.remove('success', 'error');

    // Add the correct class based on the type
    if (type === 'success') {
      alertContent.classList.add('success');
    } else if (type === 'error') {
      alertContent.classList.add('error');
    }

    customAlertMessage.textContent = message;
    customAlertModal.classList.remove("hidden");
    customAlertOkBtn.onclick = () => {
      customAlertModal.classList.add("hidden");
    };
  }
// ▼▼▼ REPLACE THE OLD getReferralCount FUNCTION WITH THIS ▼▼▼
// Function to get the referral count by checking field names in 'Paid' and 'Guest' docs
async function getReferralCount(userCode) {
  if (!userCode) return 0; // Return 0 if no code provided

  let totalCount = 0;

  try {
    // Define references to the Paid and Guest documents in the Referral collection
    const paidDocRef = doc(db, "Referral", "Paid");
    const guestDocRef = doc(db, "Referral", "Guest");

    // Fetch both documents
    const [paidDocSnap, guestDocSnap] = await Promise.all([
      getDoc(paidDocRef),
      getDoc(guestDocRef)
    ]);

    // Process Paid document
    if (paidDocSnap.exists()) {
      const paidData = paidDocSnap.data();
      // Check if a field with the userCode name exists
      if (paidData.hasOwnProperty(userCode)) {
         // Ensure the value is a number before adding
         const count = Number(paidData[userCode]);
         if (!isNaN(count)) {
           totalCount += count;
         }
      }
    }

    // Process Guest document
    if (guestDocSnap.exists()) {
      const guestData = guestDocSnap.data();
      // Check if a field with the userCode name exists
      if (guestData.hasOwnProperty(userCode)) {
         // Ensure the value is a number before adding
         const count = Number(guestData[userCode]);
         if (!isNaN(count)) {
           totalCount += count;
         }
      }
    }

    return totalCount; // Return the combined count

  } catch (error) {
    console.error("Error fetching referral count from Paid/Guest docs:", error);
    return 0; // Return 0 on error
  }
}
// ▲▲▲ END OF REPLACEMENT ▲▲▲
// ▲▲▲ END OF REPLACEMENT ▲▲▲
  profileBtn?.addEventListener("click", () => {
  // Slide miniProfile out (if present), then open profile
  const mp = document.getElementById("miniProfile");
  if (mp) {
    mp.classList.remove("mp-slide-in");
    mp.classList.add("mp-slide-out");
    mp.addEventListener("animationend", function onEnd() {
      mp.style.display = "none";                 // fully hide after slide
      mp.removeEventListener("animationend", onEnd);
    }, { once: true });
  }
  if (currentUser) loadUserProfile(currentUser.email, true);
});


  profileModal.addEventListener("click", (e) => e.stopPropagation());
  closeBtn?.addEventListener("click", () => {
  profileModal.classList.add("hidden");
  // Bring miniProfile back (slide in)
  const mp = document.getElementById("miniProfile");
  if (mp) {
    mp.style.display = "";                     // unhide
    mp.classList.remove("mp-slide-out");       // clear previous state
    mp.classList.add("mp-slide-in");           // play slide-in
  }
});


  avatarInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file || !currentUser) return;
    const avatarRef = ref(storage, `avatars/${currentUser.email}`);
    await uploadBytes(avatarRef, file);
    const url = await getDownloadURL(avatarRef);
    document.getElementById("avatarPreview").src = url;
  });

  coverInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file || !currentUser) return;
    const coverRef = ref(storage, `covers/${currentUser.email}`);
    await uploadBytes(coverRef, file);
    const url = await getDownloadURL(coverRef);
    document.getElementById("coverPreview").src = url;
  });

  // This new code block replaces the one you just deleted.
  document.querySelector(".edit-username").addEventListener("click", () => {
    if (!currentUser) return;

    // Show your custom modal
    usernameModal.classList.remove("hidden");
    usernameInput.value = ""; // Clear previous input
    usernameInput.focus();

    // This new code block replaces the one you just deleted
    const handleConfirm = async () => {
      const newUsername = usernameInput.value;
      
      // Hide the modal
      usernameModal.classList.add("hidden");

      if (!newUsername || newUsername.trim() === "") {
        return; // Exit if input is empty
      }
      
      const username = newUsername.trim();

      // --- Logic updated to use showAlert ---
      // --- Logic updated to use showAlert with success/error types ---
      try {
        const q = query(collection(db, "usernames"), where("username", "==", username));
        const snapshot = await getDocs(q);

        if (!snapshot.empty && !snapshot.docs.every(doc => doc.id === currentUser.email)) {
          showAlert("Username already taken. Please try a different one.", 'error');
          return;
        }

        await setDoc(doc(db, "usernames", currentUser.email), {
          username,
          updatedAt: new Date()
        });

        document.getElementById("userName").textContent = username;
        showAlert("Username saved!", 'success');
      } catch (err) {
        console.error("Error saving username:", err);
        showAlert("Failed to save username.", 'error');
      }
    };

    const handleCancel = () => {
      usernameModal.classList.add("hidden");
    };

    // Attach event listeners for the modal buttons
    confirmUsernameBtn.onclick = handleConfirm;
    cancelUsernameBtn.onclick = handleCancel;
  });

  logoutBtn?.addEventListener("click", () => {
    auth.signOut().then(() => {
      sessionStorage.setItem("loggedOut", "true");
      window.location.href = "index.html";
    });
  });

  makeModalDraggable(modalBox, dragHandle);
  // Listener to open settings modal
openSettingsBtn?.addEventListener("click", () => {
  profileModal.classList.add("hidden"); // Close profile modal
  settingsModal.classList.remove("hidden"); // Open settings modal
  checkAndDisableReferralUI(); // Check referral status when modal opens
});

// Listener to close settings modal
// Listener to close settings modal and hard reload
closeSettingsModalBtn?.addEventListener("click", () => {
  window.location.reload(true); // Hard reload the page
});

// Listener for the "Set" referral code button
setReferralCodeBtn?.addEventListener("click", () => {
  const code = referralCodeInput.value.trim();
  if (code === "") {
    showAlert("Please enter a referral code.", "error");
    return;
  }

  // Show the confirmation modal
  confirmMessage.textContent = "Are you sure? This code cannot be changed once set.";
  confirmModal.classList.remove("hidden");

  // Handle confirmation
  confirmBtn.onclick = async () => {
    confirmModal.classList.add("hidden");
    if (!currentUser) {
      showAlert("You must be logged in.", "error");
      return;
    }

    // Disable UI immediately to prevent double-click
    setReferralCodeBtn.disabled = true;
    setReferralCodeBtn.textContent = "Saving...";

    try {
      // ▼▼▼ ADD THIS BLOCK TO CHECK FOR DUPLICATES ▼▼▼
// Check if the code already exists in the collection
const checkQuery = query(
  collection(db, "ReferralCodeChoice"),
  where("code", "==", code),
  limit(1) // We only need to know if at least one exists
);
const checkSnapshot = await getDocs(checkQuery);

if (!checkSnapshot.empty) {
  // Code already exists
  showAlert("This referral code is already taken. Please choose another one.", "error");
  // Re-enable button on failure
  setReferralCodeBtn.disabled = false;
  setReferralCodeBtn.textContent = "Set Code";
  return; // Stop the function here
}
// ▲▲▲ END OF DUPLICATE CHECK BLOCK ▲▲▲

      // Set the document in Firestore
      const referralDocRef = doc(db, "ReferralCodeChoice", currentUser.email);
      await setDoc(referralDocRef, {
        code: code,
        timestamp: new Date()
      });

      showAlert("Referral code set successfully!", "success");
const referralCount = await getReferralCount(code); // Re-use the code variable
userReferralCodeSpan.textContent = code;
referralCounterSpan.textContent = `Points: ${referralCount}`;
userReferralCodeDisplay.classList.remove("hidden");
      // Permanently disable the UI
      referralCodeInput.value = code;
      referralCodeInput.disabled = true;
      setReferralCodeBtn.textContent = "Code Set";

    } catch (error) {
      console.error("Error setting referral code: ", error);
      showAlert("Failed to set referral code.", "error");
      // Re-enable button on failure
      setReferralCodeBtn.disabled = false;
      setReferralCodeBtn.textContent = "Set Code";
    }
  };

  // Handle cancellation
  cancelBtn.onclick = () => {
    confirmModal.classList.add("hidden");
  };
});
showRewardsBtn?.addEventListener("click", () => {
  // Keep settings modal open behind it
  rewardsModal.classList.remove("hidden");
});

// Listener to close rewards modal
closeRewardsModalBtn?.addEventListener("click", () => {
  rewardsModal.classList.add("hidden");
});

// Optional: Close rewards modal if backdrop is clicked
rewardsModal?.addEventListener("click", (event) => {
    if (event.target === rewardsModal) {
        rewardsModal.classList.add("hidden");
    }
});
});

function makeModalDraggable(modalBox, dragHandle) {
  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  modalBox.style.position = "absolute";
  modalBox.style.zIndex = 9999;
  dragHandle.style.cursor = "move";

  dragHandle.addEventListener("mousedown", (e) => {
    isDragging = true;
    offsetX = modalBox.offsetWidth / 2;
    offsetY = modalBox.offsetHeight / 2;
    e.preventDefault();
  });

  window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    const x = e.clientX - offsetX;
    const y = e.clientY - offsetY;

    const maxX = window.innerWidth - modalBox.offsetWidth;
    const maxY = window.innerHeight - modalBox.offsetHeight;

    modalBox.style.left = `${Math.min(Math.max(0, x), maxX)}px`;
    modalBox.style.top = `${Math.min(Math.max(0, y), maxY)}px`;
  });

  window.addEventListener("mouseup", () => {
    isDragging = false;
  });
}

// 👤 Reusable entry point from member.js
export async function openUserProfile(email) {
  const modal = document.getElementById("profileModal");
  const avatarImg = document.getElementById("avatarPreview");
  const coverImg = document.getElementById("coverPreview");
  const usernameText = document.getElementById("userName");
  const badgeSpan = document.getElementById("userBadgeContainer");
  const emailText = document.getElementById("userEmail");
  const xpBar = document.getElementById("xpFill");
  const levelText = document.getElementById("userLevelText");
  const xpText = document.getElementById("xpText");

  // Show "Loading..." state
  if (avatarImg) avatarImg.src = "Group-100.png";
  if (coverImg) coverImg.src = "backgroundlobby.png";
  if (usernameText) usernameText.textContent = "Loading...";
  if (emailText) emailText.textContent = "";
  if (badgeSpan) badgeSpan.innerHTML = "";
  if (levelText) levelText.textContent = "Lvl ...";
  if (xpText) xpText.textContent = "... / ... XP";
  if (xpBar) xpBar.style.width = "0%";

  modal.classList.remove("hidden");

  // Continue with loading the actual data
  loadUserProfile(email, email === currentUser?.email);
}


// 🔁 Main function for loading profiles
async function loadUserProfile(email, isSelf = false) {
  const modal = document.getElementById("profileModal");
  const avatarImg = document.getElementById("avatarPreview");
  const coverImg = document.getElementById("coverPreview");
  const usernameText = document.getElementById("userName");
  const badgeSpan = document.getElementById("userBadgeContainer");
  const emailText = document.getElementById("userEmail");
  const xpBar = document.getElementById("xpFill");
  const levelText = document.getElementById("userLevelText");
  const xpText = document.getElementById("xpText");

  try {
    // Fetch all data in parallel
    const [avatarURL, coverURL, usernameSnap, approvedSnap] = await Promise.all([
      getDownloadURL(ref(storage, `avatars/${email}`)).catch(() => "Group-100.png"),
      getDownloadURL(ref(storage, `covers/${email}`)).catch(() => "backgroundlobby.png"),
      getDoc(doc(db, "usernames", email)),
      getDoc(doc(db, "approved_emails", email))
    ]);

    avatarImg.src = avatarURL;
    coverImg.src = coverURL;

// Create a separate border container on top of the avatar container
const avatarContainer = document.querySelector(".avatar-container");
let borderContainer = document.getElementById("profileBorderContainer");
if (!borderContainer) {
  borderContainer = document.createElement("div");
  borderContainer.id = "profileBorderContainer";
  borderContainer.style.position = "absolute";
  borderContainer.style.top = "0px";
  borderContainer.style.left = "0";
  borderContainer.style.width = "100%";
  borderContainer.style.height = "100%";
  borderContainer.style.display = "flex";
  borderContainer.style.alignItems = "center";
  borderContainer.style.justifyContent = "center";
  avatarContainer.parentElement.appendChild(borderContainer);
}

// Clear previous borders
borderContainer.innerHTML = `
  <img id="goldBorderProfile" src="goldborder.png" class="profile-border" style="display:none;">
  <img id="adminBorderProfile" src="adminborder.png" class="profile-border" style="display:none;">
  <img id="agaBorderProfile" src="agacustomborder.png" class="profile-border" style="display:none;">
  <img id="coadminBorderProfile" src="coadminborder.png" class="profile-border" style="display:none;">
  <img id="persBorderProfile" src="firstplacedefi.png" class="profile-border" style="display:none;">
  <img id="secondBorderProfile" src="seconddefiborder.png" class="profile-border" style="display:none;">
  <img id="firstUserProfile" src="firstuser.png" class="profile-border" style="display:none;">
`;

    
    const usernameData = usernameSnap.exists() ? usernameSnap.data() : {};
    const approvedData = approvedSnap.exists() ? approvedSnap.data() : {};

    const username = usernameData.username || "User";
    const roleString = approvedData.role || "";
    const roleArray = roleString.split(',').map(r => r.trim().toLowerCase());
    document.getElementById("goldBorderProfile").style.display = roleArray.includes("goldborder") ? "block" : "none";
document.getElementById("adminBorderProfile").style.display = roleArray.includes("admn") ? "block" : "none";
document.getElementById("agaBorderProfile").style.display = roleArray.includes("aga") ? "block" : "none";
document.getElementById("coadminBorderProfile").style.display = roleArray.includes("co") ? "block" : "none";
document.getElementById("persBorderProfile").style.display = roleArray.includes("pers") ? "block" : "none";
document.getElementById("secondBorderProfile").style.display = roleArray.includes("sec") ? "block" : "none";
document.getElementById("firstUserProfile").style.display = roleArray.includes("1st") ? "block" : "none";



    const level = approvedData.level || 1;
    const xp = approvedData.xp || 0;
    const maxXP = 1200 + (level - 1) * 500;

    emailText.textContent = email;
    usernameText.textContent = username;
    badgeSpan.innerHTML = "";
if (roleArray.includes("plus")) {
  badgeSpan.innerHTML += `<img src="plass.png" alt="plus" title="FlipCards+" class="plus-badge" />`;
}
    if (roleArray.includes("verified")) {
      badgeSpan.innerHTML += `<img src="verified.svg" alt="verified" title="Verified" />`;
    }
    if (roleArray.includes("first")) {
      badgeSpan.innerHTML += `<img src="first.png" alt="first" title="First User" />`;
    }

    if (levelText && xpText && xpBar) {
      levelText.textContent = `Lvl ${level}`;
      xpText.textContent = `${xp} / ${maxXP} XP`;
      xpBar.style.width = `${Math.min(100, (xp / maxXP) * 100)}%`;

    const badgeIcons = {
  hearted: "hearted.png",
  trophy: "trophy.png",
  friend: "friend.png",
  bronze: "bronze.png",
  silver: "silver.png",
  gold: "gold.png",
  platinum: "platinum.png",
  diamond: "diamond.png",
  sponsor: "sponsor.png"
};

const achievementBadgesHTML = roleArray
  .filter(r => ["hearted", "trophy", "friend", "bronze", "silver", "gold", "platinum", "diamond", "sponsor"].includes(r))
  .map(r => {
    const badge = badgeIcons[r];
    return badge ? `<img src="${badge}" alt="${r}" class="role-badge" title="${r}">` : "";
  }).join(" ");

document.getElementById("profileBadges").innerHTML = achievementBadgesHTML;

    }

    // Toggle editing controls
    const editUsernameBtn = document.querySelector(".edit-username");
    const avatarLabel = document.querySelector("label[for='avatarInput']");
    const coverLabel = document.querySelector("label[for='coverInput']");
    const logoutlabel = document.querySelector(".profile-logout-btn");
    const setlabel = document.querySelector(".profile-settings-btn");

    if (isSelf) {
      editUsernameBtn?.classList.remove("hidden");
      avatarLabel?.classList.remove("hidden");
      coverLabel?.classList.remove("hidden");
    } else {
      editUsernameBtn?.classList.add("hidden");
      avatarLabel?.classList.add("hidden");
      coverLabel?.classList.add("hidden");
      logoutlabel?.classList.add("hidden");
      setlabel?.classList.add("hidden");
    }

    modal.classList.remove("hidden");
  } catch (err) {
    console.error("Error loading profile:", err);
  }
}


// 🔍 Stats for achievements
async function getFlashcardCount(email) {
  const statsRef = doc(db, "user_card_stats", email);
  const snap = await getDoc(statsRef);
  if (snap.exists()) {
    const data = snap.data();
    return typeof data.totalCards === "number" ? data.totalCards : 0;
  }
  return 0;
}

async function getDefiDropCount(email) {
  const ref = doc(db, "defidrop_scores", email);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data();
    return typeof data.totalCorrect === "number" ? data.totalCorrect : 0;
  }
  return 0;
}

// 🏆 Open Achievements Modal for any user
// 🏆 Open Achievements Modal for any user
export function openAchievementsForUser(email) {
  const modal = document.getElementById("achievementsModal");
  const box = modal?.querySelector('.achievements-box');
  if (!modal || !box) return;

  modal.classList.remove("hidden");
  box.classList.remove("animate-expand");
  void box.offsetWidth;
  box.classList.add("animate-expand");

  // 🟡 Update title
  const title = document.getElementById("achievementsTitle");
  if (title) {
    title.textContent = email === auth.currentUser?.email
      ? "🏅 Your Achievements"
      : `🏅 Achievements of ${email.split("@")[0]}`;
  }

  Promise.all([
    getFlashcardCount(email),
    getDefiDropCount(email),
    getQuibblWins(email)
  ]).then(([cardCount, defidropCount, quibblWins]) => {
    const cardLabel = document.getElementById("flashcardCountLabel");
    if (cardLabel) {
      cardLabel.textContent = `Total Created Flashcard${cardCount !== 1 ? 's' : ''}: ${cardCount}`;
    }

    const defidropLabel = document.getElementById("defidropCountLabel");
    if (defidropLabel) {
      defidropLabel.textContent = `${defidropCount} DefiDrop Correct`;
    }

    const quibblWinsLabel = document.getElementById("quibblWinsLabel");
    if (quibblWinsLabel) {
      if (quibblWins > 0) {
        quibblWinsLabel.innerHTML = `
  <span style="font-weight:bold; font-size:14px; margin-right:4px; background: transparent; color: white;">${quibblWins}</span>
  <img src="quibblstar.png" alt="Quibbl Star" class="star-icon" style="width: 20px; height: 20px; vertical-align: middle;">
`;

      } else {
        quibblWinsLabel.textContent = "No Quibbl wins yet.";
      }
    }
  });
}


