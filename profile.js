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
    if (currentUser) loadUserProfile(currentUser.email, true);
  });

  profileModal.addEventListener("click", (e) => e.stopPropagation());
  closeBtn?.addEventListener("click", () => profileModal.classList.add("hidden"));

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
    const avatarURL = await getDownloadURL(ref(storage, `avatars/${email}`));
    avatarImg.src = avatarURL;
  } catch {
    avatarImg.src = "Group-10.png";
  }

  try {
    const coverURL = await getDownloadURL(ref(storage, `covers/${email}`));
    coverImg.src = coverURL;
  } catch {
    coverImg.src = "backgroundlobby.png";
  }

  try {
    const usernameSnap = await getDoc(doc(db, "usernames", email));
    const approvedSnap = await getDoc(doc(db, "approved_emails", email));
    const usernameData = usernameSnap.exists() ? usernameSnap.data() : {};
    const approvedData = approvedSnap.exists() ? approvedSnap.data() : {};

    const username = usernameData.username || "User";
    const roleString = approvedData.role || "";
    const roleArray = roleString.split(',').map(r => r.trim().toLowerCase());
    const level = approvedData.level || 1;
    const xp = approvedData.xp || 0;
    const maxXP = 1200 + (level - 1) * 500;

    emailText.textContent = email;
    usernameText.textContent = username;
    badgeSpan.innerHTML = "";

    if (roleArray.includes("verified")) {
      badgeSpan.innerHTML += `<img src="verified.png" alt="verified" title="Verified" />`;
    }
    if (roleArray.includes("first")) {
      badgeSpan.innerHTML += `<img src="first.png" alt="first" title="First User" />`;
    }

    if (levelText && xpText && xpBar) {
      levelText.textContent = `Lvl ${level}`;
      xpText.textContent = `${xp} / ${maxXP} XP`;
      xpBar.style.width = `${Math.min(100, (xp / maxXP) * 100)}%`;
    }

    // 👁️ Toggle editing controls
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
    getDefiDropCount(email)
  ]).then(([cardCount, defidropCount]) => {
    const cardLabel = document.getElementById("flashcardCountLabel");
    if (cardLabel) {
      cardLabel.textContent = `Total Created Flashcard${cardCount !== 1 ? 's' : ''}: ${cardCount}`;
    }

    const defidropLabel = document.getElementById("defidropCountLabel");
    if (defidropLabel) {
      defidropLabel.textContent = `${defidropCount} DefiDrop Correct`;
    }
  });
}

