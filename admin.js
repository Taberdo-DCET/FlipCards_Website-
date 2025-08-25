// Import necessary functions from the Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
// +++ Replace it with this line +++
import { getFirestore, collection, onSnapshot, doc, getDoc, getDocs, updateDoc, deleteField, setDoc, serverTimestamp, addDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- DOM ELEMENT SELECTORS ---
const themeToggle = document.getElementById('theme-toggle');
const body = document.body;
const loginBtn = document.getElementById('login-btn');
const loginModal = document.getElementById('login-modal');
const loginOverlay = document.getElementById('login-overlay');
const closeModalBtn = document.getElementById('close-modal-btn');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const userList = document.getElementById('user-list');
const addUserBtn = document.querySelector('.add-user-btn');
const contentDisplay = document.getElementById('content-display'); // Added selector
let unsubscribeUserDetails = null; // Manages the real-time listener for user details
// +++ ADD THESE SELECTORS +++
const detailsModal = document.getElementById('details-modal');
const detailsOverlay = document.getElementById('details-overlay');
const closeDetailsModalBtn = document.getElementById('close-details-modal-btn');
const detailsModalContent = document.getElementById('details-modal-content');
// +++ ADD THESE NEW SELECTORS +++
const addFieldModal = document.getElementById('add-field-modal');
const addFieldOverlay = document.getElementById('add-field-overlay');
const closeAddFieldModalBtn = document.getElementById('close-add-field-modal-btn');
const addFieldForm = document.getElementById('add-field-form');
const cancelAddFieldBtn = document.getElementById('cancel-add-field-btn');
const newFieldTypeSelect = document.getElementById('new-field-type');
const newFieldValueGroup = document.getElementById('new-field-value-group');
// --- ADD THESE NEW SELECTORS ---
const addUserModal = document.getElementById('add-user-modal');
const addUserOverlay = document.getElementById('add-user-overlay');
const closeAddUserModalBtn = document.getElementById('close-add-user-modal-btn');
const addUserForm = document.getElementById('add-user-form');
const cancelAddUserBtn = document.getElementById('cancel-add-user-btn');
const suggestionsBtn = document.getElementById('suggestions-btn');
// --- THEME TOGGLE LOGIC ---
themeToggle.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    const icon = themeToggle.querySelector('i');
    if (body.classList.contains('dark-mode')) {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
    } else {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    }
});

// --- ADD USER BUTTON PLACEHOLDER ---
if (addUserBtn) {
    addUserBtn.addEventListener('click', () => {
        showAddUserModal();
    });
}


