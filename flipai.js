// Add these lines at the top of flipai.js
import { auth, db } from './firebaseinit.js';
import { GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { doc, getDoc, collection, setDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

console.log("Firebase modules imported.");

document.addEventListener("DOMContentLoaded", () => {

const savedTabId = localStorage.getItem('activeFlipAITab');
// Only run this logic if a tab was saved AND it's not the default 'create' tab
if (savedTabId && savedTabId !== 'create') {
    // Find the default elements that need to be deactivated
    const defaultButton = document.querySelector('.tab-btn[data-tab="create"]');
    const defaultPanel = document.getElementById('create-panel');

    // Find the saved elements that need to be activated
    const buttonToActivate = document.querySelector(`.tab-btn[data-tab="${savedTabId}"]`);
    const panelToActivate = document.getElementById(`${savedTabId}-panel`);

    if (buttonToActivate && panelToActivate) {
        // Deactivate the default 'create' tab
        defaultButton.classList.remove('active');
        defaultPanel.classList.remove('active');

        // Activate the saved tab and its panel
        buttonToActivate.classList.add('active');
        panelToActivate.classList.add('active');
    }
}

    const downloadPdfBtn = document.getElementById('downloadPdfBtn');
    let currentExplanations = [];
    let aiProcessingState = { create: false, explain: false, summarizer: false, ask: false, askText: false }; // <-- ADD THIS LINE
    // DOM Elements
    // --- DOM Elements for Create Sets Tab ---
    const uploadPdfBtn = document.getElementById('uploadPdfBtn');
    const uploadPptxBtn = document.getElementById('uploadPptxBtn');
    const uploadDocxBtn = document.getElementById('uploadDocxBtn');
    const fileUploadInput = document.getElementById('fileUploadInput');
    const flashcardsContainer = document.getElementById('flashcardsContainer');
    const usageTracker = document.getElementById('usageTracker');
    const usageCountEl = document.getElementById('usageCount');
    const resetTimerEl = document.getElementById('resetTimer');
    const upgradeNote = document.getElementById('upgradeNote');
    const addSetBtn = document.getElementById('addSetBtn');

    // --- DOM Elements for Analyze File Tab ---
    const uploadPdfBtnExplain = document.getElementById('uploadPdfBtnExplain');
    const uploadPptxBtnExplain = document.getElementById('uploadPptxBtnExplain');
    const uploadDocxBtnExplain = document.getElementById('uploadDocxBtnExplain');
    const fileUploadInputExplain = document.getElementById('fileUploadInputExplain');
    const explanationContainer = document.getElementById('explanationContainer');
    const usageTrackerExplain = document.getElementById('usageTrackerExplain');
    const usageCountElExplain = document.getElementById('usageCountExplain');
    const resetTimerElExplain = document.getElementById('resetTimerExplain');
    const upgradeNoteExplain = document.getElementById('upgradeNoteExplain');
    const usageInfoBtnExplain = document.getElementById('usageInfoBtnExplain');

    // --- Common DOM Elements ---
    const upgradeBtn = document.getElementById('upgradeBtn');
    const usageInfoBtn = document.getElementById('usageInfoBtn');
    const infoModal = document.getElementById('infoModal');
    const infoModalCloseBtn = document.getElementById('infoModalCloseBtn');
    const backToLobbyBtn = document.getElementById('backToLobbyBtn');
    let countdownInterval = null;

    const howItWorksBtns = document.querySelectorAll('.how-it-works-btn');
const howItWorksModal = document.getElementById('howItWorksModal');
const howItWorksTitle = document.getElementById('howItWorksTitle');
const howItWorksContent = document.getElementById('howItWorksContent');
const howItWorksCloseBtn = document.getElementById('howItWorksCloseBtn');

const uploadPdfBtnSummarizer = document.getElementById('uploadPdfBtnSummarizer');
    const uploadPptxBtnSummarizer = document.getElementById('uploadPptxBtnSummarizer');
    const uploadDocxBtnSummarizer = document.getElementById('uploadDocxBtnSummarizer');
    const fileUploadInputSummarizer = document.getElementById('fileUploadInputSummarizer');
    const summaryContainer = document.getElementById('summaryContainer');
    const usageTrackerSummarizer = document.getElementById('usageTrackerSummarizer');
    const usageCountSummarizer = document.getElementById('usageCountSummarizer');
    const resetTimerSummarizer = document.getElementById('resetTimerSummarizer');
    const upgradeNoteSummarizer = document.getElementById('upgradeNoteSummarizer');
    const usageInfoBtnSummarizer = document.getElementById('usageInfoBtnSummarizer');

    const fileInfoCreate = document.getElementById('fileInfoCreate');
const fileInfoExplain = document.getElementById('fileInfoExplain');
const fileInfoSummarizer = document.getElementById('fileInfoSummarizer');

// --- DOM Elements for Ask AI (Text) Tab ---
    const askAiTextInput = document.getElementById('askAiTextInput');
    const askAiTextSendBtn = document.getElementById('askAiTextSendBtn');
    const askTextContainer = document.getElementById('askTextContainer');
    const usageTrackerAskText = document.getElementById('usageTrackerAskText');
    const usageCountAskText = document.getElementById('usageCountAskText');
    const resetTimerAskText = document.getElementById('resetTimerAskText');
    const upgradeNoteAskText = document.getElementById('upgradeNoteAskText');
    const usageInfoBtnAskText = document.getElementById('usageInfoBtnAskText');

const askAiImageInput = document.getElementById('askAiImageInput');
const askAiAttachImageBtn = document.getElementById('askAiAttachImageBtn');
const askAiImagePreview = document.getElementById('askAiImagePreview');


    let isAiProcessing = false; // Tracks if an AI request is in progress
    let askAiTextHistory = [];
    let attachedImageFiles = [];

    const askAiDocInput = document.getElementById('askAiDocInput');
const askAiAttachDocBtn = document.getElementById('askAiAttachDocBtn');
const askAiDocPreview = document.getElementById('askAiDocPreview');
let attachedDocFile = null;
const importGoogleDocBtn = document.getElementById('importGoogleDocBtn');

    // 1. Get this from Google Cloud -> APIs & Services -> Credentials
    //    It's the "Client ID" from the "OAuth 2.0 Client IDs" section.
    const GOOGLE_CLIENT_ID = "836765717736-iq3j9en6k8u1cvgi6dkdq9k84eqnj5tq.apps.googleusercontent.com"; 

    // 2. Get this from Google Cloud -> APIs & Services -> Credentials
    //    Click "Create Credentials" -> "API Key"
    const GOOGLE_API_KEY = "AIzaSyBVqdR0XmHSDW-QlyoxTtmr5m_F6ILd87Q";
    
    // 3. Define the permissions we need
    const GOOGLE_SCOPES = [
        'https://www.googleapis.com/auth/documents.readonly', // Read docs
        'https://www.googleapis.com/auth/drive.file'          // Find files with Picker
    ];
    
    let googleAccessToken = null; // We'll store the token here
    let pickerApiLoaded = false;  // Track if Picker script is loaded
    // --- End Google API Configuration ---



    // --- Usage Limit Configuration ---
    const USAGE_LIMITS = {
        default: 10,
        verified: 25,
        plus: 70
    };
const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and panels
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanels.forEach(panel => panel.classList.remove('active'));

            // Add active class to the clicked button
            button.classList.add('active');

            // Show the corresponding panel
            const tabId = button.dataset.tab;
            const activePanel = document.getElementById(`${tabId}-panel`);
            if (activePanel) {
                activePanel.classList.add('active');
            }
            localStorage.setItem('activeFlipAITab', tabId);
        });
    });
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


    
    // --- Info Modal Logic ---
   [usageInfoBtn, usageInfoBtnExplain, usageInfoBtnSummarizer, usageInfoBtnAskText].forEach(btn => { // <-- ADD usageInfoBtnAskText
    if (btn) { // Add a check in case an ID is wrong
         btn.addEventListener('click', () => infoModal.classList.add('visible'));
    } else {
         console.warn("An info button was not found. Check IDs.");
    }
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

    backToLobbyBtn.addEventListener('click', (event) => {
        event.preventDefault(); // Stop the link from navigating immediately
        console.log("Back to Lobby clicked. Clearing 'flashcardsData'.");
        localStorage.removeItem('flashcardsData');
        window.location.href = backToLobbyBtn.href; // Proceed to lobby
    });
    // --- Main Functionality ---
    // When the PDF button is clicked...
uploadPdfBtn.addEventListener('click', () => {
    // Set the file input to only accept PDFs
    fileUploadInput.accept = '.pdf';
    fileUploadInput.click(); // Open the file dialog
});
importGoogleDocBtn.addEventListener('click', handleGoogleDocImport);
// When the PPTX button is clicked...
uploadPptxBtn.addEventListener('click', () => {
    // Set the file input to only accept PPTX files
    fileUploadInput.accept = '.pptx';
    fileUploadInput.click(); // Open the file dialog
});
// ADD THIS EVENT LISTENER
uploadDocxBtn.addEventListener('click', () => {
    fileUploadInput.accept = '.docx';
    fileUploadInput.click();
});
    fileUploadInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) {
            showCustomAlert('No File Selected', 'Please choose a PDF, PPTX, or DOCX file to continue.');
            return;
        }
        
        processFileForFlashcards(file);
    });
    // --- "ANALYZE FILE" TAB LOGIC ---
    uploadPdfBtnExplain.addEventListener('click', () => {
        fileUploadInputExplain.accept = '.pdf';
        fileUploadInputExplain.click();
    });
    uploadPptxBtnExplain.addEventListener('click', () => {
        fileUploadInputExplain.accept = '.pptx';
        fileUploadInputExplain.click();
    });
    uploadDocxBtnExplain.addEventListener('click', () => {
        fileUploadInputExplain.accept = '.docx';
        fileUploadInputExplain.click();
    });
    fileUploadInputExplain.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) processFileForExplanation(file);
    });
