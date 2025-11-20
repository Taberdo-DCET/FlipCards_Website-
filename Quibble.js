import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { 
    getFirestore, doc, getDoc, collection, getDocs, query, where, 
    addDoc, updateDoc, arrayUnion, onSnapshot, deleteDoc, serverTimestamp,
    setDoc, increment, runTransaction // <-- ADDED THIS
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { getStorage, ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js";
import { db } from "./firebaseinit.js";
import { addXP } from './xpTracker.js';

const storage = getStorage();

// --- DOM Element References ---
const createLobbyBtn = document.getElementById('createLobbyBtn');
const createLobbyModal = document.getElementById('createLobbyModal');
const closeLobbyBtn = document.getElementById('closeLobbyBtn');
const readyBtn = document.getElementById('readyBtn'); 
const selectSetDropdown = document.getElementById('selectSetDropdown');
const selectCardsDropdown = document.getElementById('selectCardsDropdown');
const userInviteList = document.getElementById('userInviteList');
const lobbyModalTitle = document.getElementById('lobbyModalTitle'); 
const lobbyAvatars = document.getElementById('lobbyAvatars'); 
const lobbyScoreboard = document.getElementById('lobbyScoreboard'); 
const mainCardDisplay = document.getElementById('mainCardDisplay');
const mainSetTitle = document.getElementById('mainSetTitle');
const mainTitleContainer = document.getElementById('mainTitleContainer');

const mainSettingsDisplay = document.getElementById('mainSettingsDisplay');
const mainCardCountDisplay = document.getElementById('mainCardCountDisplay');
const mainTimerDisplay = document.getElementById('mainTimerDisplay');
const mainGameModeDisplay = document.getElementById('mainGameModeDisplay');

const cardTextDisplay = document.getElementById('cardTextDisplay');
const definitionLabel = document.getElementById('definitionLabel');
const leaveBtn = document.getElementById('leaveBtn');

const homeBtn = document.getElementById('homeBtn');

// --- Custom Alert Refs ---
const customAlertModal = document.getElementById('customAlertModal');
const customAlertTitle = document.getElementById('customAlertTitle');
const customAlertMessage = document.getElementById('customAlertMessage');
const customAlertOkBtn = document.getElementById('customAlertOkBtn');
const customConfirmModal = document.getElementById('customConfirmModal');
const customConfirmTitle = document.getElementById('customConfirmTitle');
const customConfirmIcon = document.getElementById('customConfirmIcon');
const customConfirmMessage = document.getElementById('customConfirmMessage');
const customConfirmCancelBtn = document.getElementById('customConfirmCancelBtn');
const customConfirmOkBtn = document.getElementById('customConfirmOkBtn');

// --- Ready Confirm Refs ---
const readyConfirmModal = document.getElementById('readyConfirmModal');
const confirmReadyBtn = document.getElementById('confirmReadyBtn');
const cancelReadyBtn = document.getElementById('cancelReadyBtn');
const modalCloseX = document.getElementById('modalCloseX');
const userSearchInput = document.getElementById('userSearchInput');
const modalPlayerList = document.getElementById('modalPlayerList');

const chatMessages = document.getElementById('mainChatMessages');
const chatInput = document.getElementById('mainChatInput');
const sendChatBtn = document.getElementById('mainSendChatBtn');
const startBtn = document.getElementById('startBtn');

const selectSetModal = document.getElementById('selectSetModal');
const modalCloseXSet = document.getElementById('modalCloseXSet');
const selectSetButton = document.getElementById('selectSetButton');
const selectedSetSpan = document.getElementById('selectedSetSpan');
const setSearchInput = document.getElementById('setSearchInput');
const setListContainer = document.getElementById('setListContainer');
const selectTimerDropdown = document.getElementById('selectTimerDropdown');
let modalSelectedSetId = null; // <-- NEW State
const timerBarContainer = document.getElementById('timerBarContainer');
const timerBar = document.getElementById('timerBar');
const lobbyStatusBox = document.getElementById('lobbyStatusBox'); // <-- ADD THIS
const lobbyStatusOpenBtn = document.getElementById('lobbyStatusOpenBtn');

const sidenavOptionsBtn = document.getElementById('sidenavOptionsBtn');
const sidenavOptionsMenu = document.getElementById('sidenavOptionsMenu');

const openQuibbleAssistantBtn = document.getElementById('openQuibbleAssistantBtn');
const aiChatContainer = document.getElementById('aiChatContainer');
const aiChatMessages = document.getElementById('aiChatMessages');
const aiChatInput = document.getElementById('aiChatInput');
const aiChatSendBtn = document.getElementById('aiChatSendBtn');

const endGameModal = document.getElementById('endGameModal');
const endGameTitle = document.getElementById('endGameTitle');
const endGameWinnerMessage = document.getElementById('endGameWinnerMessage');
const endGameScoreboard = document.getElementById('endGameScoreboard');

const pauseGameBtn = document.getElementById('pauseGameBtn');

const infoGameBtn = document.getElementById('infoGameBtn');
const infoModal = document.getElementById('infoModal');
const infoModalCloseBtn = document.getElementById('infoModalCloseBtn');

const tutorialGameBtn = document.getElementById('tutorialGameBtn');
const tutorialModal = document.getElementById('tutorialModal');
const tutorialModalCloseBtn = document.getElementById('tutorialModalCloseBtn');
const tutorialSidenavBtns = document.querySelectorAll('.tutorial-nav-btn');
const tutorialContentPages = document.querySelectorAll('.tutorial-page');

const selectGameModeDropdown = document.getElementById('selectGameModeDropdown');
const choiceContainer = document.getElementById('choiceContainer');

// --- Lobby State ---
let currentLobbyId = null; 
window.hostLobbyId = null;
let allUsers = []; // <-- ADD THIS
let hostUsername = "Host"; 
let hostEmail = null; 
let lobbyListener = null; 
let allFlashcardSets = []; // <-- NEW: To store set data
window.previousPlayerEmails = new Set(); // <-- ADD THIS
window.gameLoopId = null;
window.currentNormalizedAnswer = "";
let lastPlayersJSON = "";
// --- Modal Controls ---

// --- UPDATED: createLobbyBtn Listener ---
// This button NOW creates the lobby
createLobbyBtn.addEventListener('click', async () => {
    if (currentLobbyId) {
        if (!createLobbyModal.classList.contains('visible')) {
            // Only show alert if modal is closed
            showCustomAlert("You are already in a lobby.");
        }
        // Just open the modal if lobby already exists
        createLobbyModal.classList.add('visible');
        return;
    }
    
    if (allFlashcardSets.length === 0) {
        showCustomAlert("Set list is still loading, please try again in a moment.");
        return;
    }

    // --- Create Lobby Immediately ---
    createLobbyBtn.disabled = true; // Prevent spam

    try {
        // Use the *first* set in the list as a default
        const defaultSet = allFlashcardSets[0];
        const defaultCardCount = defaultSet.cardCount >= 5 ? 5 : defaultSet.cardCount;

        const lobbyRef = await addDoc(collection(db, "quibble_lobbies"), {
            host: { email: hostEmail, username: hostUsername },
            setId: defaultSet.id,
            setTitle: defaultSet.title,
            cardCount: defaultCardCount,
            status: "waiting",
            timer: 5,
            gameMode: "test",
            players: [
                { email: hostEmail, username: hostUsername, score: 0, isReady: false } // Host starts NOT ready
            ],
            playerEmails: [hostEmail],
            invited: [],
            chat: [],
            currentQuestionAnswers: [],
            createdAt: new Date()
        });

        currentLobbyId = lobbyRef.id; 
        window.hostLobbyId = currentLobbyId;
        lastPlayersJSON = "";

        // 2. Update the modal UI
        lobbyModalTitle.textContent = "Lobby Settings";
        createLobbyBtn.innerHTML = '<i class="fa-solid fa-gear"></i> Configure Lobby'; // <-- ADD THIS
        
        // 3. Start listening to this lobby
        listenToLobby(currentLobbyId);
        
        // 4. Load users available for invite
        loadUsersForLobby(); // Now we call this
        
        // 5. Open the modal
        createLobbyModal.classList.add('visible');

    } catch (e) {
        console.error("Error creating lobby: ", e);
        showCustomAlert("Could not create lobby.");
    }

    createLobbyBtn.disabled = false; // Re-enable button
});


// --- UPDATED: closeLobbyBtn Listener ---
closeLobbyBtn.addEventListener('click', async () => { 
    if (currentLobbyId) {
        // If a lobby exists, delete it from Firestore
        try {
            await deleteDoc(doc(db, "quibble_lobbies", currentLobbyId));
            console.log("Lobby deleted successfully.");
        } catch (e) {
            console.error("Error deleting lobby: ", e);
        }
    }
    
    // Reset local state and UI regardless of deletion success
    currentLobbyId = null;
    window.hostLobbyId = null;
    createLobbyBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Create Lobby'; // <-- ADD THIS
    if (lobbyListener) {
        lobbyListener(); // Unsubscribe from listener
        lobbyListener = null;
    }
    mainTitleContainer.style.display = 'none'; // <-- CHANGE THIS
    mainSettingsDisplay.style.display = 'none';
    mainSetTitle.textContent = "";
    mainCardDisplay.textContent = "Create Lobby for game to start...";
    lobbyScoreboard.innerHTML = `<li><span>${hostUsername}</span> <strong>0</strong></li>`;
    lobbyAvatars.innerHTML = `<div class="avatar-circle"></div>`;
    // Reset modal to its original state
    lobbyModalTitle.textContent = "Create Lobby";
    readyBtn.disabled = false;
    selectSetButton.disabled = false; // <-- This was missing, adding it.
    selectCardsDropdown.disabled = false;
    selectTimerDropdown.disabled = false; // <-- ADD THIS
    selectTimerDropdown.value = "5";

    readyBtn.innerHTML = '<i class="fa-solid fa-check"></i> I\'m Ready';
    readyBtn.classList.add('ready-btn');

    // Reset invite buttons in the list
    userInviteList.querySelectorAll('.invite-btn').forEach(btn => {
        btn.disabled = false;
        btn.textContent = '+';
    });

    // Hide the modal
    createLobbyModal.classList.remove('visible');
    if (homeBtn) homeBtn.disabled = false;
    startBtn.disabled = true;
    if (gameLoopId) {
        cancelAnimationFrame(gameLoopId);
        gameLoopId = null;
    }
});

createLobbyModal.addEventListener('click', (event) => {
    if (event.target === createLobbyModal) {
        createLobbyModal.classList.remove('visible');
    }
});

// --- NEW: X Button Closes Modal (no delete) ---
modalCloseX.addEventListener('click', () => {
    createLobbyModal.classList.remove('visible');
});

// --- Custom Alert Function ---
function showCustomAlert(title, message) {
    customAlertTitle.textContent = title;
    customAlertMessage.textContent = message;
    customAlertModal.classList.add('visible');
}
customAlertOkBtn.addEventListener('click', () => {
    customAlertModal.classList.remove('visible');
});
customAlertModal.addEventListener('click', (event) => {
    if (event.target === customAlertModal) {
        customAlertModal.classList.remove('visible');
    }
});
function showCustomConfirm(title, message, onConfirmCallback) {
    customConfirmTitle.textContent = title;
    customConfirmMessage.textContent = message;
    
    // Set icon based on title
    if (title.toLowerCase().includes("close") || title.toLowerCase().includes("leave")) {
        customConfirmIcon.className = "fa-solid fa-arrow-right-from-bracket modal-info-icon";
    } else {
        customConfirmIcon.className = "fa-solid fa-circle-question modal-info-icon";
    }

    customConfirmModal.classList.add('visible');

    // Use .onclick to replace any previous listeners
    customConfirmCancelBtn.onclick = () => {
        customConfirmModal.classList.remove('visible');
    };
    
    customConfirmOkBtn.onclick = () => {
        customConfirmModal.classList.remove('visible');
        onConfirmCallback();
    };

    // Use .onclick for overlay to ensure it's a fresh listener
    customConfirmModal.onclick = (event) => {
        if (event.target === customConfirmModal) {
            customConfirmModal.classList.remove('visible');
        }
    };
}
// --- Ready Confirmation Function ---
function showReadyConfirmation(onConfirmCallback) {
    readyConfirmModal.classList.add('visible');

    cancelReadyBtn.onclick = () => {
        readyConfirmModal.classList.remove('visible');
    };
    
    confirmReadyBtn.onclick = () => {
        readyConfirmModal.classList.remove('visible');
        onConfirmCallback(); // Run the logic that was passed in
    };
}
readyConfirmModal.addEventListener('click', (event) => {
    if (event.target === readyConfirmModal) {
        readyConfirmModal.classList.remove('visible');
    }
});


// --- Get Current User Info ---
// --- Get Current User Info ---
const auth = getAuth();
auth.onAuthStateChanged(user => {
    if (user) {
        hostEmail = user.email;
        if (homeBtn) homeBtn.disabled = true;
        // First, get the username
        getDoc(doc(db, "usernames", user.email)).then(async usernameSnap => {
            if (usernameSnap.exists()) {
                hostUsername = usernameSnap.data().username;
            } else {
                hostUsername = user.email.split('@')[0];
            }

            // --- NEW: Check for existing lobby ---
            const lobbiesRef = collection(db, "quibble_lobbies");
            const q = query(lobbiesRef, where("host.email", "==", hostEmail));
            
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                // A lobby hosted by this user already exists
                const lobbyDoc = querySnapshot.docs[0];
                const lobbyData = lobbyDoc.data(); // <-- Get lobby data
                currentLobbyId = lobbyDoc.id;
                window.hostLobbyId = currentLobbyId;
                lastPlayersJSON = "";
                
                console.log("Existing lobby found:", currentLobbyId);
                
                // Update UI to reflect existing lobby
                createLobbyBtn.innerHTML = '<i class="fa-solid fa-gear"></i> Configure Lobby';
                mainSetTitle.textContent = lobbyData.setTitle; 
                mainTitleContainer.style.display = 'block'; 

                // --- NEW: Populate Main Settings ---
                mainSettingsDisplay.style.display = 'flex';
                mainCardCountDisplay.textContent = lobbyData.cardCount;
                mainTimerDisplay.textContent = lobbyData.timer || "5";
                mainGameModeDisplay.textContent = (lobbyData.gameMode === 'learn') ? "Learn Mode" : "Test Mode"; // <-- ADD
                // --- END NEW ---
                
                listenToLobby(currentLobbyId); // Start listening for updates
                loadUsersForLobby(); // Load users for inviting
            
            } else {
                // No existing lobby, set default UI
                console.log("No existing lobby found for this host.");
                if (homeBtn) homeBtn.disabled = false;
                mainTitleContainer.style.display = 'none';
                mainSettingsDisplay.style.display = 'none';
                mainSetTitle.textContent = ""; 
                cardTextDisplay.textContent = "Waiting for game to start..."; // <-- THIS IS THE FIX
                lobbyScoreboard.innerHTML = `<li><span>${hostUsername}</span> <strong>0</strong></li>`;
                
                // --- NEW: Fetch host avatar for default UI ---
                const avatar = document.createElement('div');
                avatar.className = 'avatar-circle';
                const avatarRef = ref(storage, `avatars/${hostEmail}`);
                getDownloadURL(avatarRef)
                    .then(url => {
                        avatar.style.backgroundImage = `url(${url})`;
                    })
                    .catch(err => {
                        console.warn(`No avatar found for ${hostEmail}`);
                    });
                lobbyAvatars.innerHTML = ''; // Clear
                lobbyAvatars.appendChild(avatar);
                // --- END NEW ---
                startBtn.disabled = true;
            }
            
            // Load sets for the dropdown regardless of lobby status
            loadSetsForLobby(); 

        }).catch(err => {
            console.error("Error in auth/lobby check:", err);
        });
    }
});

// --- REPLACED: readyBtn Listener ---
// This button NOW toggles ready status and locks/unlocks settings
// --- REPLACED: readyBtn Listener ---
// This button NOW toggles ready status and locks/unlocks settings
readyBtn.addEventListener('click', async () => {
    // --- UPDATED: Read from variables/dropdowns ---
    const setId = modalSelectedSetId; // <-- CHANGED
    const cardCount = selectCardsDropdown.value;
    const setTitle = selectedSetSpan.textContent; // <-- CHANGED

    if (!setId && !currentLobbyId) {
        showCustomAlert("Please select a set.");
        return;
    }

    readyBtn.disabled = true; // Disable button to prevent spam

    try {
        if (!currentLobbyId) {
            // --- Path 1: Create Lobby ---
            // This path is no longer used since createLobbyBtn creates the lobby.
            // This 'if' block will be skipped.
            // We'll keep the 'else' block which is now the main logic.
            
        } else {
            // --- Path 2: Toggle Ready Status ---
            const lobbyRef = doc(db, "quibble_lobbies", currentLobbyId);
            const lobbySnap = await getDoc(lobbyRef);
            if (!lobbySnap.exists()) {
                showCustomAlert("Lobby not found.");
                readyBtn.disabled = false;
                return;
            }
            
            const lobbyData = lobbySnap.data();
            const hostPlayer = lobbyData.players.find(p => p.email === hostEmail);

            if (hostPlayer.isReady) {
                // --- User wants to UN-READY ---
                const updatedPlayers = lobbyData.players.map(p => {
                    if (p.email === hostEmail) p.isReady = false;
                    return p;
                });
                await updateDoc(lobbyRef, { players: updatedPlayers });
                // Listener will update UI
            
            } else {
                // --- User wants to RE-READY ---
                // Show confirmation modal
                showReadyConfirmation(async () => {
                    const updatedPlayers = lobbyData.players.map(p => {
                        if (p.email === hostEmail) p.isReady = true;
                        return p;
                    });

                    // Update ONLY the ready status
                    await updateDoc(lobbyRef, { 
                        players: updatedPlayers
                    });
                    // Listener will update UI
                });
            }
        }
    } catch (e) {
        console.error("Error in ready button logic:", e);
        showCustomAlert("An error occurred.");
    }
    
    readyBtn.disabled = false; // Re-enable button
});


// --- Firestore Functions ---

// --- UPDATED: loadSetsForLobby Function ---
async function loadSetsForLobby() {
    try {
        const setsCollection = collection(db, "flashcard_sets");
        const querySnap = await getDocs(setsCollection);

        if (querySnap.empty) {
            console.error("No flashcard sets found in database.");
            allFlashcardSets = [];
        }

        allFlashcardSets = []; // Clear previous
        querySnap.forEach(doc => {
            const setData = doc.data();
            const setId = doc.id;
            const cardCount = setData.flashcards ? setData.flashcards.length : 0;
            const title = setData.title || "Untitled Set";
            const description = setData.description || "No description"; // <-- ADD THIS
            
            // Save to global array
            allFlashcardSets.push({
                id: setId,
                title: title,
                description: description, // <-- ADD THIS
                cardCount: cardCount,
                searchKey: title.toLowerCase() 
            });
        });
        
        // --- NEW: Enable the create lobby button ---
        // --- NEW: Enable the create lobby button ---
        // Only enable if the user is not a guest in another lobby
        if (hostEmail) {
            const guestQuery = query(collection(db, "quibble_lobbies"), where("playerEmails", "array-contains", hostEmail));
            const guestSnap = await getDocs(guestQuery);
            
            // Check if user is a guest (in a lobby, but not the host of it)
            const isGuest = !guestSnap.empty && guestSnap.docs[0].data().host.email !== hostEmail;

            if (!isGuest) {
                createLobbyBtn.disabled = false;
                if (!currentLobbyId) {
                    // Only reset text if no lobby is loaded
                    createLobbyBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Create Lobby';
                }
            }
        }

    } catch (error) {
        console.error("Error loading flashcard sets:", error);
        
        // --- NEW: Update button on error ---
        createLobbyBtn.innerHTML = '<i class="fa-solid fa-xmark"></i> Load Error';
    }
}
// --- NEW: Renders the SET list based on filter ---
function renderSetList(filter = "") {
    setListContainer.innerHTML = ''; // Clear the list
    
    const searchTerm = filter.toLowerCase();
    
    // Filter the global allFlashcardSets array
    const filteredSets = allFlashcardSets.filter(set => set.searchKey.includes(searchTerm));
    
    if (filteredSets.length === 0) {
        setListContainer.innerHTML = '<p>No sets match your search.</p>';
        return;
    }

    filteredSets.forEach(set => {
        const setItem = document.createElement('div');
        setItem.className = 'set-list-item';
        // --- UPDATED HTML STRUCTURE ---
        setItem.innerHTML = `
            <div class="set-info">
                <span class="set-title">${set.title}</span>
                <p class="set-description">${set.description}</p>
            </div>
            <small class="set-count">${set.cardCount} cards</small>
        `;
        // --- END UPDATED HTML ---
        
        // Add click listener
        
        // Add click listener
        setItem.addEventListener('click', async () => { // <-- 1. Add async
            // 1. Update the button text
            selectedSetSpan.textContent = set.title;
            
            // 2. Store the ID
            modalSelectedSetId = set.id;

            // 3. Populate the card count dropdown
            populateCardsDropdown(set.id);

            // 4. Close the modal
            selectSetModal.classList.remove('visible');

            // --- 5. NEW: Immediately update Firestore ---
            if (currentLobbyId) {
                try {
                    const lobbyRef = doc(db, "quibble_lobbies", currentLobbyId);
                    await updateDoc(lobbyRef, {
                        setId: set.id,
                        setTitle: set.title,
                        // Also reset card count to a valid default for the new set
                        cardCount: parseInt(selectCardsDropdown.value, 10) 
                    });
                } catch (e) {
                    console.error("Error updating set:", e);
                }
            }
            // --- END NEW ---
        });

        setListContainer.appendChild(setItem);
    });
}
// --- UPDATED: populateCardsDropdown Function ---
function populateCardsDropdown(selectedSetId) {
    const selectedSet = allFlashcardSets.find(set => set.id === selectedSetId);
    
    if (!selectedSet) {
        selectCardsDropdown.innerHTML = '<option value="">Select a set</option>';
        return;
    }

    const cardCount = selectedSet.cardCount;
    selectCardsDropdown.innerHTML = ''; 
    if (cardCount === 0) {
        selectCardsDropdown.innerHTML = '<option value="0">0 cards</option>';
        return;
    }
    for (let i = 5; i <= cardCount; i += 5) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `${i} cards`;
        selectCardsDropdown.appendChild(option);
    }
    if (cardCount % 5 !== 0 && cardCount > (selectCardsDropdown.options.length * 5) ) {
        const option = document.createElement('option');
        option.value = cardCount;
        option.textContent = `${cardCount} cards (All)`;
        selectCardsDropdown.appendChild(option);
    }
}
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
async function loadUsersForLobby() {
    try {
        // --- NEW: Step 1: Fetch all usernames for lookup ---
        const usernameSnap = await getDocs(collection(db, "usernames"));
        const usernameMap = new Map();
        usernameSnap.forEach(doc => {
            usernameMap.set(doc.id, doc.data()); // Key: email, Value: {username: "..."}
        });

        // --- Step 2: Fetch all approved emails ---
        const emailsCollection = collection(db, "approved_emails");
        const querySnap = await getDocs(emailsCollection);

        if (querySnap.empty) {
            userInviteList.innerHTML = '<p>No users found to invite.</p>';
            return;
        }

        allUsers = []; // Clear the array
        querySnap.forEach(emailDoc => { 
            const userEmail = emailDoc.id; // Email is the document ID

            if (hostEmail && userEmail === hostEmail) { 
                return; // Don't add host to the list
            }
            
            // --- NEW: Step 3: Apply display logic ---
            const usernameData = usernameMap.get(userEmail);
            // If username exists use it, otherwise use email prefix
            const username = usernameData ? usernameData.username : userEmail.split('@')[0];
            // For searching, only use the username if it exists
            const searchName = usernameData ? usernameData.username : "";

            // Push to global array
            allUsers.push({
                email: userEmail,
                username: username,
                // Create a single string to search against
                searchKey: `${searchName.toLowerCase()} ${userEmail.toLowerCase()}`.trim()
            });
        });
        
        renderUserList(); // Call render function

    } catch (error) {
        console.error("Error loading users:", error);
        userInviteList.innerHTML = '<p>Error loading users.</p>';
    }
}
// --- NEW: Renders the user list based on filter ---
function renderUserList(filter = "") {
    userInviteList.innerHTML = ''; // Clear the list
    
    const searchTerm = filter.toLowerCase();
    
    // Filter the global allUsers array
    const filteredUsers = allUsers.filter(user => user.searchKey.includes(searchTerm));
    
    if (filteredUsers.length === 0) {
        userInviteList.innerHTML = '<p>No users match your search.</p>';
        return;
    }

    // Get the current lobby state to set button status
    const lobbyData = window.currentLobbyDataForRender || { players: [], invited: [] };
    const playerEmails = lobbyData.players.map(p => p.email);
    const invitedEmails = lobbyData.invited || [];

    filteredUsers.forEach(user => {
        const userItem = document.createElement('div');
        userItem.className = 'user-invite-item';
        userItem.innerHTML = `
            <span class="username">${user.username}</span>
            <button class="invite-btn" data-email="${user.email}" data-username="${user.username}">+</button>
        `;

        const inviteButton = userItem.querySelector('.invite-btn');

        // --- NEW: Check status immediately on render ---
        if (playerEmails.includes(user.email) || invitedEmails.includes(user.email)) {
            inviteButton.textContent = '✓';
            inviteButton.disabled = true;
        }
        
        inviteButton.addEventListener('click', async (e) => {
            if (!currentLobbyId) {
                showCustomAlert("Please create the lobby first.");
                return;
            }

            const button = e.target;
            const emailToInvite = button.dataset.email;
            
            try {
                const lobbyRef = doc(db, "quibble_lobbies", currentLobbyId);
                await updateDoc(lobbyRef, {
                    invited: arrayUnion(emailToInvite) 
                });
                
                // The listenToLobby snapshot will handle the UI update

            } catch (err) {
                console.error("Error sending invite: ", err);
                showCustomAlert("Could not send invite."); 
            }
        });

        userInviteList.appendChild(userItem);
    });
}

