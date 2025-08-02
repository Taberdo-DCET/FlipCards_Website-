import { auth, db } from './firebaseinit.js';
import { onSnapshot, doc, setDoc, getDoc, getDocs, collection } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js";
import { storage } from './firebaseStorageInit.js';

let currentUserEmail = null;
let acceptedPlayers = [];
let isUserReady = false;
let lobbyDocRef = null;
let currentLobbyHost = null;
let countdownStarted = false;
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
      redirectToDefidrop();
    }
  }, 1000);
}

function redirectToDefidrop() {
  if (!currentLobbyHost) {
    console.error("No currentLobbyHost found during redirect!");
    return;
  }
  window.location.href = "defidrop.html?host=" + encodeURIComponent(currentLobbyHost);
}




// Auth state listener
auth.onAuthStateChanged(async (user) => {
  if (user) {
    currentUserEmail = user.email;
    await setupCurrentUserInLobby();
    await checkIfInLobby(); // Auto rejoin any lobby the user is part of
    listenForInvitations();
  }
});

// Listen for invitations
function listenForInvitations() {
  if (!currentUserEmail) return;
  const inviteDoc = doc(db, "invitations", currentUserEmail);

  onSnapshot(inviteDoc, (snapshot) => {
  if (snapshot.exists()) {
    const data = snapshot.data();
    if (data.invitedBy && data.invitedBy !== currentUserEmail) {
      showInvitePopup(data.invitedBy);
    }
  }
});

}

