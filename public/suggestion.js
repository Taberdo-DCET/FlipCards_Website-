import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { db } from "./firebaseinit.js";

// Initialize Firebase services
const auth = getAuth();

// Get DOM elements
const suggestionBtn = document.getElementById('suggestionBtn');
const suggestionModal = document.getElementById('suggestionModal');
const closeSuggestionModal = document.getElementById('closeSuggestionModal');
const submitSuggestionBtn = document.getElementById('submitSuggestionBtn');
const suggestionTitleInput = document.getElementById('suggestionTitleInput'); // New
const suggestionInput = document.getElementById('suggestionInput');

// Re-use the existing custom alert modal for feedback
const alertModal = document.getElementById('customAlertModal');
const alertMessage = document.getElementById('customAlertMessage');
const alertOkBtn = document.getElementById('customAlertOkBtn');

// Helper function to show alerts
const showCustomAlert = (message, isSuccess = true) => {
  alertMessage.textContent = message;
  const content = alertModal.querySelector('.custom-alert-content');
  content.classList.toggle('success', isSuccess);
  content.classList.toggle('error', !isSuccess);
  alertModal.classList.remove('hidden');
};

alertOkBtn.addEventListener('click', () => {
  alertModal.classList.add('hidden');
});

// Event listeners to open/close the modal
suggestionBtn.addEventListener('click', () => {
  const user = auth.currentUser;
  if (!user) {
    showCustomAlert("You must be logged in to make a suggestion.", false);
    return;
  }
  suggestionModal.classList.remove('hidden');
});

const closeModal = () => {
  suggestionTitleInput.value = ''; // Clear title on close
  suggestionInput.value = ''; // Clear text on close
  suggestionModal.classList.add('hidden');
};

closeSuggestionModal.addEventListener('click', closeModal);

// Event listener for submitting the suggestion
submitSuggestionBtn.addEventListener('click', async () => {
  const user = auth.currentUser;
  const suggestionTitle = suggestionTitleInput.value.trim(); // New
  const suggestionText = suggestionInput.value.trim();

  if (!user) {
    showCustomAlert("Authentication error. Please log in again.", false);
    return;
  }

  if (!suggestionText) {
    showCustomAlert("Please enter a suggestion before submitting.", false);
    return;
  }

  // Disable button to prevent multiple submissions
  submitSuggestionBtn.disabled = true;
  submitSuggestionBtn.textContent = 'Submitting...';

  try {
    // Add a new document to the "suggestions" collection in Firestore
    await addDoc(collection(db, "suggestions"), {
      userEmail: user.email,
      title: suggestionTitle || 'Untitled Suggestion', // Save the title
      suggestion: suggestionText,
      timestamp: serverTimestamp(),
      status: "new"
    });

    showCustomAlert("Thank you! Your suggestion has been submitted successfully.", true);
    closeModal();

  } catch (error) {
    console.error("Error adding suggestion to Firestore: ", error);
    showCustomAlert("Sorry, there was an error submitting your suggestion. Please try again later.", false);
  } finally {
    // Re-enable the button
    submitSuggestionBtn.disabled = false;
    submitSuggestionBtn.textContent = 'Submit';
  }
});