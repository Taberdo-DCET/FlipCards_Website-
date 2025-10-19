// Add these lines at the top of flipai.js
import { auth, db } from './firebaseinit.js';
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

const uploadJpgBtnAsk = document.getElementById('uploadJpgBtnAsk');
    const fileUploadInputAsk = document.getElementById('fileUploadInputAsk');
    const askContainer = document.getElementById('askContainer');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    const usageTrackerAsk = document.getElementById('usageTrackerAsk');
    const usageCountAsk = document.getElementById('usageCountAsk');
    const resetTimerAsk = document.getElementById('resetTimerAsk');
    const upgradeNoteAsk = document.getElementById('upgradeNoteAsk');
    const usageInfoBtnAsk = document.getElementById('usageInfoBtnAsk');

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
    let isAiProcessing = false; // Tracks if an AI request is in progress
    // --- Usage Limit Configuration ---
    const USAGE_LIMITS = {
        default: 5,
        verified: 20,
        plus: 50
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
   [usageInfoBtn, usageInfoBtnExplain, usageInfoBtnSummarizer, usageInfoBtnAsk, usageInfoBtnAskText].forEach(btn => { // <-- ADD usageInfoBtnAskText
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
    uploadJpgBtnAsk.addEventListener('click', () => {
        fileUploadInputAsk.accept = '.jpg, .jpeg';
        fileUploadInputAsk.click();
    });
    fileUploadInputAsk.addEventListener('change', (e) => {
    const file = e.target.files[0];
    // Clear previous results and preview
    imagePreviewContainer.innerHTML = '';
    imagePreviewContainer.classList.add('hidden');

    if (file) {
        // Use FileReader to create a preview
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = document.createElement('img');
            img.src = event.target.result;
            img.alt = "Uploaded question";
            imagePreviewContainer.appendChild(img);
            imagePreviewContainer.classList.remove('hidden');
        }
        reader.readAsDataURL(file);

        // Now, proceed with uploading and processing the file
        processFileForAskAI(file);
    }
});
// --- ASK AI (TEXT) TAB LOGIC ---
    // --- ASK AI (TEXT) TAB LOGIC ---
    askAiTextSendBtn.addEventListener('click', handleSendAskText);
    askAiTextInput.addEventListener('keydown', (e) => { // Use keydown for better modifier key detection
        // Send only if Enter is pressed WITHOUT the Shift key
        if (e.key === 'Enter' && !e.shiftKey && !askAiTextSendBtn.disabled) {
            e.preventDefault(); // Prevent default Enter behavior (like adding a newline)
            handleSendAskText();
        }
        // If Shift + Enter is pressed, the browser's default behavior (add newline) occurs
    });
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
    
    async function handleFileUpload(file, container, fileInfoContainer, url, displayFn, tabId) { // Added tabId parameter
        // --- CHECK PROCESSING STATE ---
        if (aiProcessingState[tabId]) {
            showCustomAlert('Processing...', 'Please wait for the current analysis to complete before starting a new one.', 'error'); // Use 'error' type for visibility
            // Clear the file input value so the same file can be selected again if needed after processing
             switch (tabId) {
                case 'create': fileUploadInput.value = ''; break;
                case 'explain': fileUploadInputExplain.value = ''; break;
                case 'summarizer': fileUploadInputSummarizer.value = ''; break;
                case 'ask': fileUploadInputAsk.value = ''; break;
            }
            return; // Stop execution
        }
        // --- END CHECK ---

        const role = await getUserRole();
        const maxUsage = USAGE_LIMITS[role] || 3;
        const usageData = await getUsageData();

        if (usageData.count >= maxUsage) {
            showCustomAlert('Daily Limit Reached', `You have used all your generations for today. Your limit will reset.`);
            return;
        }

        // --- SET PROCESSING STATE & DISABLE BUTTONS ---
        aiProcessingState[tabId] = true; // Mark as processing
        let buttonsToDisable = [];
        switch (tabId) {
            case 'create':
                buttonsToDisable = [uploadPdfBtn, uploadPptxBtn, uploadDocxBtn];
                break;
            case 'explain':
                buttonsToDisable = [uploadPdfBtnExplain, uploadPptxBtnExplain, uploadDocxBtnExplain];
                break;
            case 'summarizer':
                buttonsToDisable = [uploadPdfBtnSummarizer, uploadPptxBtnSummarizer, uploadDocxBtnSummarizer];
                break;
            case 'ask':
                buttonsToDisable = [uploadJpgBtnAsk];
                break;
        }
        buttonsToDisable.forEach(btn => btn.disabled = true);
        // --- END SET STATE & DISABLE ---

        // Display file info
        if (fileInfoContainer) {
            const iconClass = getFileIconClass(file.type);
            const fileSize = formatBytes(file.size);
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
                 if (tabId !== 'create') {
                     showCustomAlert('Success!', `Your file has been analyzed.`, 'success');
                 }
            } else {
                throw new Error('The AI could not extract any information from this file.');
            }
        } catch (error) {
            console.error('[CLIENT] Detailed error:', error);
            showCustomAlert('Processing Failed', error.message);
            container.innerHTML = ''; // Clear loader on error
        } finally {
            // Clear relevant file input
            // (Keep this clearing logic as is)
             if (fileUploadInput.accept.includes(file.type.split('/')[1])) fileUploadInput.value = '';
            if (fileUploadInputExplain.accept.includes(file.type.split('/')[1])) fileUploadInputExplain.value = '';
            if (fileUploadInputSummarizer.accept.includes(file.type.split('/')[1])) fileUploadInputSummarizer.value = '';
            if (fileUploadInputAsk.accept.includes(file.type.split('/')[1])) fileUploadInputAsk.value = '';

            // --- RESET PROCESSING STATE & RE-ENABLE BUTTONS ---
            aiProcessingState[tabId] = false; // Mark as done processing
            buttonsToDisable.forEach(btn => btn.disabled = false);
            // --- END RESET STATE & RE-ENABLE ---
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
    async function processFileForAskAI(file) {
        // ❗ IMPORTANT: Use the URL for your new askAI function
        const CLOUD_FUNCTION_URL = 'https://askai-zpanpdg2va-uc.a.run.app';
        await handleFileUpload(file, askContainer, null, CLOUD_FUNCTION_URL, displayAskAIResponse);
    }
async function handleSendAskText() {
        // --- CHECK PROCESSING STATE ---
        if (aiProcessingState.askText) {
            showCustomAlert('Processing...', 'Please wait for the current question to be answered before sending another.', 'error');
            return; // Stop execution
        }
        // --- END CHECK ---

        const question = askAiTextInput.value.trim();
        if (!question) {
            showCustomAlert('Input Required', 'Please enter a question.');
            return;
        }

        const role = await getUserRole();
        const maxUsage = USAGE_LIMITS[role] || 3;
        const usageData = await getUsageData();

        if (usageData.count >= maxUsage) {
            showCustomAlert('Daily Limit Reached', `You have used all your generations for today. Your limit will reset.`);
            return;
        }

        // --- SET PROCESSING STATE & DISABLE INPUT/BUTTON ---
        aiProcessingState.askText = true; // Mark as processing
        askAiTextInput.disabled = true;
        askAiTextSendBtn.disabled = true;
        // --- END SET STATE & DISABLE ---

        askTextContainer.innerHTML = `<div class="loader-container"><div class="loader"></div><p>AI is thinking...</p></div>`;

        const CLOUD_FUNCTION_URL = 'https://askaitext-zpanpdg2va-uc.a.run.app';

        try {
            const response = await fetch(CLOUD_FUNCTION_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: question }) // Send as JSON
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'An error occurred asking the AI.');
            }

            const result = await response.json(); // Expect { answer: "..." }
            await displayAskTextResponse(result); // Display the text response

        } catch (error) {
            console.error('[CLIENT] Ask AI Text Error:', error);
            showCustomAlert('Request Failed', error.message);
            askTextContainer.innerHTML = ''; // Clear loader on error
        } finally {
            // --- RESET PROCESSING STATE & RE-ENABLE INPUT/BUTTON ---
            aiProcessingState.askText = false; // Mark as done processing
            askAiTextInput.disabled = false;
            askAiTextSendBtn.disabled = false;
            // --- END RESET STATE & RE-ENABLE ---
            askAiTextInput.value = ''; // Clear input field
            askAiTextInput.focus();
        }
    }
    async function displayAskTextResponse(data) {
        await incrementUsage(); // Increment usage *after* successful response

        askTextContainer.innerHTML = `
            <div class="summary-item">
                <div class="summary-header">
                    <h4 class="summary-heading">AI Response</h4>
                    <button class="copy-btn" data-copy-target="ask-text-answer" title="Copy Response">
                        <i class="fa-regular fa-copy"></i>
                    </button>
                </div>
                <div id="ask-text-answer" class="ask-ai-answer">${marked.parse(data.answer)}</div>
            </div>
        `;

        // Attach event listener to the new copy button
        const copyBtn = askTextContainer.querySelector('.copy-btn');
        copyBtn.addEventListener('click', () => {
            // Get the raw text from the original data to preserve formatting like newlines
            const textToCopy = data.answer;
            navigator.clipboard.writeText(textToCopy).then(() => {
                showCustomAlert('Copied!', 'The response has been copied to your clipboard.', 'success');
            }).catch(err => {
                console.error('Failed to copy text: ', err);
                showCustomAlert('Copy Failed', 'Could not copy the text.', 'error');
            });
        });

        // Tell MathJax to render LaTeX if present
        MathJax.typesetPromise([askTextContainer.querySelector('.ask-ai-answer')]);
    }
