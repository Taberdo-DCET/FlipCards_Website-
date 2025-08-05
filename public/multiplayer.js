import { db, auth } from './firebaseinit.js';
import { collection, getDocs, doc, getDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js";
import { storage } from './firebaseStorageInit.js';

const multiplayerBtn = document.getElementById("multiplayerBtn");
const multiplayerModal = document.getElementById("multiplayerModal");
const userListContainer = document.getElementById("userList");
const playerSlotsContainer = document.getElementById("playerSlots");
const userSearchInput = document.getElementById("userSearch");
const recentInvitesContainer = document.getElementById("recentInvitesList");

let acceptedPlayers = [];
let allUserRows = [];
let currentUserEmail = null;
let isUserReady = false;
let lobbyDocRef = null;
let currentLobbyHost = null;

auth.onAuthStateChanged((user) => {
  if (user) {
    currentUserEmail = user.email;
    // Only prepare lobby when multiplayer UI is opened
    renderPlayerSlots();
  }
});


multiplayerBtn.addEventListener("click", () => {
  setupCurrentUserInLobby();  // Create lobby or join only when the user clicks multiplayer
  loadUsers();
  loadRecentInvites();
  multiplayerModal.style.display = "flex";
  renderPlayerSlots();
});


window.closeMultiplayerModal = function () {
  multiplayerModal.style.display = "none";
  if (currentUserEmail === currentLobbyHost) {
    window.location.reload();  // Reload only if the current user is the host
  }
};



async function getAvatarURL(email) {
  try {
    const avatarRef = ref(storage, `avatars/${email}`);
    return await getDownloadURL(avatarRef);
  } catch {
    return "Group-10.png";
  }
}

async function getUserBadge(email) {
  try {
    const approvedDoc = await getDoc(doc(db, "approved_emails", email));
    if (approvedDoc.exists()) {
      const data = approvedDoc.data();
      const roleString = data.role || "";
      const roleArray = roleString.split(',').map(r => r.trim().toLowerCase());

      let badges = "";
      if (roleArray.includes("verified")) {
        badges += `<img src="verified.svg" alt="verified" title="Verified" class="badge-icon">`;
      }
      if (roleArray.includes("first")) {
        badges += `<img src="first.png" alt="first" title="First User" class="badge-icon">`;
      }
      return badges;
    }
  } catch (error) {
    console.error("Error fetching badge:", error);
  }
  return "";
}

async function setupCurrentUserInLobby() {
  if (!currentUserEmail) return;
  const avatarURL = await getAvatarURL(currentUserEmail);

  if (currentUserEmail === currentLobbyHost || !currentLobbyHost) {
    if (!acceptedPlayers.find(player => player.email === currentUserEmail)) {
      acceptedPlayers.unshift({ email: currentUserEmail, avatar: avatarURL, ready: false });
    }
  }

  if (!currentLobbyHost) {
  // Check if user is already in another lobby
  const lobbiesSnapshot = await getDocs(collection(db, "lobbies"));
  let existingLobby = null;
  lobbiesSnapshot.forEach(docSnap => {
    const data = docSnap.data();
    if (data.players && data.players.some(p => p.email === currentUserEmail)) {
      existingLobby = { id: docSnap.id, host: data.host };
    }
  });

  if (existingLobby) {
    currentLobbyHost = existingLobby.host;
    lobbyDocRef = doc(db, "lobbies", existingLobby.id);
    onSnapshot(lobbyDocRef, (snapshot) => {
      if (snapshot.exists()) {
        acceptedPlayers = snapshot.data().players || [];
        renderPlayerSlots();
      }
    });
    return; // Don't create a new lobby
  }

  currentLobbyHost = currentUserEmail;
}
renderPlayerSlots();

if (currentUserEmail === currentLobbyHost) {
  createOrJoinLobby(currentLobbyHost);
}

}

async function createOrJoinLobby(lobbyId) {
  lobbyDocRef = doc(db, "lobbies", lobbyId);

  const snapshot = await getDoc(lobbyDocRef);
  if (!snapshot.exists() && currentUserEmail === currentLobbyHost) {
    await setDoc(lobbyDocRef, {
      host: currentLobbyHost,
      players: acceptedPlayers
    });
  }

  onSnapshot(lobbyDocRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      acceptedPlayers = data.players || [];
      currentLobbyHost = data.host || currentLobbyHost;
      renderPlayerSlots();
    } else {
      if (currentUserEmail === currentLobbyHost) {
        const hostPlayer = acceptedPlayers.find(p => p.email === currentLobbyHost);
        acceptedPlayers = hostPlayer ? [hostPlayer] : [];
        renderPlayerSlots();
      } else {
        alert("The lobby was closed by the host.");
        acceptedPlayers = [];
        renderPlayerSlots();
      }
    }
  });
}

