import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";

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
const auth = getAuth(app);

const wrapper = document.querySelector(".flashcard-wrapper");
const createBtn = document.querySelector("#mainActionBtn");
const practiceBtn = document.querySelector("#mainActionBtnn");
const addBtn = document.querySelector(".add-btn");
const deleteBtn = document.querySelector(".delete-btn");

let isEditMode = false;
let originalCreatedOn = null;
let originalTitle = null;

function updateCardNumbers() {
  document.querySelectorAll(".flashcard").forEach((card, index) => {
    card.querySelector(".flashcard-header span").textContent = index + 1;
  });
}

function createFlashcard() {
  const flashcard = document.createElement("div");
  flashcard.className = "flashcard";

  flashcard.innerHTML = `
    <div class="flashcard-header">
      <span></span>
      <div class="card-buttons">
        <button class="add-btn" title="Add Card"></button>
        <button class="delete-btn" title="Delete Card"></button>
      </div>
    </div>
    <div class="flashcard-body">
      <input type="text" class="input term" placeholder="Enter term" />
      <input type="text" class="input definition" placeholder="Enter definition" />
    </div>
  `;

  flashcard.querySelector(".add-btn").addEventListener("click", () => {
    wrapper.insertBefore(createFlashcard(), document.querySelector(".btn-row"));
    updateCardNumbers();
  });

  flashcard.querySelector(".delete-btn").addEventListener("click", () => {
    flashcard.remove();
    updateCardNumbers();
  });

  return flashcard;
}

addBtn.addEventListener("click", () => {
  wrapper.insertBefore(createFlashcard(), document.querySelector(".btn-row"));
  updateCardNumbers();
});

deleteBtn.addEventListener("click", () => {
  const parent = deleteBtn.closest(".flashcard");
  if (parent) {
    parent.remove();
    updateCardNumbers();
  }
});

function clearForm() {
  document.querySelector(".title").value = "";
  document.querySelector(".description").value = "";
  document.getElementById("publicToggle").checked = false;

  const cards = document.querySelectorAll(".flashcard");
  cards.forEach((card, index) => {
    if (index === 0) {
      card.querySelector(".term").value = "";
      card.querySelector(".definition").value = "";
    } else {
      card.remove();
    }
  });

  // Reset labels
  if (createBtn) createBtn.textContent = "Create";
  if (practiceBtn) practiceBtn.textContent = "Create and Practice";

  isEditMode = false;
  originalCreatedOn = null;
  originalTitle = null;

  updateCardNumbers();
}

createBtn.addEventListener("click", async () => {
  const title = document.querySelector(".title").value.trim();
  const description = document.querySelector(".description").value.trim();
  const isPublic = document.getElementById("publicToggle")?.checked;
  const flashcards = [];
  let valid = true;

  document.querySelectorAll(".flashcard").forEach(card => {
    const term = card.querySelector(".term")?.value.trim();
    const def = card.querySelector(".definition")?.value.trim();
    if (!term || !def) valid = false;
    flashcards.push({ term, definition: def });
  });

  if (!title || flashcards.length === 0 || !valid) {
    alert("Please enter a title, and make sure all flashcards have both term and definition.");
    return;
  }

  const user = auth.currentUser;

  if (isPublic && user) {
    const q = query(
      collection(db, "flashcard_sets"),
      where("user", "==", user.email),
      where("public", "==", true)
    );
    const snapshot = await getDocs(q);
    if (snapshot.size >= 2) {
      alert("You can only have 2 public flashcard sets.");
      return;
    }
  }

  const now = new Date();
  const createdTime = originalCreatedOn || now.toISOString();

  const data = {
    title,
    description,
    flashcards,
    createdAt: createdTime,
    createdOn: createdTime,
    public: Boolean(isPublic)
  };

  const existing = JSON.parse(localStorage.getItem("flashcardSets") || "[]");

  if (isEditMode) {
    const updated = existing.map(set => {
      if (set.title === originalTitle && set.createdOn === originalCreatedOn) {
        return data;
      }
      return set;
    });
    localStorage.setItem("flashcardSets", JSON.stringify(updated));
    alert("Flashcard set updated.");
  } else {
    existing.push(data);
    localStorage.setItem("flashcardSets", JSON.stringify(existing));
    alert(isPublic ? "Flashcard set saved to Firebase and localStorage!" : "Flashcard set saved locally only.");
  }

  // ✅ Upload to Firebase if public
  if (isPublic && user) {
    const firebaseData = {
      ...data,
      user: user.email
    };
    try {
      await addDoc(collection(db, "flashcard_sets"), firebaseData);
      console.log("Public flashcard set uploaded to Firebase.");
    } catch (error) {
      console.error("Error uploading to Firebase:", error);
      alert("Failed to upload public set to server.");
    }
  }

  clearForm();
});

// 🔄 Load edit mode
window.addEventListener("DOMContentLoaded", () => {
  const data = JSON.parse(localStorage.getItem("editingFlashcardSet"));
  if (!data) return;

  isEditMode = true;
  originalTitle = data.title;
  originalCreatedOn = data.createdOn;

  document.querySelector(".title").value = data.title || "";
  document.querySelector(".description").value = data.description || "";
  document.getElementById("publicToggle").checked = !!data.public;

  wrapper.querySelectorAll(".flashcard").forEach(card => card.remove());

  data.flashcards.forEach((fc, index) => {
    const card = createFlashcard();
    card.querySelector(".term").value = fc.term;
    card.querySelector(".definition").value = fc.definition;
    card.querySelector(".flashcard-header span").textContent = index + 1;
    wrapper.insertBefore(card, document.querySelector(".btn-row"));
  });

  // Update labels
  if (createBtn) createBtn.textContent = "Update";
  if (practiceBtn) practiceBtn.textContent = "Update and Practice";

  localStorage.removeItem("editingFlashcardSet");
});

onAuthStateChanged(auth, user => {
  if (!user) {
    alert("You must be logged in to create a public flashcard set.");
  }
});
