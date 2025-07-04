import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

// Firebase config and initialization
const firebaseConfig = {
  apiKey: "AIzaSyCndfcWksvEBhzJDiQmJj_zSRI6FSVNUC0",
  authDomain: "flipcards-7adab.firebaseapp.com",
  projectId: "flipcards-7adab",
  storageBucket: "flipcards-7adab.firebasestorage.app",
  messagingSenderId: "836765717736",
  appId: "1:836765717736:web:ff749a40245798307b655d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const searchInput = document.getElementById("folderSearch");
const filterSelect = document.getElementById("folderFilter");
const container = document.querySelector(".folder-grid");

function sanitize(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatDate(isoString) {
  const parsed = new Date(isoString);
  return isNaN(parsed)
    ? "Unknown"
    : parsed.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric"
      });
}

function createCard(set, isPublic) {
  const card = document.createElement("div");
  card.className = "folder-card";

  const date = formatDate(set.createdOn || set.createdAt);
  const uniqueKey = `${set.title}___${set.createdOn}`;
  const userLine = isPublic ? `<div style="font-size: 13px; color: #bbb;">by ${set.user || "Anonymous"}</div>` : "";

  card.innerHTML = `
    <div class="folder-header">
      <span class="folder-date">${date}</span>
      <div class="folder-icons">
        ${!isPublic ? `
          <img src="editttnc.png" data-hover="editttc.png" data-default="editttnc.png" class="edit-icon hover-switch edit-btn" title="Edit" data-key="${uniqueKey}" />
          <img src="delnc.png" data-hover="delc.png" data-default="delnc.png" class="delete-icon hover-switch delete-btn" title="Delete" data-key="${uniqueKey}" />
        ` : ""}
      </div>
    </div>
    <div class="folder-title">${sanitize(set.title)}</div>
    <div class="folder-subtitle">${sanitize(set.description || "Flashcards Set")}</div>
    <button class="review-btn" onclick="reviewSet('${uniqueKey}')">REVIEW</button>
    ${userLine}
  `;

  return card;
}

async function renderFilteredFolders() {
  if (!container) return;
  container.innerHTML = "";

  const keyword = searchInput?.value.toLowerCase() || "";
  const type = filterSelect?.value || "your";

  if (type === "your") {
    const sets = JSON.parse(localStorage.getItem("flashcardSets") || "[]");
    sets.forEach(set => {
      const title = set.title?.toLowerCase() || "";
      const desc = set.description?.toLowerCase() || "";
      const match = title.includes(keyword) || desc.includes(keyword);
      if (!match) return;
      container.appendChild(createCard(set, false));
    });
  } else if (type === "public") {
    const q = query(collection(db, "flashcard_sets"), where("public", "==", true));
    const snapshot = await getDocs(q);
    snapshot.forEach(doc => {
      const set = doc.data();
      const title = set.title?.toLowerCase() || "";
      const desc = set.description?.toLowerCase() || "";
      const match = title.includes(keyword) || desc.includes(keyword);
      if (!match) return;
      container.appendChild(createCard(set, true));
    });
  }

  // Hover effect on icons
  document.querySelectorAll(".hover-switch").forEach(img => {
    const def = img.getAttribute("data-default");
    const hov = img.getAttribute("data-hover");
    img.addEventListener("mouseover", () => img.src = hov);
    img.addEventListener("mouseout", () => img.src = def);
  });
}

window.addEventListener("DOMContentLoaded", renderFilteredFolders);
searchInput?.addEventListener("input", renderFilteredFolders);
filterSelect?.addEventListener("change", renderFilteredFolders);

// ✅ Unified Review Handler: Local or Public
window.reviewSet = async function (key) {
  const [titleKey, createdOnKey] = key.split("___");

  // Try local first
  const localSets = JSON.parse(localStorage.getItem("flashcardSets") || "[]");
  const localMatch = localSets.find(s => s.title === titleKey && s.createdOn === createdOnKey);

  if (localMatch) {
    localStorage.setItem("reviewingSet", JSON.stringify(localMatch));
    return window.location.href = "flashcard.html";
  }

  // Try Firebase
  try {
    const q = query(
      collection(db, "flashcard_sets"),
      where("title", "==", titleKey),
      where("createdOn", "==", createdOnKey)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const doc = snapshot.docs[0].data();
      localStorage.setItem("reviewingSet", JSON.stringify(doc));
      return window.location.href = "flashcard.html";
    } else {
      alert("Flashcard set not found in public database.");
    }
  } catch (err) {
    console.error("Error loading public flashcard set:", err);
    alert("Failed to load public flashcard set.");
  }
};