// --- FIREBASE CONFIG ---
const firebaseConfig = {
  apiKey: "AIzaSyCndfcWksvEBhzJDiQmJj_zSRI6FSVNUC0",
  authDomain: "flipcards-7adab.firebaseapp.com",
  databaseURL: "https://flipcards-7adab-default-rtdb.firebaseio.com",
  projectId: "flipcards-7adab",
  storageBucket: "flipcards-7adab.firebasestorage.app",
  messagingSenderId: "836765717736",
  appId: "1:836765717736:web:ff749a40245798307b655d",
  measurementId: "G-M26MWQZBJ0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- LOGIN MODAL VISIBILITY ---
const showLoginModal = () => { /* (omitted for brevity) */ };
const hideLoginModal = () => { /* (omitted for brevity) */ };
loginBtn.addEventListener('click', showLoginModal);
closeModalBtn.addEventListener('click', hideLoginModal);
loginOverlay.addEventListener('click', hideLoginModal);

// --- AUTHENTICATION LOGIC ---
loginForm.addEventListener('submit', async (e) => { /* (omitted for brevity) */ });

onAuthStateChanged(auth, (user) => {
    if (user && user.email === "taberdoraphael189@gmail.com") {
        console.log("Admin user is logged in:", user.email);
        displayApprovedEmails();
    } else {
        console.log("No admin user logged in.");
        clearUserList();
        showDefaultDashboard();
    }
});


// --- FIRESTORE DATA DISPLAY ---

/**
 * Fetches and displays approved user emails from Firestore in real-time.
 */
function displayApprovedEmails() {
    const emailsCol = collection(db, 'approved_emails');

    onSnapshot(emailsCol, (snapshot) => {
        userList.innerHTML = ''; // Clear the current list
        if (snapshot.empty) { /* (handle empty list) */ return; }

        snapshot.forEach(doc => {
            const li = document.createElement('li');
            li.textContent = doc.id;
            li.setAttribute('data-id', doc.id);
            userList.appendChild(li);
        });
    }, (error) => {
        console.error("Error fetching approved emails:", error);
    });
}

/**
 * Clears the user list and shows a prompt to log in.
 */
function clearUserList() {
    userList.innerHTML = '<li>Please log in to view users.</li>';
}

/**
 * Displays the default welcome message on the dashboard.
 */
function showDefaultDashboard() {
    contentDisplay.innerHTML = `
        <h2>Dashboard</h2>
        <p>Welcome to the admin panel. Select a user to view their details.</p>
    `;
}

// --- NEW: USER DETAILS LOGIC ---

// Event delegation for clicking on a user in the list
userList.addEventListener('click', (e) => {
    if (e.target && e.target.nodeName === 'LI') {
        // Remove 'selected' class from any other item
        const currentlySelected = userList.querySelector('.selected');
        if (currentlySelected) {
            currentlySelected.classList.remove('selected');
        }
        // Add 'selected' class to the clicked item
        e.target.classList.add('selected');

        const userEmail = e.target.getAttribute('data-id');
        if (userEmail) {
            displayUserDetails(userEmail);
        }
    }
});

/**
 * Fetches a specific user's document and renders it as an editable form.
/**
 * Fetches and displays a user's document in real-time using onSnapshot.
 * @param {string} email - The document ID of the user to display.
 */
function displayUserDetails(email) {
    // Unsubscribe from the previous real-time listener if it exists
    if (unsubscribeUserDetails) {
        unsubscribeUserDetails();
    }

    const docRef = doc(db, 'approved_emails', email);

    // Set up the new real-time listener on the document
    unsubscribeUserDetails = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            const userData = docSnap.data();
            let formHTML = `<div class="user-details-form" data-email="${email}">
                              <h2><span class="label-text">Editing User:</span> ${email}</h2>
                              <div class="details-grid">`;

            const originalDataTypes = {};

            for (const key in userData) {
                const value = userData[key];
                originalDataTypes[key] = typeof value;
                const isReadOnly = key === 'uid';

                formHTML += `
                    <div class="detail-card">
                        <div class="card-header">
                            <label for="${key}">${key}</label>
                             ${key !== 'uid' ? `
        <button type="button" class="delete-field-btn" data-key="${key}" aria-label="Delete Field">
            <i class="fas fa-trash-alt"></i>
        </button>` : ''}
                            <button type="button" class="expand-card-btn" data-key="${key}" aria-label="Expand">
                                <i class="fas fa-expand-arrows-alt"></i>
                            </button>
                        </div>`;

                if (key === 'allowed') {
                    formHTML += `
                        <select id="${key}" name="${key}">
                            <option value="true" ${value === true ? 'selected' : ''}>True</option>
                            <option value="false" ${value === false ? 'selected' : ''}>False</option>
                        </select>
                    `;
                } else if (typeof value === 'number' && !isReadOnly) {
                    formHTML += `
                        <div class="number-input-wrapper">
                            <input type="number" id="${key}" name="${key}" value="${value}">
                            <div class="stepper-buttons">
                                <button type="button" class="stepper-up" aria-label="Increase">&#9650;</button>
                                <button type="button" class="stepper-down" aria-label="Decrease">&#9660;</button>
                            </div>
                        </div>`;
                } else {
                    formHTML += `<input type="text" id="${key}" name="${key}" value="${value}" ${isReadOnly ? 'readonly' : ''}>`;
                }
                formHTML += `</div>`;
            }

            formHTML += `
                <button type="button" class="add-field-card" aria-label="Add new field">
                    <i class="fas fa-plus"></i>
                </button>
            `;
            formHTML += `   </div> 
                            <button id="save-changes-btn" class="save-changes-btn">Save Changes</button>
                          </div>`;
            contentDisplay.innerHTML = formHTML;

            document.getElementById('save-changes-btn').addEventListener('click', () => {
                saveUserDetails(email, originalDataTypes);
            });
            // +++ ADD THESE 3 LINES AFTER THE EVENT LISTENER +++
const subcollectionsContainer = document.createElement('div');
subcollectionsContainer.id = 'subcollections-container';
contentDisplay.appendChild(subcollectionsContainer);
renderLimitsSubcollection(email, subcollectionsContainer);
        } else {
            contentDisplay.innerHTML = `<p>No data found for user: ${email}</p>`;
        }
    }, (error) => {
        console.error("Error listening to user details:", error);
        contentDisplay.innerHTML = `<p>Error loading user data.</p>`;
    });
}
// +++ ADD THIS ENTIRE NEW BLOCK OF CODE +++
/**
 * Attaches event listeners to custom stepper buttons to control number inputs.
 */
