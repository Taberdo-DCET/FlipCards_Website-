import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import {
  getFirestore,
  setDoc,
  deleteDoc,
  doc,
  increment
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";


import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js";
import { storage } from "./firebaseStorageInit.js";

const auth = getAuth();
const db = getFirestore();

const createBtn = document.getElementById("createImageCardBtn");
const cardsContainer = document.getElementById("cardsContainer");

let imageFiles = [];

// PASTE THE NEW FUNCTION HERE
function showCustomAlert(message, type = 'default') {
  return new Promise((resolve) => {
    const alertModal = document.getElementById("createAlertModal");
    const alertContent = alertModal.querySelector('.modal-content');
    const alertMessage = document.getElementById("createAlertMessage");
    const closeBtn = document.getElementById("closeCreateAlert");

    // Clear previous color classes
    alertContent.classList.remove('success', 'error');

    // Add the correct class based on the type
    if (type === 'success') {
      alertContent.classList.add('success');
    } else if (type === 'error') {
      alertContent.classList.add('error');
    }

    alertMessage.textContent = message;
    alertModal.classList.remove("hidden");

    // When OK is clicked, hide the modal and resolve the promise
    closeBtn.onclick = () => {
      alertModal.classList.add("hidden");
      resolve(); // This tells the code to continue
    };
  });
}


// Check for edit mode
const editMode = window.location.search.includes("edit=true");
const editingSet = editMode ? JSON.parse(localStorage.getItem("editingFlashcardSet")) : null;

// Find and replace your entire createCard function
function createCard(index) {
  const card = document.createElement("div");
  card.className = "flashcard";

  // ▼▼▼ MODIFIED BLOCK: Added the new Paste button ▼▼▼
  card.innerHTML = `
    <div class="flashcard-header">
      <span>${index + 1}</span>
      <div class="card-buttons">
        <button class="add-btn" title="Add Card">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>
        <button class="delete-btn" title="Delete Card">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      </div>
    </div>
    <div class="flashcard-body">
      <div class="input-group">
        <label>Term</label>
        <input type="text" class="input term" placeholder="e.g., Mitochondria" />
      </div>
      <div class="input-group">
        <label>Definition (Image)</label>
        <div class="image-definition-controls">
          <input type="file" class="imageDefinition" accept="image/*" style="display: none;" />
          <button type="button" class="image-upload-button">Choose Image</button>
          <button type="button" class="view-preview-button">View Preview</button>
          <button type="button" class="paste-image-button">Paste Image</button> <svg class="upload-success-icon hidden" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <div class="image-preview-box hidden">No image selected.</div>
      </div>
    </div>
  `;
  // ▲▲▲ END OF MODIFIED BLOCK ▲▲▲

  const fileInput = card.querySelector(".imageDefinition");
  const previewBox = card.querySelector(".image-preview-box");
  const viewPreviewBtn = card.querySelector(".view-preview-button");
  const successIcon = card.querySelector(".upload-success-icon");
  const pasteBtn = card.querySelector(".paste-image-button"); // NEW: Get the paste button

  card.querySelector(".image-upload-button").addEventListener("click", () => fileInput.click());

  viewPreviewBtn.addEventListener("click", () => {
    previewBox.classList.toggle("hidden");
    viewPreviewBtn.textContent = previewBox.classList.contains("hidden") ? "View Preview" : "Close Preview";
  });

  // ▼▼▼ NEW FUNCTION: Handles displaying a file (from upload or paste) ▼▼▼
  function displayImageFile(file) {
    if (file && file.type.startsWith('image/')) {
      imageFiles[index] = file;
      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      img.style.maxWidth = "200px";
      img.style.marginTop = "10px";
      previewBox.innerHTML = "";
      previewBox.appendChild(img);
      successIcon.classList.remove("hidden");
      
      // Flash animation on the preview box
      previewBox.classList.add('paste-success');
      setTimeout(() => previewBox.classList.remove('paste-success'), 600);
    } else {
      console.warn("Pasted item was not a valid image file.");
    }
  }
  // ▲▲▲ END OF NEW FUNCTION ▲▲▲

  // ▼▼▼ NEW EVENT LISTENER for the Paste button ▼▼▼
  pasteBtn.addEventListener("click", async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        for (const type of item.types) {
          if (type.startsWith("image/")) {
            const blob = await item.getType(type);
            // Create a File object to mimic a file selection
            const file = new File([blob], "pasted-image.png", { type: blob.type });
            displayImageFile(file);
            return; // Stop after the first image is found
          }
        }
      }
      showCustomAlert("No image found in your clipboard.", 'error');
    } catch (err) {
      console.error("Error reading clipboard:", err);
      showCustomAlert("Could not access clipboard. Please check browser permissions.", 'error');
    }
  });
  // ▲▲▲ END OF NEW EVENT LISTENER ▲▲▲

  // ▼▼▼ MODIFIED: The file input now uses the new display function ▼▼▼
  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      displayImageFile(file);
    } else {
      imageFiles[index] = null;
      previewBox.innerHTML = "No image selected.";
      successIcon.classList.add("hidden");
    }
  });
  // ▲▲▲ END OF MODIFICATION ▲▲▲

  card.querySelector(".add-btn").addEventListener("click", () => {
    const newCard = createCard(cardsContainer.children.length);
    cardsContainer.appendChild(newCard);
    updateCardNumbers();
  });

  card.querySelector(".delete-btn").addEventListener("click", () => {
    if (cardsContainer.children.length > 1) {
      cardsContainer.removeChild(card);
      imageFiles.splice(index, 1);
      updateCardNumbers();
    } else {
      showCustomAlert("At least one card is required.", 'error');
    }
  });

  return card;
}