// --- SUMMARIZER TAB LOGIC ---
    uploadPdfBtnSummarizer.addEventListener('click', () => {
        fileUploadInputSummarizer.accept = '.pdf';
        fileUploadInputSummarizer.click();
    });
    uploadPptxBtnSummarizer.addEventListener('click', () => {
        fileUploadInputSummarizer.accept = '.pptx';
        fileUploadInputSummarizer.click();
    });
    uploadDocxBtnSummarizer.addEventListener('click', () => {
        fileUploadInputSummarizer.accept = '.docx';
        fileUploadInputSummarizer.click();
    });
    fileUploadInputSummarizer.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) processFileForSummary(file);
    });
    // --- ASK AI TAB LOGIC ---

// --- Helper functions for Ask AI (Text) Image Attachment ---

// Helper to read file as Base64 AND get mime type
function readFileAsBase64WithMime(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            // result is "data:mime/type;base64,BASE64_STRING"
            const base64Full = reader.result;
            const base64Data = base64Full.split(',')[1];
            const mimeType = base64Full.match(/^data:(.*);base64,/)?.[1] || file.type; // Extract mime type

            if (!base64Data) {
                reject(new Error("Could not extract base64 string from file reader result."));
            } else {
                 resolve({ base64Data, mimeType });
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file); // Read as Data URL
    });
}
function clearAttachedDoc() {
    attachedDocFile = null;
    if(askAiDocPreview) {
        askAiDocPreview.innerHTML = '';
        askAiDocPreview.classList.add('hidden');
    }
    if(askAiDocInput) {
        askAiDocInput.value = '';
    }
    console.log("Cleared attached document.");
}
// Function to clear ALL attached files (images and docs)
function clearAllAttachments() {
    // Clear images
    attachedImageFiles = [];
    if (askAiImagePreview) {
        askAiImagePreview.innerHTML = '';
        askAiImagePreview.classList.add('hidden');
    }
    if (askAiImageInput) {
        askAiImageInput.value = '';
    }
    console.log("Cleared attached images.");

    // Clear document
    clearAttachedDoc(); // Call the specific doc clearing function
}

function appendUserMessage(question, imageSources = [], docInfo = null) { // Add docInfo parameter
    console.log("Appending user message. Question:", question, "Images:", imageSources.length, "Doc:", docInfo ? docInfo.name : 'None');

    // --- 1. Create and Append the Text Bubble ---
    const messageWrapper = document.createElement('div');
    messageWrapper.className = 'user-message-item';
    const messageContent = document.createElement('div');
    messageContent.className = 'user-message-content';
    const textElement = document.createElement('p');
     // Add placeholder if only files were sent
    textElement.textContent = question || (imageSources.length > 0 || docInfo ? '(File attached)' : '');
    textElement.style.margin = '0';
    messageContent.appendChild(textElement);
    messageWrapper.appendChild(messageContent);
    askTextContainer.appendChild(messageWrapper);
    console.log("Appended text bubble.");
 if (docInfo) {
        const docContainer = document.createElement('div');
        docContainer.className = 'user-doc-container'; // New class for alignment
        const iconClass = getFileIconClass(docInfo.type || docInfo.name.split('.').pop());
        docContainer.innerHTML = `
            <div class="user-doc-preview-item">
                <i class="fa-solid ${iconClass}"></i>
                <span>${docInfo.name}</span>
            </div>
        `;
        askTextContainer.appendChild(docContainer);
        console.log("Appended document preview container.");
    }
    // --- 2. Create and Append Image Container ---
    if (imageSources.length > 0) {
        const imageContainer = document.createElement('div');
        imageContainer.className = 'user-images-container';
        imageSources.forEach(src => {
            const imageElement = document.createElement('img');
            imageElement.src = src;
            imageElement.alt = "Attached image";
            imageElement.style.height = '70px';
            imageElement.style.width = '70px';
            imageElement.style.objectFit = 'cover';
            imageElement.style.borderRadius = '8px';
            imageElement.style.border = '1px solid #444';
            imageElement.style.backgroundColor = '#333';
            imageElement.onerror = () => { console.error("Error loading separate image source:", src.substring(0, 50) + "..."); imageElement.alt = "Error loading";};
            imageElement.onload = () => { imageElement.style.backgroundColor = 'transparent'; };
            imageContainer.appendChild(imageElement);
        });
        askTextContainer.appendChild(imageContainer);
        console.log(`Appended image container with ${imageSources.length} previews.`);
    }

    // --- 3. Create and Append Document Preview Container ---
   

    // --- 4. Scroll ---
    scrollToAskTextBottom();
}

// --- End Helper functions ---
// --- ASK AI (TEXT) TAB LOGIC ---
    // --- ASK AI (TEXT) TAB LOGIC ---
function scrollToAskTextBottom() {
        // The main page body is what scrolls
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
    

    function appendTypingIndicator() {
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'typing-indicator';
        typingIndicator.id = 'ai-typing-loader'; // Give it an ID to find/remove it
        typingIndicator.innerHTML = `
            <svg class="ai-sparkle-icon-typing" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5Z"></path>
              <path d="M4 4l2 2m0-2l-2 2"></path><path d="M18 4l2 2m0-2l-2 2"></path>
              <path d="M4 18l2 2m0-2l-2 2"></path><path d="M18 18l2 2m0-2l-2 2"></path>
            </svg>
            <p>FlipCards AI is thinking...</p>`;
        askTextContainer.appendChild(typingIndicator);
        scrollToAskTextBottom();
    }
    
    function removeTypingIndicator() {
         const loader = document.getElementById('ai-typing-loader');
         if (loader) loader.remove();
    }

    function appendErrorMessage(error) {
        if (askAiTextHistory.length > 0 && askAiTextHistory[askAiTextHistory.length - 1].role === 'user') {
       // Only pop if the last item was a user message (prevents double-popping on retries etc.)
       askAiTextHistory.pop();
       console.log("Popped last user message from history due to error.");
    }
        removeTypingIndicator(); // Remove loader first
        
        const errorElement = document.createElement('div');
        errorElement.className = 'summary-item'; // Reuse AI bubble style
        errorElement.style.borderColor = '#ef4444'; // Make it red
        errorElement.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
        
        errorElement.innerHTML = `
            <div class="summary-header">
                <h4 class="summary-heading" style="color: #ef4444;">Error</h4>
            </div>
            <div class="ask-ai-answer" style="color: #f87171;">
                <p>Sorry, an error occurred:</p>
                <p><strong>${error.message || 'Unknown error'}</strong></p>
            </div>
        `;
        askTextContainer.appendChild(errorElement);
        scrollToAskTextBottom();
    }

    askAiTextSendBtn.addEventListener('click', handleSendAskText);
    askAiTextInput.addEventListener('keydown', (e) => { // Use keydown for better modifier key detection
        // Send only if Enter is pressed WITHOUT the Shift key
        if (e.key === 'Enter' && !e.shiftKey && !askAiTextSendBtn.disabled) {
            e.preventDefault(); // Prevent default Enter behavior (like adding a newline)
            handleSendAskText();
        }
        // If Shift + Enter is pressed, the browser's default behavior (add newline) occurs
    });
    // --- ADD THIS BLOCK: Handle Pasting Images ---
    askAiTextInput.addEventListener('paste', async (event) => {
        const items = (event.clipboardData || window.clipboardData).items;
        let imageFile = null;

        // Loop through clipboard items to find an image
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                imageFile = items[i].getAsFile();
                break; // Stop after finding the first image
            }
        }

        // If an image file was found in the clipboard
        if (imageFile) {
            event.preventDefault(); // Prevent default paste action (like pasting file path text)
            console.log("Image pasted:", imageFile.name, imageFile.type);

            // --- Reuse logic similar to file input 'change' event ---
            // Clear existing previews/files if you only want one pasted image at a time
            // Or modify to *add* the pasted image to the existing attachedImageFiles array
            // For simplicity, this example replaces existing attachments with the pasted one:
            clearAllAttachments(); // Clear previous
            askAiImagePreview.classList.remove('hidden'); // Show preview area

            const currentFileId = 0; // Simple ID for single pasted image case

            try {
                // Read file for preview and store Base64
                const { base64Data, mimeType } = await readFileAsBase64WithMime(imageFile);
                const previewSrc = `data:${mimeType};base64,${base64Data}`;

                // Store file info (replace existing files)
                attachedImageFiles = [{
                    fileId: currentFileId,
                    file: imageFile,
                    base64: base64Data,
                    mimeType: mimeType
                }];
                console.log("Stored pasted image:", imageFile.name, mimeType, `(ID: ${currentFileId})`);

                // Create preview item
                const previewItem = document.createElement('div');
                previewItem.className = 'image-preview-item';
                previewItem.dataset.fileId = currentFileId;
                previewItem.innerHTML = `
                    <img src="${previewSrc}" alt="Pasted image preview">
                    <button class="remove-image-btn" title="Remove image">&times;</button>
                `;
                askAiImagePreview.innerHTML = ''; // Clear just in case before adding new
                askAiImagePreview.appendChild(previewItem);

                // Add listener to the remove button
                const removeBtn = previewItem.querySelector('.remove-image-btn');
                if (removeBtn) {
                    removeBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        clearAllAttachments(); // Clear everything if removed
                    });
                }
            } catch (error) {
                console.error("Error reading pasted image:", error);
                showCustomAlert('Paste Error', 'Could not read the pasted image data.', 'error');
                clearAllAttachments(); // Clear if reading fails
            }
            // --- End reused logic ---

        } else {
            console.log("Paste event detected, but no image found in clipboard items.");
            // Allow default paste action for text
        }
    });
    // --- END OF ADDED PASTE LISTENER BLOCK ---
    // --- Event Listeners for Ask AI Text Image Attachment ---
    // --- Event Listeners for Ask AI Text Image Attachment ---