function initializeStepperButtons() {
    // Use event delegation on the content display area
    contentDisplay.addEventListener('click', function(event) {
        const target = event.target;
        
        // Find the wrapper for the input and buttons
        const wrapper = target.closest('.number-input-wrapper');
        if (!wrapper) return;

        const input = wrapper.querySelector('input[type="number"]');
        if (!input) return;

        let currentValue = parseFloat(input.value) || 0;

        // Handle 'up' button clicks
        if (target.classList.contains('stepper-up')) {
            input.value = currentValue + 1;
        }

        // Handle 'down' button clicks
        if (target.classList.contains('stepper-down')) {
            input.value = currentValue - 1;
        }
    });
}
// +++ ADD THIS ENTIRE NEW BLOCK OF CODE AT THE END OF THE FILE +++

// --- EXPANDED DETAILS MODAL LOGIC ---

function showDetailsModal(key, value, originalType, isReadOnly) {
    const inputId = `modal-input-${key}`;
    let contentHTML = `<h2>${key}</h2>`;
    
    // Create the input field for the modal
// +++ ADD THIS NEW BLOCK +++
contentHTML += `<div class="modal-form-field">
                  <label for="${inputId}">Value</label>`;

// +++ ADD THIS NEW BLOCK +++
if (key === 'allowed') {
    contentHTML += `
        <select id="${inputId}">
            <option value="true" ${String(value) === 'true' ? 'selected' : ''}>True</option>
            <option value="false" ${String(value) === 'false' ? 'selected' : ''}>False</option>
        </select>
    `;
} else if (originalType === 'number') {
    contentHTML += `<input type="number" id="${inputId}" value="${value}" ${isReadOnly ? 'readonly' : ''}>`;
} else {
    contentHTML += `<textarea id="${inputId}" ${isReadOnly ? 'readonly' : ''}>${value}</textarea>`;
}

contentHTML += `</div>`;

    detailsModalContent.innerHTML = contentHTML;
    // Store the ID of the original input field on the dashboard
    detailsModal.setAttribute('data-source-id', key);

    detailsModal.classList.remove('hidden');
    detailsOverlay.classList.remove('hidden');
}

function hideDetailsModal() {
    const sourceInputId = detailsModal.getAttribute('data-source-id');
    const modalField = detailsModalContent.querySelector('input, textarea, select');

    if (sourceInputId && modalField) {
        // Sync the value from the modal back to the dashboard input
        const sourceInput = document.getElementById(sourceInputId);
        if (sourceInput) {
        sourceInput.value = modalField.value;
    }
    }

    detailsModal.classList.add('hidden');
    detailsOverlay.classList.add('hidden');
    detailsModalContent.innerHTML = ''; // Clear content
}

// Event listeners for closing the modal
closeDetailsModalBtn.addEventListener('click', hideDetailsModal);
detailsOverlay.addEventListener('click', hideDetailsModal);