async function loadUsers() {
  userListContainer.innerHTML = "<p>Loading...</p>";
  allUserRows = [];
  try {
    const emailsSnapshot = await getDocs(collection(db, "approved_emails"));
    const usernamesSnapshot = await getDocs(collection(db, "usernames"));

    const usernameMap = {};
    usernamesSnapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.email && data.username) {
        usernameMap[data.email] = data.username;
      } else if (!data.email && docSnap.id.includes("@")) {
        usernameMap[docSnap.id] = data.username || "Unnamed User";
      }
    });

    userListContainer.innerHTML = "";
    if (emailsSnapshot.empty) {
      userListContainer.innerHTML = "<p>No approved emails found.</p>";
      return;
    }

    emailsSnapshot.forEach(async docSnap => {
      const data = docSnap.data();
      const email = data.email || docSnap.id || "No Email";
      if (email === currentUserEmail) return;

      const username = usernameMap[email] || email.split('@')[0];
      const avatarURL = await getAvatarURL(email);
      const badgesHTML = await getUserBadge(email);

      const div = document.createElement("div");
      div.className = "user-row";
      div.setAttribute("data-email", email.toLowerCase());
      div.setAttribute("data-username", username.toLowerCase());
      div.style.display = "flex";
      div.style.opacity = "1";
      div.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px;">
          <img src="${avatarURL}" alt="avatar" style="width:36px; height:36px; border-radius:50%; object-fit:cover; border:1px solid #333;">
          <div>
            <div>${username} ${badgesHTML}</div>
            <div style="font-size:11px; opacity:0.6;">${email}</div>
          </div>
        </div>
        <button onclick="inviteUser('${email}')">+</button>
      `;
      allUserRows.push(div);
      userListContainer.appendChild(div);
    });
  } catch (err) {
    console.error("Error loading users:", err);
    userListContainer.innerHTML = "<p>Failed to load users.</p>";
  }
}

async function loadRecentInvites() {
  if (!currentUserEmail || !recentInvitesContainer) return;
  recentInvitesContainer.innerHTML = "<p>Loading...</p>";
  try {
    const docSnap = await getDoc(doc(db, "recent_invites", currentUserEmail));
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.emails && data.emails.length > 0) {
  recentInvitesContainer.innerHTML = "";

  // Take only the 2 most recent invites
  const recentEmails = data.emails.slice(0, 2);

  for (const email of recentEmails) {
    const avatarURL = await getAvatarURL(email);
    const badgesHTML = await getUserBadge(email);

    let username = email.split('@')[0];
    try {
      const userDoc = await getDoc(doc(db, "usernames", email));
      if (userDoc.exists() && userDoc.data().username) {
        username = userDoc.data().username;
      }
    } catch (err) {
      console.warn(`Username not found for ${email}`);
    }

    const div = document.createElement("div");
    div.className = "user-row";
    div.setAttribute("data-email", email.toLowerCase());
    div.setAttribute("data-username", username.toLowerCase());
    div.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px;">
        <img src="${avatarURL}" alt="avatar" style="width:36px; height:36px; border-radius:50%; object-fit:cover; border:1px solid #333;">
        <div>
          <div>${username} ${badgesHTML}</div>
          <div style="font-size:11px; opacity:0.6;">${email}</div>
        </div>
      </div>
      <button onclick="inviteUser('${email}')">+</button>
    `;
    recentInvitesContainer.appendChild(div);
  }
}
 else {
        recentInvitesContainer.innerHTML = "<p>No recent invites.</p>";
      }
    } else {
      recentInvitesContainer.innerHTML = "<p>No recent invites.</p>";
    }
  } catch (error) {
    console.error("Error loading recent invites:", error);
    recentInvitesContainer.innerHTML = "<p>Failed to load.</p>";
  }
}

async function addPlayerToLobby(email) {
  if (acceptedPlayers.find(player => player.email === email)) return;
  if (acceptedPlayers.length >= 5) {
    alert("Maximum of 5 players reached!");
    return;
  }

  if (lobbyDocRef) {
    const latestSnapshot = await getDoc(lobbyDocRef);
    if (latestSnapshot.exists()) {
      acceptedPlayers = latestSnapshot.data().players || [];
    }
  }

  const avatarURL = await getAvatarURL(email);
  acceptedPlayers.push({ email, avatar: avatarURL, ready: false });

  if (lobbyDocRef && currentUserEmail === currentLobbyHost) {
    await setDoc(lobbyDocRef, { players: acceptedPlayers }, { merge: true });
  }

  renderPlayerSlots();
}

