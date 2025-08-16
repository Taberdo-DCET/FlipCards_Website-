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
  getDocs
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { storage } from "./firebaseStorageInit.js";

const auth = getAuth();
const db = getFirestore();
let currentUser = null;

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
});

document.addEventListener("DOMContentLoaded", () => {
  const profileBtn = document.querySelector(".music-icon.profile");
  const profileModal = document.getElementById("profileModal");
  const modalBox = document.querySelector(".profile-box");
  const dragHandle = document.getElementById("profileDragHandle");
  const avatarInput = document.getElementById("avatarInput");
  const coverInput = document.getElementById("coverInput");
  const closeBtn = document.querySelector(".close-profile-modal");
  const logoutBtn = document.getElementById("logoutBtn");

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

  document.querySelector(".edit-username").addEventListener("click", async () => {
    if (!currentUser) return;
    const newUsername = prompt("Enter your new username:");
    if (!newUsername || newUsername.trim() === "") return;
    const username = newUsername.trim();

    try {
      const q = query(collection(db, "usernames"), where("username", "==", username));
      const snapshot = await getDocs(q);

      if (!snapshot.empty && !snapshot.docs.every(doc => doc.id === currentUser.email)) {
        alert("Username already taken. Please try a different one.");
        return;
      }

      await setDoc(doc(db, "usernames", currentUser.email), {
        username,
        updatedAt: new Date()
      });

      document.getElementById("userName").textContent = username;
      alert("Username saved!");
    } catch (err) {
      console.error("Error saving username:", err);
      alert("Failed to save username.");
    }
  });

  logoutBtn?.addEventListener("click", () => {
    auth.signOut().then(() => {
      sessionStorage.setItem("loggedOut", "true");
      window.location.href = "index.html";
    });
  });

  makeModalDraggable(modalBox, dragHandle);
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