// Event delegation to handle clicks on any expand button
contentDisplay.addEventListener('click', (event) => {
        const addFieldButton = event.target.closest('.add-field-card');
if (addFieldButton) {
    const userDetailsForm = document.querySelector('.user-details-form');
    const email = userDetailsForm ? userDetailsForm.dataset.email : null;
    if (email) {
        showAddFieldModal(email);
    } else {
        alert('Could not determine the user to add a field to.');
    }
    return;
}
  const deleteButton = event.target.closest('.delete-field-btn');
    if (deleteButton) {
        const fieldKey = deleteButton.dataset.key;
        const email = document.querySelector('.user-details-form').dataset.email;

        if (window.confirm(`Are you sure you want to delete the "${fieldKey}" field? This cannot be undone.`)) {
            const docRef = doc(db, 'approved_emails', email);
            
            // Create an update object to delete the specific field
            const updateData = {
                [fieldKey]: deleteField()
            };

            updateDoc(docRef, updateData).catch(error => {
                console.error("Error deleting field: ", error);
                alert("Failed to delete field. See console for details.");
            });
        }
        return; // Stop further execution
    }
    const expandButton = event.target.closest('.expand-card-btn');
    if (expandButton) {
        const card = expandButton.closest('.detail-card');
        const input = card.querySelector('input');
        
        const key = expandButton.getAttribute('data-key');
        const value = input.value;
        const isReadOnly = input.hasAttribute('readonly');
        const originalType = input.getAttribute('type') === 'number' ? 'number' : 'text';

        showDetailsModal(key, value, originalType, isReadOnly);
    }
});
// Call this function once to set up the listener
initializeStepperButtons();
/**
 * Saves the updated user details from the form back to Firestore.
 * @param {string} email - The document ID of the user to update.
 * @param {object} originalDataTypes - An object mapping keys to their original data types.
 */
async function saveUserDetails(email, originalDataTypes) {
    const form = document.querySelector('.user-details-form');
    const fields = form.querySelectorAll('input, select, textarea');
    const updatedData = {};

    fields.forEach(input => {
        const key = input.name;
        let value = input.value;

        // Convert values back to their original types
        if (originalDataTypes[key] === 'number') {
            value = Number(value);
        } else if (originalDataTypes[key] === 'boolean') {
            value = value.toLowerCase() === 'true';
        }
        updatedData[key] = value;
    });

    try {
        const docRef = doc(db, 'approved_emails', email);
        await updateDoc(docRef, updatedData);
        alert(`Successfully updated data for ${email}`);
    } catch (error) {
        console.error("Error updating document:", error);
        alert(`Failed to update data for ${email}. Check the console for errors.`);
    }
}
// +++ ADD THIS ENTIRE NEW BLOCK OF CODE AT THE END OF THE FILE +++

// --- ADD NEW FIELD MODAL LOGIC ---

function showAddFieldModal(email) {
    addFieldForm.reset(); // Clear previous entries
    addFieldForm.setAttribute('data-email', email); // Store email for submission
    updateValueInputForType('string'); // Set default input type
    addFieldModal.classList.remove('hidden');
    addFieldOverlay.classList.remove('hidden');
}

function hideAddFieldModal() {
    addFieldModal.classList.add('hidden');
    addFieldOverlay.classList.add('hidden');
}

function updateValueInputForType(type) {
    let inputHTML = '';
    const valueLabel = newFieldValueGroup.querySelector('label');
    valueLabel.style.display = 'block'; // Ensure label is visible

    switch (type) {
        case 'number':
            inputHTML = `<input type="number" id="new-field-value" required>`;
            break;
        case 'boolean':
            inputHTML = `<select id="new-field-value">
                           <option value="true">true</option>
                           <option value="false">false</option>
                         </select>`;
            break;
        case 'null':
            // For null, there is no value to input, so we hide the input field.
            valueLabel.style.display = 'none';
            inputHTML = `<input type="hidden" id="new-field-value" value="null">`;
            break;
        case 'string':
        default:
            inputHTML = `<input type="text" id="new-field-value" required>`;
            break;
    }
    // Replace the old input with the new one
    const oldInput = newFieldValueGroup.querySelector('input, select');
    if (oldInput) {
        oldInput.remove();
    }
    newFieldValueGroup.insertAdjacentHTML('beforeend', inputHTML);
}

// Event Listeners
closeAddFieldModalBtn.addEventListener('click', hideAddFieldModal);
cancelAddFieldBtn.addEventListener('click', hideAddFieldModal);
addFieldOverlay.addEventListener('click', hideAddFieldModal);
newFieldTypeSelect.addEventListener('change', (e) => updateValueInputForType(e.target.value));

addFieldForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = addFieldForm.dataset.email;
    const fieldName = addFieldForm.querySelector('#new-field-name').value.trim();
    const fieldType = addFieldForm.querySelector('#new-field-type').value;
    const valueInput = addFieldForm.querySelector('#new-field-value');

    if (!email || !fieldName) {
        alert('Field name is required.');
        return;
    }

    let fieldValue = valueInput.value;

    // Convert value to the correct data type
    switch (fieldType) {
        case 'number':
            fieldValue = Number(fieldValue);
            break;
        case 'boolean':
            fieldValue = (fieldValue === 'true');
            break;
        case 'null':
            fieldValue = null;
            break;
    }

    try {
        const docRef = doc(db, 'approved_emails', email);
        // Use an update object with a dynamic key
        const updateData = { [fieldName]: fieldValue };
        
        await updateDoc(docRef, updateData);
        hideAddFieldModal();
        // The UI will update automatically thanks to the onSnapshot listener
    } catch (error) {
        console.error("Error adding new field:", error);
        alert('Failed to add field. See console for details.');
    }
});
// +++ ADD THIS ENTIRE NEW FUNCTION AT THE END OF THE FILE +++

// --- Find and REPLACE the entire renderLimitsSubcollection function with this ---

/**
// --- Find and REPLACE the entire renderLimitsSubcollection function with this ---

/**
 * Renders the 'limits' subcollection or a button to create it if it doesn't exist.
 * @param {string} email The email of the parent document.
 * @param {HTMLElement} container The container element to render the content into.
 */
async function renderLimitsSubcollection(email, container) {
    try {
        const limitsCollectionRef = collection(db, 'approved_emails', email, 'limits');
        const querySnapshot = await getDocs(limitsCollectionRef);

        // Main container and title for the subcollection section
        container.innerHTML = `
            <div class="subcollection-section">
                <h2>Subcollection: limits</h2>
            </div>
        `;
        const section = container.querySelector('.subcollection-section');

        // --- NEW LOGIC: Check if the subcollection is empty ---
        if (querySnapshot.empty) {
            const createButtonHTML = `
                <div class="empty-subcollection-prompt">
                    <p>This user has no 'limits' data.</p>
                    <button type="button" class="add-subcollection-btn" aria-label="Create default limits">
                        <i class="fas fa-plus"></i> Create Default Limits
                    </button>
                </div>
            `;
            section.insertAdjacentHTML('beforeend', createButtonHTML);

            // Add event listener to the newly created button
            section.querySelector('.add-subcollection-btn').addEventListener('click', async () => {
                const newDocRef = doc(db, 'approved_emails', email, 'limits', 'parseusage');
                const defaultLimitsData = {
                    max: 6,
                    used: 0,
                    updatedAt: serverTimestamp()
                };

                try {
                    await setDoc(newDocRef, defaultLimitsData);
                    // After creating, re-render this section to show the new data
                    renderLimitsSubcollection(email, container);
                } catch (err) {
                    console.error("Error creating default limits doc:", err);
                    alert("Failed to create limits data.");
                }
            });

        } else {
            // --- This is the existing logic for when the collection EXISTS ---
            const docsContainer = document.createElement('div');
            docsContainer.className = 'details-grid';

            querySnapshot.forEach(doc => {
                const docData = doc.data();
                for (const key in docData) {
                    const value = docData[key];
                    if (key === 'max') {
                        docsContainer.innerHTML += `
                            <div class="detail-card">
                                <label for="${doc.id}-${key}">${doc.id}: ${key}</label>
                                <div class="number-input-wrapper">
                                    <input type="number" id="${doc.id}-${key}" class="subcollection-input" data-doc-id="${doc.id}" data-field-key="${key}" value="${value}">
                                    <div class="stepper-buttons">
                                        <button type="button" class="stepper-up" aria-label="Increase">&#9650;</button>
                                        <button type="button" class="stepper-down" aria-label="Decrease">&#9660;</button>
                                    </div>
                                </div>
                            </div>
                        `;
                    } else {
                        const displayValue = (value && typeof value.toDate === 'function') ? value.toDate().toLocaleString() : value;
                        docsContainer.innerHTML += `
                            <div class="detail-card read-only">
                                <label>${doc.id}: ${key}</label>
                                <p class="field-value">${displayValue}</p>
                            </div>
                        `;
                    }
                }
            });

            section.appendChild(docsContainer);

            const saveButton = document.createElement('button');
            saveButton.className = 'save-changes-btn';
            saveButton.textContent = 'Save Limits';
            section.appendChild(saveButton);

            saveButton.addEventListener('click', async () => {
                const inputs = docsContainer.querySelectorAll('.subcollection-input');
                const updates = [];
                inputs.forEach(input => {
                    const docId = input.dataset.docId;
                    const fieldKey = input.dataset.fieldKey;
                    const newValue = Number(input.value);
                    if (docId && fieldKey) {
                        const docRef = doc(db, 'approved_emails', email, 'limits', docId);
                        updates.push(updateDoc(docRef, { [fieldKey]: newValue }));
                    }
                });
                try {
                    await Promise.all(updates);
                    alert('Successfully updated limits!');
                } catch (error) {
                    console.error("Error updating limits subcollection:", error);
                    alert('Failed to update limits. See console for details.');
                }
            });
        }
    } catch (error) {
        console.error(`Error rendering 'limits' subcollection for ${email}:`, error);
        container.innerHTML = `<p>Error loading subcollection data.</p>`;
    }
}
// +++ ADD THIS ENTIRE NEW BLOCK OF CODE AT THE END OF THE FILE +++

