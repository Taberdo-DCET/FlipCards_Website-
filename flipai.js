// Add these lines at the top of flipai.js
import { auth, db } from './firebaseinit.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { doc, getDoc, collection, setDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

console.log("Firebase modules imported.");

document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const uploadBtn = document.getElementById('uploadBtn');
    const fileUploadInput = document.getElementById('fileUploadInput');
    const flashcardsContainer = document.getElementById('flashcardsContainer');
    const usageTracker = document.getElementById('usageTracker');
    const usageCountEl = document.getElementById('usageCount');
    const resetTimerEl = document.getElementById('resetTimer');
    const upgradeBtn = document.getElementById('upgradeBtn'); // <-- ADD THIS
    const upgradeNote = document.getElementById('upgradeNote'); 
    const usageInfoBtn = document.getElementById('usageInfoBtn');
    const infoModal = document.getElementById('infoModal');
    const infoModalCloseBtn = document.getElementById('infoModalCloseBtn');

    let countdownInterval = null;

    // --- Usage Limit Configuration ---
    const USAGE_LIMITS = {
        default: 3,
        verified: 5,
        plus: 10
    };

    // Placeholder: Replace this with your actual user authentication logic
    // to get the user's role (e.g., from Firebase Auth custom claims).
    // NEW: Replace the old getUserRole function with this async version
async function getUserRole() {
    console.log("Attempting to get user role...");
    const user = auth.currentUser;

    if (!user) {
        console.log("No user is currently signed in. Role is 'default'.");
        return 'default';
    }

    console.log(`User found: ${user.email}. Checking Firestore for role.`);
    try {
        const userDocRef = doc(collection(db, "approved_emails"), user.email);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
            const rolesString = docSnap.data().role || ''; // Get the string of roles
            console.log(`Roles found in Firestore: '${rolesString}'`);

            // Check for roles in order of priority
            if (rolesString.includes('plus')) {
                console.log("User has 'plus' role.");
                return 'plus';
            }
            if (rolesString.includes('verified')) {
                console.log("User has 'verified' role.");
                return 'verified';
            }
            // If no specific role is found, return default
            console.log("No priority role found in string. Assigning 'default'.");
            return 'default';

        } else {
            console.log(`No specific role document found for ${user.email}. Role is 'default'.`);
            return 'default';
        }
    } catch (error) {
        console.error("Error fetching user role from Firestore:", error);
        return 'default';
    }
}

    // --- Alert Modal Logic (from Pinpoint.js) ---
    const alertModal = document.getElementById('alertModal');
    const alertBox = alertModal.querySelector('.alert-box');
    const alertTitleText = document.getElementById('alertTitleText');
    const alertIcon = document.getElementById('alertIcon');
    const alertMessage = document.getElementById('alertMessage');
    const alertOkBtn = document.getElementById('alertOkBtn');

    const showCustomAlert = (title, message, type = 'error') => {
        alertBox.classList.remove('success', 'error');
        if (type === 'success') {
            alertBox.classList.add('success');
            alertIcon.className = 'fa-solid fa-circle-check';
        } else {
            alertBox.classList.add('error');
            alertIcon.className = 'fa-solid fa-circle-xmark';
        }
        alertTitleText.textContent = title;
        alertMessage.textContent = message;
        alertModal.classList.add('visible');
    };

    alertOkBtn.addEventListener('click', () => {
        alertModal.classList.remove('visible');
    });


    // --- NEW: Info Modal Logic ---
    usageInfoBtn.addEventListener('click', () => {
        infoModal.classList.add('visible');
    });

    infoModalCloseBtn.addEventListener('click', () => {
        infoModal.classList.remove('visible');
    });

    // Close modal if user clicks on the dark overlay
    infoModal.addEventListener('click', (event) => {
        if (event.target === infoModal) {
            infoModal.classList.remove('visible');
        }
    });
    // --- Main Functionality ---
    uploadBtn.addEventListener('click', () => {
        fileUploadInput.click();
    });

    fileUploadInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) {
            showCustomAlert('No File Selected', 'Please choose a PDF or PPT file to continue.');
            return;
        }
        
        processFile(file);
    });