if (askAiAttachImageBtn && askAiImageInput) {
    askAiAttachImageBtn.addEventListener('click', () => {
        askAiImageInput.click();
    });

    // --- Replace this entire 'change' listener ---
    askAiImageInput.addEventListener('change', async (event) => {
        const files = event.target.files;
        if (!files || files.length === 0) {
            console.log("No files selected or selection cancelled.");
            // Don't clear existing if the user cancelled - only if they selected zero files
            if (files && files.length === 0 && attachedImageFiles.length > 0) {
                 // Might clear here if desired, or just do nothing
            }
            return;
        }

        askAiImagePreview.innerHTML = ''; // Clear previous previews before adding new ones
        attachedImageFiles = []; // Reset the stored files array
        askAiImagePreview.classList.remove('hidden'); // Show preview area

        let fileIdCounter = 0; // Simple ID for removal later

        for (const file of files) {
            if (file && file.type.startsWith('image/')) {
                const currentFileId = fileIdCounter++;
                try {
                    // Read file for preview and store Base64
                    const { base64Data, mimeType } = await readFileAsBase64WithMime(file);
                    const previewSrc = `data:${mimeType};base64,${base64Data}`;

                    // Store file info
                    attachedImageFiles.push({
                        fileId: currentFileId,
                        file: file, // Keep original file object if needed later
                        base64: base64Data,
                        mimeType: mimeType
                    });
                    console.log("Attached image:", file.name, mimeType, `(ID: ${currentFileId})`);

                    // Create preview item
                    const previewItem = document.createElement('div');
                    previewItem.className = 'image-preview-item';
                    previewItem.dataset.fileId = currentFileId; // Store ID on element
                    previewItem.innerHTML = `
                        <img src="${previewSrc}" alt="Image preview">
                        <button class="remove-image-btn" title="Remove image">&times;</button>
                    `;
                    askAiImagePreview.appendChild(previewItem);

                    // Add listener to the remove button for this specific item
                    const removeBtn = previewItem.querySelector('.remove-image-btn');
                    if (removeBtn) {
                        removeBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            const fileIdToRemove = parseInt(previewItem.dataset.fileId, 10);
                            // Remove from array
                            attachedImageFiles = attachedImageFiles.filter(f => f.fileId !== fileIdToRemove);
                            // Remove preview element
                            previewItem.remove();
                            console.log(`Removed image with ID: ${fileIdToRemove}`);
                            // Hide preview container if empty
                            if (attachedImageFiles.length === 0) {
                                askAiImagePreview.classList.add('hidden');
                                askAiImageInput.value = ''; // Reset input if all removed
                            }
                        });
                    }
                } catch (error) {
                    console.error("Error reading file:", file.name, error);
                    showCustomAlert('Error', `Could not read image file: ${file.name}`, 'error');
                }
            } else if (file) {
                showCustomAlert('Invalid File', `Skipping non-image file: ${file.name}`, 'warning');
            }
        } // End for loop

        // If after processing all files, none were valid images, hide the preview area
        if (attachedImageFiles.length === 0) {
            askAiImagePreview.classList.add('hidden');
        }
        askAiTextInput.focus();
    }); // --- End of replaced 'change' listener ---

} else {
    console.error("Ask AI Text image attachment buttons not found.");
}
// --- End Image Attachment Listeners ---
    // --- End Image Attachment Listeners ---
    if (askAiAttachDocBtn && askAiDocInput) {
    askAiAttachDocBtn.addEventListener('click', () => {
        // Prevent attaching doc if image already attached, and vice versa
        
        askAiDocInput.click();
    });

    askAiDocInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const allowedTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // docx
        ];
        if (!allowedTypes.includes(file.type)) {
             showCustomAlert('Invalid File Type', 'Please select a PDF, PPTX, or DOCX file.', 'error');
             clearAttachedDoc(); // Use specific clear here
             return;
        }

        // Clear any existing attachments (enforce one type at a time)
        // Use the combined clear

        const currentFileId = Date.now();
        attachedDocFile = {
            fileId: currentFileId,
            file: file,
            name: file.name,
            type: file.type
        };
        console.log("Attached document:", file.name, file.type);

        const iconClass = getFileIconClass(file.type || file.name.split('.').pop());
        askAiDocPreview.innerHTML = `
            <div class="doc-preview-item" data-file-id="${currentFileId}">
                <i class="fa-solid ${iconClass}"></i>
                <span>${file.name}</span>
                <button class="remove-doc-btn" title="Remove document">&times;</button>
            </div>
        `;
        askAiDocPreview.classList.remove('hidden');

        const removeBtn = askAiDocPreview.querySelector('.remove-doc-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                clearAttachedDoc(); // Use specific clear for doc remove
            });
        }
        askAiTextInput.focus();
    });
} else {
    console.error("Ask AI Text document attachment elements not found."); // Updated error message slightly
}
    const askTextInputResize = document.getElementById('askAiTextInput'); // Use a distinct variable name
    const askTextPanelResize = document.getElementById('ask-text-panel');
    const inputAreaContainerResize = askTextInputResize.closest('.ask-ai-input-area'); // Find parent container

    if (askTextInputResize && askTextPanelResize && inputAreaContainerResize) {
        const initialInputAreaHeight = inputAreaContainerResize.offsetHeight;
        const initialPanelPadding = parseInt(window.getComputedStyle(askTextPanelResize).paddingBottom, 10) || 100; // Default if style not loaded yet
        const maxTextareaHeight = parseInt(window.getComputedStyle(askTextInputResize).maxHeight, 10);

        console.log("Initial Resize Values:", { initialInputAreaHeight, initialPanelPadding, maxTextareaHeight });

        askTextInputResize.addEventListener('input', () => {
           // console.log('--- Textarea Input Event Fired ---'); // Optional: Keep for debugging

            // Reset height first to calculate scrollHeight correctly (for shrinking too)
            askTextInputResize.style.height = 'auto';

            let scrollH = askTextInputResize.scrollHeight;
           // console.log('Scroll Height:', scrollH); // Optional: Keep for debugging

            // Includes padding, border is none, so scrollHeight should be close enough
            let newHeight = scrollH;

           // console.log('Calculated newHeight:', newHeight); // Optional: Keep for debugging

            // Apply max height limit
            if (newHeight > maxTextareaHeight) {
                // console.log('Height exceeds max. Clamping.'); // Optional: Keep for debugging
                newHeight = maxTextareaHeight;
                askTextInputResize.style.overflowY = 'auto'; // Show scrollbar
            } else {
                askTextInputResize.style.overflowY = 'hidden'; // Hide scrollbar
            }

            // Set the new height
           // console.log('Setting textarea height to:', newHeight + 'px'); // Optional: Keep for debugging
            askTextInputResize.style.height = `${newHeight}px`;

            // Adjust bottom padding of the content panel to prevent overlap
            // Use requestAnimationFrame to ensure layout changes are calculated correctly
             requestAnimationFrame(() => {
                const currentInputAreaHeight = inputAreaContainerResize.offsetHeight;
                const heightDifference = currentInputAreaHeight - initialInputAreaHeight;
                const newPadding = initialPanelPadding + heightDifference;
                // console.log('Setting panel paddingBottom to:', newPadding + 'px'); // Optional: Keep for debugging
                askTextPanelResize.style.paddingBottom = `${newPadding}px`;
             });
        });
    } else {
         console.error("Error: Could not find one or more elements needed for textarea resize. Check IDs: askAiTextInput, ask-text-panel, and ensure the input has a parent with class .ask-ai-input-area");
    }
