import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { 
    getFirestore, doc, onSnapshot, query, collection, where, 
    updateDoc, arrayRemove, arrayUnion, getDoc, getDocs, runTransaction // <-- ADDED
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { db } from "./firebaseinit.js";
import { addXP } from './xpTracker.js';

console.log("Quibble Listener Loaded.");

const auth = getAuth();
let inviteListener = null; 
// <-- ADD THIS
let currentUserEmail = null;
let currentUsername = "Guest";

// --- DOM Elements ---
const inviteModal = document.getElementById('inviteModal');
const inviteMessage = document.getElementById('inviteMessage');
const acceptInviteBtn = document.getElementById('acceptInviteBtn');
const declineInviteBtn = document.getElementById('declineInviteBtn');

const homeBtn = document.getElementById('homeBtn');

// --- Lobby Status Box DOM Elements ---
const lobbyStatusBox = document.getElementById('lobbyStatusBox');
const lobbyReadyBtn = document.getElementById('lobbyReadyBtn');
const lobbyLeaveBtn = document.getElementById('lobbyLeaveBtn');

const lobbyCollapseBtn = document.getElementById('lobbyCollapseBtn'); // <-- ADD THIS
const lobbyStatusOpenBtn = document.getElementById('lobbyStatusOpenBtn');
const startBtn = document.getElementById('startBtn');
const createLobbyBtn = document.getElementById('createLobbyBtn');

const pauseGameBtn = document.getElementById('pauseGameBtn');

const chatMessages = document.getElementById('mainChatMessages');
const chatInput = document.getElementById('mainChatInput');
const sendChatBtn = document.getElementById('mainSendChatBtn');
const customAlertModal = document.getElementById('customAlertModal');
const customAlertTitle = document.getElementById('customAlertTitle');
const customAlertMessage = document.getElementById('customAlertMessage');
const customAlertOkBtn = document.getElementById('customAlertOkBtn');

let pendingLobbyId = null; 
let joinedLobbyId = null; 
let inviteTimeout = null; // <-- ADD THIS LINE
let lastInvitedLobbyId = null;
window.currentNormalizedAnswer = "";
let lastAnsweredCardIndex = -1;

onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("Listener: User is logged in.", user.email);
        currentUserEmail = user.email;

        // Get username
        getDoc(doc(db, "usernames", user.email)).then(async usernameSnap => { // <-- ADD ASYNC
            if (usernameSnap.exists()) {
                currentUsername = usernameSnap.data().username;
            } else {
                currentUsername = user.email.split('@')[0];
            }

            // --- NEW: Check if user is already in a lobby ---
            const lobbyQuery = query(collection(db, "quibble_lobbies"), where("playerEmails", "array-contains", currentUserEmail));
            const lobbySnapshot = await getDocs(lobbyQuery);

            if (!lobbySnapshot.empty) {
                if (homeBtn) homeBtn.disabled = true;
                // --- User is already in a lobby ---
                const lobbyDoc = lobbySnapshot.docs[0];
                const lobbyData = lobbyDoc.data(); 

                // --- NEW: Check if user is host ---
                if (lobbyData.host.email === currentUserEmail) {
                    console.log("Listener: User is host, listener stopping.");
                    if (pauseGameBtn) pauseGameBtn.disabled = false;
                    return; // Stop. The host's UI is handled by Quibble.js
                }
                // --- END NEW ---
if (pauseGameBtn) pauseGameBtn.disabled = true;
                joinedLobbyId = lobbyDoc.id;
                createLobbyBtn.innerHTML = '<i class="fa-solid fa-gear"></i> In Lobby';
                // Dispatch event for Quibble.js to load UI
                const event = new CustomEvent('lobbyJoined', { detail: { lobbyId: joinedLobbyId } });
                document.dispatchEvent(event);

                // --- NEW: Check game status BEFORE starting listener ---
                if (lobbyData.status === 'countdown' || lobbyData.status === 'question') {
                    // Game is already in progress, just let Quibble.js handle it
                    console.log("Found user in active game.");
                    chatInput.focus(); // <-- ADD THIS
                    startBtn.disabled = true;
                    createLobbyBtn.disabled = true;
                } else {
                    // Game is waiting, show modal and start listener
                    console.log("Found user in existing lobby:", joinedLobbyId);
                    lobbyStatusBox.classList.add('visible');
                    // startJoinedLobbyListener(joinedLobbyId); // <-- DELETE THIS
                    startBtn.disabled = true;
                    createLobbyBtn.disabled = true;
                }
                // --- END NEW ---

            } else {
                if (homeBtn) homeBtn.disabled = false;
                // --- User is not in a lobby, listen for NEW invites ---
                console.log("User not in a lobby, listening for invites.");
                if (inviteListener) {
                    inviteListener(); // Unsubscribe from old listener
                }
                const q = query(
                    collection(db, "quibble_lobbies"), 
                    where("invited", "array-contains", user.email)
                );
                inviteListener = onSnapshot(q, (snapshot) => {
                    if (!snapshot.empty && !joinedLobbyId) {
                        const inviteDoc = snapshot.docs[0];
                        pendingLobbyId = inviteDoc.id;
                        const lobbyData = inviteDoc.data();
                        
                        inviteMessage.textContent = `${lobbyData.host.username} invited you to play "${lobbyData.setTitle}"!`;
                        inviteModal.classList.add('visible');

                        // --- NEW: Play Invite Sound (Fixed Volume & Stacking) ---
                        // Only play if this is a NEW invite (prevents stacking on DB updates)
                        if (inviteDoc.id !== lastInvitedLobbyId) {
                            const inviteSound = new Audio('invite.mp3');
                            inviteSound.volume = 1; // Set consistent volume
                            inviteSound.play().catch(e => console.warn("Audio autoplay blocked:", e));
                            lastInvitedLobbyId = inviteDoc.id;
                        }
                        // --- END NEW ---

                        // --- ADD THIS BLOCK ---
                        // Clear any old timeout just in case
                        if (inviteTimeout) {
                            clearTimeout(inviteTimeout);
                        }
                        
                        // Start a new 10-second timeout
                        inviteTimeout = setTimeout(() => {
                            console.log("Invite timed out, declining.");
                            showCustomAlert("The invite has expired.");
                            declineInvite(); // Call the shared decline function
                        }, 10000); // 10000ms = 10 seconds
                        // --- END ADD ---
                    }
                });
            }
        });
        
    } else {
        console.log("Listener: User is logged out.");
        if (inviteListener) {
            inviteListener(); 
        }
        
        if (gameLoopId) { // <-- ADD THIS
            cancelAnimationFrame(gameLoopId);
            gameLoopId = null;
        }
        currentUserEmail = null;
    }
});
// --- NEW: Reusable function to listen to a joined lobby ---