window.kickPlayer = async function (email) {
  acceptedPlayers = acceptedPlayers.filter(player => player.email !== email);
  if (lobbyDocRef && currentUserEmail === currentLobbyHost) {
    await setDoc(lobbyDocRef, { players: acceptedPlayers }, { merge: true });
  }
  renderPlayerSlots();
  const userRow = userListContainer.querySelector(`.user-row[data-email='${email.toLowerCase()}']`);
  if (userRow) {
    userRow.style.display = "flex";
    userRow.style.opacity = "1";
  }
};

window.closeLobby = async function () {
  if (currentUserEmail !== currentLobbyHost) {
    alert("Only the host can close the lobby.");
    return;
  }

  if (lobbyDocRef) {
    // Mark the lobby as closed
    await setDoc(lobbyDocRef, { lobbyClosed: true }, { merge: true });

    // Small delay to ensure clients detect the flag
    import("https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js")
  .then(async ({ deleteDoc }) => {
    await deleteDoc(lobbyDocRef);
    console.log("Lobby deleted:", lobbyDocRef.id);
    window.location.reload(); // reload AFTER deletion
  });

  }

  // Clear any leftover invitations
  await setDoc(doc(db, "invitations", currentUserEmail), { invitedBy: null }, { merge: true });

  acceptedPlayers = [];
  playerSlotsContainer.innerHTML = "";
  alert("Lobby closed. All players removed.");
  loadUsers();
  window.location.reload();
};




function renderPlayerSlots() {
  playerSlotsContainer.innerHTML = "";

  acceptedPlayers.sort((a, b) => (a.email === currentLobbyHost ? -1 : b.email === currentLobbyHost ? 1 : 0));

 const totalPlayers = acceptedPlayers.length;
const maxPlayers = 5;

const avatarsHTML = acceptedPlayers.map((player, index) => {
  const isHost = player.email === currentLobbyHost;
  const isNewest = index === totalPlayers - 1; // The latest appended player
  return `
    <div style="position:relative; display:inline-block; text-align:center; margin:0 5px;">
      <img src="${player.avatar}" 
           title="${player.email}"
           style="width:50px; height:50px; border-radius:50%; 
           border:2px solid ${player.ready ? 'green' : '#ffcf00'}; 
           object-fit:cover;" />
      ${isHost ? `<div style="font-size:14px; color:#ffcf00; margin-top:4px;">👑</div>` : ""}
      ${isNewest ? `<div style="position:absolute; bottom:-6px; left:50%; transform:translateX(-50%);
           background:#333; color:#fff; font-size:12px; padding:2px 6px; border-radius:12px;">
           ${totalPlayers}/${maxPlayers}
         </div>` : ""}
      ${player.email !== currentUserEmail && currentUserEmail === currentLobbyHost ? `
        <span class="kick-overlay" onclick="kickPlayer('${player.email}')"
              style="position:absolute; top:-5px; right:-5px; background:red; color:white;
              font-size:10px; width:20px; height:20px; border-radius:50%; display:flex;
              align-items:center; justify-content:center; cursor:pointer; font-family:'QilkaBold'; line-height:1;">
          X
        </span>
      ` : ''}
    </div>
  `;
}).join('');


  playerSlotsContainer.innerHTML = `
    <div class="avatar-list" style="display:flex; justify-content:center; gap:10px; margin-bottom:10px;">
      ${avatarsHTML}
    </div>
  `;

  const allPlayersReady = acceptedPlayers.length > 1 && acceptedPlayers.every(player => player.ready);

  if (currentUserEmail) {
    let hostButton = '';
    if (currentUserEmail === currentLobbyHost) {
      hostButton = `<button onclick="closeLobby()" 
        style="padding:6px 16px; background:#ff4d4d; border:none; border-radius:8px;
        cursor:pointer; font-family:'QilkaBold'; font-size:14px; color:white;">
        Close Lobby
      </button>`;
    }
    playerSlotsContainer.innerHTML += `
      <div style="text-align:center; margin-top:10px;">
        <button onclick="${allPlayersReady && currentUserEmail === currentLobbyHost ? 'startGame()' : 'toggleUserReady()'}"
          style="padding:8px 20px; background:#ffcf00; border:none; border-radius:8px;
          cursor:pointer; font-family:'QilkaBold'; font-size:14px; margin-bottom:5px;">
          ${allPlayersReady && currentUserEmail === currentLobbyHost ? "Start" : (isUserReady ? "Unready" : "I'm Ready")}
        </button>
        <br/>
        ${hostButton}
      </div>
    `;
  }
}

window.toggleUserReady = async function () {
  isUserReady = !isUserReady;
  acceptedPlayers = acceptedPlayers.map(p => p.email === currentUserEmail ? { ...p, ready: isUserReady } : p);
  if (lobbyDocRef) {
    await setDoc(lobbyDocRef, { players: acceptedPlayers }, { merge: true });
  }
  renderPlayerSlots();
};