// --- File Processing Functions ---
    async function processFileForFlashcards(file) {
        const CLOUD_FUNCTION_URL = 'https://generateflashcards-zpanpdg2va-uc.a.run.app';
        await handleFileUpload(file, flashcardsContainer, fileInfoCreate, CLOUD_FUNCTION_URL, displayFlashcards);
    }
    
    async function processFileForExplanation(file) {
        // ❗IMPORTANT: Replace this with the URL for your new deployed function
        const CLOUD_FUNCTION_URL = 'https://extractandexplainterms-zpanpdg2va-uc.a.run.app';
        await handleFileUpload(file, explanationContainer, fileInfoExplain, CLOUD_FUNCTION_URL, displayExplanations);
    }
    
    async function handleFileUpload(file, container, fileInfoContainer, url, displayFn, tabId) {
    if (aiProcessingState[tabId]) {
        showCustomAlert('Processing...', `Please wait for the current ${tabId} process to complete before starting a new one.`, 'error');
        switch (tabId) {
            case 'create': fileUploadInput.value = ''; break;
            case 'explain': fileUploadInputExplain.value = ''; break;
            case 'summarizer': fileUploadInputSummarizer.value = ''; break;
        }
        return;
    }

    const role = await getUserRole();
    const maxUsage = USAGE_LIMITS[role] || 3;
    const usageData = await getUsageData();

    if (usageData.count >= maxUsage) {
        showCustomAlert('Daily Limit Reached', `You have used all your generations for today. Your limit will reset.`);
        return;
    }

    aiProcessingState[tabId] = true;
    let buttonsToDisable = [];
    switch (tabId) {
        case 'create':
            buttonsToDisable = [uploadPdfBtn, uploadPptxBtn, uploadDocxBtn, importGoogleDocBtn];
            break;
        case 'explain':
            buttonsToDisable = [uploadPdfBtnExplain, uploadPptxBtnExplain, uploadDocxBtnExplain];
            break;
        case 'summarizer':
            buttonsToDisable = [uploadPdfBtnSummarizer, uploadPptxBtnSummarizer, uploadDocxBtnSummarizer];
            break;
    }
    buttonsToDisable.forEach(btn => btn.disabled = true);

    if (fileInfoContainer) {
        const iconClass = getFileIconClass(file.type || file.name.split('.').pop()); // Added fallback for GDocs
        const fileSize = file.size ? formatBytes(file.size) : 'N/A'; // Handle GDocs size
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        fileInfoContainer.innerHTML = `
            <i class="fa-solid ${iconClass}"></i>
            <div class="file-details">
                <span class="file-name">${file.name}</span>
                <span class="file-meta">${fileSize} • Uploaded at ${timestamp}</span>
            </div>
        `;
        fileInfoContainer.classList.remove('hidden');
    }
    container.innerHTML = `<div class="loader-container"><div class="loader"></div><p>AI is analyzing, please wait...</p></div>`;

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(url, { method: 'POST', body: formData });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'An error occurred on the server.');
        }

        const results = await response.json();

        if (results && (Array.isArray(results) ? results.length > 0 : Object.keys(results).length > 0)) {
             await displayFn(results);
             if (tabId !== 'create' && tabId !== 'askText') { // Don't show success for create or askText
                 showCustomAlert('Success!', `Your file has been processed.`, 'success');
             }
        } else {
            throw new Error('The AI could not extract any information from this file.');
        }
    } catch (error) {
        console.error('[CLIENT] Detailed error:', error);
        showCustomAlert('Processing Failed', error.message);
        container.innerHTML = '';
    } finally {
        if (fileUploadInput && file.type && fileUploadInput.accept.includes(file.type.split('/')[1])) fileUploadInput.value = '';
        if (fileUploadInputExplain && file.type && fileUploadInputExplain.accept.includes(file.type.split('/')[1])) fileUploadInputExplain.value = '';
        if (fileUploadInputSummarizer && file.type && fileUploadInputSummarizer.accept.includes(file.type.split('/')[1])) fileUploadInputSummarizer.value = '';
        // No need to clear Ask AI (Image) input as it's removed

        aiProcessingState[tabId] = false;
        buttonsToDisable.forEach(btn => btn.disabled = false);
    }
}
async function processFileForSummary(file) {
        // ❗ IMPORTANT: Use the URL for your new summarizeDocument function
        const CLOUD_FUNCTION_URL = 'https://summarizedocument-zpanpdg2va-uc.a.run.app';
        await handleFileUpload(file, summaryContainer, fileInfoSummarizer, CLOUD_FUNCTION_URL, displaySummary);
    }

    async function displaySummary(data) {
    await incrementUsage();
    summaryContainer.innerHTML = `
        <div class="summary-item">
            <div class="summary-header">
                <h4 class="summary-heading">Summary</h4>
                <button class="copy-btn" data-copy-target="summary-text" title="Copy Summary">
                    <i class="fa-regular fa-copy"></i>
                </button>
            </div>
            <p id="summary-text">${data.summary}</p>
        </div>
        <div class="summary-item">
            <div class="summary-header">
                <h4 class="summary-heading">Paraphrased Version</h4>
                <button class="copy-btn" data-copy-target="paraphrased-text" title="Copy Paraphrased Version">
                    <i class="fa-regular fa-copy"></i>
                </button>
            </div>
            <p id="paraphrased-text">${data.paraphrased}</p>
        </div>
    `;

    // Attach event listeners to the new copy buttons
    summaryContainer.querySelectorAll('.copy-btn').forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.dataset.copyTarget;
            const textToCopy = document.getElementById(targetId).innerText;

            navigator.clipboard.writeText(textToCopy).then(() => {
                showCustomAlert('Copied!', 'The text has been copied to your clipboard.', 'success');
            }).catch(err => {
                console.error('Failed to copy text: ', err);
                showCustomAlert('Copy Failed', 'Could not copy text to the clipboard.', 'error');
            });
        });
    });
}

