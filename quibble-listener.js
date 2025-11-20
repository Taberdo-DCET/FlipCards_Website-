import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { 
    getFirestore, doc, onSnapshot, query, collection, where, 
    updateDoc, arrayRemove, arrayUnion, getDoc, getDocs
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
const customAlertMessage = document.getElementById('customAlertMessage');
const customAlertOkBtn = document.getElementById('customAlertOkBtn');

let pendingLobbyId = null; 
let joinedLobbyId = null; 
let inviteTimeout = null; // <-- ADD THIS LINE
window.currentNormalizedAnswer = "";

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
}

// Update the button to use the new function
declineInviteBtn.addEventListener('click', declineInvite);

// --- NEW: Custom Alert Function (for guest) ---
function showCustomAlert(message) {
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
async function sendUserMessage(lobbyId, text) {
    if (!lobbyId || !text || !currentUserEmail) return;
    const lobbyRef = doc(db, "quibble_lobbies", lobbyId);

    // 1. Check for correct answer FIRST
    try {
        const lobbySnap = await getDoc(lobbyRef);
        if (!lobbySnap.exists()) return;
        const lobbyData = lobbySnap.data();

        if (lobbyData.status !== 'question') {
            // Game not running, just send chat message
        
        // --- UPDATED: Only check for answers in "test" mode ---
        } else if (lobbyData.gameMode === 'test') { 
            // Game is running, check answer
            const currentCard = lobbyData.flashcards[lobbyData.currentCardIndex];
            if (!currentCard) return;

            const normalizedGuess = normalizeText(text);
            const normalizedAnswer = normalizeText(currentCard.term);

            if (normalizedGuess === normalizedAnswer) {
                // Correct answer!
                
                // Check if guest already answered
                if (lobbyData.currentQuestionAnswers.includes(currentUserEmail)) {
                    showCustomAlert("You've already answered this question!"); // <-- FIX 3
                    return; // Stop, don't send message
                }

                // Update the score in the players array
                const updatedPlayers = lobbyData.players.map(player => {
                    if (player.email === currentUserEmail) {
                        player.score += 1; // Add 1 point
                    }
                    return player;
                });
await addXP(50);
                // Update Firestore. Host listener will send announcement.
                await updateDoc(lobbyRef, {
                    players: updatedPlayers,
                    currentQuestionAnswers: arrayUnion(currentUserEmail)
                });
                return; // Stop, don't send the answer to chat
            }
        }
    } catch (e) {
        console.error("Error checking answer: ", e);
    }

    // 2. If not a correct answer, send the user's chat message
    const message = {
        type: 'user',
        username: currentUsername, // Guest's username
        text: text,
        timestamp: new Date()
    };
    try {
        await updateDoc(lobbyRef, { chat: arrayUnion(message) });
    } catch (e) {
        console.error("Error sending message: ", e);
    }
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

// --- NEW: Renders a message object to the chat UI ---
function addChatMessageToUI(message) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-message';

    if (message.type === 'system') {
        msgDiv.classList.add('system');
        msgDiv.textContent = message.text;
    } else {
        const hash = stringToHash(message.username);
        const color = chatUsernameColors[hash % chatUsernameColors.length];

        // Hide correct answers
        const normalizedText = normalizeText(message.text);
        if (window.currentNormalizedAnswer && normalizedText === window.currentNormalizedAnswer) {
            msgDiv.innerHTML = `<strong style="color: ${color};">${message.username}:</strong> <em style="color:#888;">[correct answer]</em>`;
        } else {
            msgDiv.innerHTML = `<strong style."color: ${color};">${message.username}:</strong> ${message.text}`;
        }
    }
    chatMessages.appendChild(msgDiv);
}

// --- NEW: Guest Chat Listeners ---
// --- NEW: Guest Chat Listeners ---
sendChatBtn.addEventListener('click', () => {
    const text = chatInput.value.trim();
    if (text && joinedLobbyId) {
        sendUserMessage(joinedLobbyId, text);
        chatInput.value = '';
    }
});
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChatBtn.click();
    }
});