// --- UPDATED: listenToLobby Function ---
function listenToLobby(lobbyId) {
    if (lobbyListener) {
        lobbyListener(); 
    }
    
    // Cancel any previous game loop
    if (gameLoopId) {
        cancelAnimationFrame(gameLoopId);
        gameLoopId = null;
    }

    lobbyListener = onSnapshot(doc(db, "quibble_lobbies", lobbyId), (docSnap) => {
        if (homeBtn) homeBtn.disabled = true;
        if (!docSnap.exists()) {
            console.error("Lobby no longer exists.");
            if (lobbyListener) lobbyListener();
            if (homeBtn) homeBtn.disabled = false;
            showCustomAlert("The lobby has been closed by the host.");

            createLobbyBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Create Lobby';
            currentLobbyId = null;
            window.hostLobbyId = null;
            
            mainTitleContainer.style.display = 'none';
            mainSettingsDisplay.style.display = 'none';

            if (gameLoopId) {
                cancelAnimationFrame(gameLoopId);
                gameLoopId = null;
            }
            
            setTimeout(() => window.location.reload(), 2000);
            return;
        }

        const lobbyData = docSnap.data();
        const amIHost = hostEmail === lobbyData.host.email;
    if (pauseGameBtn) {
        pauseGameBtn.disabled = !amIHost;
    }
        window.currentLobbyDataForRender = lobbyData;
if (hostEmail !== lobbyData.host.email && lobbyStatusBox && lobbyStatusOpenBtn) { 
            if (lobbyData.status === 'countdown' || lobbyData.status === 'question') {
                // Game is in progress, hide the mini-modal and its open button
                lobbyStatusBox.classList.remove('visible');
                lobbyStatusBox.classList.add('collapsed'); 
                lobbyStatusOpenBtn.classList.remove('visible');
            } else if (lobbyData.status === 'waiting') {
                // Game is waiting, show the mini-modal (if not collapsed)
                lobbyStatusBox.classList.add('visible');
                // The 'open' button visibility is handled by its own listener
            }
        }
        // --- Game State Handling ---
        // Cancel previous loop before starting a new one
        if (gameLoopId) cancelAnimationFrame(gameLoopId);
if (lobbyData.status === 'waiting' && lobbyData.gamePhase === 'ended') {
            endGameModal.classList.add('visible');
            renderEndGameScoreboard(lobbyData.players);
            renderEndGameControls(lobbyData);
            
            // Stop processing, we are in the end-game screen
            return; 
        } else {
            // If not in end-game, make sure modal is hidden
            endGameModal.classList.remove('visible'); 
        }
        // --- NEW: Handle Game Mode UI (for Host AND Guest) ---
    if (lobbyData.gameMode === 'learn') {
            chatInput.disabled = false;
            chatInput.placeholder = "Type a message...";
            sendChatBtn.disabled = false;
        } else {
        // Test Mode
        chatInput.disabled = false;
        chatInput.placeholder = "Type your answer...";
        sendChatBtn.disabled = false;
        choiceContainer.classList.add('hidden'); // Hide choices in test mode
    }
    // --- END NEW ---
        try {
            if (lobbyData.status === 'countdown') {
                handleCountdown(lobbyData);
                if (pauseGameBtn) pauseGameBtn.innerHTML = '<i class="fa-solid fa-pause"></i>'; // Icon only
            } else if (lobbyData.status === 'question') {
                handleShowQuestion(lobbyData);
                if (pauseGameBtn) pauseGameBtn.innerHTML = '<i class="fa-solid fa-pause"></i>'; // Icon only
                } else if (lobbyData.status === 'paused') {
            // Game is Paused
            if (gameLoopId) cancelAnimationFrame(gameLoopId);
            gameLoopId = null;

            mainTitleContainer.style.display = 'block';
            definitionLabel.style.display = 'block';
            definitionLabel.textContent = 'PAUSED';
            cardTextDisplay.textContent = 'Game Paused';
            cardTextDisplay.className = '';
            timerBarContainer.style.opacity = '1';

            // Show remaining time on timer bar
            if (lobbyData.pauseState && lobbyData.timer) {
                const remainingRatio = lobbyData.pauseState.remainingTime / (lobbyData.timer * 1000);
                timerBar.style.width = `${Math.max(0, remainingRatio * 100)}%`;
            }
if (lobbyData.gameMode === 'learn') {
                    choiceContainer.classList.remove('hidden'); 
                    const choiceButtons = choiceContainer.querySelectorAll('.choice-btn');
                    choiceButtons.forEach(btn => {
                        btn.disabled = true; // Disable all buttons
                    });
                }
            if (pauseGameBtn) pauseGameBtn.innerHTML = '<i class="fa-solid fa-play"></i>'; // Icon only
        // --- END ADD ---
            } else {
                // Default "waiting" state
                if (pauseGameBtn) pauseGameBtn.innerHTML = '<i class="fa-solid fa-pause"></i>'; // Icon only
                mainTitleContainer.style.display = 'block'; 
                mainSetTitle.textContent = lobbyData.setTitle;
                mainSettingsDisplay.style.display = 'flex';
                mainCardCountDisplay.textContent = lobbyData.cardCount;
                mainTimerDisplay.textContent = lobbyData.timer || "5";
                mainGameModeDisplay.textContent = (lobbyData.gameMode === 'learn') ? "Learn Mode" : "Test Mode";

                const lobbyHostPlayer = lobbyData.players.find(p => p.email === lobbyData.host.email);

                if (lobbyHostPlayer && lobbyHostPlayer.isReady) {
                    cardTextDisplay.textContent = "Waiting for players to ready up...";
                } else if (lobbyHostPlayer && !lobbyHostPlayer.isReady) {
                    cardTextDisplay.textContent = "Host is configuring settings...";
                } else {
                    cardTextDisplay.textContent = "Waiting for host...";
                }
                cardTextDisplay.className = ''; // Ensure no countdown styles
                timerBarContainer.style.opacity = '0'; // Hide timer bar
                definitionLabel.style.display = 'none';
                choiceContainer.classList.add('hidden');
                
            }
        } catch (e) {
            console.error("Error in game loop:", e);
        }

        // --- Modal & UI Updates (Run in parallel to game state) ---
        
        modalSelectedSetId = lobbyData.setId;
        selectedSetSpan.textContent = lobbyData.setTitle;
        
        populateCardsDropdown(lobbyData.setId);
        selectCardsDropdown.value = lobbyData.cardCount;
        selectTimerDropdown.value = lobbyData.timer || "5"; 
        selectGameModeDropdown.value = lobbyData.gameMode || "test";

// --- NEW: Only re-render if players changed ---
        const currentPlayersJSON = JSON.stringify(lobbyData.players);
        
        if (currentPlayersJSON !== lastPlayersJSON) {
            lastPlayersJSON = currentPlayersJSON;

            // 1. Render Scoreboard
            lobbyScoreboard.innerHTML = '';
            if (lobbyData.players && lobbyData.players.length > 0) {
                lobbyData.players.forEach(player => {
                    const li = document.createElement('li');
                    const readyIcon = player.isReady ? 
                        '<i class="fa-solid fa-circle-check" style="color: #4ade80;"></i>' : 
                        '<i class="fa-solid fa-circle-xmark" style="color: #999;"></i>';
                    li.innerHTML = `<span>${readyIcon} ${player.username}</span> <strong>${player.score}</strong>`;
                    lobbyScoreboard.appendChild(li);
                });
            } else {
                lobbyScoreboard.innerHTML = '<li class="empty-slot">Waiting for players...</li>';
            }

            // 2. Render Avatars & Modal List
           // 2. Render Avatars (SMART UPDATE - Prevents Flicker)
            // We do NOT clear lobbyAvatars.innerHTML here.
            
            // Always clear modal list (it's hidden usually, so flicker doesn't matter there)
            modalPlayerList.innerHTML = ''; 
            
            const currentAvatarIds = new Set();

            if (lobbyData.players) {
                lobbyData.players.forEach(player => {
                    // --- A. SIDEBAR AVATARS (Smart Logic) ---
                    // Create a safe ID for the element based on email
                    const safeEmailId = player.email.replace(/[^a-zA-Z0-9]/g, '');
                    const avatarElementId = `sidebar-avatar-${safeEmailId}`;
                    currentAvatarIds.add(avatarElementId);

                    let sidebarAvatar = document.getElementById(avatarElementId);

                    // If avatar doesn't exist yet, create it and fetch image
                    if (!sidebarAvatar) {
                        sidebarAvatar = document.createElement('div');
                        sidebarAvatar.className = 'avatar-circle';
                        sidebarAvatar.id = avatarElementId;
                        lobbyAvatars.appendChild(sidebarAvatar);

                        // Only fetch the image URL once when creating
                        const avatarRef = ref(storage, `avatars/${player.email}`);
                        getDownloadURL(avatarRef)
                            .then(url => {
                                sidebarAvatar.style.backgroundImage = `url(${url})`;
                            })
                            .catch(err => { /* Ignore missing avatars */ });
                    }

                    // Always update the border/ready status (this is instant, no flicker)
                    if (player.isReady) {
                        sidebarAvatar.style.borderColor = "#4ade80"; 
                    } else {
                        sidebarAvatar.style.borderColor = ""; 
                    }

                    // --- B. MODAL PLAYER LIST (Standard Rebuild) ---
                    // We rebuild this every time to ensure Kick buttons work correctly
                    const playerItem = document.createElement('div');
                    playerItem.className = 'modal-player-item';
                    
                    const modalAvatar = document.createElement('div');
                    modalAvatar.className = 'avatar-circle';
                    if (player.isReady) modalAvatar.style.borderColor = "#4ade80";
                    
                    // We have to re-fetch/set bg for modal (or you could cache URLs globally)
                    // Since modal is usually closed, this performance hit is negligible
                    const avatarRef = ref(storage, `avatars/${player.email}`);
                    getDownloadURL(avatarRef).then(url => {
                        modalAvatar.style.backgroundImage = `url(${url})`;
                    }).catch(() => {});

                    playerItem.appendChild(modalAvatar);

                    if (player.email !== hostEmail) {
                        const kickBtn = document.createElement('button');
                        kickBtn.className = 'kick-player-btn';
                        kickBtn.innerHTML = '&times;';
                        kickBtn.title = `Kick ${player.username}`;
                        kickBtn.addEventListener('click', () => kickPlayer(player.email));
                        playerItem.appendChild(kickBtn);
                    }
                    modalPlayerList.appendChild(playerItem);
                });
            }

            // Cleanup: Remove avatars of players who left the lobby
            const existingAvatars = lobbyAvatars.querySelectorAll('.avatar-circle');
            existingAvatars.forEach(avatar => {
                if (!currentAvatarIds.has(avatar.id)) {
                    avatar.remove();
                }
            });
        }
        // --- END NEW ---
        
        const playerEmails = lobbyData.players.map(p => p.email);
        const invitedEmails = lobbyData.invited || [];
        const allInviteButtons = userInviteList.querySelectorAll('.invite-btn');
        
        allInviteButtons.forEach(button => {
            const buttonEmail = button.dataset.email;
            if (playerEmails.includes(buttonEmail) || invitedEmails.includes(buttonEmail)) {
                button.textContent = '✓';
                button.disabled = true;
            } else {
                button.textContent = '+';
                button.disabled = false;
            }
        });
        
        const hostPlayer = lobbyData.players.find(p => p.email === hostEmail);
        if (hostPlayer) {
            if (hostPlayer.isReady) {
                readyBtn.innerHTML = '<i class="fa-solid fa-xmark"></i> Unready';
                readyBtn.classList.remove('ready-btn');
                selectSetButton.disabled = true; 
                selectCardsDropdown.disabled = true;
                selectTimerDropdown.disabled = true; 
                selectGameModeDropdown.disabled = true; // <-- ADD THIS LINE
            } else {
                readyBtn.innerHTML = '<i class="fa-solid fa-check"></i> I\'m Ready';
                readyBtn.classList.add('ready-btn');
                selectSetButton.disabled = false; 
                selectCardsDropdown.disabled = false;
                selectTimerDropdown.disabled = false; 
                selectGameModeDropdown.disabled = false; // <-- ADD THIS LINE
            }
        }
        const updateLobbySetting = async (key, value) => {
            // Only update if host is not ready
            const hostPlayer = lobbyData.players.find(p => p.email === hostEmail);
            if (hostPlayer && !hostPlayer.isReady && currentLobbyId) {
                try {
                    const lobbyRef = doc(db, "quibble_lobbies", currentLobbyId);
                    await updateDoc(lobbyRef, { [key]: value });
                } catch (e) {
                    console.error(`Error updating ${key}:`, e);
                }
            }
        };

        selectCardsDropdown.onchange = () => {
            updateLobbySetting('cardCount', parseInt(selectCardsDropdown.value, 10));
        };
        selectTimerDropdown.onchange = () => {
            updateLobbySetting('timer', parseInt(selectTimerDropdown.value, 10));
        };
        selectGameModeDropdown.onchange = () => {
            updateLobbySetting('gameMode', selectGameModeDropdown.value);
        };
// --- NEW: Kick Check (for Guests) ---
        if (hostEmail !== lobbyData.host.email) {
            const amIInLobby = lobbyData.playerEmails && lobbyData.playerEmails.includes(hostEmail);
            if (!amIInLobby) {
                console.log("Kicked from lobby or left.");
                window.location.reload();
                return; // Stop processing
            }
        }
        // --- END NEW ---
        if (hostEmail === lobbyData.host.email) { 
            const allReady = lobbyData.players.every(player => player.isReady);
            
            // --- NEW: Update Start/Restart Button ---
            if (lobbyData.status === 'countdown' || lobbyData.status === 'question' || lobbyData.status === 'paused') {
                // Game is IN PROGRESS or PAUSED
                startBtn.innerHTML = '<i class="fa-solid fa-redo"></i> Restart';
                startBtn.disabled = false; // Host can always restart
            
            } else if (lobbyData.status === 'waiting') {
                // Game is WAITING (or ended)
                startBtn.innerHTML = '<i class="fa-solid fa-play"></i> Start';
                
                // Only enable start if all are ready
                if (allReady && lobbyData.players.length > 0) {
                    startBtn.disabled = false;
                } else {
                    startBtn.disabled = true;
                }
            } else {
                // Failsafe
                startBtn.disabled = true;
            }
            // --- END NEW ---

        } else {
            // User is a GUEST
            startBtn.disabled = true;
            startBtn.innerHTML = '<i class="fa-solid fa-play"></i> Start'; // Ensure guests see "Start"
        }

        // --- Chat Logic ---
        chatMessages.innerHTML = ''; 
        const chat = lobbyData.chat || [];
        chat.forEach(message => {
            addChatMessageToUI(message, lobbyData.players); // <--- NEW: Pass players
        });
        
        // --- NEW: Host checks all chat messages for answers ---
        // --- NEW: Set global normalized answer ---
        if (lobbyData.status === 'question') {
            const currentCard = lobbyData.flashcards[lobbyData.currentCardIndex];
            window.currentNormalizedAnswer = normalizeText(currentCard.term);
        } else {
            window.currentNormalizedAnswer = ""; // Clear answer
        }
        // --- END NEW ---
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        if (hostEmail === lobbyData.host.email) {
            const newPlayerEmails = new Set(lobbyData.players.map(p => p.email));
            
            for (const email of previousPlayerEmails) {
                if (!newPlayerEmails.has(email)) {
                    const leftPlayer = allUsers.find(u => u.email === email) || {username: 'A player'};
                    sendSystemMessage(lobbyId, `${leftPlayer.username} left the lobby.`);
                }
            }
            
            for (const player of lobbyData.players) {
                if (!previousPlayerEmails.has(player.email)) {
                    if (player.email !== hostEmail) { 
                        sendSystemMessage(lobbyId, `${player.username} joined the lobby.`);
                    }
                }
            }
            previousPlayerEmails = newPlayerEmails;
        }
    });
}
// --- NEW: Kicks a player from the lobby ---
// --- NEW: Kicks a player from the lobby ---
async function kickPlayer(playerEmail) {
    if (!currentLobbyId || !playerEmail) return;

    console.log(`Kicking ${playerEmail}...`);
    const lobbyRef = doc(db, "quibble_lobbies", currentLobbyId);

    try {
        const lobbySnap = await getDoc(lobbyRef);
        if (lobbySnap.exists()) {
            const lobbyData = lobbySnap.data();
            
            // --- NEW: Find the player's username before kicking ---
            const playerToKick = lobbyData.players.find(p => p.email === playerEmail);
            const kickedUsername = playerToKick ? playerToKick.username : 'A player';
            // --- END NEW ---
            
            // Create a new array *without* the kicked player
            const updatedPlayers = lobbyData.players.filter(player => player.email !== playerEmail);

            // Also remove them from 'invited' array if they're in there
            const updatedInvited = lobbyData.invited.filter(email => email !== playerEmail);
            const updatedPlayerEmails = lobbyData.playerEmails.filter(email => email !== playerEmail);

           await updateDoc(lobbyRef, {
                players: updatedPlayers,
                invited: updatedInvited,
                playerEmails: updatedPlayerEmails // <-- ADD THIS
            });
            
            // --- FIX: Use the correct username variable ---
            sendSystemMessage(currentLobbyId, `${kickedUsername} was kicked by the host.`);
        }
    } catch (e) {
        console.error("Error kicking player: ", e);
        showCustomAlert("Failed to kick player.");
    }
}
function normalizeText(text) {
    if (typeof text !== 'string') return '';
    // Lowercase and remove all non-alphanumeric chars
    return text.toLowerCase().replace(/[^a-z0-9]/gi, '');
}
// --- NEW: Game Loop Function 1: Countdown ---
function handleCountdown(lobbyData) {
    if (!lobbyData.gameStateTimestamp) {
        console.log("Waiting for server timestamp (countdown)...");
        return; // Wait for the snapshot that has the server time
    }
    const startTime = lobbyData.gameStateTimestamp.toDate();
    const now = new Date();
    const elapsed = (now.getTime() - startTime.getTime()) / 1000;
    const timeLeft = Math.ceil(10 - elapsed); // 10 second countdown

    // --- NEW: Show and populate title/settings ---
    mainTitleContainer.style.display = 'block';
    mainSetTitle.textContent = lobbyData.setTitle;
    mainSettingsDisplay.style.display = 'flex';
    mainCardCountDisplay.textContent = lobbyData.cardCount;
    mainTimerDisplay.textContent = lobbyData.timer || "5";
    mainGameModeDisplay.textContent = (lobbyData.gameMode === 'learn') ? "Learn Mode" : "Test Mode"; // <-- ADD
    // --- END NEW ---

    timerBarContainer.style.opacity = '0';
    definitionLabel.textContent = '';
    choiceContainer.classList.add('hidden');
    
    if (timeLeft <= 0) {
        // Countdown finished
        cardTextDisplay.textContent = 'Go!';
        cardTextDisplay.className = 'game-countdown';
        if (hostEmail === lobbyData.host.email) {
            // Host transitions to the question phase
            console.log("Countdown finished, host updating to 'question'");
            
            // --- BUG FIX: Generate choices once and save them ---
            const choices = generateChoicesForRound(lobbyData.flashcards, 0); // Start at index 0
            
            updateDoc(doc(db, "quibble_lobbies", currentLobbyId), {
                status: 'question',
                gameStateTimestamp: serverTimestamp(),
                currentChoices: choices // <-- Save to DB
            }).catch(e => console.error("Error updating to question:", e));
        }
    } else {
        // Still counting down
        cardTextDisplay.textContent = timeLeft;
        cardTextDisplay.className = 'game-countdown';
        gameLoopId = requestAnimationFrame(() => handleCountdown(lobbyData));
    }
}