async function displayAskAIResponse(data) {
    await incrementUsage();

    // Create HTML for each response, including a copy button
    const allAnswersHTML = data.responses.map((response, index) => `
        <div class="ask-ai-item">
            <div class="ask-ai-header">
                <h4 class="ask-ai-heading">Answer for Question ${response.question_number}</h4>
                <button class="copy-btn" data-copy-index="${index}" title="Copy Answer">
                    <i class="fa-regular fa-copy"></i>
                </button>
            </div>
            <div class="ask-ai-answer">${marked.parse(response.answer)}</div>
        </div>
    `).join('');

    askContainer.innerHTML = allAnswersHTML;

    // Attach event listeners to the new copy buttons
    askContainer.querySelectorAll('.copy-btn').forEach(button => {
        button.addEventListener('click', () => {
            const index = button.dataset.copyIndex;
            // ✨ FIX: Get the original, raw text from the 'data' object
            const textToCopy = data.responses[index].answer; 

            navigator.clipboard.writeText(textToCopy).then(() => {
                showCustomAlert('Copied!', 'The answer has been copied to your clipboard.', 'success');
            }).catch(err => {
                console.error('Failed to copy text: ', err);
                showCustomAlert('Copy Failed', 'Could not copy the text.', 'error');
            });
        });
    });
    
    // Tell MathJax to render LaTeX in the new content
    MathJax.typesetPromise();
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
        itemElement.className = 'flashcard';
        itemElement.style.animationDelay = `${index * 100}ms`;
        
        let contentHTML = '';

        // Check the subject to decide which layout to render
        if (item.subject === 'mathematics') {
            // ----- RENDER MATH-SPECIFIC LAYOUT -----
            const stepsHTML = (item.process_steps || []).map(step => `<li>${step}</li>`).join('');
            contentHTML = `
                <div class="math-section">
                    <h4 class="examples-heading">Process Steps:</h4>
                    <ol>${stepsHTML}</ol>
                </div>`;
        } else {
            // ----- RENDER STANDARD LAYOUT -----
            let docExampleHTML = '';
            if (item.document_example) {
                docExampleHTML = `
                    <div class="document-example-section">
                        <h4 class="examples-heading">Example from the Document:</h4>
                        <p>${item.document_example}</p>
                    </div>`;
            }

            let aiExamplesHTML = '';
            if (item.ai_examples) {
                aiExamplesHTML = `
                    <div class="ai-examples-section">
                        <h4 class="examples-heading">AI Generated Examples:</h4>
                        <div class="example-item">
                            <h5>General</h5>
                            <p>${item.ai_examples.general}</p>
                        </div>
                        <div class="example-item">
                            <h5>Real-Life Context</h5>
                            <p>${item.ai_examples.real_life_context}</p>
                        </div>
                        <div class="example-item">
                            <h5>Filipino Context</h5>
                            <p>${item.ai_examples.filipino_context}</p>
                        </div>
                        <div class="example-item tagalog-example">
                            <h5>In Tagalog</h5>
                            <p>${item.ai_examples.filipino_context_tagalog}</p>
                        </div>
                    </div>`;
            }

            let synonymsHTML = '';
            if (item.synonyms && item.synonyms.length > 0) {
                synonymsHTML = `
                    <div class="synonyms-section">
                        <h4 class="examples-heading">Synonyms:</h4>
                        <ul>
                            ${item.synonyms.map(synonym => `<li>${synonym}</li>`).join('')}
                        </ul>
                    </div>`;
            }
            contentHTML = docExampleHTML + aiExamplesHTML + synonymsHTML;
        }

        itemElement.innerHTML = `
            <div class="term">${item.term || 'Untitled Concept'}</div>
            <div class="definition">
                <p class="base-explanation">${item.explanation || 'No explanation found.'}</p>
                ${contentHTML}
            </div>`;
            
        explanationContainer.appendChild(itemElement);
    });
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

        // --- UPDATE BOTH TABS ---
        usageCountEl.textContent = remainingText;
        usageCountElExplain.textContent = remainingText; // Update explain tab
        usageCountSummarizer.textContent = remainingText; // Update summarizer tab
        usageCountAsk.textContent = remainingText; // Update ask tab
        usageCountAskText.textContent = remainingText;
        usageTracker.classList.remove('hidden');
        usageTrackerExplain.classList.remove('hidden'); // Update explain tab
        usageTrackerSummarizer.classList.remove('hidden'); // Update summarizer tab
        usageTrackerAsk.classList.remove('hidden'); // Update ask tab
        usageTrackerAskText.classList.remove('hidden');

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
            
            const timerText = `Resets in: ${h}h ${m}m ${s}s`;
            // --- UPDATE BOTH TABS ---
            resetTimerEl.textContent = timerText;
            resetTimerElExplain.textContent = timerText; // Update explain tab
            resetTimerSummarizer.textContent = timerText; // Update summarizer tab
            resetTimerAsk.textContent = timerText; // Update ask tab
            resetTimerAskText.textContent = timerText;
        }, 1000);

        // Show/Hide upgrade prompts on both tabs
        if (role === 'verified' || role === 'plus') {
            upgradeBtn.classList.add('hidden');
            upgradeNote.classList.add('hidden');
            upgradeNoteExplain.classList.add('hidden'); // Update explain tab
            upgradeNoteSummarizer.classList.add('hidden'); // Update summarizer tab
            upgradeNoteAsk.classList.add('hidden'); // Update ask tab
            upgradeNoteAskText.classList.add('hidden');
        } else {
            upgradeBtn.classList.remove('hidden');
            upgradeNote.classList.remove('hidden');
            upgradeNoteExplain.classList.remove('hidden'); // Update explain tab
            upgradeNoteSummarizer.classList.remove('hidden'); // Update summarizer tab
            upgradeNoteAsk.classList.remove('hidden'); // Update ask tab
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
});