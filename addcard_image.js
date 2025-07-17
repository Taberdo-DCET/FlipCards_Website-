import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import {
  getFirestore,
  collection,
  setDoc,
  doc,
  increment // ✅ this is required!
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js";
import { storage } from "./firebaseStorageInit.js";

const auth = getAuth();
const db = getFirestore();

const createBtn = document.getElementById("createImageCardBtn");
const cardsContainer = document.getElementById("cardsContainer");

let cardIndex = 0;
let imageFiles = [];

function createCard(index) {
  const card = document.createElement("div");
  card.className = "flashcard";

  card.innerHTML = `
    <div class="flashcard-header">
      <span>${index + 1}</span>
      <div class="card-buttons">
        <button class="add-btn" title="Add Card"></button>
        <button class="delete-btn" title="Delete Card"></button>
      </div>
    </div>
    <div class="flashcard-body">
      <input type="text" class="input term" placeholder="Enter term" />
      <div class="image-upload">
        <label>📷 Use Image as Definition</label>
        <input type="file" accept="image/*" class="imageDefinition" style="display: none;" />
      </div>
      <div class="preview-container">
        <div class="image-preview-box">No image selected.</div>
      </div>
    </div>
  `;

  // image selection
  const fileInput = card.querySelector(".imageDefinition");
  const previewBox = card.querySelector(".image-preview-box");
  card.querySelector(".image-upload label").addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    imageFiles[index] = file || null;
    if (file) {
      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      img.style.maxWidth = "200px";
      img.style.marginTop = "10px";
      previewBox.innerHTML = "";
      previewBox.appendChild(img);
    } else {
      previewBox.innerHTML = "No image selected.";
    }
  });

  // Add card logic
  card.querySelector(".add-btn").addEventListener("click", () => {
    const newCard = createCard(cardsContainer.children.length);
    cardsContainer.appendChild(newCard);
    updateCardNumbers();
  });

  // Delete card logic
  card.querySelector(".delete-btn").addEventListener("click", () => {
    if (cardsContainer.children.length > 1) {
      cardsContainer.removeChild(card);
      imageFiles.splice(index, 1);
      updateCardNumbers();
    } else {
      alert("At least one card is required.");
    }
  });

  return card;
}

function updateCardNumbers() {
  [...cardsContainer.children].forEach((card, i) => {
    card.querySelector("span").textContent = i + 1;
  });
}

cardsContainer.appendChild(createCard(0));

createBtn.addEventListener("click", async () => {
  const title = document.querySelector(".title").value.trim();
  const description = document.querySelector(".description").value.trim();
  const isPublic = document.getElementById("publicToggle").checked;

  const terms = Array.from(cardsContainer.querySelectorAll(".term")).map(input => input.value.trim());
  const files = [...cardsContainer.querySelectorAll(".imageDefinition")].map(input => input.files[0]);

  if (!title || terms.some(term => !term) || files.some(file => !file)) {
    alert("Please fill in title, terms, and select all images.");
    return;
  }

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const flashcards = [];

        for (let i = 0; i < terms.length; i++) {
          const file = files[i];
          const timestamp = Date.now();
          const path = `definitions/${user.uid}/${timestamp}_${file.name}`;
          const imageRef = ref(storage, path);

          await uploadBytes(imageRef, file);
          const url = await getDownloadURL(imageRef);
          flashcards.push({ term: terms[i], definition: url });
        }

        const flashcardSet = {
          title,
          description,
          public: isPublic,
          createdAt: new Date().toISOString(),
          createdOn: new Date().toISOString(),
          user: user.email,
          flashcards
        };

        const docId = `${user.email.replace(/\./g, "_")}_${Date.now()}`;
        await setDoc(doc(db, "local_sets", docId), flashcardSet);
        if (isPublic) {
  const publicId = `${user.email.replace(/\./g, "_")}_${Date.now()}_public`;
  await setDoc(doc(db, "flashcard_sets", publicId), flashcardSet);
}

        const userStatsRef = doc(db, "user_card_stats", user.email);
await setDoc(userStatsRef, {
  totalCards: increment(flashcardSet.flashcards.length)
}, { merge: true });



        alert("✅ Flashcard set with images saved!");
        window.location.href = "lobby.html#Folderr";
      } catch (err) {
        console.error("Upload error:", err);
        alert("❌ Failed to upload one or more images.");
      }
    } else {
      alert("❌ You must be logged in.");
    }
  });
});