// --- NEW: Game Loop Function 2: Show Question ---
function handleShowQuestion(lobbyData) {
    if (lobbyData.gameMode === 'learn') {
    choiceContainer.classList.remove('hidden');
    renderLearnModeChoices(lobbyData);
} else {
    // Test Mode
    chatInput.focus();
    choiceContainer.classList.add('hidden');
}
    mainTitleContainer.style.display = 'block';
    mainSetTitle.textContent = lobbyData.setTitle; // <-- ADD THIS
    mainSettingsDisplay.style.display = 'flex';

    // --- NEW: Populate settings ---
    mainCardCountDisplay.textContent = lobbyData.cardCount;
    mainTimerDisplay.textContent = lobbyData.timer || "5";
    mainGameModeDisplay.textContent = (lobbyData.gameMode === 'learn') ? "Learn Mode" : "Test Mode"; // <-- ADD
    // --- END NEW ---

    timerBarContainer.style.opacity = '1';

    // --- NEW: Show definition label ---

    // --- NEW: Show definition label ---
    definitionLabel.textContent = `Definition #${lobbyData.currentCardIndex + 1}`;
    definitionLabel.style.display = 'block';
    // --- END NEW ---

    // Display the definition
    try {
        const card = lobbyData.flashcards[lobbyData.currentCardIndex];
        cardTextDisplay.textContent = card.definition;
        cardTextDisplay.className = '';
    } catch (e) {
        console.error("Failed to get card:", e, lobbyData);
        mainCardDisplay.textContent = "Error loading card.";
        return; // Stop loop
    }

    // Animate the timer bar
    // Animate the timer bar
    if (!lobbyData.gameStateTimestamp) {
        console.log("Waiting for server timestamp (question)...");
        return; // Wait for the snapshot that has the server time
    }
    const startTime = lobbyData.gameStateTimestamp.toDate();
    const questionTime = lobbyData.timer * 1000; // e.g., 5 seconds in ms
    
    async function updateTimerBar() {
        const now = new Date();
        const elapsed = now.getTime() - startTime.getTime();
        let percentage = 100 - (elapsed / questionTime) * 100;
        
        if (percentage < 0) percentage = 0;
        timerBar.style.width = `${percentage}%`;

        if (percentage > 0) {
            gameLoopId = requestAnimationFrame(updateTimerBar);
        } else {
            // Time's up!
            cardTextDisplay.textContent = "Time's Up!";
            cardTextDisplay.className = '';
            definitionLabel.textContent = '';
            if (hostEmail === lobbyData.host.email) {
                // --- NEW: Game Loop Logic ---
                const nextCardIndex = lobbyData.currentCardIndex + 1;

                if (nextCardIndex < lobbyData.flashcards.length) {
                    window.currentNormalizedAnswer = "";
                    // --- Go to next question ---
                    console.log("Time's up, loading next question");
                    
                    // --- BUG FIX: Generate choices for NEXT card and save them ---
                    const choices = generateChoicesForRound(lobbyData.flashcards, nextCardIndex);

                    updateDoc(doc(db, "quibble_lobbies", currentLobbyId), {
                        status: 'question', 
                        currentCardIndex: nextCardIndex, 
                        gameStateTimestamp: serverTimestamp(),
                        currentQuestionAnswers: [],
                        currentChoices: choices // <-- Save to DB
                    }).catch(e => console.error("Error updating to next question:", e));
                } else {
                    // --- Game Over ---
                    console.log("Game finished, host updating to 'waiting'");

                    // --- NEW: Find winner and increment wins ---
                    // --- NEW: Find winner, increment wins, AND add XP ---
                    // --- NEW: Find winner, increment wins, AND add XP ---
                    try {
                        // === 1. SOLO MODE NERF ===
                        if (lobbyData.players.length === 1) {
                            const player = lobbyData.players[0];
                            if (player.score > 0) {
                                console.log(`Solo Mode: Score > 0. Awarding 300 XP.`);
                                await addXP(300, player.email); // Nerfed XP
                            } else {
                                console.log(`Solo Mode: Score is 0. No XP awarded.`);
                                // No XP call here
                            }
                        } 
                        // === 2. MULTIPLAYER MODE (Standard Logic) ===
                        else {
                            const sortedPlayers = [...lobbyData.players].sort((a, b) => b.score - a.score);
                            const highestScore = sortedPlayers.length > 0 ? sortedPlayers[0].score : 0;
                            
                            // Find ALL players who have the highest score (must be > 0)
                            const winners = sortedPlayers.filter(p => p.score === highestScore && p.score > 0);

                            if (winners.length > 0) {
                                console.log(`Winners found: ${winners.map(w => w.username).join(', ')}`);
                                
                                // 1. Increment 'quibblwinner' for EVERY winner
                                for (const winner of winners) {
                                    await incrementWinnerWins(winner.email);
                                }

                                // 2. Distribute XP
                                for (const player of lobbyData.players) {
                                    // Check if this player is in the winners array
                                    const isAWinner = winners.some(w => w.email === player.email);

                                    if (isAWinner) {
                                        console.log(`Adding 1000 XP to winner ${player.email}`);
                                        await addXP(1000, player.email); // Winner XP
                                    } else {
                                        console.log(`Adding 300 XP to non-winner ${player.email}`);
                                        await addXP(300, player.email); // Non-winner XP
                                    }
                                }
                            } else {
                                console.log("No winner or all scores are 0. Giving all players 300 XP.");
                                // Give all players non-winner XP
                                for (const player of lobbyData.players) {
                                    await addXP(300, player.email);
                                }
                            }
                        }
                    } catch (e) {
                        console.error("Error finding/incrementing winner or adding XP:", e);
                    }
                    // --- END NEW ---
                    

                    // Set all players to unready (but keep scores for the modal)
                    const updatedPlayers = lobbyData.players.map(p => {
                        return { ...p, isReady: false };
                    });

                    updateDoc(doc(db, "quibble_lobbies", currentLobbyId), {
                        status: 'waiting', // Go back to lobby
                        gamePhase: 'ended', // <-- ADD THIS
                        players: updatedPlayers, // <-- ADD THIS
                        currentCardIndex: 0,
                        flashcards: [], // Clear the card deck
                        currentQuestionAnswers: [] // <-- ADD THIS
                    }).catch(e => console.error("Error ending game:", e));
                }
                // --- END NEW ---
            }
        }
    }
    
    gameLoopId = requestAnimationFrame(updateTimerBar);
}
// --- UPDATED: Sends user message and checks for correct answer (HOST) ---
async function sendUserMessage(lobbyId, text) {
    if (!lobbyId || !text) return false;
    const lobbyRef = doc(db, "quibble_lobbies", lobbyId);

    try {
        // --- FIX START: Use the VISUAL data to check answer ---
        let lobbyData = window.currentLobbyDataForRender;
        if (!lobbyData) {
            const lobbySnap = await getDoc(lobbyRef);
            if (!lobbySnap.exists()) return false;
            lobbyData = lobbySnap.data();
        }

        // If user is no longer in playerEmails, stop.
        if (!lobbyData.playerEmails || !lobbyData.playerEmails.includes(hostEmail)) {
            console.warn("User is not in lobby, cannot send message.");
            return false; 
        }

        // Only check for answers in "test" mode + question phase
        if (lobbyData.status === 'question' && lobbyData.gameMode === 'test') {
            const currentCard = lobbyData.flashcards[lobbyData.currentCardIndex];
            if (!currentCard) return false;

            const normalizedGuess = normalizeText(text);
            const normalizedAnswer = normalizeText(currentCard.term);

            if (normalizedGuess === normalizedAnswer) {
                // Correct answer!
                
                // --- FIX: Check if host already answered ---
                if (lobbyData.currentQuestionAnswers.includes(hostEmail)) {
                    // ... (This part you already have correct) ...
                    addChatMessageToUI({ type: 'system', text: "You have already answered this question.", timestamp: new Date() }, lobbyData.players);
                    const chatContainer = document.getElementById('mainChatMessages');
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                    return false; 
                }
                // -------------------------------------------

                const targetCardIndex = lobbyData.currentCardIndex; // <--- 1. CAPTURE THE INDEX
                
                // --- OPTIMISTIC UI ... (Keep your existing UI code here) ...
                triggerInstantFeedback();
                const optimisticMsg = { type: 'system', text: `${hostUsername} got the correct answer!`, timestamp: new Date() };
                addChatMessageToUI(optimisticMsg, lobbyData.players);
                const chatContainer = document.getElementById('mainChatMessages');
                chatContainer.scrollTop = chatContainer.scrollHeight;

                // Update the score in the players array
                try {
                    await runTransaction(db, async (transaction) => {
                        const freshDoc = await transaction.get(lobbyRef);
                        if (!freshDoc.exists()) throw "Lobby missing";
                        const freshData = freshDoc.data();

                        // --- 2. CRITICAL FIX: Abort if round changed ---
                        if (freshData.currentCardIndex !== targetCardIndex) {
                            throw "Round Changed";
                        }
                        // ----------------------------------------------

                        if (freshData.currentQuestionAnswers.includes(hostEmail)) {
                            throw "Already answered"; 
                        }

                        const updatedPlayers = freshData.players.map(p => {
                            if (p.email === hostEmail) return { ...p, score: p.score + 1 };
                            return p;
                        });

                        const sysMsg = {
                            type: 'system', text: `${hostUsername} got the correct answer!`, timestamp: new Date()
                        };

                        transaction.update(lobbyRef, {
                            players: updatedPlayers,
                            currentQuestionAnswers: [...freshData.currentQuestionAnswers, hostEmail],
                            chat: arrayUnion(sysMsg) // <--- 3. OPTIMIZATION: Use arrayUnion to prevent conflict
                        });
                    });
                    
                    await addXP(50);
                    return true; // Success
                    
                } catch (e) {
                    // --- 4. HANDLE THE "TOO LATE" ERROR ---
                    if (e === "Round Changed") {
                        console.log("Answer too late, round changed.");
                        // Show the system notification for "Too Late"
                        addChatMessageToUI({
                            type: 'system',
                            text: "Time ran out! Your answer was too late.",
                            timestamp: new Date()
                        }, lobbyData.players);
                        const chatContainer = document.getElementById('mainChatMessages');
                        chatContainer.scrollTop = chatContainer.scrollHeight;
                        return false; // Keep text in input so they can try again if they want
                    } else if (e !== "Already answered") {
                        console.error("Transaction error: ", e);
                    }
                }
                return true; 
            }
        }
    } catch (e) {
        if (e !== "Already answered") console.error("Error checking answer: ", e);
    }

    // 2. If not a correct answer, send the user's chat message
    const message = {
        type: 'user',
        username: hostUsername, // Host's username
        text: text,
        timestamp: new Date()
    };
    try {
        await updateDoc(lobbyRef, { chat: arrayUnion(message) });
    } catch (e) {
        console.error("Error sending message: ", e);
    }
    return true; // <-- RETURN TRUE: Message sent, clear input
}
// --- NEW: Color Hashing for Chat ---
const chatUsernameColors = [
  '#FF8A80', // Light Red
  '#FFD180', // Orange
  '#FFFF8D', // Yellow
  '#CCFF90', // Light Green
  '#A7FFEB', // Teal
  '#8C9EFF', // Blue
  '#B388FF', // Purple
  '#F8BBD0'  // Pink
];

function stringToHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash); // Ensure it's a positive number
}
// --- END NEW ---
// --- NEW: Sends a system message to the lobby chat (HOST ONLY) ---
async function sendSystemMessage(lobbyId, text) {
    if (!lobbyId || !text) return;
    const lobbyRef = doc(db, "quibble_lobbies", lobbyId);
    const message = {
        type: 'system',
        text: text,
        timestamp: new Date()
    };
    try {
        await updateDoc(lobbyRef, { chat: arrayUnion(message) });
    } catch (e) {
        console.error("Error sending system message: ", e);
    }
}
// 15 Fixed Colors for Slots
const SLOT_COLORS = [
    '#FF5252', // Red
    '#00FA9A', // Pink
    '#E040FB', // Purple
    '#7C4DFF', // Deep Purple
    '#536DFE', // Indigo
    '#448AFF', // Blue
    '#40C4FF', // Light Blue
    '#18FFFF', // Cyan
    '#64FFDA', // Teal
    '#69F0AE', // Green
    '#B2FF59', // Light Green
    '#EEFF41', // Lime
    '#FFFF00', // Yellow
    '#FFD740', // Amber
    '#FF6E40'  // Deep Orange
];
// --- NEW: Renders a message object to the chat UI ---
function addChatMessageToUI(message, players = []) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-message';

    if (message.type === 'system') {
        msgDiv.classList.add('system');
        msgDiv.textContent = message.text;
    } else {
        // 1. Find the player's index (Slot)
        const playerIndex = players.findIndex(p => p.username === message.username);
        
        // 2. Pick color based on slot (Index % 15)
        let color;
        if (playerIndex !== -1) {
            color = SLOT_COLORS[playerIndex % SLOT_COLORS.length];
        } else {
            // Fallback if player left or not found (Grey)
            color = '#aaaaaa'; 
        }

        const normalizedText = normalizeText(message.text);
        if (window.currentNormalizedAnswer && normalizedText === window.currentNormalizedAnswer) {
            // Correct syntax: style="color: ..."
            msgDiv.innerHTML = `<strong style="color: ${color};">${message.username}:</strong> <em style="color:#888;">[correct answer]</em>`;
        } else {
            // Correct syntax: style="color: ..."
            msgDiv.innerHTML = `<strong style="color: ${color};">${message.username}:</strong> ${message.text}`;
        }
    }
    chatMessages.appendChild(msgDiv);
}
// --- Event Listeners ---
// --- UPDATED: selectSetDropdown Listener ---
// --- Event Listeners ---
// --- NEW: Input Mirror & Suggestion Logic (Test Mode Only) ---
const chatInputMirror = document.getElementById('chatInputMirror');
const chatInputSuggestion = document.getElementById('chatInputSuggestion');