// --- Handle Invite Actions ---

acceptInviteBtn.addEventListener('click', async () => {
    
    // --- THIS IS THE FIX ---
    // 1. Check if user is already a guest in another lobby
    if (joinedLobbyId) {
        console.warn("User is already in a lobby (as guest), declining new invite.");
        showCustomAlert("You are already in a lobby. Please leave your current lobby to accept a new invite.");
        declineInvite(); // Automatically decline the new invite
        return;
    }

    // 2. Check if user is already a host
    if (window.hostLobbyId) {
        console.warn("User is already hosting a lobby, declining new invite.");
        showCustomAlert("You are already hosting a lobby. Please close your lobby to accept an invite.");
        declineInvite(); // Automatically decline the new invite
        return;
    }
    // --- END OF FIX ---

    // Clear the 10-second timer
    if (inviteTimeout) {
        clearTimeout(inviteTimeout);
        inviteTimeout = null;
    }

    if (!pendingLobbyId || !currentUserEmail) return;

    const lobbyRef = doc(db, "quibble_lobbies", pendingLobbyId);
    
    try {
        // Add user to 'players' array and remove from 'invited' array
        await updateDoc(lobbyRef, {
            invited: arrayRemove(currentUserEmail),
            players: arrayUnion({
                email: currentUserEmail,
                username: currentUsername,
                score: 0,
                isReady: false 
            }),
            playerEmails: arrayUnion(currentUserEmail) // <-- ADD THIS
        });

        

        console.log("Joined lobby!");

        // --- ADD THIS LINE ---
        previousPlayerEmails.clear(); // Resets the "join/leave" detector

        // This event tells Quibble.js to start listening to this lobby ID
        const event = new CustomEvent('lobbyJoined', { detail: { lobbyId: pendingLobbyId } });
        document.dispatchEvent(event);

        // Show Lobby Status Box
        joinedLobbyId = pendingLobbyId; // Store our current lobby
        lobbyStatusBox.classList.add('visible');
        if (homeBtn) homeBtn.disabled = true;
        if (pauseGameBtn) pauseGameBtn.disabled = true;

        startBtn.disabled = true;
        createLobbyBtn.disabled = true;
        createLobbyBtn.innerHTML = '<i class="fa-solid fa-gear"></i> In Lobby';

    } catch (e) {
        console.error("Error accepting invite: ", e);
    }

    inviteModal.classList.remove('visible');
    pendingLobbyId = null;
});

