// invlistenerquibbl.js
import { auth, db } from './firebaseinit.js';
import { onSnapshot, doc, setDoc, getDoc, getDocs, collection, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js";
import { addXP } from './xpTracker.js'; // <-- Make sure this is at the top of your file
import { storage } from './firebaseStorageInit.js';
import { increment } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

let countdownFinished = localStorage.getItem("countdownFinished") === "true";


let currentUserEmail = null;
let acceptedPlayers = [];
let isUserReady = false;
let lobbyDocRef = null;
let currentLobbyHost = null;
let countdownStarted = false;
let lastSetID = null;
function showCustomAlert(message, type = 'default') {
  const alertModal = document.getElementById("customAlertModal");
  if (!alertModal) return; 

  const alertContent = alertModal.querySelector('.modal-content');
  const alertMessage = document.getElementById("customAlertMessage");
  const closeBtn = document.getElementById("customAlertOkBtn");

  alertContent.classList.remove('success', 'error');
  if (type === 'success') {
    alertContent.classList.add('success');
  } else if (type === 'error') {
    alertContent.classList.add('error');
  }

  alertMessage.textContent = message;
  alertModal.classList.remove("hidden");

  closeBtn.onclick = () => {
    alertModal.classList.add("hidden");
  };
}
// PASTE THIS NEW FUNCTION AFTER your showAlert function

// Helper function to show a custom confirmation dialog
function showConfirm(message) {
  const confirmModal = document.getElementById("customConfirmModal");
  if (!confirmModal) return Promise.resolve(false); // Failsafe

  const confirmMessage = document.getElementById("confirmMessage");
  const confirmBtn = document.getElementById("confirmBtn");
  const cancelBtn = document.getElementById("cancelBtn");

  confirmMessage.textContent = message;
  confirmModal.classList.remove("hidden");

  return new Promise(resolve => {
    confirmBtn.onclick = () => {
      confirmModal.classList.add("hidden");
      resolve(true); // User clicked Confirm
    };
    cancelBtn.onclick = () => {
      confirmModal.classList.add("hidden");
      resolve(false); // User clicked Cancel
    };
  });
}
function startCountdownAndRedirect(timeRemaining) {
  let countdown = Math.ceil(timeRemaining / 1000);
  const modal = document.createElement("div");
  modal.classList.add("countdown-modal");
  modal.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #171717;
    color: white;
    padding: 20px 40px;
    border-radius: 12px;
    font-family: 'Satoshi';
    font-size: 24px;
    text-align: center;
    z-index: 9999;
  `;
  modal.innerText = `Game starting in ${countdown}...`;
  document.body.appendChild(modal);

  const interval = setInterval(() => {
    countdown--;
    if (countdown > 0) {
      modal.innerText = `Game starting in ${countdown}...`;
    } else {
  clearInterval(interval);
  
modal.remove();
countdownFinished = false;
localStorage.setItem("countdownFinished", "false"); // Set false before the start


  const miniModal = document.querySelector('.invite-popup');
  if (miniModal) miniModal.remove();

  (async () => {
  const gameRef = doc(db, "gamestartquibbl", currentLobbyHost);
  const gameSnap = await getDoc(gameRef);
  if (gameSnap.exists()) {
    const gameData = gameSnap.data();
    if (gameData.flashcardSequence) {
      startDefinitionSequence(gameData.flashcardSequence, gameData.flashcardSequence.length);
    } else if (gameData.cardSet?.flashcards) {
      startDefinitionSequence(gameData.cardSet.flashcards, gameData.cardSet.numCardsToDisplay || 0);
    }
  }
})();




  // Reset gameStartTime
  if (lobbyDocRef) {
    setDoc(lobbyDocRef, { gameStartTime: null }, { merge: true })
      .then(() => console.log("gameStartTime reset"))
      .catch(err => console.error("Failed to reset gameStartTime:", err));
  }




    }
  }, 1000);
}
function startDefinitionSequence(flashcards = [], maxCards = 0) {
  const rightContainer = document.querySelector('.right-container');
  if (!rightContainer || flashcards.length === 0) return;

  let index = 0;
const cardsToShow = maxCards > 0 ? flashcards.slice(0, maxCards) : flashcards;



  const showNextDefinition = () => {
  if (index >= cardsToShow.length) {
  showEndGameModal(); // ⬅️ NEW FUNCTION
  return;
}


  const card = cardsToShow[index];
  window.currentCorrectAnswer = card.term?.toLowerCase() || "";
  window.correctAnswerTracker = {}; // ✅ reset tracker for new card

  let definitionHTML = "";

if (card.definition && (card.definition.startsWith("https://") && card.definition.includes("firebasestorage") || /\.(jpeg|jpg|gif|png|webp)$/i.test(card.definition))) {

  definitionHTML = `<img src="${card.definition}" alt="Definition Image" style="max-width: 80%; border-radius: 10px; object-fit: contain;">`;
} else {
  definitionHTML = `<p style="max-width: 80%;">${card.definition || 'No definition provided.'}</p>`;
}

rightContainer.innerHTML = `
  <div class="definition-slide" style="
    padding: 20px;
    background: transparent;
    border-radius: 10px;
    font-family: 'Satoshi';
    font-size: 20px;
    color: #fff;
    height: calc(100% - 10px);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    overflow: hidden;">
    
    <h3 style="margin-bottom: 10px;">Definition ${index + 1}</h3>
    ${definitionHTML}
  </div>

  <div class="definition-timer-bar">
    <div class="timer-fill"></div>
  </div>
`;
document.getElementById("chatInputField")?.focus();
const chatInput = document.getElementById("chatInputField");
  if (chatInput) {
    chatInput.scrollIntoView({ behavior: "smooth", block: "center" });
  }
if (!countdownFinished) {
  countdownFinished = true;
  localStorage.setItem("countdownFinished", "true");
}


  index++;
  setTimeout(showNextDefinition, 10000); // next card after 10s
};


  showNextDefinition();
}
// REPLACE your old showEndGameModal function with this new one:
// REPLACE your old showEndGameModal function with this:
async function showEndGameModal() {
  const gameRef = doc(db, "gamestartquibbl", currentLobbyHost);
  const snapshot = await getDoc(gameRef);
  if (!snapshot.exists()) return;

  const data = snapshot.data();
  const players = [...(data.players || [])];
  players.sort((a, b) => (b.correctScore || 0) - (a.correctScore || 0));

  const isHost = auth.currentUser?.email === currentLobbyHost;
  const topScore = players.length > 0 ? players[0].correctScore || 0 : 0;
  const winners = players.filter(p => (p.correctScore || 0) === topScore);
  const isDraw = winners.length > 1;

  if (isHost) {
    for (const winner of winners) {
      const winnerRef = doc(db, "quibblwinner", winner.email);
      await setDoc(winnerRef, { wins: increment(1) }, { merge: true });
    }
  }

  const winnerAnnouncementHTML = `
    <div class="winner-announcement">
        <h3>${isDraw ? 'It\'s a Draw!' : '🏆 Winner 🏆'}</h3>
        <div class="winner-info">
            ${winners.map(winner => `
                <div>
                    <img src="${winner.avatar || 'Group-100.png'}" alt="winner avatar">
                    <div class="winner-name">${winner.username || winner.email.split('@')[0]}</div>
                </div>
            `).join('')}
        </div>
    </div>
  `;

  const playerRowsHTML = await Promise.all(players.map(async (player) => {
    const score = player.correctScore || 0;
    const isWinner = score === topScore;
    let earnedXP = isWinner ? (isDraw ? 400 : 500) : 200;
    
    if (player.email === auth.currentUser?.email) {
      addXP(earnedXP); 
    }

    const username = player.username || player.email.split('@')[0];
    
    return `
      <div class="endgame-player-row">
        <div class="player-info">
          <img src="${player.avatar || 'Group-100.png'}" alt="player avatar">
          <span>${username}</span>
        </div>
        <div class="player-results">
          <div class="player-score">${score} pts</div>
          <div class="player-xp">+${earnedXP} XP</div>
        </div>
      </div>
    `;
  }));

  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.style.display = "flex";
  modal.innerHTML = `
    <div class="endgame-modal-box">
        <div class="endgame-header">
            <h2>Game Over</h2>
        </div>
        ${winnerAnnouncementHTML}
        <div class="endgame-scoreboard">
            ${playerRowsHTML.join("")}
        </div>
        <div class="endgame-footer">
            ${isHost ? `
                <button id="endgame-restart-btn" class="control-btn start-btn" onclick="startGame()">Restart</button>
                <button id="endgame-leave-btn" class="control-btn leave-btn" onclick="leaveLobby()">Leave</button>
            ` : `
                <button id="endgame-leave-btn" class="control-btn leave-btn" onclick="leaveLobby()">Leave</button>
            `}
        </div>
    </div>
  `;

  document.body.appendChild(modal);
}
// REPLACE your old leaveGameAfterMatch function with this:
window.leaveGameAfterMatch = async function () {
  const leaveBtn = document.getElementById('endgame-leave-btn');
  if (leaveBtn) {
    leaveBtn.disabled = true;
    leaveBtn.textContent = 'Leaving...';
  }

  const host = localStorage.getItem("quibblHost");
  const userName = localStorage.getItem("username") || currentUserEmail;

  try {
    const lobbyRef = doc(db, "quibbllobbies", host);
    const snapshot = await getDoc(lobbyRef);
    if (snapshot.exists()) {
      const data = snapshot.data();
      const updatedPlayers = (data.players || []).filter(p => p.email !== currentUserEmail);
      const updatedChat = data.chat || [];

      updatedChat.push({
        user: "System",
        email: "system@quibbl",
        message: `${userName} left the game.`,
        isCorrect: false,
        timestamp: Date.now()
      });

      await setDoc(lobbyRef, {
        players: updatedPlayers,
        chat: updatedChat
      }, { merge: true });
    }

    localStorage.removeItem("quibblHost");
    localStorage.removeItem("reviewingSet");
    localStorage.removeItem("countdownFinished");

    showCustomAlert("You have left the game.", 'success');
    window.location.href = "quibbl.html";

  } catch (err) {
    console.error("Error leaving game after match:", err);
    showCustomAlert("Something went wrong while leaving.", 'error');
  }
};

// REPLACE your old closeLobbyFromEndgame function with this:
window.closeLobbyFromEndgame = async function () {
  const leaveBtn = document.getElementById('endgame-leave-btn');
  if (leaveBtn) {
    leaveBtn.disabled = true;
    leaveBtn.textContent = 'Closing...';
  }
  
  const host = localStorage.getItem("quibblHost");
  if (!host || currentUserEmail !== host) return;

  const confirmed = await showConfirm("Are you sure you want to end the game and delete the lobby?");
  if (confirmed) {
    try {
      await deleteDoc(doc(db, "quibbllobbies", currentUserEmail));
      await deleteDoc(doc(db, "gamestartquibbl", currentUserEmail));
      localStorage.removeItem("quibblHost");
      localStorage.removeItem("reviewingSet");
      localStorage.removeItem("countdownFinished");
      showCustomAlert("Lobby deleted.", 'success');
      window.location.href = "quibbl.html";
    } catch (err) {
      console.error("Error deleting lobby from endgame:", err);
      showCustomAlert("Failed to delete the lobby.", 'error');
    }
  } else {
    // Re-enable the button if the user cancels
    if (leaveBtn) {
      leaveBtn.disabled = false;
      leaveBtn.textContent = 'Leave';
    }
  }
};

function redirectToQuibbl() {
  if (!currentLobbyHost) {
    console.error("No currentLobbyHost found during redirect!");
    return;
  }
  localStorage.setItem("quibblHost", currentLobbyHost); // <-- Add this line
  window.location.href = "quibbl.html?host=" + encodeURIComponent(currentLobbyHost);
}


// Auth state listener
auth.onAuthStateChanged(async (user) => {
  if (user) {
    currentUserEmail = user.email;
    await setupCurrentUserInLobby();
    await checkIfInLobby(); 
    listenForInvitations();
  }
});

// Listen for invitations
function listenForInvitations() {
  if (!currentUserEmail) return;
  const inviteDoc = doc(db, "invitations_quibbl", currentUserEmail);

  onSnapshot(inviteDoc, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      if (data.invitedBy && data.invitedBy !== currentUserEmail) {
        showInvitePopup(data.invitedBy);
      }
    }
  });
}

// Check if the user is part of any lobby
// REPLACE your old 'checkIfInLobby' function with this:
async function checkIfInLobby() {
  const lobbiesSnapshot = await getDocs(collection(db, "quibbllobbies"));
  for (const lobbySnap of lobbiesSnapshot.docs) {
    const data = lobbySnap.data();
    if (data.players && data.players.some(p => p.email === currentUserEmail)) {
      currentLobbyHost = data.host;
      lobbyDocRef = doc(db, "quibbllobbies", lobbySnap.id);
      
      onSnapshot(lobbyDocRef, (snapshot) => {
        if (!snapshot.exists()) {
          // ... (rest of your existing code inside this if-block)
          return;
        }

        const updatedData = snapshot.data();
        acceptedPlayers = updatedData.players || [];
        
        // --- THIS IS THE CORE FIX ---
        // It now calls both functions correctly.
        if (typeof window.renderPlayerSlots === 'function') {
            window.renderPlayerSlots(); // Updates the main modal for the host
        }
        renderGuestInvitePopup(); // Updates the mini pop-up for guests
        // --- END OF FIX ---
        
        // ... (rest of your existing code inside the onSnapshot listener)
        const currentPlayer = acceptedPlayers.find(p => p.email === currentUserEmail);
        isUserReady = currentPlayer ? currentPlayer.ready : false;

        renderTopAvatars();
        
        // (The rest of your code from the original onSnapshot function continues here)
        const newRestartToken = updatedData.restartToken;
        const lastRestartToken = parseInt(localStorage.getItem("lastRestartToken") || "0", 10);

        if (newRestartToken && newRestartToken > lastRestartToken) {
          localStorage.setItem("lastRestartToken", newRestartToken);
          localStorage.setItem("countdownFinished", "false");
          localStorage.setItem("forceReload", "true");
          setTimeout(() => window.location.reload(), 100);
          return;
        }

        if (updatedData.lobbyClosed) {
            showCustomAlert("The host has closed the lobby.", 'error');
            localStorage.removeItem("quibblHost");
            localStorage.removeItem("reviewingSet");
            localStorage.removeItem("countdownFinished");
            window.location.href = "quibbl.html";
            return;
        }
        
        currentLobbyHost = updatedData.host || currentLobbyHost;
        const stillInLobby = acceptedPlayers.some(p => p.email === currentUserEmail);
        if (!stillInLobby) {
            showCustomAlert("You have been removed from the lobby by the host.", 'error');
            localStorage.removeItem("quibblHost");
            localStorage.removeItem("reviewingSet");
            localStorage.removeItem("countdownFinished");
            window.location.href = "quibbl.html";
            return;
        }
        
        listenForScores(currentLobbyHost);
        toggleHostControls();

        if (updatedData.selectedSet) {
            const setData = updatedData.selectedSet;
            if (updatedData.numCardsToDisplay) {
              setData.numCardsToDisplay = updatedData.numCardsToDisplay;
            }
            window.latestSetData = setData;
            updateQuibblTitle(setData.title || "Untitled Set");
            updateRoundsDisplayFromSnapshot({ numCardsToDisplay: setData.numCardsToDisplay });
        }

        if (updatedData.gameStartTime && !countdownStarted) {
            countdownStarted = true;
            const countdownStart = updatedData.gameStartTime - Date.now();
            if (countdownStart > 0) {
              startCountdownAndRedirect(countdownStart);
            } else {
              redirectToQuibbl();
            }
        }
        
        const updatedPlayer = acceptedPlayers.find(p => p.email === currentUserEmail);
        isUserReady = updatedPlayer ? updatedPlayer.ready : false;

      });
      break;
    }
  }
}

// Fetch inviter name
async function getInviterName(email) {
  try {
    const userDoc = await getDoc(doc(db, "usernames", email));
    if (userDoc.exists() && userDoc.data().username) {
      return userDoc.data().username;
    }
  } catch (err) {
    console.error("Error fetching inviter name:", err);
  }
  return email;
}

// Fetch avatar URL
async function getAvatarURL(email) {
  try {
    const avatarRef = ref(storage, `avatars/${email}`);
    return await getDownloadURL(avatarRef);
  } catch {
    return "Group-100.png";
  }
}

// Setup current user in lobby
async function setupCurrentUserInLobby() {
  if (!currentUserEmail) return;
  const avatarURL = await getAvatarURL(currentUserEmail);
  if (!acceptedPlayers.find(p => p.email === currentUserEmail)) {
    acceptedPlayers.unshift({ email: currentUserEmail, avatar: avatarURL, ready: false });
  }
}
function toggleHostControls() {
  const startBtn = document.querySelector(".start-btn");
  const createLobbyBtn = document.querySelector(".create-lobby-btn");

  if (currentUserEmail !== currentLobbyHost) {
    if (startBtn) {
      startBtn.disabled = true;
      startBtn.style.cursor = "not-allowed";
      startBtn.style.opacity = "0.5";
    }
    if (createLobbyBtn) {
      createLobbyBtn.disabled = true;
      createLobbyBtn.style.cursor = "not-allowed";
      createLobbyBtn.style.opacity = "0.5";
    }
  } else {
    if (startBtn) {
  startBtn.disabled = false;
  startBtn.style.cursor = "pointer";
  startBtn.style.opacity = "1";

  const finished = localStorage.getItem("countdownFinished") === "true";
startBtn.textContent = finished ? "Restart" : "Start";

}

    if (createLobbyBtn) {
      createLobbyBtn.disabled = false;
      createLobbyBtn.style.cursor = "pointer";
      createLobbyBtn.style.opacity = "1";
    }
  }
}

// Create or join a lobby
async function createOrJoinLobby(lobbyId, hostEmail) {
  currentLobbyHost = hostEmail || currentLobbyHost || currentUserEmail;
  lobbyDocRef = doc(db, "quibbllobbies", lobbyId);

  const snapshot = await getDoc(lobbyDocRef);
  if (!snapshot.exists()) {
    await setDoc(lobbyDocRef, {
      host: currentLobbyHost,
      players: acceptedPlayers
    });
  }

  onSnapshot(lobbyDocRef, (snapshot) => {
    if (snapshot.exists()) {
      const updatedData = snapshot.data();
      acceptedPlayers = updatedData.players || [];
      currentLobbyHost = updatedData.host || currentLobbyHost;
      toggleHostControls();

      if (updatedData.gameStartTime && !countdownStarted) {
        countdownStarted = true;
        const countdownStart = updatedData.gameStartTime - Date.now();
        if (countdownStart > 0) {
          startCountdownAndRedirect(countdownStart);
        } else {
          redirectToQuibbl();
        }
      }

      if (acceptedPlayers.length <= 1 && currentUserEmail !== currentLobbyHost) {
        const modal = document.querySelector('.invite-popup');
        if (modal) modal.remove();
        showCustomAlert("The lobby was closed by the host.", 'error');
        localStorage.removeItem("countdownFinished");

        window.location.reload();
      } else {
       if (currentUserEmail !== currentLobbyHost) {
  renderPlayerSlots();
}
renderTopAvatars();

      }
    } else {
      if (currentUserEmail !== currentLobbyHost) {
        const modal = document.querySelector('.invite-popup');
        if (modal) modal.remove();
        showCustomAlert("The lobby was closed by the host.", 'error');
        localStorage.removeItem("countdownFinished");

        window.location.reload();
      }
      acceptedPlayers = [];
    }
  });
}

// Render player slots (mini modal)
// invlistenerquibbl.js

// REPLACE your old 'renderPlayerSlots' function in this file with this:
function renderGuestInvitePopup() {
  // Prevent rendering if countdown has finished
  if (countdownFinished) {
    const existingModal = document.querySelector('.invite-popup');
    if (existingModal) existingModal.remove();
    return;
  }

  // Disable mini modal for host
  if (currentUserEmail === currentLobbyHost) {
    const existingModal = document.querySelector('.invite-popup');
    if (existingModal) existingModal.remove();
    return;
  }

  let container = document.querySelector('.invite-popup');
  if (!container) {
    container = document.createElement('div');
    container.className = 'invite-popup';
    document.body.appendChild(container);
    addInviteStyles();
  }

  acceptedPlayers.sort((a, b) =>
    (a.email === currentLobbyHost ? -1 : b.email === currentLobbyHost ? 1 : 0)
  );

  const avatarsHTML = acceptedPlayers.map((player) => `
    <div style="position:relative; display:inline-block; text-align:center; margin:0 5px;">
      <img src="${player.avatar}"
           title="${player.email}"
           style="width:50px; height:50px; border-radius:50%;
           border:2px solid ${player.ready ? '#28a745' : '#ffcf00'};
           object-fit:cover;" />
    </div>
  `).join('');

    const reviewingSet = window.latestSetData || null;

  // This is the new, redesigned innerHTML
  container.innerHTML = `
    <div class="invite-header">
      <i class="fa-solid fa-users"></i>
      <span>Quibbl Lobby</span>
    </div>
    <div class="invite-body" style="flex-direction: column; padding: 15px; align-items: center; text-align: center;">
      <div class="avatar-list" style="margin-bottom: 15px;">
        ${avatarsHTML}
      </div>
      ${reviewingSet ? `
        <div style="font-size: 13px; color: #ccc;">
          <i class="fa-solid fa-book"></i> Set: <span style="color:#ffcf00; font-weight: bold;">${reviewingSet.title}</span>
        </div>` : '<div style="font-size: 13px; color: #888;">Host is selecting a set...</div>'
      }
    </div>
        <div class="invite-buttons">
        <button 
            type="button" 
            onclick="toggleUserReady()" 
            class="invite-popup-btn ${isUserReady ? 'decline' : 'accept'}">
            ${isUserReady ? "Unready" : "I'm Ready"}
        </button>
    </div>
  `;
}



// Toggle user readiness
window.toggleUserReady = async function () {
  // Prevent host from using mini modal's ready button
  if (currentUserEmail === currentLobbyHost) {
    return; 
  }

  isUserReady = !isUserReady;
  acceptedPlayers = acceptedPlayers.map(p => p.email === currentUserEmail ? { ...p, ready: isUserReady } : p);
  if (lobbyDocRef) {
    await setDoc(lobbyDocRef, { players: acceptedPlayers }, { merge: true });
  }
  renderPlayerSlots();
  renderTopAvatars();
};

// REPLACE your old leaveLobby function with this
window.leaveLobby = async function () {
  localStorage.setItem('isLeavingLobby', 'true');
  console.log("--- leaveLobby function initiated, 'isLeavingLobby' flag set ---");

  let host = localStorage.getItem("quibblHost");
  if (!host) {
    console.error("Could not find host in localStorage. Forcing cleanup.");
    localStorage.removeItem("quibblHost");
    localStorage.removeItem('isLeavingLobby');
    window.location.reload();
    return;
  }

  const isHost = currentUserEmail === host;
  const btnToDisable = document.querySelector('.leave-btn') || document.getElementById('endgame-leave-btn') || document.getElementById('leave-lobby-btn');

  if (btnToDisable) {
    btnToDisable.disabled = true;
    btnToDisable.textContent = isHost ? 'Closing...' : 'Leaving...';
  }

  if (isHost) {
    const confirmed = await showConfirm("Are you sure you want to close the lobby? All players will be removed.");
    if (confirmed) {
      try {
        await deleteDoc(doc(db, "quibbllobbies", currentUserEmail));
        await deleteDoc(doc(db, "gamestartquibbl", currentUserEmail));
      } catch (err) {
        console.error("Error deleting lobby documents:", err);
      } finally {
        localStorage.removeItem("quibblHost");
        localStorage.removeItem("reviewingSet");
        localStorage.removeItem("countdownFinished");
        localStorage.removeItem('isLeavingLobby');
        window.location.reload();
      }
    } else {
      if (btnToDisable) {
        btnToDisable.disabled = false;
        btnToDisable.textContent = 'Leave Game';
      }
      localStorage.removeItem('isLeavingLobby');
    }
  } else {
    // --- FIX START: Guest logic now properly waits for confirmation ---
    const confirmed = await showConfirm("Are you sure you want to leave the lobby?");
    if (confirmed) {
      try {
        const lobbyRef = doc(db, "quibbllobbies", host);
        const snapshot = await getDoc(lobbyRef);

        if (snapshot.exists()) {
          const data = snapshot.data();
          const userName = localStorage.getItem("username") || currentUserEmail;
          const userEmailLower = currentUserEmail.toLowerCase();
          
          const updatedPlayers = (data.players || []).filter(p => (p.email ? p.email.toLowerCase() : '') !== userEmailLower);
          const updatedChat = data.chat || [];
          updatedChat.push({ user: "System", email: "system@quibbl", message: `${userName} left the lobby.`, isCorrect: false, timestamp: Date.now() });

          await setDoc(lobbyRef, { players: updatedPlayers, chat: updatedChat }, { merge: true });
        }
      } catch (err) {
        console.error("An error occurred while updating Firestore:", err);
      } finally {
        localStorage.removeItem("quibblHost");
        localStorage.removeItem("reviewingSet");
        localStorage.removeItem("countdownFinished");
        localStorage.removeItem('isLeavingLobby');
        window.location.reload();
      }
    } else {
      // User clicked "Cancel"
      if (btnToDisable) {
        btnToDisable.disabled = false;
        btnToDisable.textContent = 'Leave Game';
      }
      localStorage.removeItem('isLeavingLobby');
    }
    // --- FIX END ---
  }
};




// invlistenerquibbl.js

async function showInvitePopup(inviterEmail) {
    const inviterName = await getInviterName(inviterEmail);
    const inviterAvatar = await getAvatarURL(inviterEmail);

    // Remove any existing pop-up first to prevent duplicates
    const existingPopup = document.querySelector('.invite-popup');
    if (existingPopup) existingPopup.remove();

    const modal = document.createElement("div");
    modal.classList.add("invite-popup");
    modal.innerHTML = `
    <div class="invite-header">
      <i class="fa-solid fa-gamepad"></i>
      <span>Game Invite</span>
    </div>
    <div class="invite-body">
      <img src="${inviterAvatar}" alt="inviter avatar">
      <div class="invite-text">
        <strong>${inviterName}</strong> has invited you to a game of Quibbl.
      </div>
    </div>
    <div class="invite-buttons">
      <button type="button" id="declineInvite" class="control-btn decline">Decline</button>
      <button type="button" id="acceptInvite" class="control-btn accept">Accept</button>
    </div>
    <div class="invite-timer-bar">
        <div id="inviteTimerFill" class="invite-timer-fill"></div>
    </div>
  `;

    document.body.appendChild(modal);

    // --- TIMER LOGIC START ---
    let countdown = 10;
    const timerFill = document.getElementById("inviteTimerFill");

    // This interval updates the visual width of the timer bar every 100ms
    const timerInterval = setInterval(() => {
        countdown -= 0.1;
        if (timerFill) {
            timerFill.style.width = `${(countdown / 10) * 100}%`;
        }
    }, 100);

    // This timeout will automatically decline the invite after 10 seconds
    const expirationTimeout = setTimeout(() => {
        clearInterval(timerInterval); // Stop the visual timer
        modal.remove();
        // Silently decline the invite by clearing it from the database
        setDoc(doc(db, "invitations_quibbl", currentUserEmail), { invitedBy: null }, { merge: true });
    }, 10000);
    // --- TIMER LOGIC END ---


    document.getElementById("acceptInvite").onclick = async () => {
        // --- ADD THESE TWO LINES TO CLEAR TIMERS ---
        clearTimeout(expirationTimeout);
        clearInterval(timerInterval);
        // --- END OF ADDITION ---
        
        await setDoc(doc(db, "invitations_quibbl", currentUserEmail), { invitedBy: null }, { merge: true });

        lobbyDocRef = doc(db, "quibbllobbies", inviterEmail);
        localStorage.setItem("quibblHost", inviterEmail);

        let latestPlayers = [];
        const latestSnapshot = await getDoc(lobbyDocRef);
        if (latestSnapshot.exists()) {
            latestPlayers = latestSnapshot.data().players || [];
        }

        const userAvatarURL = await getAvatarURL(currentUserEmail);
        if (!latestPlayers.find(p => p.email === currentUserEmail)) {
            latestPlayers.push({ email: currentUserEmail, avatar: userAvatarURL, ready: false, username: localStorage.getItem("username") });
        }

        await setDoc(lobbyDocRef, { players: latestPlayers }, { merge: true });

        showCustomAlert("Joined lobby! The page will now reload.", 'success');
        setTimeout(() => window.location.reload(), 2000);
    };

    document.getElementById("declineInvite").onclick = async () => {
        // --- ADD THESE TWO LINES TO CLEAR TIMERS ---
        clearTimeout(expirationTimeout);
        clearInterval(timerInterval);
        // --- END OF ADDITION ---
        
        await setDoc(doc(db, "invitations_quibbl", currentUserEmail), { invitedBy: null }, { merge: true });
        modal.remove();
    };
}

// Styles
function addInviteStyles() {
  if (document.getElementById("invite-popup-style")) return;
  const style = document.createElement("style");
  style.id = "invite-popup-style";
  style.innerHTML = `
    .invite-popup {
      position: fixed;
      bottom: 20px;
      right: -400px;
      background: #171717;
      color: white;
      font-family: 'Satoshi';
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      min-width: 260px;
      z-index: 10000;
      animation: slideIn 0.5s forwards;
    }
    @keyframes slideIn {
      from { right: -400px; opacity: 0; }
      to { right: 20px; opacity: 1; }
    }
    .invite-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
    }
    .invite-buttons {
      display: flex;
      gap: 8px;
    }
    .invite-btn {
      border: none;
      border-radius: 50%;
      width: 30px;
      height: 30px;
      font-size: 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .invite-btn.accept {
      background-color: #00cc66;
      color: white;
    }
    .invite-btn.decline {
      background-color: #ff4d4d;
      color: white;
    }
    .invite-btn:hover {
      transform: scale(1.1);
    }
  `;
  document.head.appendChild(style);
}
function renderTopAvatars() {
  const avatarContainer = document.querySelector('.avatar-container');
  if (!avatarContainer) return;

  avatarContainer.innerHTML = ""; // Clear existing avatars

  const maxAvatars = 5;
  const playersToShow = acceptedPlayers.slice(0, maxAvatars);

playersToShow.forEach((player, index) => {
  const wrapper = document.createElement('div');
  wrapper.style.position = "relative";
  wrapper.style.display = "inline-block";
  wrapper.style.textAlign = "center";
  wrapper.style.margin = "0 4px";

  const img = document.createElement('img');
  img.src = player.avatar || "Group-100.png";
  if (player.left === true) {
  img.classList.add("player-left");
}


  img.alt = player.email;
  img.title = player.email;
  img.style.width = "40px";
  img.style.height = "40px";
  img.style.borderRadius = "50%";
  img.style.objectFit = "cover";
  img.style.border = `3px solid ${player.ready ? 'green' : '#ffcf00'}`;

  // 👑 Add emoji crown for first player
  if (index === 0) {
    const crownDiv = document.createElement('div');
    crownDiv.textContent = "👑";
    crownDiv.style.position = "absolute";
    crownDiv.style.top = "-12px";
    crownDiv.style.left = "50%";
    crownDiv.style.transform = "translateX(-50%)";
    crownDiv.style.fontSize = "14px";
    wrapper.appendChild(crownDiv);
  }

  // Add 1/5, 2/5 etc.
  const label = document.createElement('div');
  label.textContent = `${index + 1}/5`;
  label.style.fontSize = "10px";
  label.style.color = "#fff";
  label.style.marginTop = "2px";

  wrapper.appendChild(img);
  wrapper.appendChild(label);
  avatarContainer.appendChild(wrapper);
});



  // Fill remaining slots
  for (let i = playersToShow.length; i < maxAvatars; i++) {
    const img = document.createElement('img');
    img.src = "Group-100.png";
    img.alt = "Empty slot";
    avatarContainer.appendChild(img);
  }
}
function updateQuibblTitle(title) {
  const titleElement = document.querySelector(".quibbl-title");
  if (titleElement) {
    titleElement.textContent = title ? `Quibbl - ${title}` : "Quibbl";
  }
}
function updateRoundsDisplayFromSnapshot(data) {
  const displayEl = document.getElementById("roundsDisplay");
  if (displayEl) {
    displayEl.textContent = data.numCardsToDisplay || 0;
  }
}
// REPLACE the old listenForScores function with this new one
function listenForScores(hostEmail) {
  const gameRef = doc(db, "gamestartquibbl", hostEmail);
  onSnapshot(gameRef, (snapshot) => {
    if (!snapshot.exists()) return;

    const data = snapshot.data();
    const players = data.players || [];
    const scoreboardContainer = document.querySelector(".scoreboard-container");
    if (!scoreboardContainer) return;

    // Clear previous scores and rebuild
    scoreboardContainer.innerHTML = "";

    // Create a score row for each player
    players.forEach((player, index) => {
      const isHost = player.email === currentLobbyHost;
      const playerName = isHost ? "P1 (Host)" : `P${index + 1}`;
      
      const scoreRow = document.createElement("div");
      scoreRow.className = "player-score-row";
      if (player.left === true) {
        scoreRow.style.opacity = "0.5";
      }

      scoreRow.innerHTML = `
        <span class="player-name">${playerName}</span>
        <div class="player-scores">
          <span class="score-correct" title="Correct Answers">
            <i class="fa-solid fa-check"></i> ${player.correctScore || 0}
          </span>
          <span class="score-wrong" title="Incorrect Answers">
            <i class="fa-solid fa-xmark"></i> ${player.incorrectScore || 0}
          </span>
        </div>
      `;
      scoreboardContainer.appendChild(scoreRow);
    });

    // Fill remaining slots if less than 5 players
    for (let i = players.length; i < 5; i++) {
        const emptyRow = document.createElement("div");
        emptyRow.className = "player-score-row";
        emptyRow.style.opacity = "0.3";
        emptyRow.innerHTML = `
            <span class="player-name">No Player</span>
            <div class="player-scores">
                <span class="score-correct"><i class="fa-solid fa-check"></i> 0</span>
                <span class="score-wrong"><i class="fa-solid fa-xmark"></i> 0</span>
            </div>
        `;
        scoreboardContainer.appendChild(emptyRow);
    }
  });
}