mainChatInput.addEventListener('input', () => {
    // 1. Reset Suggestion
    if (chatInputSuggestion) chatInputSuggestion.textContent = '';

    // 2. Check Game Mode & Status (Must be Test Mode + Question Phase)
    const lobbyData = window.currentLobbyDataForRender;
    if (!lobbyData || lobbyData.gameMode !== 'test' || lobbyData.status !== 'question') {
        return; 
    }

    // 3. Get Current Data
    const currentCard = lobbyData.flashcards[lobbyData.currentCardIndex];
    if (!currentCard) return;

    const currentInput = mainChatInput.value;
    
    // 4. Update Mirror to measure width
    // 4. Update Mirror to measure width
    if (chatInputMirror) {
        chatInputMirror.textContent = currentInput;
        // Measure width: Mirror width + padding-left (20px) + border/adjustment (2px)
        // Note: 20px must match CSS .chat-input-area input padding
        const textWidth = chatInputMirror.offsetWidth;
        
        // We subtract 20px to remove the Right Padding included in offsetWidth
        chatInputSuggestion.style.left = (textWidth - 20) + 'px'; 
    }

    // 5. Logic to show 's'
    const correctAnswer = currentCard.term;
    const normalizedInput = normalizeText(currentInput);
    const normalizedAnswer = normalizeText(correctAnswer);

    // Check: If Answer is exactly Input + 's'
    if (normalizedAnswer === normalizedInput + 's' && normalizedInput !== '') {
        chatInputSuggestion.textContent = 's';
    }
});
// --- END NEW ---
// --- NEW: Select Set Button Listener ---
selectSetButton.addEventListener('click', () => {
    renderSetList(); // Render all sets
    setSearchInput.value = ""; // Clear search
    selectSetModal.classList.add('visible');
});