async function processFile(file) {
    const role = await getUserRole(); // Use await here
    const maxUsage = USAGE_LIMITS[role] || 3;
    console.log(`Processing file. User role: '${role}', Max Usage: ${maxUsage}`);
        const usageData = await getUsageData();
        if (usageData.count >= maxUsage) {
            showCustomAlert('Daily Limit Reached', `You have used all your generations for today. Your limit will reset.`);
            return;
        }
        // 1. Clear previous results and show loader
        flashcardsContainer.innerHTML = '';
        // Show loader inside the container
        flashcardsContainer.innerHTML = `
            <div class="loader-container">
                <div class="loader"></div>
                <p>Loading, please don't turn off your device...</p>
            </div>
        `;

        // We use FormData to easily send the file to our backend
        const formData = new FormData();
        formData.append('file', file);


        try {
            // 2. Send the file to YOUR backend server endpoint
            //    This URL ('/generate-flashcards') is a placeholder. 
            //    You will define this endpoint in your server code.
            const response = await fetch('https://generateflashcards-zpanpdg2va-uc.a.run.app', {

                method: 'POST',
                body: formData, // Send the file
            });

            if (!response.ok) {
                // If the server responded with an error (e.g., 400, 500)
                const errorData = await response.json();
                throw new Error(errorData.message || 'An error occurred on the server.');
            }

            // 3. Get the real flashcard data from your backend's response
            const flashcards = await response.json();
            
            if (flashcards && flashcards.length > 0) {
                 await displayFlashcards(flashcards); // <-- Add await
                 showCustomAlert('Success!', `${flashcards.length} flashcards were created.`, 'success');
            } else {
                throw new Error('No flashcards were generated.');
            }

        } catch (error) {
            console.error('Error processing file:', error);
            showCustomAlert('Processing Failed', error.message);
        } finally {
            // 4. Hide loader and reset input regardless of outcome
            // If there's an error, the container might still show the loader. Clear it.
            if (flashcardsContainer.querySelector('.loader-container')) {
                flashcardsContainer.innerHTML = '';
            }
            fileUploadInput.value = '';
        }
    }

    
    async function displayFlashcards(flashcards) { // <-- Add async
         await incrementUsage(); // <-- Add await
    
    flashcardsContainer.innerHTML = '';
    flashcards.forEach((card, index) => {
        const cardElement = document.createElement('div');
        cardElement.className = 'flashcard';
        cardElement.style.animationDelay = `${index * 100}ms`;

        cardElement.innerHTML = `
            <div class="term">${card.term || 'Untitled Term'}</div>
            <div class="definition">${card.definition || 'No definition provided.'}</div>
        `;
        flashcardsContainer.appendChild(cardElement);
    });

     localStorage.setItem('flashcardsData', JSON.stringify(flashcards));

  // NEW: reveal + wire the button
  const addSetBtn = document.getElementById('addSetBtn');
  addSetBtn.classList.remove('hidden');
  addSetBtn.onclick = () => {
    window.location.href = 'addcard.html';
  };
}
// --- Usage Tracking Logic ---
    // --- Usage Tracking Logic ---
    async function getUsageData() {
        const user = auth.currentUser;
        const todayUTC = new Date().toISOString().split('T')[0];

        // If no user is signed in, they can't have Firestore data.
        // Return a temporary, non-persistent state.
        if (!user) {
            return { count: 0, lastReset: todayUTC };
        }

        // Reference to the user's specific document in the 'flipAiUsage' collection
        const usageDocRef = doc(db, 'flipAiUsage', user.email);
        const docSnap = await getDoc(usageDocRef);

        let data;
        if (docSnap.exists()) {
            // If the user has data, use it
            data = docSnap.data();
        } else {
            // If it's a new user, create default data
            data = { count: 0, lastReset: '' };
        }

        // Reset the count if the last use was on a different day
        if (data.lastReset !== todayUTC) {
            data.count = 0;
            data.lastReset = todayUTC;
        }
        
        return data;
    }

    async function incrementUsage() {
        const user = auth.currentUser;
        // Can't save usage for a user that doesn't exist
        if (!user) return;

        const data = await getUsageData();
        data.count++;
        
        // Reference the document and update it in Firestore
        const usageDocRef = doc(db, 'flipAiUsage', user.email);
        await setDoc(usageDocRef, data); // setDoc creates or overwrites the document

        updateUsageUI(); // Refresh UI after incrementing
    }

    async function updateUsageUI() {
        const role = await getUserRole();
        const maxUsage = USAGE_LIMITS[role] || 3;
        const usageData = await getUsageData();
        const remaining = maxUsage - usageData.count;

        usageCountEl.textContent = `Uses Remaining: ${remaining < 0 ? 0 : remaining}/${maxUsage}`;
        usageTracker.classList.remove('hidden');

        // Countdown Timer Logic
        if (countdownInterval) {
            clearInterval(countdownInterval);
        }
        countdownInterval = setInterval(() => {
            const now = new Date();
            const tomorrowUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
            const diff = tomorrowUTC - now;

            const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const m = Math.floor((diff / 1000 / 60) % 60);
            const s = Math.floor((diff / 1000) % 60);

            resetTimerEl.textContent = `Resets in: ${h}h ${m}m ${s}s`;
        }, 1000);

        // --- NEW LOGIC TO SHOW/HIDE UPGRADE PROMPTS ---
        if (role === 'verified' || role === 'plus') {
            upgradeBtn.classList.add('hidden');
            upgradeNote.classList.add('hidden');
        } else {
            upgradeBtn.classList.remove('hidden');
            upgradeNote.classList.remove('hidden');
        }
    }
    
    // Initial UI update on page load
    onAuthStateChanged(auth, (user) => {
        console.log("Auth state changed. User:", user ? user.email : "No user");
        // Initial UI update on page load, now waits for auth state
        updateUsageUI();
    });
});