async function handleSendAskText() {
    if (aiProcessingState.askText) {
        showCustomAlert('Processing...', 'Please wait...', 'error');
        return;
    }

    const question = askAiTextInput.value.trim(); // <-- Text is captured
    const hasImages = attachedImageFiles.length > 0;
    const hasDoc = attachedDocFile !== null; // Check if doc is attached

    // --- ADD THIS BLOCK ---
    // Clear the input and trigger resize *immediately*
    // but only if the submission is valid (not empty).
    if (question || hasImages || hasDoc) {
         askAiTextInput.value = ''; // <-- MOVED HERE
         if (askTextInputResize) askTextInputResize.dispatchEvent(new Event('input')); // <-- MOVED HERE
        
    }
    // --- END ADDED BLOCK ---


    if (!question && !hasImages && !hasDoc) { // Check all inputs
        showCustomAlert('Input Required', 'Please enter a question or attach a file.');
        return;
    }

    // Enforce only one type of attachment
   

    const role = await getUserRole();
    const maxUsage = USAGE_LIMITS[role] || 3;
    const usageData = await getUsageData();
    if (usageData.count >= maxUsage) {
        showCustomAlert('Daily Limit Reached', 'Limit resets soon.', 'error');
        return;
    }

    aiProcessingState.askText = true;
    askAiTextInput.disabled = true;
    askAiTextSendBtn.disabled = true;
    askAiAttachImageBtn.disabled = true;
    askAiAttachDocBtn.disabled = true; // Disable doc button
    askAiImagePreview.querySelectorAll('.remove-image-btn').forEach(btn => btn.disabled = true);
    askAiDocPreview.querySelectorAll('.remove-doc-btn').forEach(btn => btn.disabled = true); // Disable doc remove

    // --- Append user message ---
    let previewSources = [];
    let docInfoForPreview = null;
    if (hasDoc) { // Now this runs regardless of whether images were found.
        docInfoForPreview = { name: attachedDocFile.name, type: attachedDocFile.type };
        // ... document info is prepared if a document exists.
    }
    if (hasImages) {
        previewSources = attachedImageFiles.map(imgFile => `data:${imgFile.mimeType};base64,${imgFile.base64}`);
    }
    appendUserMessage(question, previewSources, docInfoForPreview);
    // --- End Append ---

    // --- Add user message to history ---
    let userMessageParts = [{ text: question }]; // Start with text
    if (hasImages) {
         attachedImageFiles.forEach(imgFile => {
            userMessageParts.push({ inlineData: { mimeType: imgFile.mimeType, data: imgFile.base64 } });
         });
    }
    // NOTE: Document content isn't added to client-side history, only text prompt
    askAiTextHistory.push({ role: 'user', parts: userMessageParts });
    // --- End History Add ---

    appendTypingIndicator();

const CLOUD_FUNCTION_URL = 'https://askaitext-zpanpdg2va-uc.a.run.app';
let requestOptions = { method: 'POST' }; // <-- ADD 'let'
let requestType = 'unknown'; // <-- ADD 'let'

if (hasImages || hasDoc) {
    // --- Use FormData if EITHER images OR a doc (or both) are present ---
    requestType = 'formdata';
    const formData = new FormData();
    formData.append('question', question);
    // Send history up to the message *before* this one for context
    formData.append('history', JSON.stringify(askAiTextHistory.slice(0, -1)));

    // Add document if it exists
    if (hasDoc) {
        formData.append('file', attachedDocFile.file, attachedDocFile.name);
        console.log(`FormData: Added document file: ${attachedDocFile.name}`);
    }

    // Add images if they exist (sending base64 data as text fields)
    if (hasImages) {
        attachedImageFiles.forEach((imgFile, index) => {
            // Sending base64 and mimeType as separate fields for each image
            formData.append(`imageBase64_${index}`, imgFile.base64);
            formData.append(`imageMimeType_${index}`, imgFile.mimeType);
        });
        console.log(`FormData: Added ${attachedImageFiles.length} image(s) as base64 fields.`);
    }

    requestOptions.body = formData;
    // Browser sets Content-Type header automatically for FormData
    console.log(`Sending combined request as FormData.`);

} else {
    // --- Text-Only Request: Use JSON ---
    requestType = 'json';
    const requestBody = {
        question: question,
        history: askAiTextHistory // Send full history including the latest user message
    };
    requestOptions.headers = { 'Content-Type': 'application/json' };
    requestOptions.body = JSON.stringify(requestBody);
    console.log("Sending text-only JSON request.");
}
    // --- End Prepare Request ---

    try {
        const response = await fetch(CLOUD_FUNCTION_URL, requestOptions);

        if (!response.ok) {
            const errorData = await response.json();
            if (askAiTextHistory.length > 0) askAiTextHistory.pop(); // Pop failed user attempt
            throw new Error(errorData.message || 'An error occurred asking the AI.');
        }

        const result = await response.json();
        // Pass flags indicating if files were part of the request
        await displayAskTextResponse(result, hasImages || hasDoc);

    } catch (error) {
        console.error(`[CLIENT] Ask AI Text Error (${requestType} request):`, error);
        appendErrorMessage(error); // Handles history pop if needed
    } finally {
        aiProcessingState.askText = false;
        askAiTextInput.disabled = false;
        askAiTextSendBtn.disabled = false;
        askAiAttachImageBtn.disabled = false;
        askAiAttachDocBtn.disabled = false; // Re-enable doc button
        askAiImagePreview.querySelectorAll('.remove-image-btn').forEach(btn => btn.disabled = false);
        askAiDocPreview.querySelectorAll('.remove-doc-btn').forEach(btn => btn.disabled = false); // Re-enable doc remove

        /* askAiTextInput.value = ''; */ // <-- REMOVED FROM HERE
        clearAllAttachments(); // Use the combined clear function
        askAiTextInput.focus();
        /* if (askTextInputResize) askTextInputResize.dispatchEvent(new Event('input')); */ // <-- REMOVED FROM HERE
    }
}
    // flipai.js

// flipai.js

