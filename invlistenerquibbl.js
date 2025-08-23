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
    font-family: 'QilkaBold';
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
    font-family: 'QilkaBold';
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
async function showEndGameModal() {
  const gameRef = doc(db, "gamestartquibbl", currentLobbyHost);
  const snapshot = await getDoc(gameRef);
  if (!snapshot.exists()) return;

  const data = snapshot.data();
  const players = [...(data.players || [])];
  players.sort((a, b) => (b.correctScore || 0) - (a.correctScore || 0));

  const currentEmail = auth.currentUser?.email || "";
  const isHost = currentEmail === currentLobbyHost;

  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.style.display = "flex";

// Get highest score
const topScore = players.length > 0 ? players[0].correctScore || 0 : 0;

// Count how many players have top score
const topScorers = players.filter(p => (p.correctScore || 0) === topScore);

// Determine if it's a draw
const isDraw = topScorers.length > 1;
// ✅ Record winners in Firestore (host only)
if (auth.currentUser?.email === currentLobbyHost) {
  for (const winner of topScorers) {
    const winnerRef = doc(db, "quibblwinner", winner.email);
    await setDoc(winnerRef, { wins: increment(1) }, { merge: true });
  }
}


// 🏁 XP reward logic


const playerRows = await Promise.all(players.map(async (player) => {
  const score = player.correctScore || 0;
  const isTop = score === topScore;
  const label = isTop ? (isDraw ? "🤝 Draw" : "🏆 Winner") : "";

  // 🎁 XP Reward
  if (player.email === auth.currentUser?.email) {
    if (isTop && isDraw) {
      addXP(400);
    } else if (isTop) {
      addXP(500);
    } else {
      addXP(200);
    }
  }

  // Get username
  let username = player.email;
  try {
    const userDoc = await getDoc(doc(db, "usernames", player.email));
    if (userDoc.exists() && userDoc.data().username) {
      username = userDoc.data().username;
    }
  } catch (err) {
    console.warn("Failed to fetch username:", err);
  }

  // Get badges
  let badges = "";
  try {
    const badgeDoc = await getDoc(doc(db, "approved_emails", player.email));
    if (badgeDoc.exists()) {
      const roles = (badgeDoc.data().role || "").toLowerCase();
      if (roles.includes("verified")) {
        badges += `<img src="verified.svg" class="badge-icon" title="Verified" alt="verified"> `;
      }
      if (roles.includes("first")) {
        badges += `<img src="first.png" class="badge-icon" title="First" alt="first"> `;
      }
    }
  } catch (err) {
    console.warn("Failed to fetch badges:", err);
  }

  let earnedXP = score === 0 ? 10 : (isTop ? (isDraw ? 400 : 500) : 200);

// Check if this player is verified
let isVerified = false;
try {
  const badgeDoc = await getDoc(doc(db, "approved_emails", player.email));
  if (badgeDoc.exists()) {
    const roles = (badgeDoc.data().role || "").toLowerCase();
    isVerified = roles.includes("verified");
  }
} catch (err) {
  console.warn("Failed to check verification status:", err);
}

let bonusXP = 0;
if (isVerified) {
  bonusXP = Math.floor(earnedXP * 0.5);
}


return `
  <div style="position:relative; display:flex; align-items:center; justify-content:space-between; padding:8px 12px; background:#1f1f1f; border-radius:8px; margin-bottom:6px;">
    <div style="display:flex; align-items:center; gap:10px;">
      <img src="${player.avatar || "Group-10.png"}" alt="avatar" style="width:40px; height:40px; border-radius:50%; object-fit:cover; border:2px solid #ffcf00;">
      <span style="display:flex; align-items:center; gap:5px;">${username} ${badges}</span>
    </div>
    <div style="font-weight:bold; color:#ffcf00;">${score} pts ${label}</div>

   <div class="xp-float" style="
  position:absolute;
  right:12px;
  top:-16px;
  font-size:13px;
  color:#ffcf00;
  animation: floatXP 3.6s ease-out forwards;
">
  +${earnedXP}${bonusXP > 0 ? ` (+${bonusXP} verified bonus)` : ''} XP
</div>
${(isTop && isHost) ? `
  <div class="star-float" style="
    position: absolute;
    left: 12px;
    top: -16px;
    font-size: 13px;
    color: #ffc700;
    animation: floatStar 3.6s ease-out forwards;
    font-weight: bold;
  ">
    +1 ⭐ Star!
  </div>
` : ""}

  </div>
`;

}));




  modal.innerHTML = `
    <div class="modal-box" style="padding: 20px; max-width: 500px;">
      <h2>Game Over</h2>
      <div class="modal-body">
        ${playerRows.join("")}

      </div>
      <div class="modal-footer" style="margin-top: 20px;">
  ${isHost ? `
    <button onclick="startGame()">Restart</button>
    <button onclick="closeLobbyFromEndgame()" style="background:#ff4d4d; color:white;">Leave</button>
  ` : `
    <button onclick="leaveGameAfterMatch()" style="background:#ff4d4d; color:white;">Leave</button>
  `}
</div>


    </div>
  `;

  document.body.appendChild(modal);
}
window.leaveGameAfterMatch = async function () {
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
window.closeLobbyFromEndgame = async function () {
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
async function checkIfInLobby() {
  const lobbiesSnapshot = await getDocs(collection(db, "quibbllobbies"));
  for (const lobbySnap of lobbiesSnapshot.docs) {
    const data = lobbySnap.data();
    if (data.players && data.players.some(p => p.email === currentUserEmail)) {
      currentLobbyHost = data.host;
      toggleHostControls();


      lobbyDocRef = doc(db, "quibbllobbies", lobbySnap.id);
      acceptedPlayers = data.players || [];

      const currentPlayer = acceptedPlayers.find(p => p.email === currentUserEmail);
      isUserReady = currentPlayer ? currentPlayer.ready : false;

      if (currentUserEmail !== currentLobbyHost) {
  renderPlayerSlots();
}
renderTopAvatars();

onSnapshot(lobbyDocRef, (snapshot) => {
  if (!snapshot.exists()) {
    acceptedPlayers = [];
    const modal = document.querySelector('.invite-popup');
    if (modal) modal.remove();
    showCustomAlert("The lobby was closed by the host.", 'error');
    localStorage.removeItem("quibblHost");
    localStorage.removeItem("reviewingSet");
    localStorage.removeItem("countdownFinished");
    window.location.reload();
    return;
  }

  const updatedData = snapshot.data();

  // ✅ Detect restart token
  const newRestartToken = updatedData.restartToken;
  const lastRestartToken = parseInt(localStorage.getItem("lastRestartToken") || "0", 10);

  if (newRestartToken && newRestartToken > lastRestartToken) {
    localStorage.setItem("lastRestartToken", newRestartToken);
    localStorage.setItem("countdownFinished", "false");
    localStorage.setItem("forceReload", "true");

    // Wait a brief moment to allow Firestore listeners to flush, then reload
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

  acceptedPlayers = updatedData.players || [];
  currentLobbyHost = updatedData.host || currentLobbyHost;
  // ✅ If this user is not in the list anymore (was kicked)
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
    const existing = document.querySelector('.invite-popup');
    if (existing) existing.remove();
    renderPlayerSlots();
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

  if (currentUserEmail !== currentLobbyHost) {
    renderPlayerSlots();
  }
  renderTopAvatars();
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
    return "Group-10.png";
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
function renderPlayerSlots() {
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
           border:2px solid ${player.ready ? 'green' : '#ffcf00'};
           object-fit:cover;" />
    </div>
  `).join('');

    const reviewingSet = window.latestSetData || null;


  container.innerHTML = `
    <div class="avatar-list" style="display:flex; justify-content:center; gap:10px; margin-bottom:10px;">
      ${avatarsHTML}
    </div>
    ${reviewingSet ? `
    <div style="color: white; text-align: center; margin-bottom: 6px;">
      <div style="font-size: 13px;">📚 Set: <span style="color:#ffcf00;">${reviewingSet.title}</span></div>
      
    </div>` : ''}
    <div style="text-align:center; margin-top:10px;">
      <button type="button" onclick="toggleUserReady()"
        style="padding:8px 20px; background:#ffcf00; border:none; border-radius:8px;
        cursor:pointer; font-family:'QilkaBold'; font-size:14px; margin-bottom:5px;">
        ${isUserReady ? "Unready" : "I'm Ready"}
      </button>
      ${currentUserEmail !== currentLobbyHost ? `
        <br/>
        <button type="button" onclick="leaveLobby()" 
          style="padding:6px 16px; background:#ff4d4d; border:none; border-radius:8px;
          cursor:pointer; font-family:'QilkaBold'; font-size:14px; color:white; margin-top:5px;">
          Leave Lobby
        </button>` : ""}
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


// Leave lobby
window.leaveLobby = async function () {
  const host = localStorage.getItem("quibblHost");
  const isHost = currentUserEmail === host;

  if (isHost) {
    const confirmed = await showConfirm("Are you sure you want to close the lobby? All players will be removed.");
    if (confirmed) {
      try {
        await deleteDoc(doc(db, "quibbllobbies", currentUserEmail));
        await deleteDoc(doc(db, "gamestartquibbl", currentUserEmail));
        localStorage.removeItem("quibblHost");
        localStorage.removeItem("reviewingSet");
        localStorage.removeItem("countdownFinished");
        showCustomAlert("Lobby closed.", 'success');
        window.location.reload();
      } catch (err) {
        console.error("Error closing lobby:", err);
        showCustomAlert("Failed to close lobby.", 'error');
      }
    }
  } else {
    try {
      const lobbyRef = doc(db, "quibbllobbies", host);
      const snapshot = await getDoc(lobbyRef);
      const userName = localStorage.getItem("username") || currentUserEmail;

      if (snapshot.exists()) {
        const data = snapshot.data();
        const updatedPlayers = (data.players || []).filter(p => p.email !== currentUserEmail);


        const updatedChat = data.chat || [];

        updatedChat.push({
          user: "System",
          email: "system@quibbl",
          message: `${userName} left the lobby.`,
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

      showCustomAlert("You have left the lobby.", 'success');
      window.location.reload();
    } catch (err) {
      console.error("Failed to leave lobby:", err);
      showCustomAlert("Error leaving lobby.", 'error');
    }
  }
};




// Show invitation popup
async function showInvitePopup(inviterEmail) {
  const inviterName = await getInviterName(inviterEmail);
  const inviterAvatar = await getAvatarURL(inviterEmail);

  const modal = document.createElement("div");
  modal.classList.add("invite-popup");
  modal.innerHTML = `
    <div class="invite-content">
      <img src="${inviterAvatar}" alt="avatar"
        style="width:40px; height:40px; border-radius:50%; border:2px solid #ffcf00; object-fit:cover; margin-right:10px;">
      <span>${inviterName} invites you to join Quibbl</span>
      <div class="invite-buttons">
        <button type="button" id="acceptInvite" class="invite-btn accept">✔</button>
        <button type="button" id="declineInvite" class="invite-btn decline">✖</button>
      </div>
    </div>
  `;

  addInviteStyles();
  document.body.appendChild(modal);

  document.getElementById("acceptInvite").onclick = async () => {
    await setDoc(doc(db, "invitations_quibbl", currentUserEmail), { invitedBy: null }, { merge: true });

    if (!lobbyDocRef) {
      lobbyDocRef = doc(db, "quibbllobbies", inviterEmail);
    }
localStorage.setItem("quibblHost", inviterEmail);

    let latestPlayers = [];
    const latestSnapshot = await getDoc(lobbyDocRef);
    if (latestSnapshot.exists()) {
      latestPlayers = latestSnapshot.data().players || [];
    }

    const userAvatarURL = await getAvatarURL(currentUserEmail);
    if (!latestPlayers.find(p => p.email === currentUserEmail)) {
      latestPlayers.push({ email: currentUserEmail, avatar: userAvatarURL, ready: false });
    }

    await setDoc(lobbyDocRef, { players: latestPlayers }, { merge: true });
acceptedPlayers = latestPlayers;
createOrJoinLobby(inviterEmail, inviterEmail);

// ✅ Immediately fetch current selectedSet and render if it exists
const lobbySnap = await getDoc(doc(db, "quibbllobbies", inviterEmail));
if (lobbySnap.exists()) {
  const lobbyData = lobbySnap.data();
  if (lobbyData.selectedSet) {
    const setData = lobbyData.selectedSet;
    if (lobbyData.numCardsToDisplay) {
      setData.numCardsToDisplay = lobbyData.numCardsToDisplay;
    }

    window.latestSetData = setData;
    updateQuibblTitle(setData.title || "Untitled Set");
    updateRoundsDisplayFromSnapshot({ numCardsToDisplay: setData.numCardsToDisplay });
  }
}

if (currentUserEmail !== currentLobbyHost) {
  renderPlayerSlots();
}
renderTopAvatars();
window.location.reload();

  };

  document.getElementById("declineInvite").onclick = async () => {
    await setDoc(doc(db, "invitations_quibbl", currentUserEmail), { invitedBy: null }, { merge: true });
    modal.remove();
    showCustomAlert("You have declined the invitation.", 'success');
    window.location.reload();
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
      font-family: 'QilkaBold';
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
  img.src = player.avatar || "Group-10.png";
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
    img.src = "Group-10.png";
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
function listenForScores(hostEmail) {
  const gameRef = doc(db, "gamestartquibbl", hostEmail);
  onSnapshot(gameRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      const scoreDivs = document.querySelectorAll(".score-values span");
      const players = data.players || [];


const scoreNames = document.querySelectorAll(".score-names span");
const scorePairs = document.querySelectorAll(".score-values > span");
const combinedPlayers = data.players || [];

scorePairs.forEach((pair, index) => {
  const player = combinedPlayers[index];
  if (!player) return;

  const correctSpan = pair.querySelector(".correct");
  const wrongSpan = pair.querySelector(".wrong");

  if (correctSpan && wrongSpan) {
    correctSpan.textContent = player.correctScore || 0;
    wrongSpan.textContent = player.incorrectScore || 0;

    if (scoreNames[index])
      scoreNames[index].textContent =
        player.email === currentLobbyHost ? "P1 (Host):" : `P${index + 1}:`;
  }
});

// Fill remaining slots
for (let i = combinedPlayers.length; i < 5; i++) {
  if (scoreNames[i]) scoreNames[i].textContent = "No Player";
  if (scorePairs[i]) {
    const correctSpan = scorePairs[i].querySelector(".correct");
    const wrongSpan = scorePairs[i].querySelector(".wrong");
    if (correctSpan) correctSpan.textContent = "0";
    if (wrongSpan) wrongSpan.textContent = "0";
  }
}


// Fill remaining slots with "No Player"
for (let i = combinedPlayers.length; i < 5; i++) {
  if (scoreNames[i]) scoreNames[i].textContent = "No Player";
  if (scoreSpans[i]) {
    const correctSpan = scoreSpans[i].querySelector(".correct");
    const wrongSpan = scoreSpans[i].querySelector(".wrong");
    if (correctSpan) correctSpan.textContent = "0";
    if (wrongSpan) wrongSpan.textContent = "0";
  }
}


    }
  });
}

