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
    <input type="text" class="input term" placeholder="e.g., Photosynthesis" />
  </div>
  <div class="input-group">
    <label>Definition</label>
    <input type="text" class="input definition" placeholder="e.g., Process used by plants to convert light..." />
  </div>
</div>
  `;

  flashcard.querySelector(".add-btn").addEventListener("click", () => {
    wrapper.appendChild(createFlashcard());
    updateCardNumbers();
  });

  flashcard.querySelector(".delete-btn").addEventListener("click", () => {
    flashcard.remove();
    updateCardNumbers();
  });

  return flashcard;
}

addBtn.addEventListener("click", () => {
  wrapper.appendChild(createFlashcard());
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

// This new function replaces the one you just deleted
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

    // This handler will be called only once when the button is clicked
    const closeHandler = () => {
      alertModal.classList.add("hidden");
      closeBtn.removeEventListener('click', closeHandler); // Clean up the listener
      resolve(); // This is the key part that tells the 'await' to continue
    };

    closeBtn.addEventListener('click', closeHandler);
  });
}

async function getFlashcardData() {
  const title = document.querySelector(".title").value.trim();
  const description = document.querySelector(".description").value.trim();
  const isPublic = document.getElementById("publicToggle")?.checked;
  const category = document.getElementById("categorySelect")?.value || "";
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

  // ✅ Require category for all sets
  if (!category) {
    return { error: "Please select a category before creating the set." };
  }

  const now = new Date();
  const createdTime = originalCreatedOn || now.toISOString();

  const data = {
    title,
    description,
    category,
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
      showCustomAlert(`❌ You can only publish up to ${maxPublicSets} public sets.`, 'error');
      return false;
    }
  } catch (err) {
    console.error("Error checking public limit:", err);
  }

  return true;
}

async function saveFlashcardSet(isPracticeAfter = false) {
    const { data, error } = await getFlashcardData();
    if (error) {
        return showCustomAlert(error, 'error');
    }

    // --- Update button text to show it's working ---
    const originalCreateText = isEditMode ? "Update" : "Create";
    const originalPracticeText = isEditMode ? "Update and Practice" : "Create and Practice";
    createBtn.textContent = "Saving...";
    practiceBtn.textContent = "Saving...";
    createBtn.disabled = true;
    practiceBtn.disabled = true;

    const user = auth.currentUser;
    const sets = JSON.parse(localStorage.getItem("flashcardSets") || "[]");

    // Variables to hold the new set's ID and collection for redirection
    let redirectSetId = null;
    let redirectCollection = null;

    try {
        if (isEditMode) {
            // Logic for updating an existing set
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
        } else {
            // --- Logic for creating a new set ---
            sets.push(data);
            localStorage.setItem("flashcardSets", JSON.stringify(sets));

            if (user) {
                // Determine collection and generate ID based on public status
                if (data.public) {
                    const canPublish = await checkPublicLimit(user, data.title, data.createdOn);
                    if (!canPublish) {
                        // Reset buttons and stop if user can't publish
                        createBtn.textContent = originalCreateText;
                        practiceBtn.textContent = originalPracticeText;
                        createBtn.disabled = false;
                        practiceBtn.disabled = false;
                        return;
                    }
                    redirectCollection = "flashcard_sets";
                    redirectSetId = `${user.email.replace(/\./g, "_")}_${Date.now()}_public`;
                } else {
                    redirectCollection = "local_sets";
                    redirectSetId = `${user.email.replace(/\./g, "_")}_${Date.now()}`;
                }

                // Save the new set to Firestore with the generated ID
                await setDoc(doc(db, redirectCollection, redirectSetId), { ...data, user: user.email });

                // Update user stats
                const totalToAdd = data.flashcards.length;
                const userStatsRef = doc(db, "user_card_stats", user.email);
                await setDoc(userStatsRef, { totalCards: increment(totalToAdd) }, { merge: true });
            }
            if (typeof addXP === "function") addXP(20);
        }

        // --- Handle redirection after a successful save ---
        await showCustomAlert(isEditMode ? "✔️ Flashcard set updated." : `✔️ Flashcard set saved.${data.public ? " Public version created too." : ""}`, 'success');
        localStorage.removeItem('flashcardDraft');

        if (isPracticeAfter) {
            if (redirectSetId && redirectCollection) {
                // --- THIS IS THE FIX ---
                // Pass the new set's ID and collection to the next page
                localStorage.setItem("reviewingSetId", redirectSetId);
                localStorage.setItem("reviewingSetCollection", redirectCollection);
                window.location.href = "flashcard.html";
            } else {
                // Fallback for logged-out users or if the ID couldn't be determined (e.g., during edit)
                await showCustomAlert("Redirecting to lobby. Please start your practice session from there.", 'default');
                window.location.href = "lobby.html#Folderr";
            }
        } else {
            window.location.href = "lobby.html#Folderr";
        }

    } catch (err) {
        console.error("Error saving set:", err);
        showCustomAlert("❌ Failed to save set.", 'error');
        // Reset button text on error
        createBtn.textContent = originalCreateText;
        practiceBtn.textContent = originalPracticeText;
        createBtn.disabled = false;
        practiceBtn.disabled = false;
    }
}
function getDraftData() {
  const title = document.querySelector(".title").value.trim();
  const description = document.querySelector(".description").value.trim();
  const flashcards = [];
  
  document.querySelectorAll(".flashcard").forEach(card => {
    const term = card.querySelector(".term")?.value.trim();
    const def = card.querySelector(".definition")?.value.trim();
    if (term || def) { // Only add card if it has some content
      flashcards.push({ term: term || "", definition: def || "" });
    }
  });

  return { title, description, flashcards };
}
function populateFormFromDraft(draftData) {
  if (!draftData) return;

  document.querySelector(".title").value = draftData.title || "";
  document.querySelector(".description").value = draftData.description || "";

  const clearDefaultCards = () => wrapper.querySelectorAll(".flashcard").forEach(card => card.remove());
  clearDefaultCards();

  if (draftData.flashcards && draftData.flashcards.length > 0) {
      draftData.flashcards.forEach(fc => {
          const newCard = createFlashcard();
          newCard.querySelector('.term').value = fc.term || '';
          newCard.querySelector('.definition').value = fc.definition || '';
          wrapper.appendChild(newCard);
      });
  } else {
      wrapper.appendChild(createFlashcard());
  }
  updateCardNumbers();
}
// Checks if any input field has content
function hasUnsavedChanges() {
  const draftData = getDraftData();
  const hasCardContent = draftData.flashcards.some(fc => fc.term || fc.definition);
  return !!(draftData.title || draftData.description || hasCardContent);
}

// Select the back button and modal elements
const backToFoldersBtn = document.getElementById("backToFoldersBtn");
const draftModal = document.getElementById("draftConfirmModal");
const saveDraftBtn = document.getElementById("saveDraftBtn");
const discardDraftBtn = document.getElementById("discardDraftBtn");
const cancelLeaveBtn = document.getElementById("cancelLeaveBtn");

// Handles clicking the "Back to Folders" button
backToFoldersBtn.addEventListener('click', (e) => {
  e.preventDefault(); // Stop the browser from navigating immediately

  // Only show the prompt if we are creating a new set and there are changes
  if (hasUnsavedChanges() && !isEditMode) {
    draftModal.classList.remove('hidden');
  } else {
    window.location.href = "lobby.html#Folderr";
  }
});

// Handles the "Save Draft" button in the modal
saveDraftBtn.addEventListener('click', () => {
  const draftData = getDraftData();
  localStorage.setItem('flashcardDraft', JSON.stringify(draftData));
  draftModal.classList.add('hidden');
  window.location.href = "lobby.html#Folderr";
});

// Handles the "Discard" button in the modal
discardDraftBtn.addEventListener('click', () => {
  localStorage.removeItem('flashcardDraft');
  draftModal.classList.add('hidden');
  window.location.href = "lobby.html#Folderr";
});

// Handles the "Cancel" button in the modal
cancelLeaveBtn.addEventListener('click', () => {
  draftModal.classList.add('hidden');
});
// --- Logic for the Load Draft Modal ---
const loadDraftModal = document.getElementById('loadDraftModal');
const loadDraftBtn = document.getElementById('loadDraftBtn');
const discardSavedDraftBtn = document.getElementById('discardSavedDraftBtn');

loadDraftBtn.addEventListener('click', () => {
    const draftData = JSON.parse(localStorage.getItem("flashcardDraft"));
    if (draftData) {
        // Use our new function to populate the form
        populateFormFromDraft(draftData);
    }
    loadDraftModal.classList.add('hidden');
});

discardSavedDraftBtn.addEventListener('click', () => {
    // User chose to discard, so remove the draft and hide the modal
    localStorage.removeItem('flashcardDraft');
    loadDraftModal.classList.add('hidden');
});
createBtn.addEventListener("click", () => saveFlashcardSet(false));
practiceBtn.addEventListener("click", () => saveFlashcardSet(true));

window.addEventListener("DOMContentLoaded", () => {
  const editingData = JSON.parse(localStorage.getItem("editingFlashcardSet"));
  const parsedFlashcards = JSON.parse(localStorage.getItem("flashcardsData") || "[]");
  const draftData = JSON.parse(localStorage.getItem("flashcardDraft"));

  // Clear the default card that loads with the page
  const clearDefaultCards = () => wrapper.querySelectorAll(".flashcard").forEach(card => card.remove());

  if (editingData) {
    // --- 1. PRIORITY: Load a set for editing ---
    isEditMode = true;
    originalTitle = editingData.title;
    originalCreatedOn = editingData.createdOn;

    document.querySelector(".title").value = editingData.title || "";
    document.querySelector(".description").value = editingData.description || "";
    document.getElementById("publicToggle").checked = !!editingData.public;
    
    clearDefaultCards();
    editingData.flashcards.forEach((fc, index) => {
      const card = createFlashcard();
      card.querySelector(".term").value = fc.term;
      card.querySelector(".definition").value = fc.definition;
      wrapper.appendChild(card);
    });
    
    createBtn.textContent = "Update";
    practiceBtn.textContent = "Update and Practice";
    localStorage.removeItem("editingFlashcardSet");

  } else if (parsedFlashcards.length > 0) {
    // --- 2. PRIORITY: Load imported card data ---
    clearDefaultCards();
    parsedFlashcards.forEach((fc) => {
      const card = createFlashcard();
      card.querySelector(".term").value = fc.term || "";
      card.querySelector(".definition").value = fc.definition || "";
      wrapper.appendChild(card);
    });
    localStorage.removeItem("flashcardsData");

  } else if (draftData) {
  // --- 3. PRIORITY: A draft was found, so show the confirmation modal ---
  const loadDraftModal = document.getElementById('loadDraftModal');
  loadDraftModal.classList.remove('hidden');
}

  updateCardNumbers(); // Update card numbers for all cases
});

onAuthStateChanged(auth, user => {
  if (!user && document.getElementById("publicToggle").checked) {
    showCustomAlert("⚠️ You must be logged in to make a set public.", 'error');
  }
});

document.getElementById("closeCreateAlert").addEventListener("click", () => {
  document.getElementById("createAlertModal").classList.add("hidden");
});