async function displayAskTextResponse(data, hasImage = false) {
    await incrementUsage();

    // Always add AI response to history now
    askAiTextHistory.push({
        role: 'model',
        parts: [{ text: data.answer }]
    });
    console.log(`AI response added to history. Current history length: ${askAiTextHistory.length}`);

    removeTypingIndicator();

    const rawHtml = marked.parse(data.answer);
    const aiMessageElement = document.createElement('div');
    aiMessageElement.className = 'summary-item';
    const contentId = `ask-text-answer-${Date.now()}`;

    aiMessageElement.innerHTML = `
        <div class="summary-header">
            <h4 class="summary-heading">AI Response</h4>
            <button class="copy-btn" data-copy-target="${contentId}" title="Copy Response">
                <i class="fa-regular fa-copy"></i>
            </button>
        </div>
        <div id="${contentId}" class="ask-ai-answer">${rawHtml}</div>
    `;

    askTextContainer.appendChild(aiMessageElement);

    const answerContainer = aiMessageElement.querySelector('.ask-ai-answer');
    if (answerContainer && typeof Prism !== 'undefined') {
        Prism.highlightAllUnder(answerContainer);
    }

    const preBlocks = answerContainer ? answerContainer.querySelectorAll('pre') : [];
    console.log(`Found ${preBlocks.length} <pre> blocks to add copy buttons to.`);

    preBlocks.forEach((preElement) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'code-block-wrapper';
        wrapper.style.position = 'relative';

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'code-copy-container';

        const copyLabel = document.createElement('span');
        copyLabel.className = 'code-copy-label';
        copyLabel.textContent = 'Copy Code';

        const copyCodeBtn = document.createElement('button');
        copyCodeBtn.className = 'code-copy-btn';
        copyCodeBtn.innerHTML = '<i class="fa-regular fa-copy"></i>';
        copyCodeBtn.setAttribute('aria-label', 'Copy code to clipboard');
        copyCodeBtn.title = 'Copy code';

        copyCodeBtn.addEventListener('click', () => {
            const codeElement = preElement.querySelector('code');
            if (codeElement) {
                const codeToCopy = codeElement.innerText;
                navigator.clipboard.writeText(codeToCopy).then(() => {
                    copyCodeBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
                    copyLabel.textContent = 'Copied!';
                    setTimeout(() => {
                        copyCodeBtn.innerHTML = '<i class="fa-regular fa-copy"></i>';
                        copyLabel.textContent = 'Copy Code';
                    }, 2000);
                }).catch(err => {
                    console.error('Failed to copy code: ', err);
                    copyLabel.textContent = 'Error';
                    showCustomAlert('Copy Failed', 'Could not copy code.', 'error');
                     setTimeout(() => {
                         copyLabel.textContent = 'Copy Code';
                     }, 2000);
                });
            } else {
                console.error("Could not find <code> element within <pre> to copy.");
            }
        });

        buttonContainer.appendChild(copyLabel);
        buttonContainer.appendChild(copyCodeBtn);

        if(preElement.parentNode) {
            preElement.parentNode.insertBefore(wrapper, preElement);
            wrapper.appendChild(preElement);
            wrapper.appendChild(buttonContainer);
        } else {
             console.warn("Could not wrap <pre> element, parentNode is null.");
        }
    });

    const copyBtn = aiMessageElement.querySelector('.copy-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const contentToCopyElement = document.getElementById(contentId);
            const textToCopy = (contentToCopyElement?.innerText?.trim()) ? contentToCopyElement.innerText.trim() : data.answer;

            navigator.clipboard.writeText(textToCopy).then(() => {
                showCustomAlert('Copied!', 'The response has been copied to your clipboard.', 'success');
            }).catch(err => {
                console.error('Failed to copy text: ', err);
                showCustomAlert('Copy Failed', 'Could not copy the text.', 'error');
            });
        });
    }

    if (answerContainer && typeof MathJax !== 'undefined' && MathJax.typesetPromise) {
        MathJax.typesetPromise([answerContainer]).catch((err) => console.error("MathJax typeset error:", err));
    }

    scrollToAskTextBottom();
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
async function displayExplanations(explanations) {
    await incrementUsage();
    explanationContainer.innerHTML = '';
    currentExplanations = explanations;
    downloadPdfBtn.classList.remove('hidden');

    explanations.forEach((item, index) => {
        const itemElement = document.createElement('div');
        itemElement.className = 'flashcard'; // Keep the card style
        itemElement.style.animationDelay = `${index * 100}ms`;
        const uniqueIdPrefix = `explain-${index}`; // Unique prefix for element IDs

        // --- TERM SECTION ---
        let termHTML = `
            <div class="explanation-section">
                <div class="explanation-header">
                    <h4 class="explanation-title">Term</h4>
                    <button class="copy-btn copy-inline" data-copy-target="${uniqueIdPrefix}-term-text" title="Copy Term">
                        <i class="fa-regular fa-copy"></i>
                    </button>
                </div>
                <p id="${uniqueIdPrefix}-term-text" class="term">${item.term || 'Untitled Concept'}</p>
            </div>`;

        // --- EXPLANATION SECTION ---
        let explanationHTML = `
            <div class="explanation-section">
                <div class="explanation-header">
                    <h4 class="explanation-title">Explanation</h4>
                    <button class="copy-btn copy-inline" data-copy-target="${uniqueIdPrefix}-explanation-text" title="Copy Explanation">
                        <i class="fa-regular fa-copy"></i>
                    </button>
                </div>
                <p id="${uniqueIdPrefix}-explanation-text" class="base-explanation">${item.explanation || 'No explanation found.'}</p>
            </div>`;

        let contentHTML = '';

        if (item.subject === 'mathematics') {
            // --- MATH-SPECIFIC SECTION ---
            const stepsHTML = (item.process_steps || []).map(step => `<li>${step}</li>`).join('');
            contentHTML = `
                <div class="explanation-section math-section">
                     <div class="explanation-header">
                        <h4 class="explanation-title examples-heading">Process Steps</h4>
                        <button class="copy-btn copy-inline" data-copy-target="${uniqueIdPrefix}-math-steps" title="Copy Steps">
                            <i class="fa-regular fa-copy"></i>
                        </button>
                    </div>
                    <ol id="${uniqueIdPrefix}-math-steps">${stepsHTML}</ol>
                </div>`;
        } else {
            // --- STANDARD LAYOUT SECTIONS ---
            let docExampleHTML = '';
            if (item.document_example) {
                docExampleHTML = `
                    <div class="explanation-section document-example-section">
                         <div class="explanation-header">
                             <h4 class="explanation-title examples-heading">Example from Document</h4>
                             <button class="copy-btn copy-inline" data-copy-target="${uniqueIdPrefix}-doc-example" title="Copy Document Example">
                                <i class="fa-regular fa-copy"></i>
                             </button>
                         </div>
                        <p id="${uniqueIdPrefix}-doc-example">${item.document_example}</p>
                    </div>`;
            }

            let aiExamplesHTML = '';
            if (item.ai_examples) {
                aiExamplesHTML = `
                    <div class="explanation-section ai-examples-section">
                        <h4 class="explanation-title examples-heading">AI Generated Examples</h4>
                        <div class="example-item">
                             <div class="explanation-header">
                                <h5>General</h5>
                                <button class="copy-btn copy-inline" data-copy-target="${uniqueIdPrefix}-ai-general" title="Copy General Example">
                                    <i class="fa-regular fa-copy"></i>
                                </button>
                             </div>
                            <p id="${uniqueIdPrefix}-ai-general">${item.ai_examples.general}</p>
                        </div>
                        <div class="example-item">
                             <div class="explanation-header">
                                <h5>Real-Life Context</h5>
                                <button class="copy-btn copy-inline" data-copy-target="${uniqueIdPrefix}-ai-real" title="Copy Real-Life Example">
                                    <i class="fa-regular fa-copy"></i>
                                </button>
                            </div>
                            <p id="${uniqueIdPrefix}-ai-real">${item.ai_examples.real_life_context}</p>
                        </div>
                        <div class="example-item">
                            <div class="explanation-header">
                                <h5>Filipino Context</h5>
                                <button class="copy-btn copy-inline" data-copy-target="${uniqueIdPrefix}-ai-filipino" title="Copy Filipino Example">
                                    <i class="fa-regular fa-copy"></i>
                                </button>
                            </div>
                            <p id="${uniqueIdPrefix}-ai-filipino">${item.ai_examples.filipino_context}</p>
                        </div>
                        <div class="example-item tagalog-example">
                             <div class="explanation-header">
                                <h5>In Tagalog</h5>
                                <button class="copy-btn copy-inline" data-copy-target="${uniqueIdPrefix}-ai-tagalog" title="Copy Tagalog Example">
                                    <i class="fa-regular fa-copy"></i>
                                </button>
                            </div>
                            <p id="${uniqueIdPrefix}-ai-tagalog">${item.ai_examples.filipino_context_tagalog}</p>
                        </div>
                    </div>`;
            }

            let synonymsHTML = '';
            if (item.synonyms && item.synonyms.length > 0) {
                 const synonymsText = item.synonyms.join(', ');
                 synonymsHTML = `
                    <div class="explanation-section synonyms-section">
                         <div class="explanation-header">
                             <h4 class="explanation-title examples-heading">Synonyms</h4>
                              <button class="copy-btn copy-inline" data-copy-target="${uniqueIdPrefix}-synonyms" title="Copy Synonyms">
                                <i class="fa-regular fa-copy"></i>
                             </button>
                         </div>
                         <p id="${uniqueIdPrefix}-synonyms">${synonymsText}</p>
                         <ul style="display: none;">${item.synonyms.map(s => `<li>${s}</li>`).join('')}</ul>
                    </div>`;
            }
            contentHTML = docExampleHTML + aiExamplesHTML + synonymsHTML;
        }

        // Combine all sections for the card
        itemElement.innerHTML = `
            ${termHTML}
            ${explanationHTML}
            ${contentHTML}
            `;

        explanationContainer.appendChild(itemElement);
    });

    // --- Attach Event Listeners to ALL new copy buttons within the container ---
    explanationContainer.querySelectorAll('.copy-btn.copy-inline').forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.dataset.copyTarget;
            const elementToCopy = document.getElementById(targetId);

            if (!elementToCopy) {
                console.error(`Copy target not found: ${targetId}`);
                return;
            }

            // For the math steps <ol>, extract text content from list items
            let textToCopy;
            if (elementToCopy.tagName === 'OL') {
                textToCopy = Array.from(elementToCopy.querySelectorAll('li'))
                                .map(li => li.textContent.trim())
                                .join('\n'); // Add newline between steps
            } else {
                textToCopy = elementToCopy.innerText || elementToCopy.textContent; // Use innerText or textContent for <p> or <h4>
            }

            navigator.clipboard.writeText(textToCopy.trim()).then(() => {
                showCustomAlert('Copied!', 'Text copied to clipboard.', 'success');
            }).catch(err => {
                console.error('Failed to copy: ', err);
                showCustomAlert('Copy Failed', 'Could not copy text.', 'error');
            });
        });
    });
    // --- End of Event Listener Attachment ---
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
    const remainingText = `Uses Remaining: ${remaining < 0 ? 0 : remaining}/${maxUsage}`;

    usageCountEl.textContent = remainingText;
    usageCountElExplain.textContent = remainingText;
    usageCountSummarizer.textContent = remainingText;
    usageCountAskText.textContent = remainingText;

    usageTracker.classList.remove('hidden');
    usageTrackerExplain.classList.remove('hidden');
    usageTrackerSummarizer.classList.remove('hidden');
    usageTrackerAskText.classList.remove('hidden');

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

        const timerText = `Resets in: ${h}h ${m}m ${s}s`;
        resetTimerEl.textContent = timerText;
        resetTimerElExplain.textContent = timerText;
        resetTimerSummarizer.textContent = timerText;
        resetTimerAskText.textContent = timerText;
    }, 1000);

    // Using admin role from Firestore check now
    if (role === 'verified' || role === 'plus' || role === 'admin') {
        upgradeBtn.classList.add('hidden');
        upgradeNote.classList.add('hidden');
        upgradeNoteExplain.classList.add('hidden');
        upgradeNoteSummarizer.classList.add('hidden');
        upgradeNoteAskText.classList.add('hidden');
    } else {
        upgradeBtn.classList.remove('hidden');
        upgradeNote.classList.remove('hidden');
        upgradeNoteExplain.classList.remove('hidden');
        upgradeNoteSummarizer.classList.remove('hidden');
        upgradeNoteAskText.classList.remove('hidden');
    }
}
    
    // Initial UI update on page load
    onAuthStateChanged(auth, (user) => {
        console.log("Auth state changed. User:", user ? user.email : "No user");
        // Initial UI update on page load, now waits for auth state
        updateUsageUI();
    });
    // --- PDF Download Logic ---
    downloadPdfBtn.addEventListener('click', () => {
    if (currentExplanations.length === 0) {
        showCustomAlert('No Data', 'There is no data to download.');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let y = 15;
    const margin = 10;
    const maxWidth = 180;

    const checkPageBreak = (spaceNeeded) => {
        if (y + spaceNeeded > 280) {
            doc.addPage();
            y = 15;
        }
    };

    doc.setFontSize(18).setFont('helvetica', 'bold').text('File Analysis Report', margin, y);
    y += 15;

    currentExplanations.forEach(item => {
        checkPageBreak(30);
        doc.setFontSize(14).setFont('helvetica', 'bold').text(item.term, margin, y);
        y += 8;

        checkPageBreak(15);
        doc.setFontSize(11).setFont('helvetica', 'normal');
        const explanationLines = doc.splitTextToSize(item.explanation, maxWidth);
        doc.text(explanationLines, margin, y);
        y += (explanationLines.length * 5) + 10;

        if (item.document_example) {
            checkPageBreak(20);
            doc.setFontSize(10).setFont('helvetica', 'bold').text('Example from Document:', margin, y);
            y += 6;
            doc.setFont('helvetica', 'italic');
            const docExampleLines = doc.splitTextToSize(item.document_example, maxWidth);
            doc.text(docExampleLines, margin + 5, y);
            y += (docExampleLines.length * 5) + 10;
        }

        if (item.ai_examples) {
            checkPageBreak(50);
            doc.setFontSize(10).setFont('helvetica', 'bold').text('AI Generated Examples:', margin, y);
            y += 8;
            
            const ai = item.ai_examples;
            doc.setFontSize(11).setFont('helvetica', 'normal');
            
            const addAIText = (title, text) => {
                const fullText = `${title}: ${text}`;
                const lines = doc.splitTextToSize(fullText, maxWidth - 5);
                checkPageBreak(lines.length * 5);
                doc.text(lines, margin + 5, y);
                y += (lines.length * 5) + 5;
            };

            addAIText('General', ai.general);
            addAIText('Real-Life', ai.real_life_context);
            addAIText('Filipino Context', ai.filipino_context);
            doc.setFont('helvetica', 'italic');
            addAIText('In Tagalog', ai.filipino_context_tagalog);
            doc.setFont('helvetica', 'normal');
        }

        if (item.synonyms && item.synonyms.length > 0) {
            checkPageBreak(20);
            doc.setFontSize(10).setFont('helvetica', 'bold').text('Synonyms:', margin, y);
            y += 6;
            doc.setFont('helvetica', 'normal').setFontSize(11);
            const synonymsText = item.synonyms.join(', ');
            const synonymLines = doc.splitTextToSize(synonymsText, maxWidth - 5);
            doc.text(synonymLines, margin + 5, y);
            y += (synonymLines.length * 5) + 5;
        }

        y += 15;
    });

    doc.save('FlipCards-AI-Analysis.pdf');
});
const howItWorksInfo = {
    create: {
        title: 'How to Create Sets',
        content: `<p>This tool instantly converts your study materials into flashcards.</p>
                  <ul>
                      <li><strong>Upload a file:</strong> Supports PDF, PPTX, and DOCX formats.</li>
                      <li><strong>AI Generation:</strong> The AI reads your document and creates a list of terms and definitions.</li>
                      <li><strong>Add to Your Sets:</strong> Once generated, you can click "Add this as Flashcard Set" to save them to your collection.</li>
                  </ul>`
    },
    explain: {
    title: 'How to Analyze a File',
    content: `<p>This smart tool adapts to your study materials. Upload a file containing your lessons, and the AI will provide a tailored analysis to help you learn faster.</p>
              <br>
              <strong>For General Topics (History, Science, etc.):</strong>
              <ul>
                  <li><strong>Detailed Explanations:</strong> Get in-depth summaries of key terms based on your document.</li>
                  <li><strong>Culturally Relevant Examples:</strong> Understand concepts better with examples adapted for a Filipino context, provided in both English and Tagalog.</li>
                  <li><strong>Synonyms:</strong> Expand your vocabulary with a list of related words.</li>
              </ul>
              <strong>For Math Files:</strong>
              <ul>
                  <li><strong>Concept Explanations:</strong> The AI explains the purpose of formulas and theorems from your file.</li>
                  <li><strong>Step-by-Step Process:</strong> Get a clear, sequential guide on how to solve problems or apply the concept.</li>
              </ul>
              <p>After the analysis, you can download the entire output as a PDF for offline review.</p>`
},
    summarizer: {
        title: 'How the Summarizer Works',
        content: `<p>Get the main ideas from a long document quickly.</p>
                  <ul>
                      <li><strong>Upload any document:</strong> Supports PDF, PPTX, and DOCX.</li>
                      <li><strong>AI Summary:</strong> The AI reads the entire text and generates a concise summary highlighting the most important points.</li>
                  </ul>`
    },
    ask: {
        title: 'How to Ask the AI',
        content: `<p>Get answers to visual questions or problems.</p>
                  <ul>
                      <li><strong>Upload an image:</strong> Supports JPG format. Take a picture of a homework question, a diagram, or anything you need help with.</li>
                      <li><strong>AI Response:</strong> The AI will analyze the image and provide a detailed answer or explanation based on what it sees.</li>
                  </ul>`
    },
    'ask-text': {
        title: 'How to Ask the AI (Text)',
        content: `<p>Get answers directly by typing your question.</p>
                  <ul>
                      <li><strong>Enter your question:</strong> Type any academic question, request for explanation, or simple query into the text box.</li>
                      <li><strong>Send to AI:</strong> Click the "Send" button.</li>
                      <li><strong>Get Response:</strong> The AI will process your question and provide a textual answer below. For math problems, it will use LaTeX formatting and provide steps where appropriate.</li>
                  </ul>`
    }
};
howItWorksBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        const info = howItWorksInfo[tab];
        if (info) {
            howItWorksTitle.textContent = info.title;
            howItWorksContent.innerHTML = info.content;
            howItWorksModal.classList.add('visible');
        }
    });
});