// --- NEW: Select Set Modal Search & Close ---
setSearchInput.addEventListener('input', (e) => {
    renderSetList(e.target.value);
});
modalCloseXSet.addEventListener('click', () => {
    selectSetModal.classList.remove('visible');
});
selectSetModal.addEventListener('click', (event) => {
    if (event.target === selectSetModal) {
        selectSetModal.classList.remove('visible');
    }
});


// Placeholder listeners for other buttons
// Placeholder listeners for other buttons
// --- NEW: Real Start Button Logic ---
// --- UPDATED: Real Start Button Logic ---
startBtn.addEventListener('click', startGame);
// --- END NEW ---
// --- NEW REUSABLE FUNCTION ---
/** Starts the game countdown and resets scores */
async function startGame() {
    if (!currentLobbyId) return;

    // Disable both buttons to prevent spam
    startBtn.disabled = true;
    const restartBtn = document.getElementById('endGameRestartBtn');
    if (restartBtn) restartBtn.disabled = true;

    console.log("Host starting game...");
    
    try {
        // 1. Get the selected flashcard set
        const lobbyRef = doc(db, "quibble_lobbies", currentLobbyId);
        const lobbySnap = await getDoc(lobbyRef);
        if (!lobbySnap.exists()) throw new Error("Lobby not found");
        
        const lobbyData = lobbySnap.data();

        // 2. Reset scores for all players on restart/start
        const playersWithResetScores = lobbyData.players.map(p => {
            return { ...p, score: 0 }; // Set score to 0
        });
        
        // 3. Fetch the set from flashcard_sets
        const setRef = doc(db, "flashcard_sets", lobbyData.setId);
        const setSnap = await getDoc(setRef);
        if (!setSnap.exists()) throw new Error("Flashcard set not found");
        
        let flashcards = setSnap.data().flashcards || [];
        
        // 4. Shuffle and slice the cards
        flashcards = shuffleArray(flashcards);
        flashcards = flashcards.slice(0, lobbyData.cardCount);
        
        if (flashcards.length === 0) {
            showCustomAlert("This set has no cards! Cannot start.");
            startBtn.disabled = false; // Re-enable
            if (restartBtn) restartBtn.disabled = false; // Re-enable
            return;
        }
        
        // 5. Update the lobby to start the countdown
        await updateDoc(lobbyRef, {
            gamePhase: 'playing',
            status: 'countdown',
            flashcards: flashcards,
            currentCardIndex: 0,
            currentQuestionAnswers: [],
            gameStateTimestamp: serverTimestamp(),
            players: playersWithResetScores
        });
       
        // The listener will take over from here

    } catch (e) {
        console.error("Error starting game: ", e);
        showCustomAlert(`Error: ${e.message}`);
        startBtn.disabled = false; // Re-enable on error
        if (restartBtn) restartBtn.disabled = false; // Re-enable on error
    }
}
// --- END NEW FUNCTION ---
// --- END NEW ---

async function leaveGameAsGuest() {
    if (!currentLobbyId || !hostEmail) return;

    console.log("Guest leaving game...");

    // Stop listener and game loop
    if (lobbyListener) lobbyListener();
    if (gameLoopId) cancelAnimationFrame(gameLoopId);

    const lobbyRef = doc(db, "quibble_lobbies", currentLobbyId);
    try {
        const lobbySnap = await getDoc(lobbyRef);
        if (lobbySnap.exists()) {
            const lobbyData = lobbySnap.data();
            
            // The host's `listenToLobby` function will see the player array change
            // and announce the player leaving.

            const updatedPlayers = lobbyData.players.filter(player => player.email !== hostEmail); // hostEmail is this user's email
            const updatedPlayerEmails = lobbyData.playerEmails.filter(email => email !== hostEmail);

            await updateDoc(lobbyRef, {
                players: updatedPlayers,
                playerEmails: updatedPlayerEmails
            });
        }
        // Reload the page to reset the UI completely
        window.location.reload();

    } catch (e) {
        console.error("Error leaving lobby: ", e);
        showCustomAlert("Error", "Could not leave lobby.");
    }
}

// --- REPLACED: leaveBtn Listener with Full Logic ---
leaveBtn.addEventListener('click', async () => {
    // 1. Get the most up-to-date lobby data (if any)
    let lobbyData = null;
    if (currentLobbyId) {
        // Use the globally stored data first for a quick check
        lobbyData = window.currentLobbyDataForRender;
    }

    // 2. Determine user role
    const amIHost = lobbyData && lobbyData.host.email === hostEmail;
    const amIGuest = lobbyData && lobbyData.host.email !== hostEmail;

    if (amIHost) {
        // --- HOST LOGIC ---
        // "IF THE USER IS THE HOST AND HE CREATED A LOBBY"
        showCustomConfirm("Close Lobby?", "This will close the lobby for all players. Are you sure?", () => {
            // Programmatically click the existing "Close Lobby" button in the modal
            // This reuses the logic defined for closeLobbyBtn
            closeLobbyBtn.click(); 
        });

    } else if (amIGuest) {
        // --- GUEST LOGIC ---
        if (lobbyData.status === 'waiting') {
            // "IF THE USER WAS INVITED AND GAME HASNT STARTED YET"
            showCustomAlert("Leave Lobby", "Please use the 'Leave' button in the mini-modal (bottom-right) to leave a lobby before the game starts.");
        } else {
            // "IF THE GAME STARTED, AND THE INVITED USER CLICKS THE LEAVE BUTTON"
            // This is the 'countdown' or 'question' state
            showCustomConfirm("Leave Game?", "Are you sure you want to leave the game? Your score will be lost.", () => {
                leaveGameAsGuest();
            });
        }
    } else {
        // --- NO LOBBY LOGIC ---
        // "IF THE USER HASNT CREATED A LOBBY YET"
        // This also catches hosts who haven't created a lobby yet
        showCustomAlert("Error", "You are not currently in a lobby.");
    }
});
function renderEndGameScoreboard(players) {
    // Sort by score, descending
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    
    const highestScore = sortedPlayers.length > 0 ? sortedPlayers[0].score : 0;
    // Identify ALL winners
    const winners = sortedPlayers.filter(p => p.score === highestScore && p.score > 0);

    // --- Set Title Message ---
    if (winners.length === 1) {
        endGameWinnerMessage.textContent = `${winners[0].username} wins with ${winners[0].score} points!`;
    } else if (winners.length > 1) {
        const winnerNames = winners.map(w => w.username).join(", ");
        endGameWinnerMessage.textContent = `It's a tie! Winners: ${winnerNames} (${highestScore} pts)`;
    } else {
        endGameWinnerMessage.textContent = "No points scored. No winners this time.";
    }
    
    endGameScoreboard.innerHTML = ''; // Clear list

    sortedPlayers.forEach((player, index) => {
        
        // --- Determine XP Gained ---
        let xpGained = 0; 
        let isWinner = false;

        // Check for Solo Mode
        if (players.length === 1) {
            if (player.score > 0) {
                xpGained = 300; // Solo Nerf
                isWinner = true; 
            } else {
                xpGained = 0;   
            }
        } 
        // Multiplayer Mode
        else {
            // Check if this specific player is inside the 'winners' array
            if (winners.some(w => w.email === player.email)) {
                xpGained = 1000;
                isWinner = true;
            } else {
                xpGained = 300; // Participation XP
            }
        }
        // --- END NEW ---

        const li = document.createElement('li');
        li.className = 'end-game-player-item';

        const readyIcon = player.isReady ? 
            '<i class="fa-solid fa-circle-check"></i>' : 
            '<i class="fa-solid fa-circle-xmark"></i>';
        
        const winnerLabel = isWinner ? '<span class="winner-label">WINNER</span>' : '';

        li.innerHTML = `
            <div class="avatar-circle" id="endGameAvatar-${player.email}"></div>
            <span class="ready-status">${readyIcon}</span>
            <span class="player-name">${player.username} ${winnerLabel}</span>
            <span class="player-xp-gain">+${xpGained} XP</span>
            <span class="player-score">${player.score}</span>
        `;
        endGameScoreboard.appendChild(li);

        // Fetch avatar
        const avatarRef = ref(storage, `avatars/${player.email}`);
        getDownloadURL(avatarRef)
            .then(url => {
                const avatarDiv = document.getElementById(`endGameAvatar-${player.email}`);
                if (avatarDiv) avatarDiv.style.backgroundImage = `url(${url})`;
            })
            .catch(err => { /* (Handle error or leave default) */ });
    });
}