function updateCardNumbers() {
  [...cardsContainer.children].forEach((card, i) => {
    card.querySelector("span").textContent = i + 1;
  });
}

// Load initial card
cardsContainer.appendChild(createCard(0));

// Populate fields if editing
if (editMode && editingSet) {
  document.querySelector(".title").value = editingSet.title || "";
  document.querySelector(".description").value = editingSet.description || "";
  document.getElementById("publicToggle").checked = !!editingSet.public;

  createBtn.textContent = "Update Flashcard Set"; // Change button text in edit mode

  cardsContainer.innerHTML = "";
  imageFiles = [];

  editingSet.flashcards.forEach((cardData, index) => {
    const card = createCard(index);
    cardsContainer.appendChild(card);
    card.querySelector(".term").value = cardData.term || "";

    if (cardData.definition && /^https?:\/\//.test(cardData.definition)) {
      const previewBox = card.querySelector(".image-preview-box");
      const img = document.createElement("img");
      img.src = cardData.definition;
      img.style.maxWidth = "200px";
      img.style.marginTop = "10px";
      previewBox.innerHTML = "";
      previewBox.appendChild(img);
    }
  });
}

createBtn.addEventListener("click", async () => {
  const title = document.querySelector(".title").value.trim();
  const description = document.querySelector(".description").value.trim();
  const isPublic = document.getElementById("publicToggle").checked;
  const category = document.getElementById("categorySelect")?.value || "";

  const terms = Array.from(cardsContainer.querySelectorAll(".term")).map(input => input.value.trim());
// REPLACEMENT BLOCK 1
const files = imageFiles; // Use the correct array that holds pasted images

if (!title || terms.some(term => !term)) {
  showCustomAlert("Please fill in title and terms.", 'error');
  return;
}

// This new validation loop correctly checks the imageFiles array
for (let i = 0; i < terms.length; i++) {
  // If we are NOT in edit mode and a file is missing for a card, show an error.
  if (!editMode && !files[i]) {
    showCustomAlert(`Please upload or paste an image for card ${i + 1}.`, 'error');
    return;
  }
}

  // ✅ Require category regardless of public/private
  if (!category) {
    showCustomAlert("Please select a category before creating the set.", 'error');
    return;
  }

  createBtn.disabled = true;
  createBtn.textContent = editMode ? "Updating..." : "Creating...";

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      showCustomAlert("❌ You must be logged in.", 'error');
      createBtn.disabled = false;
      createBtn.textContent = editMode ? "Update Flashcard Set" : "Create Flashcard Set";
      return;
    }

    try {
      const flashcards = [];

      // REPLACEMENT BLOCK 2
for (let i = 0; i < terms.length; i++) {
  const file = imageFiles[i]; // Use the correct array

  if (file) { // If a file exists (from upload OR paste)
    const timestamp = Date.now();
    // Use a consistent name for pasted files
    const fileName = file.name === 'pasted-image.png' ? `${timestamp}_pasted.png` : `${timestamp}_${file.name}`;
    const path = `definitions/${user.uid}/${fileName}`;
    const imageRef = ref(storage, path);
    await uploadBytes(imageRef, file);
    const url = await getDownloadURL(imageRef);
    flashcards.push({ term: terms[i], definition: url });
  } else if (editMode && editingSet.flashcards[i] && editingSet.flashcards[i].definition) {
    // If in edit mode and an existing image URL is present
    flashcards.push({ term: terms[i], definition: editingSet.flashcards[i].definition });
  }
  // The 'else' case for missing images is no longer needed here
  // because the first replacement block already handles that validation.
}

const flashcardSet = {
  title,
  description,
  category,
  public: isPublic,
  createdOn: editMode ? editingSet.createdOn : new Date().toISOString(),
  user: user.email,
  flashcards,
  _id: editMode ? editingSet._id : null,
  publicId: editMode ? (editingSet.publicId || null) : null
};


      if (editMode) {
  if (!editingSet._id) {
    showCustomAlert("Error: Missing set ID for update.", 'error');
    createBtn.disabled = false;
    createBtn.textContent = "Update Flashcard Set";
    return;
  }

  // Update local set
  await setDoc(doc(db, "local_sets", editingSet._id), flashcardSet, { merge: false });

  // If public toggle is on, add/update in flashcard_sets
// --- CONSOLE LOGS FOR DEBUGGING ---
console.log("--- Debugging Public/Private Toggle ---");
console.log("Value of isPublic toggle:", isPublic);
console.log("Full flashcardSet object being processed:", flashcardSet);
// --- END DEBUGGING LOGS ---

if (isPublic) {
  // Logic for making/keeping a set public
  if (!flashcardSet.publicId) {
    // If no publicId exists, create a new one and update the local set
    const newPublicId = `${user.email.replace(/\./g, "_")}_${editingSet._id}`;
    flashcardSet.publicId = newPublicId;
    await setDoc(doc(db, "local_sets", editingSet._id), { publicId: newPublicId }, { merge: true });
  }
  // Always use the now-guaranteed flashcardSet.publicId to update the public document
  await setDoc(doc(db, "flashcard_sets", flashcardSet.publicId), flashcardSet, { merge: false });
  console.log("Set updated/made public in 'flashcard_sets'.");

}else {
  // Logic for making a set private
  console.log("Attempting to make the set private.");

  if (flashcardSet.publicId) {
    console.log("Found publicId to delete:", flashcardSet.publicId);
    try {
      await deleteDoc(doc(db, "flashcard_sets", flashcardSet.publicId));
      console.log("✅ Successfully deleted public document.");

      // IMPORTANT: Also remove the publicId from the local set for consistency
      await setDoc(doc(db, "local_sets", editingSet._id), { publicId: null }, { merge: true });
      console.log("✅ Cleared publicId field in 'local_sets'.");

    } catch (error) {
      console.error("❌ Error deleting public document:", error);
    }
  } else {
    console.log("No publicId found on the flashcardSet. Nothing to delete from public sets.");
  }
}

  await showCustomAlert("✅ Flashcard set updated!", 'success');
}
 else {
        const docId = `${user.email.replace(/\./g, "_")}_${Date.now()}`;
// Add the local ID to the flashcardSet object before saving
flashcardSet._id = docId; 
await setDoc(doc(db, "local_sets", docId), flashcardSet);

if (isPublic) {
  const publicId = `${user.email.replace(/\./g, "_")}_${Date.now()}`;
  flashcardSet.publicId = publicId; 
  await setDoc(doc(db, "flashcard_sets", publicId), flashcardSet);
  // Now, update the local set to include the publicId
  await setDoc(doc(db, "local_sets", docId), { publicId: publicId }, { merge: true });
}

        const userStatsRef = doc(db, "user_card_stats", user.email);
        await setDoc(userStatsRef, {
          totalCards: increment(flashcardSet.flashcards.length)
        }, { merge: true });

        await showCustomAlert("✅ Flashcard set with images saved!", 'success');
      }

      window.location.href = "lobby.html#Folderr";
    } catch (err) {
      console.error("Upload error:", err);
      showCustomAlert("❌ Failed to upload or save.", 'error');
      createBtn.disabled = false;
      createBtn.textContent = editMode ? "Update Flashcard Set" : "Create Flashcard Set";
    }
  });
});