// --- NEW: Reusable function to decline an invite ---
async function declineInvite() {
    // 1. Clear the 10-second timer so it doesn't run again
    if (inviteTimeout) {
        clearTimeout(inviteTimeout);
        inviteTimeout = null;
    }

    if (!pendingLobbyId || !currentUserEmail) return;
    const lobbyRef = doc(db, "quibble_lobbies", pendingLobbyId);

    try {
        // 2. Just remove user from 'invited' array
        await updateDoc(lobbyRef, {
            invited: arrayRemove(currentUserEmail)
        });
    } catch (e) {
        console.error("Error declining invite: ", e);
    }

// 3. Hide modal and clear pending state
    inviteModal.classList.remove('visible');
    pendingLobbyId = null;
    lastInvitedLobbyId = null; // <-- Reset so next invite plays sound
}

// Update the button to use the new function
declineInviteBtn.addEventListener('click', declineInvite);

// --- NEW: Custom Alert Function (for guest) ---
function showCustomAlert(message, title = "Alert") {
    if (customAlertTitle) customAlertTitle.textContent = title;
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

// --- NEW: Normalizes text for answer checking ---
function normalizeText(text) {
    if (typeof text !== 'string') return '';
    return text.toLowerCase().replace(/[^a-z0-9]/gi, '');
}

// --- NEW: Sends a system message (Guest CANNOT do this) ---
// This is just here so sendUserMessage can call it, but it will be blocked
async function sendSystemMessage(lobbyId, text) {
    console.warn("Guest attempted to send system message:", text);
    // Guests are not allowed to send system messages.
    // The host's listener will handle announcements.
    return;
}

// --- NEW: Sends user message and checks for correct answer (GUEST) ---
// --- NEW: Sends user message and checks for correct answer (GUEST) ---
async function sendUserMessage(lobbyId, text) {
    if (!lobbyId || !text || !currentUserEmail) return;
    const lobbyRef = doc(db, "quibble_lobbies", lobbyId);

    // 1. Check for correct answer FIRST
    try {
        // --- FIX START: Use the VISUAL data, not a fresh fetch ---
        let lobbyData = window.currentLobbyDataForRender;
        
        if (!lobbyData) {
            // Fallback if global var is missing
            const lobbySnap = await getDoc(lobbyRef);
            if (!lobbySnap.exists()) return;
            lobbyData = lobbySnap.data();
        }

        // --- CHANGE 1: Prevent Double Sending (If I am Host, STOP) ---
        // Quibble.js handles the host. This script handles guests.
        if (lobbyData.host && lobbyData.host.email === currentUserEmail) {
            return false; 
        }
        // --- END CHANGE 1 ---

        if (lobbyData.status !== 'question') {
            // Game not running, just send chat message below
        
        } else if (lobbyData.gameMode === 'test') { 
            // Game is running, check answer
            const currentCard = lobbyData.flashcards[lobbyData.currentCardIndex];
            if (!currentCard) return;

            const normalizedGuess = normalizeText(text);
            const normalizedAnswer = normalizeText(currentCard.term);

            if (normalizedGuess === normalizedAnswer) {
                // Correct answer!
                
                // --- NEW: Play Correct Sound ---
                const correctSound = new Audio('correct.mp3');
                correctSound.volume = 1; // Set consistent volume
                correctSound.play().catch(e => console.warn("Audio play blocked:", e));
                // --- END NEW ---

                const targetCardIndex = lobbyData.currentCardIndex; 

                // --- FIX: Race Condition Handling (Local Check) ---
                if (lastAnsweredCardIndex === targetCardIndex) {
                    addChatMessageToUI({
                        type: 'system',
                        text: "You have already answered this question.",
                        timestamp: new Date()
                    });
                    const chatContainer = document.getElementById('mainChatMessages');
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                    return false; 
                }
                lastAnsweredCardIndex = targetCardIndex;
                // ------------------------------------
                
                // --- OPTIMISTIC UI ---
                triggerInstantFeedback(); 
                const optimisticMsg = {
                    type: 'system',
                    text: `${currentUsername} got the correct answer!`,
                    timestamp: new Date()
                };
                addChatMessageToUI(optimisticMsg, lobbyData.players);
                const chatContainer = document.getElementById('mainChatMessages');
                chatContainer.scrollTop = chatContainer.scrollHeight;

                // --- BUG FIX: Transaction for Guests ---
                try {
                    await runTransaction(db, async (transaction) => {
                        const freshDoc = await transaction.get(lobbyRef);
                        if (!freshDoc.exists()) throw "Lobby missing";
                        const freshData = freshDoc.data();

                        // If the server moved to the next card while we were sending, abort.
                        if (freshData.currentCardIndex !== targetCardIndex) {
                            throw "Round Changed";
                        }

                        if (freshData.currentQuestionAnswers.includes(currentUserEmail)) {
                             throw "Already Answered";
                        }

                        const updatedPlayers = freshData.players.map(p => {
                            if (p.email === currentUserEmail) return { ...p, score: p.score + 1 };
                            return p;
                        });

                        // --- FIX START: Create System Message ---
const sysMsg = {
    type: 'system',
    text: `${currentUsername} got the correct answer!`,
    timestamp: new Date()
};
// ----------------------------------------

transaction.update(lobbyRef, {
    players: updatedPlayers,
    currentQuestionAnswers: [...freshData.currentQuestionAnswers, currentUserEmail],
    chat: arrayUnion(sysMsg) // <--- FIX: SAVE MESSAGE TO DB
});
                    });
                    await addXP(50);
                    
                } catch (e) {
                    // --- CHANGE 2: Handle Errors Gracefully (No Modals) ---
                    if (e === "Round Changed") {
                        console.log("[DEBUG] Answer ignored because the round ended before save.");
                        
                        addChatMessageToUI({
                            type: 'system',
                            text: "Time ran out! Your answer was too late to be counted.",
                            timestamp: new Date()
                        }, lobbyData.players);
                        
                        const chatContainer = document.getElementById('mainChatMessages');
                        chatContainer.scrollTop = chatContainer.scrollHeight;

                        return false; // Don't clear input

                    } else if (e === "Already Answered") {
                        console.log("[DEBUG] Answer ignored because already recorded.");
                        return false; // Don't clear input
                    } else {
                        console.error("Transaction error:", e);
                    }
                }
                // --- END CHANGE 2 ---
                return true; // Success
            } else {
                // --- NEW: Play Wrong Sound (Test Mode) ---
                const wrongSound = new Audio('chat.mp3');
                wrongSound.volume = .3;
                wrongSound.play().catch(e => console.warn("Audio play blocked:", e));
                // -----------------------------------------
            }
        }
    } catch (e) {
        console.error("Error checking answer: ", e);
    }
    // 2. If not a correct answer, send the user's chat message
    const message = {
        type: 'user',
        username: currentUsername,
        text: text,
        timestamp: new Date()
    };
    try {
        await updateDoc(lobbyRef, { chat: arrayUnion(message) });
    } catch (e) {
        console.error("Error sending message: ", e);
    }
    return true;
}

// --- Lobby Status Box Actions ---

lobbyLeaveBtn.addEventListener('click', async () => {
    if (!joinedLobbyId || !currentUserEmail) return;

    // --- NEW: Stop the listener *before* updating ---
    
    // --- END NEW ---
// --- NEW: Cancel game loop ---
    if (gameLoopId) {
        cancelAnimationFrame(gameLoopId);
        gameLoopId = null;
    }
    // --- END NEW ---
    const lobbyRef = doc(db, "quibble_lobbies", joinedLobbyId);

    try {
        // We need to remove our specific player object.
        const lobbySnap = await getDoc(lobbyRef);
        if (lobbySnap.exists()) {
            const lobbyData = lobbySnap.data();
            // Create a new array *without* this player
            // Create a new array *without* this player
            const updatedPlayers = lobbyData.players.filter(player => player.email !== currentUserEmail);
            // --- NEW: Also remove from playerEmails array ---
            const updatedPlayerEmails = lobbyData.playerEmails.filter(email => email !== currentUserEmail);

            await updateDoc(lobbyRef, {
                players: updatedPlayers,
                playerEmails: updatedPlayerEmails // <-- ADD THIS
            });
        }
        
        // Hide the box and reset state
        lobbyStatusBox.classList.remove('visible');
        joinedLobbyId = null;
        
        // Reload the page to reset the UI completely
        window.location.reload();

    } catch (e) {
        console.error("Error leaving lobby: ", e);
    }
});

lobbyReadyBtn.addEventListener('click', async () => {
    if (!joinedLobbyId || !currentUserEmail) return;

    const lobbyRef = doc(db, "quibble_lobbies", joinedLobbyId);
    lobbyReadyBtn.disabled = true; // Prevent spam clicking

    try {
        const lobbySnap = await getDoc(lobbyRef);
        if (!lobbySnap.exists()) {
            console.error("Lobby not found");
            return;
        }

        const lobbyData = lobbySnap.data();
        let isCurrentlyReady = false;

        // Find our player and update their ready status
        const updatedPlayers = lobbyData.players.map(player => {
            if (player.email === currentUserEmail) {
                isCurrentlyReady = player.isReady; // Get current state
                player.isReady = !player.isReady; // Toggle ready state
            }
            return player;
        });

        // Write the new array back to Firestore
        await updateDoc(lobbyRef, {
            players: updatedPlayers
        });
        
        // Update button text based on the *new* state
        if (!isCurrentlyReady) {
            lobbyReadyBtn.innerHTML = '<i class="fa-solid fa-xmark"></i> Unready';
            lobbyReadyBtn.classList.remove('ready-btn'); // Make it grey
        } else {
            lobbyReadyBtn.innerHTML = '<i class="fa-solid fa-check"></i> Ready';
            lobbyReadyBtn.classList.add('ready-btn'); // Make it yellow
        }

    } catch (e) {
        console.error("Error updating ready status: ", e);
    }

    lobbyReadyBtn.disabled = false; // Re-enable button
});
lobbyCollapseBtn.addEventListener('click', () => {
    lobbyStatusBox.classList.add('collapsed');
    lobbyStatusOpenBtn.classList.add('visible');
});

lobbyStatusOpenBtn.addEventListener('click', () => {
    lobbyStatusBox.classList.remove('collapsed');
    lobbyStatusOpenBtn.classList.remove('visible');
});



function stringToHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash); // Ensure it's a positive number
}