/** Renders the Host or Guest buttons in the end-game modal */
/** Renders the Host or Guest buttons in the end-game modal */
function renderEndGameControls(lobbyData) {
    const endGameControls = document.getElementById('endGameControls');
    if (!endGameControls) {
        console.error("Could not find endGameControls element!");
        return;
    }
    
    const amIHost = hostEmail === lobbyData.host.email;
    const allPlayersReady = lobbyData.players.every(p => p.isReady);

    // We check childElementCount instead of innerHTML, because innerHTML
    // can contain whitespace and fail the check.
    if (endGameControls.childElementCount === 0) {
        
        // Only build buttons *once*
        if (amIHost) {
            endGameControls.innerHTML = `
                <button id="endGameRestartBtn" class="modern-button start-btn"><i class="fa-solid fa-play"></i> Restart</button>
                <button id="endGameReadyBtn" class="modern-button ready-btn"><i class="fa-solid fa-check"></i> Ready</button>
                <button id="endGameCloseBtn" class="modern-button"><i class="fa-solid fa-times"></i> Close Lobby</button>
            `;
            // ---
            // --- REMOVED LISTENERS FROM HERE ---
            // ---
        } else {
            endGameControls.innerHTML = `
                <button id="endGameReadyBtn" class="modern-button ready-btn"><i class="fa-solid fa-check"></i> Ready</button>
                <button id="endGameLeaveBtn" class="modern-button leave-btn"><i class="fa-solid fa-arrow-right-from-bracket"></i> Leave</button>
            `;
            // ---
            // --- REMOVED LISTENERS FROM HERE ---
            // ---
        }
    }

    // --- Update button states (runs every time) ---
// --- Update button states (runs every time) ---
    const readyBtn = document.getElementById('endGameReadyBtn');
    
    // --- ADDING A SAFETY CHECK ---
    if (!readyBtn) {
        console.error("endGameReadyBtn not found! This shouldn't happen.");
        return;
    }
    // --- END SAFETY CHECK ---

    // ---
    // --- THIS IS THE FIX ---
    // ---
    readyBtn.disabled = false; // Re-enable the button every time we render
    // ---
    // --- END FIX ---
    // ---
    
    // 'hostEmail' is the current user's email, which works for guests too
    const currentPlayer = lobbyData.players.find(p => p.email === hostEmail);

    // --- THIS INNERHTML CHANGE IS WHAT BREAKS THE LISTENER ---
    if (currentPlayer && currentPlayer.isReady) {
        readyBtn.innerHTML = '<i class="fa-solid fa-xmark"></i> Unready';
        readyBtn.classList.remove('ready-btn');
    } else {
        readyBtn.innerHTML = '<i class="fa-solid fa-check"></i> Ready';
        readyBtn.classList.add('ready-btn');
    }

    if (amIHost) {
        // Only disable if the game *isn't* in progress
        document.getElementById('endGameRestartBtn').disabled = !allPlayersReady;
    }

    // ---
    // --- THIS IS THE FIX ---
    // ---
    // Re-attach listeners EVERY time, *after* innerHTML is set.
    // This is safe because .onclick just overwrites the previous assignment.
    if (amIHost) {
        document.getElementById('endGameRestartBtn').onclick = startGame;
        document.getElementById('endGameReadyBtn').onclick = () => toggleEndGameReady();
        document.getElementById('endGameCloseBtn').onclick = () => closeLobbyBtn.click();
    } else {
        document.getElementById('endGameReadyBtn').onclick = () => toggleEndGameReady();
        document.getElementById('endGameLeaveBtn').onclick = () => leaveGameAsGuest();
    }
    // ---
    // --- END OF FIX ---
    // ---
}

/** Toggles the current user's ready status (works for host and guest) */
async function toggleEndGameReady() {
    if (!currentLobbyId || !hostEmail) return;

    const lobbyRef = doc(db, "quibble_lobbies", currentLobbyId);
    const readyBtn = document.getElementById('endGameReadyBtn');
    if (readyBtn) readyBtn.disabled = true; // Prevent spam

    try {
        const lobbySnap = await getDoc(lobbyRef);
        if (!lobbySnap.exists()) return;

        const lobbyData = lobbySnap.data();
        const updatedPlayers = lobbyData.players.map(player => {
            if (player.email === hostEmail) { // hostEmail is the current user's email
                player.isReady = !player.isReady;
            }
            return player;
        });

        await updateDoc(lobbyRef, {
            players: updatedPlayers
        });

    } catch (e) {
        console.error("Error toggling ready state: ", e);
    }
    // No need to re-enable button, listener will do it
}
/** Increments the win count for a user in the 'quibblwinner' collection */
async function incrementWinnerWins(userEmail) {
    if (!userEmail) return;
    
    // This creates a reference to the winner's document in 'quibblwinner'
    const winRef = doc(db, "quibblwinner", userEmail);
    
    try {
        // setDoc with { merge: true } will create the doc if it doesn't exist,
        // or update it if it does.
        // increment(1) atomically adds 1 to the 'wins' field.
        await setDoc(winRef, {
            wins: increment(1)
        }, { merge: true }); 
        
        console.log(`Incremented wins for ${userEmail}`);
    } catch (e) {
        console.error(`Failed to increment wins for ${userEmail}:`, e);
    }
}
// --- NEW: Send Chat Button Listener ---
sendChatBtn.addEventListener('click', async () => {
    const text = chatInput.value.trim();
    if (text && currentLobbyId) {
        // Wait for result: true = clear, false = keep
        const shouldClear = await sendUserMessage(currentLobbyId, text);
        if (shouldClear) {
            chatInput.value = '';
        }
    }
});

// Also send on Enter key
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChatBtn.click();
    }
});
// --- END NEW ---

userSearchInput.addEventListener('input', (e) => {
    renderUserList(e.target.value);
});

if (sidenavOptionsBtn && sidenavOptionsMenu) {
    sidenavOptionsBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevents the window click from firing immediately
        sidenavOptionsMenu.classList.toggle('visible');
    });
}
// Close menu if user clicks outside
window.addEventListener('click', (e) => {
    if (sidenavOptionsMenu && sidenavOptionsMenu.classList.contains('visible')) {
        if (!sidenavOptionsBtn.contains(e.target) && !sidenavOptionsMenu.contains(e.target)) {
            sidenavOptionsMenu.classList.remove('visible');
        }
    }
});

// This listens for the 'lobbyJoined' event from quibble-listener.js
document.addEventListener('lobbyJoined', (e) => {
    const joinedLobbyId = e.detail.lobbyId;
    console.log(`Event received: Joined lobby ${joinedLobbyId}`);
    
    // Set the currentLobbyId for the joined player
    currentLobbyId = joinedLobbyId; 
    lastPlayersJSON = "";

    // Start listening to the lobby we just joined
    listenToLobby(joinedLobbyId);

    // Close the "Create Lobby" modal if it's open
    createLobbyModal.classList.remove('visible');
});
// --- NEW: Quibble AI Assistant Chat Toggle ---
function toggleQuibbleAssistant() {
    if (!aiChatContainer || !openQuibbleAssistantBtn) {
        console.error("Chat widget elements not found!");
        return;
    }

    const isHidden = aiChatContainer.classList.contains('hidden');
    
    if (isHidden) {
        // Get button position and viewport dimensions
        const btnRect = openQuibbleAssistantBtn.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;

        // --- NEW POSITIONING LOGIC ---
        const modalHeight = 500; // This is the max-height from your CSS
        const spaceBelow = viewportHeight - (btnRect.bottom + 10);
        const spaceAbove = btnRect.top - 10;
        
        // Check if we're on a "mobile" screen (based on the CSS breakpoint)
        if (viewportWidth <= 768) {
            // --- 1. Mobile Logic (Centered at Bottom) ---
            aiChatContainer.style.left = '50%';
            aiChatContainer.style.top = 'auto';
            aiChatContainer.style.bottom = '10px';
            aiChatContainer.style.transform = 'translateX(-50%)'; // Center horizontally
            aiChatContainer.style.transformOrigin = 'bottom center';
        
        } else {
            // --- 2. Desktop Logic (Position near button) ---
            aiChatContainer.style.left = `${btnRect.left}px`;
            aiChatContainer.style.transform = 'none'; // Clear mobile transform

            if (spaceBelow >= modalHeight || spaceBelow >= spaceAbove) {
                // Open Downwards (Default)
                aiChatContainer.style.top = `${btnRect.bottom + 10}px`; 
                aiChatContainer.style.bottom = 'auto';
                aiChatContainer.style.transformOrigin = 'top left';
            } else {
                // Open Upwards
                aiChatContainer.style.top = 'auto';
                aiChatContainer.style.bottom = `${viewportHeight - btnRect.top + 10}px`;
                aiChatContainer.style.transformOrigin = 'bottom left';
            }
        }
        // --- END NEW LOGIC ---

        aiChatContainer.classList.remove('hidden');
        aiChatContainer.classList.remove('closing');
    } else {
        aiChatContainer.classList.add('closing');
    }
}


if (openQuibbleAssistantBtn) {
    openQuibbleAssistantBtn.addEventListener('click', toggleQuibbleAssistant);
}