howItWorksCloseBtn.addEventListener('click', () => {
    howItWorksModal.classList.remove('visible');
});

howItWorksModal.addEventListener('click', (event) => {
    if (event.target === howItWorksModal) {
        howItWorksModal.classList.remove('visible');
    }
});
function getFileIconClass(mimeType) {
    if (mimeType.includes('pdf')) return 'fa-file-pdf';
    if (mimeType.includes('presentation')) return 'fa-file-powerpoint';
    if (mimeType.includes('word')) return 'fa-file-word';
    return 'fa-file'; // Default icon
}

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
// --- Chat Widget Logic ---
    const chatWidget = document.getElementById('chatWidget');
    const chatToggleBtn = document.getElementById('chatToggleBtn');
    const chatContainer = document.getElementById('chatContainer');
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const chatSendBtn = document.getElementById('chatSendBtn');

chatToggleBtn.addEventListener('click', () => {
    const chatIcon = chatToggleBtn.querySelector('#chatIcon');
    const closeIcon = chatToggleBtn.querySelector('.fa-xmark');
    const isHidden = chatContainer.classList.contains('hidden');

    if (isHidden) {
        // --- OPENING ---
        chatContainer.classList.remove('hidden'); // Show container to start animation
        chatIcon.classList.add('hidden');
        closeIcon.classList.remove('hidden');
    } else {
        // --- CLOSING ---
        chatContainer.classList.add('closing'); // Add class to trigger closing animation
        chatIcon.classList.remove('hidden');
        closeIcon.classList.add('hidden');

        // Listen for the animation to end, then hide the container
        chatContainer.addEventListener('animationend', () => {
            chatContainer.classList.add('hidden');
            chatContainer.classList.remove('closing'); // Clean up class
        }, { once: true }); // Important: listener removes itself after running once
    }
});

    const handleSendMessage = async () => {
        const question = chatInput.value.trim();
        if (!question) return;

        // Disable input while processing
        chatInput.disabled = true;
        chatSendBtn.disabled = true;

        // Display user's message
        const userMessage = document.createElement('div');
        userMessage.className = 'chat-message user-message';
        userMessage.innerHTML = `<p>${question}</p>`;
        chatMessages.appendChild(userMessage);
        chatInput.value = '';
        chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll to bottom

        // Display typing indicator
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'typing-indicator';
        typingIndicator.innerHTML = `
            <svg class="ai-sparkle-icon-typing" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5Z"></path>
              <path d="M4 4l2 2m0-2l-2 2"></path><path d="M18 4l2 2m0-2l-2 2"></path>
              <path d="M4 18l2 2m0-2l-2 2"></path><path d="M18 18l2 2m0-2l-2 2"></path>
            </svg>
            <p>FlipCards AI is typing...</p>`;
        chatMessages.appendChild(typingIndicator);
        chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll to bottom

        try {
            // URL of your deployed Cloud Function
            const CHAT_URL = 'https://chatwithflipcardsai-zpanpdg2va-uc.a.run.app'; // Replace if different
            const response = await fetch(CHAT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question })
            });

            typingIndicator.remove(); // Remove typing indicator

            if (!response.ok) throw new Error('Network response was not ok.');

            const data = await response.json(); // Expecting { answer: "...", actionButton?: { ... } }

            // Create the main AI message bubble
            const aiMessage = document.createElement('div');
            aiMessage.className = 'chat-message ai-message';

            // Create a container for the text part and parse Markdown
            const textContent = document.createElement('div');
            textContent.innerHTML = marked.parse(data.answer); // Use marked.js library
            aiMessage.appendChild(textContent);

            // NEW: Check if actionButton data exists in the response
            if (data.actionButton && data.actionButton.url && data.actionButton.text) {
                // NEW: Create an anchor tag (link) styled as a button
                const actionButton = document.createElement('a');
                actionButton.href = data.actionButton.url;
                actionButton.textContent = data.actionButton.text;
                actionButton.className = 'shop-link-button'; // Class for CSS styling
                actionButton.target = '_blank'; // Open in new tab
                actionButton.rel = 'noopener noreferrer'; // Security best practice

                // NEW: Append the button to the message bubble, below the text
                aiMessage.appendChild(actionButton);
            }

            // Add the complete message bubble (with text and maybe button) to the chat
            chatMessages.appendChild(aiMessage);

        } catch (error) {
            console.error("Chat error:", error);
            typingIndicator.remove(); // Ensure indicator is removed on error too
            // Display an error message in the chat
            const errorMessage = document.createElement('div');
            errorMessage.className = 'chat-message ai-message';
            errorMessage.innerHTML = `<p>Sorry, I'm having trouble connecting right now.</p>`;
            chatMessages.appendChild(errorMessage);
        } finally {
            // Re-enable input fields
            chatInput.disabled = false;
            chatSendBtn.disabled = false;
            chatInput.focus(); // Set focus back to input
            chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll to the latest message
        }
    };

    chatSendBtn.addEventListener('click', handleSendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    });