// Check if the user is part of any lobby (auto-rejoin)
async function checkIfInLobby() {
  const lobbiesSnapshot = await getDocs(collection(db, "lobbies"));
  for (const lobbySnap of lobbiesSnapshot.docs) {
    const data = lobbySnap.data();
    if (data.players && data.players.some(p => p.email === currentUserEmail)) {
      currentLobbyHost = data.host;
      lobbyDocRef = doc(db, "lobbies", lobbySnap.id);
      acceptedPlayers = data.players || [];

      // Set isUserReady based on Firestore data
      const currentPlayer = acceptedPlayers.find(p => p.email === currentUserEmail);
      isUserReady = currentPlayer ? currentPlayer.ready : false;

      renderPlayerSlots();
      onSnapshot(lobbyDocRef, (snapshot) => {
  if (snapshot.exists()) {
    const updatedData = snapshot.data();
    if (updatedData.lobbyClosed) {
  alert("The host has closed the lobby.");
  window.location.href = "lobby.html"; // Redirect all players back to lobby
  return;
}

    acceptedPlayers = updatedData.players || [];
    currentLobbyHost = updatedData.host || currentLobbyHost;

    // Check for gameStartTime to trigger countdown
    if (updatedData.gameStartTime && !countdownStarted) {
      countdownStarted = true;
      console.log("GameStartTime detected:", updatedData.gameStartTime);
      const countdownStart = updatedData.gameStartTime - Date.now();
      if (countdownStart > 0) {
        startCountdownAndRedirect(countdownStart);
      } else {
        redirectToDefidrop();
      }
    }

    // Keep isUserReady synced
    const updatedPlayer = acceptedPlayers.find(p => p.email === currentUserEmail);
    isUserReady = updatedPlayer ? updatedPlayer.ready : false;

    renderPlayerSlots();

        } else {
          acceptedPlayers = [];
          const modal = document.querySelector('.invite-popup');
          if (modal) modal.remove();
          alert("The lobby was closed by the host.");
          window.location.reload();
        }
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

// Create or join a lobby
async function createOrJoinLobby(lobbyId, hostEmail) {
  currentLobbyHost = hostEmail || currentLobbyHost || currentUserEmail;
  lobbyDocRef = doc(db, "lobbies", lobbyId);

  const snapshot = await getDoc(lobbyDocRef);
  if (!snapshot.exists()) {
    await setDoc(lobbyDocRef, {
      host: currentLobbyHost,
      players: acceptedPlayers
    });
  }

  // Real-time updates
  onSnapshot(lobbyDocRef, (snapshot) => {
  if (snapshot.exists()) {
    const updatedData = snapshot.data();
    acceptedPlayers = updatedData.players || [];
    currentLobbyHost = updatedData.host || currentLobbyHost;

    // Check for game start countdown
    if (updatedData.gameStartTime && !countdownStarted) {
  countdownStarted = true;
  console.log("GameStartTime detected:", updatedData.gameStartTime);
  const countdownStart = updatedData.gameStartTime - Date.now();
  if (countdownStart > 0) {
    startCountdownAndRedirect(countdownStart);
  } else {
    redirectToDefidrop();
  }
}


    if (acceptedPlayers.length <= 1 && currentUserEmail !== currentLobbyHost) {
      const modal = document.querySelector('.invite-popup');
      if (modal) modal.remove();
      alert("The lobby was closed by the host.");
      window.location.reload();
    } else {
      renderPlayerSlots();
    }
  } else {
    if (currentUserEmail !== currentLobbyHost) {
      const modal = document.querySelector('.invite-popup');
      if (modal) modal.remove();
      alert("The lobby was closed by the host.");
      window.location.reload();
    }
    acceptedPlayers = [];
  }
});

}

// Render player slots in the lobby modal
function renderPlayerSlots() {
  let container = document.querySelector('.invite-popup');
  if (!container) {
    container = document.createElement('div');
    container.className = 'invite-popup';
    document.body.appendChild(container);
    addInviteStyles();
  }

  acceptedPlayers.sort((a, b) => (a.email === currentLobbyHost ? -1 : b.email === currentLobbyHost ? 1 : 0));

  const totalPlayers = acceptedPlayers.length;
  const maxPlayers = 5;

  const avatarsHTML = acceptedPlayers.map((player, index) => {
    const isHost = player.email === currentLobbyHost;
    const isNewest = index === totalPlayers - 1;
    return `
      <div style="position:relative; display:inline-block; text-align:center; margin:0 5px;">
        <img src="${player.avatar}"
             title="${player.email}"
             style="width:50px; height:50px; border-radius:50%;
             border:2px solid ${player.ready ? 'green' : '#ffcf00'};
             object-fit:cover;" />
        ${isHost ? `<div style="font-size:14px; color:#ffcf00; margin-top:4px;">👑</div>` : ""}
        ${isNewest ? `<div style="position:absolute; bottom:-5px; left:50%; transform:translateX(-50%);
             background:#333; color:#fff; font-size:12px; padding:2px 6px; border-radius:12px;">
             ${totalPlayers}/${maxPlayers}
           </div>` : ""}
      </div>
    `;
  }).join('');

  let hostButton = '';
  let leaveButton = '';

  if (currentUserEmail === currentLobbyHost) {
    hostButton = `<button type="button" onclick="closeLobby()" 
      style="padding:6px 16px; background:#ff4d4d; border:none; border-radius:8px;
      cursor:pointer; font-family:'QilkaBold'; font-size:14px; color:white; margin-top:5px;">
      Close Lobby
    </button>`;
  } else {
    leaveButton = `<button type="button" onclick="leaveLobby()" 
      style="padding:6px 16px; background:#ff4d4d; border:none; border-radius:8px;
      cursor:pointer; font-family:'QilkaBold'; font-size:14px; color:white; margin-top:5px;">
      Leave Lobby
    </button>`;
  }

  container.innerHTML = `
    <div class="avatar-list" style="display:flex; justify-content:center; gap:10px; margin-bottom:10px;">
      ${avatarsHTML}
    </div>
    <div style="text-align:center; margin-top:10px;">
      <button type="button" onclick="toggleUserReady()"
        style="padding:8px 20px; background:#ffcf00; border:none; border-radius:8px;
        cursor:pointer; font-family:'QilkaBold'; font-size:14px; margin-bottom:5px;">
        ${isUserReady ? "Unready" : "I'm Ready"}
      </button>
      <br/>
      ${hostButton}
      ${leaveButton}
    </div>
  `;
}

// Toggle user readiness
window.toggleUserReady = async function () {
  isUserReady = !isUserReady;
  acceptedPlayers = acceptedPlayers.map(p => p.email === currentUserEmail ? { ...p, ready: isUserReady } : p);
  if (lobbyDocRef) {
    await setDoc(lobbyDocRef, { players: acceptedPlayers }, { merge: true });
  }
  renderPlayerSlots();
};

// Leave lobby
window.leaveLobby = async function (event) {
  if (event) event.preventDefault();
  if (currentUserEmail === currentLobbyHost) {
    alert("Host cannot leave the lobby. Use 'Close Lobby' instead.");
    return;
  }
  acceptedPlayers = acceptedPlayers.filter(p => p.email !== currentUserEmail);
  isUserReady = false;
  if (lobbyDocRef) {
    await setDoc(lobbyDocRef, { players: acceptedPlayers }, { merge: true });
  }
  const modal = document.querySelector('.invite-popup');
  if (modal) modal.remove();
  alert("You have left the lobby.");
  window.location.reload();
};

// Close lobby (host only)
window.closeLobby = async function (event) {
  if (event) event.preventDefault();
  if (currentUserEmail !== currentLobbyHost) {
    alert("Only the host can close the lobby.");
    window.location.reload();
    return;
  }

  if (lobbyDocRef) {
    
    await import("https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js")
      .then(({ deleteDoc }) => deleteDoc(lobbyDocRef));
  }

  acceptedPlayers = [];
  const modal = document.querySelector('.invite-popup');
  if (modal) modal.remove();
  alert("Lobby closed and deleted.");
  window.location.reload();
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
      <span style="background: transparent; color: white;">${inviterName} invites you to play DefiDrop</span>
      <div class="invite-buttons">
        <button type="button" id="acceptInvite" class="invite-btn accept">✔</button>
        <button type="button" id="declineInvite" class="invite-btn decline">✖</button>
      </div>
    </div>
  `;

  addInviteStyles();
  document.body.appendChild(modal);

  // Accept
  document.getElementById("acceptInvite").onclick = async () => {
    await setDoc(doc(db, "invitations", currentUserEmail), { invitedBy: null }, { merge: true });

    if (!lobbyDocRef) {
      lobbyDocRef = doc(db, "lobbies", inviterEmail);
    }

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
    renderPlayerSlots();
  };

  // Decline
  document.getElementById("declineInvite").onclick = async () => {
    await setDoc(doc(db, "invitations", currentUserEmail), { invitedBy: null }, { merge: true });
    modal.remove();
    alert("You have declined the invitation.");
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