if (aiChatContainer) { // <-- CHANGE
    aiChatContainer.addEventListener('animationend', () => { // <-- CHANGE
        if (aiChatContainer.classList.contains('closing')) { // <-- CHANGE
            aiChatContainer.classList.add('hidden'); // <-- CHANGE
        }
    }, { once: false });
}
// --- END NEW ---
// --- NEW: Pause Game Logic ---
async function handlePauseGame() {
    if (!hostEmail || !currentLobbyId) return;

    // Get fresh lobby data
    const lobbyRef = doc(db, "quibble_lobbies", currentLobbyId);
    const lobbySnap = await getDoc(lobbyRef);
    if (!lobbySnap.exists()) return;
    const lobbyData = lobbySnap.data();

    // Only host can pause
    if (lobbyData.host.email !== hostEmail) {
        showCustomAlert("Error", "Only the host can pause the game.");
        return;
    }

    if (lobbyData.status === 'question' || lobbyData.status === 'countdown') {
        // --- PAUSE THE GAME ---
        // Calculate remaining time
        const startTime = lobbyData.gameStateTimestamp.toDate();
        const totalTime = (lobbyData.timer || 5) * 1000;
        const elapsed = new Date().getTime() - startTime.getTime();
        let remainingTime = totalTime - elapsed;
        if (remainingTime < 0) remainingTime = 0;

        // Update Firestore
        await updateDoc(lobbyRef, {
            status: 'paused',
            pauseState: {
                oldStatus: lobbyData.status,
                remainingTime: remainingTime
            }
        });
        
    } else if (lobbyData.status === 'paused') {
        // --- RESUME THE GAME ---
        const oldStatus = lobbyData.pauseState.oldStatus;
        const remainingTime = lobbyData.pauseState.remainingTime; // e.g., 2500ms
        const totalTime = (lobbyData.timer || 5) * 1000; // e.g., 5000ms

        // Calculate the elapsed time we need to "fake"
        const elapsedToSet = totalTime - remainingTime; // e.g., 5000 - 2500 = 2500ms
        
        // Create a new start time in the past
        const newStartTime = new Date(new Date().getTime() - elapsedToSet);

        // We update the timestamp, but NOT the 'timer' field
        await updateDoc(lobbyRef, {
            status: oldStatus,
            gameStateTimestamp: newStartTime, // Set new start time
            pauseState: null // Clear the pause state
        });
        
    } else {
        // --- NOT IN GAME ---
        showCustomAlert("Not In Game", "You can only pause when a game is in progress.");
    }
}

if (pauseGameBtn) {
    pauseGameBtn.addEventListener('click', handlePauseGame);
}

// --- NEW: Info Modal Listeners ---
if (infoGameBtn) {
    infoGameBtn.addEventListener('click', () => {
        infoModal.classList.add('visible');
    });
}

if (infoModalCloseBtn) {
    infoModalCloseBtn.addEventListener('click', () => {
        infoModal.classList.remove('visible');
    });
}

if (infoModal) {
    infoModal.addEventListener('click', (e) => {
        if (e.target === infoModal) {
            infoModal.classList.remove('visible');
        }
    });
}
// --- NEW: Learn Mode Functions ---

/** Gets 3 random wrong answers from the deck */
function getWrongAnswers(lobbyData, correctAnswer) {
    const allTerms = lobbyData.flashcards.map(card => card.term);
    const wrongTerms = allTerms.filter(term => normalizeText(term) !== normalizeText(correctAnswer));
    
    // Shuffle the wrong terms
    for (let i = wrongTerms.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [wrongTerms[i], wrongTerms[j]] = [wrongTerms[j], wrongTerms[i]];
    }
    
    return wrongTerms.slice(0, 3);
}

function renderLearnModeChoices(lobbyData) {
    const card = lobbyData.flashcards[lobbyData.currentCardIndex];
    
    // --- BUG FIX: Use choices from DB ---
    let choices = lobbyData.currentChoices;

    // Fallback if choices aren't in DB yet (legacy/error prevention)
    if (!choices || choices.length === 0) {
        choices = generateChoicesForRound(lobbyData.flashcards, lobbyData.currentCardIndex);
    }

    const choiceButtons = choiceContainer.querySelectorAll('.choice-btn');
    
    // Check if user has already answered this round
    const hasAnswered = lobbyData.currentQuestionAnswers.includes(hostEmail);

    choiceButtons.forEach((btn, index) => {
        btn.textContent = choices[index];
        btn.className = 'choice-btn'; 
        btn.disabled = hasAnswered; 

        // Add click listener
        btn.onclick = () => handleLearnModeAnswer(choices[index], card, lobbyData);
    });
}

/** Handles the click of a multiple choice button */
async function handleLearnModeAnswer(selectedTerm, card, lobbyData) {
    const isCorrect = normalizeText(selectedTerm) === normalizeText(card.term);
    const allButtons = choiceContainer.querySelectorAll('.choice-btn');

    // Disable all buttons immediately
    allButtons.forEach(btn => btn.disabled = true);

    if (isCorrect) {
        // Find the clicked button and mark it correct
        allButtons.forEach(btn => {
            if (btn.textContent === selectedTerm) {
                btn.classList.add('correct');
            }
        });
        // Submit the correct answer to Firestore
        await submitLearnModeAnswer(lobbyData);

    } else {
        // Mark clicked button incorrect, and find and mark the correct one
        allButtons.forEach(btn => {
            if (btn.textContent === selectedTerm) {
                btn.classList.add('incorrect');
            }
            if (normalizeText(btn.textContent) === normalizeText(card.term)) {
                btn.classList.add('correct');
            }
        });
        // Do not update firestore, user was wrong
    }
}

/** Updates Firestore for a correct Learn Mode answer */
async function submitLearnModeAnswer(lobbyData) {
    const lobbyRef = doc(db, "quibble_lobbies", currentLobbyId);

    try {
        await runTransaction(db, async (transaction) => {
            const lobbyDoc = await transaction.get(lobbyRef);
            if (!lobbyDoc.exists()) throw "Lobby does not exist!";
            
            const freshData = lobbyDoc.data();
            
            // Double check inside transaction
            if (freshData.currentQuestionAnswers.includes(hostEmail)) {
                return; // Already answered
            }

            const updatedPlayers = freshData.players.map(player => {
                if (player.email === hostEmail) {
                    return { ...player, score: player.score + 1 };
                }
                return player;
            });
            
            // Add system message
            const newMessage = {
                type: 'system',
                text: `${hostUsername} got the correct answer!`,
                timestamp: new Date()
            };
            const updatedChat = [...freshData.chat, newMessage];

            transaction.update(lobbyRef, {
                players: updatedPlayers,
                chat: updatedChat,
                currentQuestionAnswers: [...freshData.currentQuestionAnswers, hostEmail]
            });
        });
        
        await addXP(50); // Grant XP after transaction succeeds
        
    } catch (e) {
        console.error("Transaction failed: ", e);
    }
}
// --- END NEW Learn Mode Functions ---
const handleAiSendMessage = async () => {
    const question = aiChatInput.value.trim();
    if (!question) return;

    aiChatInput.disabled = true;
    aiChatSendBtn.disabled = true;

    const userMessage = document.createElement('div');
    userMessage.className = 'chat-message user-message';
    userMessage.innerHTML = `<p>${question}</p>`;
    aiChatMessages.appendChild(userMessage);
    aiChatInput.value = '';
    aiChatMessages.scrollTop = aiChatMessages.scrollHeight;

    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'typing-indicator';
    typingIndicator.innerHTML = `
        <svg class="ai-sparkle-icon-typing" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path class="sparkle-main" d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5Z"></path>
        </svg>
        <p>Assistant is typing...</p>`;
    aiChatMessages.appendChild(typingIndicator);
    aiChatMessages.scrollTop = aiChatMessages.scrollHeight;

    try {
        // ❗ IMPORTANT: This URL assumes your new function is deployed as 'chatWithQuibbleAI'
        const CHAT_URL = 'https://chatwithquibbleai-zpanpdg2va-uc.a.run.app';
        
        const response = await fetch(CHAT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question })
        });

        typingIndicator.remove();

        if (!response.ok) throw new Error('Network response was not ok.');

        const data = await response.json();
        
        const aiMessage = document.createElement('div');
        aiMessage.className = 'chat-message ai-message';
        aiMessage.innerHTML = marked.parse(data.answer); // Uses marked.js
        aiChatMessages.appendChild(aiMessage);
        
    } catch (error) {
        console.error("Chat error:", error);
        typingIndicator.remove();
        const errorMessage = document.createElement('div');
        errorMessage.className = 'chat-message ai-message';
        errorMessage.innerHTML = `<p>Sorry, I'm having trouble connecting right now.</p>`;
        aiChatMessages.appendChild(errorMessage);
    } finally {
        aiChatInput.disabled = false;
        aiChatSendBtn.disabled = false;
        aiChatInput.focus();
        aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
    }
};

aiChatSendBtn.addEventListener('click', handleAiSendMessage);
aiChatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAiSendMessage();
});

// --- Add Quick Question Buttons ---
const initialAiMessageDiv = document.getElementById('initialAiMessage');
if (initialAiMessageDiv) {
    const questions = [
        'What is Learn Mode?',
        'How do I get XP?',
        'What does the Host do?'
    ];

    questions.forEach(q => {
        const btn = document.createElement('button');
        btn.textContent = q;
        btn.className = 'quick-question-button';
        btn.addEventListener('click', () => {
            aiChatInput.value = q;
            handleAiSendMessage();
            // Remove all quick buttons after one is clicked
            initialAiMessageDiv.querySelectorAll('.quick-question-button').forEach(b => b.remove());
        });
        initialAiMessageDiv.appendChild(btn);
    });
}
// --- NEW: Tutorial Modal Listeners ---
if (tutorialGameBtn) {
    tutorialGameBtn.addEventListener('click', () => {
        tutorialModal.classList.add('visible');
    });
}

if (tutorialModalCloseBtn) {
    tutorialModalCloseBtn.addEventListener('click', () => {
        tutorialModal.classList.remove('visible');
    });
}

if (tutorialModal) {
    tutorialModal.addEventListener('click', (e) => {
        if (e.target === tutorialModal) {
            tutorialModal.classList.remove('visible');
        }
    });
}

// Sidenav logic
tutorialSidenavBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const targetId = btn.dataset.target;

        // 1. Remove 'active' from all buttons
        tutorialSidenavBtns.forEach(b => b.classList.remove('active'));
        // 2. Add 'active' to the clicked button
        btn.classList.add('active');

        // 3. Hide all content pages
        tutorialContentPages.forEach(page => page.classList.remove('active'));
        // 4. Show the target page
        const targetPage = document.getElementById(targetId);
        if (targetPage) {
            targetPage.classList.add('active');
        }
    });
});
// --- NEW HELPER: Generate Choices ---
function generateChoicesForRound(flashcards, cardIndex) {
    const currentCard = flashcards[cardIndex];
    const correctAnswer = currentCard.term;
    
    const allTerms = flashcards.map(card => card.term);
    const wrongTerms = allTerms.filter(term => normalizeText(term) !== normalizeText(correctAnswer));
    
    // Shuffle wrong terms
    for (let i = wrongTerms.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [wrongTerms[i], wrongTerms[j]] = [wrongTerms[j], wrongTerms[i]];
    }
    
    const selectedWrong = wrongTerms.slice(0, 3);
    while (selectedWrong.length < 3) {
        selectedWrong.push(`Wrong Answer ${selectedWrong.length + 1}`);
    }

    let choices = [correctAnswer, ...selectedWrong];
    // Shuffle the final set of 4
    for (let i = choices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [choices[i], choices[j]] = [choices[j], choices[i]];
    }
    return choices;
}
// --- END NEW ---
function triggerInstantFeedback() {
    // 1. Clear Input immediately
    const input = document.getElementById('mainChatInput');
    input.value = ""; 
    
    // 2. Add Green Flash Class
    input.classList.add('input-correct-flash');
    setTimeout(() => input.classList.remove('input-correct-flash'), 500);

    // 3. Create Floating Toast
    const wrapper = document.querySelector('.chat-input-wrapper');
    if (wrapper) {
        const toast = document.createElement('div');
        toast.className = 'correct-toast';
        toast.innerHTML = '<i class="fa-solid fa-check"></i> Correct! (+50 XP)';
        wrapper.appendChild(toast);

        // Remove from DOM after animation finishes
        setTimeout(() => toast.remove(), 1500);
    }
}