async function handleGoogleDocImport() {
        // 1. Check if AI is already processing on this tab
        if (aiProcessingState.create) {
            showCustomAlert('Processing...', 'Please wait for the current card set to finish generating.', 'error');
            return;
        }

        try {
            // 2. Load the Google Picker API script (if not already loaded)
            await loadPickerApi();

            // 3. Get a Google OAuth Token (if we don't have one)
            if (!googleAccessToken) {
                console.log("Requesting new Google Auth token...");
                googleAccessToken = await getGoogleAuthToken();
            }
            
            // 4. Create and show the file picker
            console.log("Creating Google Picker...");
            createPicker(googleAccessToken);

        } catch (error) {
            console.error("Google Doc Import Error:", error);
            if (error.code === 'auth/popup-closed-by-user') {
                showCustomAlert('Auth Cancelled', 'You closed the Google Sign-In pop-up. Please try again to connect your Google Account.');
            } else {
                showCustomAlert('Google Auth Error', `Could not sign in with Google: ${error.message}`);
            }
            googleAccessToken = null; // Reset token on error
        }
    }

    /**
     * Dynamically loads the Google 'gapi' script needed for the Picker.
     */
    function loadPickerApi() {
        return new Promise((resolve, reject) => {
            if (pickerApiLoaded) {
                resolve();
                return;
            }
            
            const gapiScript = document.createElement('script');
            gapiScript.src = 'https://apis.google.com/js/api.js';
            gapiScript.async = true;
            gapiScript.defer = true;
            gapiScript.onload = () => {
                // After gapi loads, load the 'picker' module
                gapi.load('picker', () => {
                    console.log('Google Picker API loaded.');
                    pickerApiLoaded = true;
                    resolve();
                });
            };
            gapiScript.onerror = reject;
            document.body.appendChild(gapiScript);
        });
    }

    /**
     * Uses Firebase to trigger a Google Sign-In pop-up and request API scopes.
     */
    async function getGoogleAuthToken() {
        const provider = new GoogleAuthProvider();
        // Add all the scopes we need
        GOOGLE_SCOPES.forEach(scope => provider.addScope(scope));

        try {
            const result = await signInWithPopup(auth, provider);
            const credential = GoogleAuthProvider.credentialFromResult(result);
            if (credential && credential.accessToken) {
                console.log("Successfully got Google OAuth token.");
                return credential.accessToken;
            } else {
                throw new Error("Could not get credential from result.");
            }
        } catch (error) {
            console.error("Error during Google Sign-In:", error);
            throw error; // Re-throw to be caught by handleGoogleDocImport
        }
    }

    /**
     * Builds and displays the Google Picker UI.
     */
    function createPicker(token) {
        // Show only Google Docs
        const view = new google.picker.View(google.picker.ViewId.DOCS);
        view.setMimeTypes("application/vnd.google-apps.document"); 

        const picker = new google.picker.PickerBuilder()
            .setDeveloperKey(GOOGLE_API_KEY)
            .setAppId(GOOGLE_CLIENT_ID.split('-')[0]) // App ID is the numeric part of Client ID
            .setOAuthToken(token)
            .addView(view)
            .setCallback(pickerCallback) // This function will run when user picks a file
            .build();
        picker.setVisible(true);
    }

    /**
     * Callback function that runs after the user selects a file from the Picker.
     */
    async function pickerCallback(data) {
        if (data.action === google.picker.Action.PICKED) {
            const doc = data.docs[0];
            const docId = doc.id;
            const docName = doc.name;
            console.log(`User picked document: ${docName} (ID: ${docId})`);

            try {
                // 1. Fetch the document content using the Docs API
                const docContent = await fetchGoogleDocContent(docId, googleAccessToken);
                // 2. Parse the text from the complex JSON
                const text = parseDocContent(docContent);
                
                if (!text.trim()) {
                    showCustomAlert('Empty Document', 'The selected Google Doc appears to be empty or contains no readable text.');
                    return;
                }
                
                // 3. Process this text using your *existing* file upload function!
                await processExtractedText(text, docName);

            } catch (error) {
                console.error("Error processing picked doc:", error);
                showCustomAlert('Error Reading Doc', `Could not read the selected document: ${error.message}`);
                // If token expired, clear it so we get a new one next time
                if (error.message.includes("401") || error.message.includes("403")) {
                    googleAccessToken = null;
                }
            }
        } else if (data.action === google.picker.Action.CANCEL) {
            console.log('User cancelled the picker.');
        }
    }

    /**
     * Fetches the content of a Google Doc using its ID and an access token.
     */
    async function fetchGoogleDocContent(docId, token) {
        // We only request the 'body' field to get content
        const url = `https://docs.googleapis.com/v1/documents/${docId}?fields=body`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401 || response.status === 403) {
            throw new Error(`Authentication error (${response.status}). Token may be expired.`);
        }
        if (!response.ok) {
            throw new Error(`Google Docs API responded with status: ${response.status}`);
        }
        return await response.json();
    }

    /**
     * Parses the raw JSON from the Google Docs API into plain text.
     */
    function parseDocContent(docJson) {
        let text = '';
        if (!docJson.body || !docJson.body.content) {
            return '';
        }

        // Loop through the 'content' array of the document body
        docJson.body.content.forEach(element => {
            if (element.paragraph) {
                // This is a paragraph element
                element.paragraph.elements.forEach(run => {
                    // 'run' is a piece of text with the same style
                    if (run.textRun && run.textRun.content) {
                        text += run.textRun.content;
                    }
                });
            }
        });
        return text;
    }

    /**
     * WORKAROUND: Converts the extracted text into a File object
     * and sends it to your EXISTING `processFileForFlashcards` function.
     */
    async function processExtractedText(text, fileName) {
        console.log(`Processing extracted text from: ${fileName}`);
        
        // 1. Create a new Blob object from the text
        const textBlob = new Blob([text], { type: 'text/plain' });
        
        // 2. Create a File object from the Blob
        const textFile = new File([textBlob], `${fileName}.txt`, { type: 'text/plain' });

        // 3. Call your *existing* function!
        // This will show the loader, upload the "file", and display flashcards.
        await processFileForFlashcards(textFile);
    }

});