// --- ADD NEW USER MODAL LOGIC ---

function showAddUserModal() {
    addUserForm.reset();
    addUserModal.classList.remove('hidden');
    addUserOverlay.classList.remove('hidden');
}

function hideAddUserModal() {
    addUserModal.classList.add('hidden');
    addUserOverlay.classList.add('hidden');
}

// Event Listeners for the new modal
closeAddUserModalBtn.addEventListener('click', hideAddUserModal);
cancelAddUserBtn.addEventListener('click', hideAddUserModal);
addUserOverlay.addEventListener('click', hideAddUserModal);

addUserForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailInput = addUserForm.querySelector('#new-user-email');
    const email = emailInput.value.trim().toLowerCase();

    // Basic email validation
    if (!email || !email.includes('@')) {
        alert('Please enter a valid email address.');
        return;
    }

    const docRef = doc(db, 'approved_emails', email);

    try {
        // Check if the user already exists
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            alert('This email address is already in the approved list.');
            return;
        }

        // Define the default data for the new user
        const defaultUserData = {
            allowed: true,
            maxPublicSets: 4,
            slots: 2,
            role: "prepper"
        };

        // Create the new document in Firestore
        await setDoc(docRef, defaultUserData);
        
        alert(`Successfully added ${email} to the approved list.`);
        hideAddUserModal();
        // The user list in the sidebar will update automatically
        // because of the onSnapshot listener.

    } catch (error) {
        console.error("Error adding new user:", error);
        alert('Failed to add new user. See console for details.');
    }
});
// --- SUGGESTIONS VIEW LOGIC ---

// Import query and orderBy if they are not already in the import statement at the top
// Note: Ensure your main import from 'firebase-firestore' includes these.
import { query, orderBy } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

/**
 * Fetches and displays user suggestions from Firestore in real-time.
 */