// Ensure SLOT_COLORS is defined here too if not imported
const SLOT_COLORS = [
    '#FF5252', '#00FA9A', '#E040FB', '#7C4DFF', '#536DFE', 
    '#448AFF', '#40C4FF', '#18FFFF', '#64FFDA', '#69F0AE', 
    '#B2FF59', '#EEFF41', '#FFFF00', '#FFD740', '#FF6E40'
];

function addChatMessageToUI(message, players = []) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-message';

    if (message.type === 'system') {
        msgDiv.classList.add('system');
        msgDiv.textContent = message.text;
        
        // NEW: Handle Gold System Messages
        if (message.isGold) {
            msgDiv.classList.add('gold-msg'); 
        }
    } else {
        // Find player index to determine slot color
        const playerIndex = players.findIndex(p => p.username === message.username);
        
        let color;
        if (playerIndex !== -1) {
            color = SLOT_COLORS[playerIndex % SLOT_COLORS.length];
        } else {
            color = '#aaaaaa'; // Fallback
        }

        const normalizedText = normalizeText(message.text);
        if (window.currentNormalizedAnswer && normalizedText === window.currentNormalizedAnswer) {
            msgDiv.innerHTML = `<strong style="color: ${color};">${message.username}:</strong> <em style="color:#888;">[correct answer]</em>`;
        } else {
            msgDiv.innerHTML = `<strong style="color: ${color};">${message.username}:</strong> ${message.text}`;
        }
    }
    chatMessages.appendChild(msgDiv);
}
sendChatBtn.addEventListener('click', async () => { 
    // --- FIX START: STRICT HOST BLOCK ---
    // 1. Check if I am the Host. If I am, STOP immediately.
    // Quibble.js handles the Host's chat logic. This listener is ONLY for Guests.
    const lobbyData = window.currentLobbyDataForRender;
    if (lobbyData && lobbyData.host && lobbyData.host.email === currentUserEmail) {
        return; 
    }
    // --- FIX END ---

    const text = chatInput.value.trim();
    if (text && joinedLobbyId) {
        // FIX: Clear input IMMEDIATELY (Optimistic UI)
        chatInput.value = ''; 
        
        // Send in background (we don't wait to clear)
        await sendUserMessage(joinedLobbyId, text);
    }
});

// --- FIX: REMOVED DUPLICATE KEYPRESS LISTENER ---
// Quibble.js already contains this exact listener. 
// Having it in both files caused the "Send" button to be clicked TWICE 
// whenever 'Enter' was pressed, creating double messages.
/*
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChatBtn.click();
    }
});
*/
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