window.startGame = async function () {
  if (!lobbyDocRef || currentUserEmail !== currentLobbyHost) return;

  const snapshot = await getDoc(lobbyDocRef);
  if (!snapshot.exists()) return;
  const data = snapshot.data();
  const players = data.players || [];

  const allReady = players.length > 0 && players.every(player => player.ready);
  if (!allReady) {
    alert("Not all players are ready!");
    return;
  }

  const reviewingSet = localStorage.getItem("reviewingSet");
  if (!reviewingSet) {
    alert("No flashcard set found for the host!");
    return;
  }

  try {
    // Add scores and timer
    const playersWithScores = players.map(player => ({
      ...player,
      correctScore: 0,
      incorrectScore: 0
    }));

    const startTime = Date.now();
const endTime = startTime + 75000; // 1 minute + 5s buffer

await setDoc(doc(db, "gamestartlobby", currentLobbyHost), {
  host: currentLobbyHost,
  startTime,
  endTime,
  cardSet: JSON.parse(reviewingSet),
  players: playersWithScores
});


    const gameStartTime = Date.now() + 3000;
    await setDoc(lobbyDocRef, { gameStartTime }, { merge: true });

    showLocalCountdown(3, () => {
      window.location.href = "defidrop.html?host=" + encodeURIComponent(currentLobbyHost);
    });

  } catch (err) {
    console.error("Failed to start game:", err);
    alert("Error starting game. Check console.");
  }
};






window.leaveLobby = async function () {
  if (currentUserEmail === currentLobbyHost) {
    alert("Host cannot leave the lobby. Use 'Close Lobby' instead.");
    return;
  }
  acceptedPlayers = acceptedPlayers.filter(p => p.email !== currentUserEmail);
  isUserReady = false;

  if (lobbyDocRef) {
    await setDoc(lobbyDocRef, { players: acceptedPlayers }, { merge: true });
  }

  multiplayerModal.style.display = "none";
  loadUsers();
};

window.inviteUser = async function (email) {
  alert("Invite sent to " + email);
  await setDoc(doc(db, "invitations", email), { invitedBy: currentUserEmail }, { merge: true });

  try {
    const refDoc = doc(db, "recent_invites", currentUserEmail);
    const snapshot = await getDoc(refDoc);
    let recent = [];
    if (snapshot.exists()) {
      recent = snapshot.data().emails || [];
    }
    // Remove existing occurrence if exists
recent = recent.filter(e => e !== email);

// Add new email at the start
recent.unshift(email);

// Trim to the latest 5 invites
recent = recent.slice(0, 5);

// Save updated list
await setDoc(refDoc, { emails: recent, updatedAt: new Date().toISOString() });

// Animate the UI
// Animate the UI without full re-render
const firstRow = recentInvitesContainer.querySelector('.user-row:first-child');
const userRow = recentInvitesContainer.querySelector(`.user-row[data-email='${email.toLowerCase()}']`);

if (userRow && firstRow && userRow !== firstRow) {
  firstRow.classList.add('move-down');
  userRow.classList.add('move-to-top');

  setTimeout(() => {
    firstRow.classList.remove('move-down');
    userRow.classList.remove('move-to-top');
    recentInvitesContainer.prepend(userRow); // Move invited user on top
  }, 500); // match CSS animation
} else if (!userRow) {
  loadRecentInvites(); // Only load if new
}



  } catch (e) {
    console.error("Failed to update recent invites:", e);
  }

  const userRow = userListContainer.querySelector(`.user-row[data-email='${email.toLowerCase()}']`);
  if (userRow) {
    userRow.style.transition = "opacity 0.3s";
    userRow.style.opacity = "0";
    setTimeout(() => {
      userRow.style.display = "none";
    }, 300);
  }
};

if (userSearchInput) {
  userSearchInput.addEventListener("input", function () {
    const query = this.value.toLowerCase();
    allUserRows.forEach(row => {
      const email = row.getAttribute("data-email");
      const username = row.getAttribute("data-username");
      if (email.includes(query) || username.includes(query)) {
        row.style.display = "flex";
      } else {
        row.style.display = "none";
      }
    });
  });
}
function showLocalCountdown(seconds, callback) {
  let countdown = seconds;
  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.8);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2em;
    z-index: 9999;
    font-family: 'QilkaBold';
  `;
  overlay.innerText = `Game starting in ${countdown}...`;
  document.body.appendChild(overlay);

  const interval = setInterval(() => {
    countdown--;
    if (countdown > 0) {
      overlay.innerText = `Game starting in ${countdown}...`;
    } else {
      clearInterval(interval);
      document.body.removeChild(overlay);
      if (callback) callback();
    }
  }, 1000);
}