function displaySuggestions() {
    const suggestionsCol = collection(db, 'suggestions');
    // Query to order suggestions by timestamp, with the newest appearing first
    const q = query(suggestionsCol, orderBy('timestamp', 'desc'));

    // Set a title for the view and a container for the list
    contentDisplay.innerHTML = `
        <div class="suggestions-container">
            <h2>User Suggestions</h2>
            <div id="suggestions-list" class="details-grid">
                <p>Loading suggestions...</p>
            </div>
        </div>
    `;
    const suggestionsList = document.getElementById('suggestions-list');

    // Use onSnapshot for real-time updates
    onSnapshot(q, (snapshot) => {
        suggestionsList.innerHTML = ''; // Clear previous results
        if (snapshot.empty) {
            suggestionsList.innerHTML = '<p>No suggestions have been submitted yet.</p>';
            return;
        }

        // In admin.js inside displaySuggestions function
// In admin.js, inside the displaySuggestions function

snapshot.forEach(doc => {
    const data = doc.data();
    const userEmail = data.userEmail || 'Anonymous';
    const suggestionText = data.suggestion || 'No content';
    
    let datePart = '';
    let timePart = '';

    if (data.timestamp) {
        const dateObj = data.timestamp.toDate();
        datePart = dateObj.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
        timePart = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    }

    // ▼▼▼ THIS IS THE FIX ▼▼▼
    // Check the suggestion's status from Firestore
    const isApproved = data.status === 'approved';
    const buttonText = isApproved ? 'Approved' : 'Approve';
    const buttonDisabled = isApproved ? 'disabled' : '';
    // ▲▲▲ END OF FIX ▲▲▲

    // In admin.js, inside the displaySuggestions function's forEach loop
const suggestionTitle = (data.title || 'Your suggestion').replace(/"/g, '&quot;');

const suggestionCardHTML = `
    <div class="suggestion-card detail-card">
        <div class="suggestion-header">
            <span class="suggestion-email-part">${userEmail}</span>
            <div class="suggestion-timestamp-wrapper">
                 <span class="suggestion-date-part">${datePart}</span>
                 <span class="suggestion-time-part">${timePart}</span>
            </div>
        </div>
        <p class="suggestion-text">${suggestionText}</p>
        <div class="suggestion-actions">
            <button class="approve-suggestion-btn" data-doc-id="${doc.id}" data-user-email="${userEmail}" data-suggestion-title="${suggestionTitle}" ${buttonDisabled}>${buttonText}</button>
        </div>
    </div>
`;
    suggestionsList.insertAdjacentHTML('beforeend', suggestionCardHTML);
});
    }, (error) => {
        console.error("Error fetching suggestions:", error);
        suggestionsList.innerHTML = '<p>An error occurred while loading suggestions.</p>';
    });
}

// Add click event listener for the new sidebar button
suggestionsBtn.addEventListener('click', (e) => {
    e.preventDefault(); // Prevent default link behavior
    
    // De-select any user in the user list to avoid confusion
    const currentlySelected = userList.querySelector('.selected');
    if (currentlySelected) {
        currentlySelected.classList.remove('selected');
    }

    // Unsubscribe from the user details listener to save resources
    if (unsubscribeUserDetails) {
        unsubscribeUserDetails();
        unsubscribeUserDetails = null;
    }

    // Call the function to render the suggestions view
    displaySuggestions();
});
// --- APPROVE SUGGESTION LOGIC ---

/**
 * Creates a notification for the user and updates the suggestion's status.
 * @param {string} docId - The ID of the suggestion document.
 * @param {string} userEmail - The email of the user who made the suggestion.
 * @param {string} suggestionTitle - The title of the suggestion.
 */
async function approveSuggestion(docId, userEmail, suggestionTitle) {
    if (!docId || !userEmail) {
        console.error("Missing document ID or user email for approval.");
        return;
    }

    try {
        const notificationsCol = collection(db, 'notifications');
        await addDoc(notificationsCol, {
            recipientEmail: userEmail,
            title: `💡 Suggestion Approved: "${suggestionTitle}"`,
            message: `The admin has approved your suggestion. Thank you for your feedback!`,
            timestamp: serverTimestamp(),
            read: false
        });

        const suggestionRef = doc(db, 'suggestions', docId);
        await updateDoc(suggestionRef, { status: 'approved' });

        console.log(`Suggestion ${docId} approved and notification sent to ${userEmail}.`);
    } catch (error) {
        console.error("Error approving suggestion: ", error);
        alert("There was an error approving the suggestion.");
    }
}

// Use event delegation to handle clicks on the dynamically added approve buttons
contentDisplay.addEventListener('click', async (e) => {
    if (e.target && e.target.classList.contains('approve-suggestion-btn')) {
        const button = e.target;
        const docId = button.dataset.docId;
        const userEmail = button.dataset.userEmail;
        const suggestionTitle = button.dataset.suggestionTitle; // Get title

        button.disabled = true;
        button.textContent = 'Approved';
        
        await approveSuggestion(docId, userEmail, suggestionTitle);
    }
});