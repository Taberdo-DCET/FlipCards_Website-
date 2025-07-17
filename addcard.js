import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  setDoc,
  updateDoc,
  deleteDoc,
  increment
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCndfcWksvEBhzJDiQmJj_zSRI6FSVNUC0",
  authDomain: "flipcards-7adab.firebaseapp.com",
  projectId: "flipcards-7adab",
  storageBucket: "flipcards-7adab.appspot.com",
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

  createBtn.textContent = "Create";
  practiceBtn.textContent = "Create and Practice";
  isEditMode = false;
  originalCreatedOn = null;
  originalTitle = null;
  updateCardNumbers();
}

function showCustomAlert(message) {
  document.getElementById("createAlertMessage").textContent = message;
  document.getElementById("createAlertModal").classList.remove("hidden");
}

async function getFlashcardData() {
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
    return { error: "Please enter a title, and make sure all flashcards have both term and definition." };
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

  return { data };
}

async function checkPublicLimit(user, currentTitle, currentCreatedOn) {
  let maxPublicSets = 2;
  try {
    const approvalSnap = await getDoc(doc(db, "approved_emails", user.email));
    if (approvalSnap.exists()) {
      const d = approvalSnap.data();
      if (typeof d.maxPublicSets === "number") {
        maxPublicSets = d.maxPublicSets;
      }
    }

    const q = query(
      collection(db, "flashcard_sets"),
      where("user", "==", user.email),
      where("public", "==", true)
    );
    const snapshot = await getDocs(q);

    const isAlreadyPublic = snapshot.docs.some(docSnap => {
      const s = docSnap.data();
      return s.title === currentTitle && s.createdOn === currentCreatedOn;
    });

    if (!isAlreadyPublic && snapshot.size >= maxPublicSets) {
      showCustomAlert(`❌ You can only publish up to ${maxPublicSets} public sets.`);
      return false;
    }
  } catch (err) {
    console.error("Error checking public limit:", err);
  }

  return true;
}

async function saveFlashcardSet(isPracticeAfter = false) {
  const { data, error } = await getFlashcardData();
  if (error) return showCustomAlert(error);

  const user = auth.currentUser;
  const sets = JSON.parse(localStorage.getItem("flashcardSets") || "[]");

  if (isEditMode) {
    const updated = sets.map(set =>
      set.title === originalTitle && set.createdOn === originalCreatedOn ? data : set
    );
    localStorage.setItem("flashcardSets", JSON.stringify(updated));

    if (user) {
      const q = query(
        collection(db, "local_sets"),
        where("user", "==", user.email),
        where("title", "==", originalTitle),
        where("createdOn", "==", originalCreatedOn)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        await updateDoc(snap.docs[0].ref, { ...data, user: user.email });
      }

      const pubQ = query(
        collection(db, "flashcard_sets"),
        where("user", "==", user.email),
        where("title", "==", originalTitle),
        where("createdOn", "==", originalCreatedOn)
      );
      const pubSnap = await getDocs(pubQ);

      const wasPublic = !pubSnap.empty;
      const isNowPublic = data.public;

      if (wasPublic && !isNowPublic) {
        for (const docSnap of pubSnap.docs) {
          await deleteDoc(doc(db, "flashcard_sets", docSnap.id));
        }
      } else if (!wasPublic && isNowPublic) {
        const docId = `${user.email.replace(/\./g, "_")}_${Date.now()}_public`;
        await setDoc(doc(db, "flashcard_sets", docId), { ...data, user: user.email });
      } else if (wasPublic && isNowPublic) {
        await updateDoc(pubSnap.docs[0].ref, { ...data, user: user.email });
      }
    }

    showCustomAlert("✔️ Flashcard set updated.");
  } else {
    sets.push(data);
    localStorage.setItem("flashcardSets", JSON.stringify(sets));

    if (user) {
  const setId = `${user.email.replace(/\./g, "_")}_${Date.now()}`;
  await setDoc(doc(db, "local_sets", setId), {
    ...data,
    user: user.email
  });

  const totalToAdd = data.flashcards.length;

if (data.public) {
  const canPublish = await checkPublicLimit(user, data.title, data.createdOn);
  if (!canPublish) return;

  const publicId = `${user.email.replace(/\./g, "_")}_${Date.now()}_public`;
  await setDoc(doc(db, "flashcard_sets", publicId), {
    ...data,
    user: user.email
  });
}


  // ✅ Increment totalCards instead of replacing it
  const userStatsRef = doc(db, "user_card_stats", user.email);
  await setDoc(userStatsRef, {
    totalCards: increment(totalToAdd)
  }, { merge: true });
}


    showCustomAlert(`✔️ Flashcard set saved.${data.public ? " Public version created too." : ""}`);
    if (typeof addXP === "function") addXP(20); // Give 20 XP for creating a set

  }

  if (isPracticeAfter) {
    localStorage.setItem("reviewingSet", JSON.stringify(data));
    window.location.href = "flashcard.html";
  } else {
    clearForm();
  }
}

createBtn.addEventListener("click", () => saveFlashcardSet(false));
practiceBtn.addEventListener("click", () => saveFlashcardSet(true));

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

  createBtn.textContent = "Update";
  practiceBtn.textContent = "Update and Practice";

  localStorage.removeItem("editingFlashcardSet");
});

onAuthStateChanged(auth, user => {
  if (!user && document.getElementById("publicToggle").checked) {
    showCustomAlert("⚠️ You must be logged in to make a set public.");
  }
});

document.getElementById("closeCreateAlert").addEventListener("click", () => {
  document.getElementById("createAlertModal").classList.add("hidden");
});
