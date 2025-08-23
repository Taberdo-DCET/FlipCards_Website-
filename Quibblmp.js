// Quibblmp.js
import { db, auth } from './firebaseinit.js';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js";
import { storage } from './firebaseStorageInit.js';
import { increment } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

const createLobbyBtn = document.querySelector(".create-lobby-btn");
const multiplayerModal = document.getElementById("multiplayerModal");
const userListContainer = document.getElementById("userList");
const playerSlotsContainer = document.getElementById("playerSlots");
const userSearchInput = document.getElementById("userSearch");
const recentInvitesContainer = document.getElementById("recentInvitesList");
const setSelectionModal = document.getElementById("setSelectionModal");
const setSelectionGrid = document.getElementById("setSelectionGrid");

let acceptedPlayers = [];
let allUserRows = [];
let currentUserEmail = null;
let isUserReady = false;
let lobbyDocRef = null;
let currentLobbyHost = null;
let lastRenderedTimestamp = 0;
// PASTE THE NEW FUNCTION RIGHT HERE
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
// --- AUTH STATE ---
auth.onAuthStateChanged((user) => {
  if (user) {
    currentUserEmail = user.email;
    renderPlayerSlots();
    renderTopAvatars();
    updateStartButtonState();

    const hostFromStorage = localStorage.getItem("quibblHost");
    if (hostFromStorage) {
      currentLobbyHost = hostFromStorage;
      createOrJoinLobby(hostFromStorage); // ✅ Call this for BOTH host and invited
      if (hostFromStorage === user.email && createLobbyBtn) {
  createLobbyBtn.textContent = "Configure Lobby";
}

    } else {
      currentLobbyHost = currentUserEmail;
      createOrJoinLobby(currentUserEmail); // ✅ fallback for host with no storage yet
    }
  }
});
if (localStorage.getItem("forceReload") === "true") {
  localStorage.removeItem("forceReload");
  setTimeout(() => {
    const reviewingSet = JSON.parse(localStorage.getItem("reviewingSet") || "{}");
    if (reviewingSet && reviewingSet.numCardsToDisplay) {
      const startTime = Date.now() + 5000;
      setDoc(doc(db, "quibbllobbies", currentUserEmail), {
        gameStartTime: startTime
      }, { merge: true });

      startCountdown(5000);
    }
  }, 200); // Slight delay to ensure Firestore is ready
}


const savedSet = JSON.parse(localStorage.getItem("reviewingSet") || "null");
if (savedSet && savedSet.title) updateQuibblTitle(savedSet.title);
if (savedSet && savedSet.numCardsToDisplay) updateRoundsDisplay();


// --- OPEN MODAL ---
if (createLobbyBtn) {
  createLobbyBtn.addEventListener("click", async () => {
    if (createLobbyBtn.textContent === "Create Lobby") {
  currentLobbyHost = currentUserEmail;
  localStorage.setItem("quibblHost", currentUserEmail); // ✅ SAVE HOST LOCALLY
  lobbyDocRef = null;
  acceptedPlayers = [];
  await setupCurrentUserInLobby();
}
 else {
      // Configure existing lobby
      if (!lobbyDocRef) {
        await checkExistingLobby();
      }
    }
    loadUsers();
    loadRecentInvites();
    multiplayerModal.style.display = "flex";
    renderPlayerSlots();
    renderTopAvatars();
    updateStartButtonState();
  });
}

// --- CLOSE MODAL ---
window.closeMultiplayerModal = function () {
  multiplayerModal.style.display = "none";
  if (createLobbyBtn) createLobbyBtn.textContent = "Configure Lobby";
};

// --- AVATAR FETCH ---
async function getAvatarURL(email) {
  try {
    const avatarRef = ref(storage, `avatars/${email}`);
    return await getDownloadURL(avatarRef);
  } catch {
    return "Group-10.png";
  }
}

// --- BADGE FETCH ---
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

// --- SETUP USER IN LOBBY ---
async function setupCurrentUserInLobby() {
  if (!currentUserEmail) return;
  const avatarURL = await getAvatarURL(currentUserEmail);

  if (currentUserEmail === currentLobbyHost || !currentLobbyHost) {
    if (!acceptedPlayers.find(player => player.email === currentUserEmail)) {
      acceptedPlayers.unshift({ email: currentUserEmail, avatar: avatarURL, ready: false });
    }
    if (currentUserEmail === currentLobbyHost && currentLobbyHost) {
  const lobbyRef = doc(db, "quibbllobbies", currentLobbyHost);
  await setDoc(lobbyRef, {
    players: acceptedPlayers,
    host: currentLobbyHost
  }, { merge: true });
}

  }

  if (!currentLobbyHost) {
    const lobbiesSnapshot = await getDocs(collection(db, "quibbllobbies"));
    let existingLobby = null;
    lobbiesSnapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.players && data.players.some(p => p.email === currentUserEmail)) {
        existingLobby = { id: docSnap.id, host: data.host };
      }
    });

    if (existingLobby) {
      currentLobbyHost = existingLobby.host;
      lobbyDocRef = doc(db, "quibbllobbies", existingLobby.id);

      onSnapshot(lobbyDocRef, (snapshot) => {
        if (snapshot.exists()) {
          acceptedPlayers = snapshot.data().players || [];
          const currentPlayer = acceptedPlayers.find(p => p.email === currentUserEmail);
          isUserReady = currentPlayer ? currentPlayer.ready : false;
          renderPlayerSlots();
          renderTopAvatars();
          updateStartButtonState();
        }
      });
      return;
    }
    currentLobbyHost = currentUserEmail;
  }
  renderPlayerSlots();
  renderTopAvatars();
  updateStartButtonState();

  if (currentUserEmail === currentLobbyHost) {
    createOrJoinLobby(currentUserEmail); // Use email as doc ID
  }
}

// --- CREATE OR JOIN LOBBY ---
async function createOrJoinLobby(lobbyId = currentUserEmail) {
  lobbyDocRef = doc(db, "quibbllobbies", lobbyId);

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
      
      
      listenForScores(currentLobbyHost); // ✅ Real-time scores update

      const chatContainer = document.getElementById("chatContainer");
if (chatContainer) {
  (async () => {
    let chatArray = data.chat || [];

    // Sort by timestamp (oldest to newest)
    chatArray.sort((a, b) => {
      const t1 = a.timestamp?.seconds || a.timestamp || 0;
      const t2 = b.timestamp?.seconds || b.timestamp || 0;
      return t1 - t2;
    });

    // Cache and state to avoid re-rendering old messages
    const badgeCache = window._chatBadgeCache || {};
    window._chatBadgeCache = badgeCache;
    window.lastRenderedTimestamp = window.lastRenderedTimestamp || 0;

    for (const chat of chatArray) {
      const timestamp = chat.timestamp?.seconds || chat.timestamp || 0;
      if (timestamp <= window.lastRenderedTimestamp) continue;

      const div = document.createElement("div");
div.classList.add("chat-message");

      div.style.margin = "5px 0";
      div.style.fontFamily = "QilkaBold";
      div.style.color = chat.isCorrect ? "#28a745" : "#fff";

      let badges = "";
      if (badgeCache[chat.email]) {
  badges = badgeCache[chat.email];
} else {
  try {
    if (chat.email === "system@quibbl") {
      // ✅ Force verified badge for System
      badges = `<img src="verified.svg" class="badge-icon" alt="verified" title="Verified"> `;
    } else {
      const approvedDoc = await getDoc(doc(db, "approved_emails", chat.email));
      if (approvedDoc.exists()) {
        const roleString = approvedDoc.data().role || "";
        const roleArray = roleString.split(',').map(r => r.trim().toLowerCase());

        if (roleArray.includes("verified")) {
          badges += `<img src="verified.svg" class="badge-icon" alt="verified" title="Verified"> `;
        }
        if (roleArray.includes("first")) {
          badges += `<img src="first.png" class="badge-icon" alt="first" title="First User"> `;
        }
      }
    }
  } catch (e) {
    console.error("Failed to fetch badges:", e);
  }
  badgeCache[chat.email] = badges;
}


      div.innerHTML = chat.isCorrect
        ? `${chat.user}${badges} got the correct answer! 🎉`
        : `${chat.user}${badges}: ${chat.message}`;

      chatContainer.appendChild(div);
      window.lastRenderedTimestamp = timestamp;
    }

    chatContainer.scrollTop = chatContainer.scrollHeight;
  })();
}



      acceptedPlayers = data.players || [];
      currentLobbyHost = data.host || currentLobbyHost;
      const currentPlayer = acceptedPlayers.find(p => p.email === currentUserEmail);
      isUserReady = currentPlayer ? currentPlayer.ready : false;
      renderPlayerSlots();
      renderTopAvatars();
      updateStartButtonState();
    } else {
      if (currentUserEmail === currentLobbyHost) {
        const hostPlayer = acceptedPlayers.find(p => p.email === currentLobbyHost);
        acceptedPlayers = hostPlayer ? [hostPlayer] : [];
        renderPlayerSlots();
        renderTopAvatars();
        updateStartButtonState();
      } else {
        showCustomAlert("The lobby was closed by the host.", 'error');
        acceptedPlayers = [];
        renderPlayerSlots();
        renderTopAvatars();
        updateStartButtonState();
      }
    }
  });
}

// --- START GAME ---
window.startGame = async function () {
  if (!lobbyDocRef || currentUserEmail !== currentLobbyHost) return;

  const snapshot = await getDoc(lobbyDocRef);
  if (!snapshot.exists()) return;

  const data = snapshot.data();
  const players = data.players || [];

  const allReady = players.length > 0 && players.every(player => player.ready);
  if (!allReady) {
    showCustomAlert("Not all players are ready!", 'error');
    return;
  }

  const reviewingSet = localStorage.getItem("reviewingSet");
  if (!reviewingSet) {
    showCustomAlert("No flashcard set found for the host!", 'error');
    return;
  }

  const parsedSet = JSON.parse(reviewingSet);
  const shuffledOrder = [...(parsedSet.flashcards || [])].sort(() => Math.random() - 0.5);
  const selectedCards = parsedSet.numCardsToDisplay
    ? shuffledOrder.slice(0, parsedSet.numCardsToDisplay)
    : shuffledOrder;

  try {
    const playersWithScores = players.map(player => ({
      ...player,
      correctScore: 0,
      incorrectScore: 0
    }));

    const startTime = Date.now() + 5000;
    const endTime = startTime + 75000;

    await setDoc(doc(db, "gamestartquibbl", currentLobbyHost), {
  host: currentLobbyHost,
  startTime,
  endTime,
  cardSet: parsedSet,
  players: playersWithScores,
  flashcardSequence: selectedCards
});

// ⬇️ Push system message to chat
try {
  const lobbyChatRef = doc(db, "quibbllobbies", currentLobbyHost);
  const lobbySnap = await getDoc(lobbyChatRef);
  const currentChat = lobbySnap.exists() && lobbySnap.data().chat ? lobbySnap.data().chat : [];

  const startBtn = document.querySelector(".start-btn");
const messageText = startBtn?.textContent === "Restart" ? "Game Restarted" : "Game Started";


  currentChat.push({
    user: "System",
    email: "system@quibbl",
    message: messageText,
    isCorrect: false,
    timestamp: Date.now()
  });

  await setDoc(lobbyChatRef, { chat: currentChat }, { merge: true });

  // Mark game as started
  localStorage.setItem("gameStartedBefore", "true");
} catch (err) {
  console.error("Failed to push system message to chat:", err);
}


const restartToken = Date.now(); // unique identifier to trigger reload for all

await setDoc(lobbyDocRef, {
  gameStartTime: startTime,
  restartToken
}, { merge: true });

localStorage.setItem("forceReload", "true");
localStorage.setItem("countdownFinished", "false");
window.location.reload(true);


localStorage.setItem("forceReload", "true");
localStorage.setItem("countdownFinished", "false");
window.location.reload(true);


  } catch (err) {
    console.error("Failed to (re)start game:", err);
    showCustomAlert("Error starting game. Check console.", 'error');
  }
};



// --- LOAD USERS ---
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
        <button 
  onclick="inviteUser('${email}')" 
  title="${!canInvite() ? 'Select a flashcard set and number of cards first!' : 'Invite player'}" 
  ${!canInvite() ? "disabled style='opacity:0.3; cursor:not-allowed;'" : ""}>+</button>


      `;
      allUserRows.push(div);
      userListContainer.appendChild(div);
    });
  } catch (err) {
    console.error("Error loading users:", err);
    userListContainer.innerHTML = "<p>Failed to load users.</p>";
  }
}

// --- LOAD RECENT INVITES ---
async function loadRecentInvites() {
  if (!currentUserEmail || !recentInvitesContainer) return;
  recentInvitesContainer.innerHTML = "<p>Loading...</p>";
  try {
    const docSnap = await getDoc(doc(db, "recent_invites", currentUserEmail));
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.emails && data.emails.length > 0) {
        recentInvitesContainer.innerHTML = "";
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
           <button 
  onclick="inviteUser('${email}')" 
  title="${!canInvite() ? 'Select a flashcard set and number of cards first!' : 'Invite player'}" 
  ${!canInvite() ? "disabled style='opacity:0.3; cursor:not-allowed;'" : ""}>+</button>


          `;
          recentInvitesContainer.appendChild(div);
        }
      } else {
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

// --- FLASHCARD SET MODAL ---
window.openSetModal = async function () {
  if (!setSelectionModal) return;
  setSelectionModal.classList.remove("hidden");
  await loadFlashcardSets();
};

window.closeSetModal = function () {
  if (!setSelectionModal) return;
  setSelectionModal.classList.add("hidden");
};

async function loadFlashcardSets() {
  if (!setSelectionGrid) return;
  setSelectionGrid.innerHTML = "<p>Loading...</p>";

  try {
    const publicSnap = await getDocs(collection(db, "flashcard_sets"));
    setSelectionGrid.innerHTML = "";

    publicSnap.forEach((docSnap) => {
      const data = docSnap.data();
      setSelectionGrid.appendChild(createSetCard(data, docSnap.id));
    });
  } catch (error) {
    console.error("Error loading flashcard sets:", error);
    setSelectionGrid.innerHTML = "<p>Failed to load flashcard sets.</p>";
  }
}

function createSetCard(data, id) {
  const card = document.createElement("div");
  card.className = "flashcard-set-card";
  card.innerHTML = `
    <div class="flashcard-title">${data.title || "Untitled Set"}</div>
    <div class="flashcard-desc">${data.description || "No description available."}</div>
    <button class="select-set-btn" onclick="selectFlashcardSet('${id}', true)">Select</button>
  `;
  return card;
}

window.selectFlashcardSet = async function (id, isPublic) {
  try {
    const setRef = doc(db, "flashcard_sets", id);
    const setSnapshot = await getDoc(setRef);

    if (!setSnapshot.exists()) {
      showCustomAlert("Flashcard set not found!", 'error');
      return;
    }

    const setData = setSnapshot.data();
    const selectedSet = {
      id,
      isPublic,
      title: setData.title || "Untitled Set",
      description: setData.description || "",
      flashcards: setData.flashcards || []
    };

    localStorage.setItem("reviewingSet", JSON.stringify(selectedSet));

    if (currentUserEmail === currentLobbyHost && lobbyDocRef) {
  await setDoc(lobbyDocRef, {
    selectedSet: {
      ...selectedSet,
      updatedAt: Date.now() // 🔥 Force snapshot to detect change
    }
  }, { merge: true });
}


    updateQuibblTitle(selectedSet.title);  // <-- Add this line
   showCustomAlert("Flashcard set selected!", 'success');
closeSetModal();
renderPlayerSlots();  // render first so the dropdown exists
populateCardsDropdown(selectedSet.flashcards.length);  // THEN enable and populate


  } catch (err) {
    console.error("Error fetching or saving flashcard set:", err);
    showCustomAlert("Failed to load or save the flashcard set.", 'error');
  }
};
window.populateCardsDropdown = function(totalCards) {
  const dropdown = document.getElementById("cardsToDisplay");
  if (!dropdown) return;

  dropdown.disabled = false;
  dropdown.innerHTML = "<option value=''>Select...</option>";
  for (let i = 5; i <= totalCards; i += 5) {
    dropdown.innerHTML += `<option value="${i}">${i} cards</option>`;
  }
  if (totalCards % 5 !== 0 && totalCards > 0) {
    dropdown.innerHTML += `<option value="${totalCards}">${totalCards} cards</option>`;
  }
};
window.saveCardsToDisplay = async function() {
  const dropdown = document.getElementById("cardsToDisplay");
  if (!dropdown || !dropdown.value) return;

  const numCards = parseInt(dropdown.value, 10);
  const reviewingSet = JSON.parse(localStorage.getItem("reviewingSet") || "{}");

  if (currentUserEmail === currentLobbyHost && lobbyDocRef) {
    await setDoc(lobbyDocRef, { numCardsToDisplay: numCards }, { merge: true });
  }

  reviewingSet.numCardsToDisplay = numCards;
  localStorage.setItem("reviewingSet", JSON.stringify(reviewingSet));
updateRoundsDisplay();
document.getElementById("selectedCardsCount").textContent = numCards;
populateCardsDropdown(reviewingSet.flashcards.length || 0);

// Refresh invite buttons if modal is open
if (multiplayerModal?.style.display === "flex") {
  loadUsers();
  loadRecentInvites();
}


};
function updateRoundsDisplay() {
  const roundsDisplay = document.getElementById("roundsDisplay");
  const reviewingSet = JSON.parse(localStorage.getItem("reviewingSet") || "{}");
  if (roundsDisplay) {
    roundsDisplay.textContent = reviewingSet.numCardsToDisplay || 0;
  }
  const selectedCardsEl = document.getElementById("selectedCardsCount");
if (selectedCardsEl) selectedCardsEl.textContent = reviewingSet.numCardsToDisplay || 0;

}





// --- RENDER PLAYER SLOTS ---
window.renderPlayerSlots = function () {
  playerSlotsContainer.innerHTML = "";
  acceptedPlayers.sort((a, b) => (a.email === currentLobbyHost ? -1 : b.email === currentLobbyHost ? 1 : 0));

  const totalPlayers = acceptedPlayers.length;
  const maxPlayers = 5;

  const avatarsHTML = acceptedPlayers.map((player, index) => {
    const isHost = player.email === currentLobbyHost;
    const isNewest = index === totalPlayers - 1;
    return `
  <div style="position:relative; display:inline-block; text-align:center; margin:0 5px;">
    <div style="position:absolute; top:-20px; left:50%; transform:translateX(-50%);
      background:#171717; color:#fff; padding:2px 8px; font-size:12px; border-radius:12px;">
      ${index + 1}/${maxPlayers}
    </div>
    <img src="${player.avatar}" 
         title="${player.email}"
         style="width:50px; height:50px; border-radius:50%; border:2px solid ${player.ready ? 'green' : '#ffcf00'}; object-fit:cover;" />
    ${isHost ? `<div style="font-size:14px; color:#ffcf00; margin-top:4px;">👑</div>` : ""}
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

  if (currentUserEmail) {
    playerSlotsContainer.innerHTML += `
      <div style="text-align:center; margin-top:10px;">
        <button onclick="${currentUserEmail === currentLobbyHost ? 'hostToggleReady()' : 'toggleUserReady()'}"
          style="padding:8px 20px; background:#ffcf00; border:none; border-radius:8px;
          cursor:pointer; font-family:'QilkaBold'; font-size:14px; margin-bottom:5px;">
          ${isUserReady ? "Unready" : "I'm Ready"}
        </button>
        <br/>
        ${currentUserEmail === currentLobbyHost
          ? `<button onclick="closeLobby()" 
            style="padding:6px 16px; background:#ff4d4d; border:none; border-radius:8px;
            cursor:pointer; font-family:'QilkaBold'; font-size:14px; color:white;">
            Close Lobby
          </button>`
          : `<button onclick="leaveLobby()" 
            style="padding:6px 16px; background:#ff4d4d; border:none; border-radius:8px;
            cursor:pointer; font-family:'QilkaBold'; font-size:14px; color:white;">
            Leave Lobby
          </button>`
        }
        <br/>
        ${currentUserEmail === currentLobbyHost ? `
  <button onclick="openSetModal()" class="neumorphic-button2" style="margin-top:8px;">
    ${localStorage.getItem("reviewingSet") ? "Change Flashcard Set" : "Select a Flashcard Set"}
  </button>
` : ""}

        ${currentUserEmail === currentLobbyHost ? `
  <br/>
  <label for="cardsToDisplay" style="display:block; margin-top:8px; color:#ffcf00;">
    Number of Cards to Show
  </label>
  <select id="cardsToDisplay" onchange="saveCardsToDisplay()" style="padding:6px; border-radius:6px; margin-top:4px;" 
  ${localStorage.getItem("reviewingSet") ? "" : "disabled"}>
  <option value="">Select...</option>
</select>

` : ""}
${currentUserEmail === currentLobbyHost ? `
  <div style="margin-top: 8px; color: white;">
    Selected: <span id="selectedCardsCount">0</span> cards
  </div>
` : ""}

      </div>
    `;
  }
  updateRoundsDisplay();
const reviewingSet = JSON.parse(localStorage.getItem("reviewingSet") || "null");
if (reviewingSet && reviewingSet.flashcards) {
  populateCardsDropdown(reviewingSet.flashcards.length);
}

};

function renderTopAvatars() {
  const avatarContainer = document.querySelector('.avatar-container');
  if (!avatarContainer) return;

  avatarContainer.innerHTML = "";

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



  for (let i = playersToShow.length; i < maxAvatars; i++) {
    const img = document.createElement('img');
    img.src = "Group-10.png";
    img.alt = "Empty slot";
    avatarContainer.appendChild(img);
  }
}

// --- INVITE USER ---
window.inviteUser = async function (inviteeEmail) {
  if (!currentUserEmail) {
    showCustomAlert("You must be logged in to invite users.", 'error');
    return;
  }

  try {
    await setDoc(doc(db, "invitations_quibbl", inviteeEmail), {
      invitedBy: currentUserEmail,
      timestamp: Date.now()
    }, { merge: true });

    const refDoc = doc(db, "recent_invites", currentUserEmail);
    const snapshot = await getDoc(refDoc);
    let recent = [];
    if (snapshot.exists()) {
      recent = snapshot.data().emails || [];
    }
    recent = recent.filter(e => e !== inviteeEmail);
    recent.unshift(inviteeEmail);
    recent = recent.slice(0, 5);
    await setDoc(refDoc, { emails: recent, updatedAt: new Date().toISOString() });

    // Change button to green check (works for both user list and recent invites)
    const btn = document.querySelector(`button[onclick="inviteUser('${inviteeEmail}')"]`);
    if (btn) {
      btn.textContent = "✔";
      btn.style.backgroundColor = "#28a745";
      btn.style.color = "white";
      btn.style.fontWeight = "bold";

      setTimeout(() => {
        btn.textContent = "+";
        btn.style.backgroundColor = "";
        btn.style.color = "";
        btn.style.fontWeight = "";
      }, 5000);
    }

  } catch (error) {
    console.error("Error sending invitation:", error);
    showCustomAlert("Failed to send invitation. Check console for details.", 'error');
  }
};


// --- TOGGLE USER READY ---
window.toggleUserReady = async function () {
  isUserReady = !isUserReady;
  acceptedPlayers = acceptedPlayers.map(p =>
    p.email === currentUserEmail ? { ...p, ready: isUserReady } : p
  );

  if (lobbyDocRef) {
    await setDoc(lobbyDocRef, { players: acceptedPlayers }, { merge: true });
  }

  renderPlayerSlots();
  renderTopAvatars();
  updateStartButtonState();
};
window.hostToggleReady = async function () {
  // This only updates ready status in the Quibbl lobby modal, not mini modal
  isUserReady = !isUserReady;
  acceptedPlayers = acceptedPlayers.map(p =>
    p.email === currentUserEmail ? { ...p, ready: isUserReady } : p
  );

  if (lobbyDocRef) {
    await setDoc(lobbyDocRef, { players: acceptedPlayers }, { merge: true });
  }

  renderPlayerSlots();
  renderTopAvatars();
  updateStartButtonState();
};

// --- LEAVE LOBBY ---
window.leaveLobby = async function () {
  const host = localStorage.getItem("quibblHost");
  const isHost = currentUserEmail === host;

  if (isHost) {
    if (isHost) {
  if (confirm("Are you sure you want to close the lobby? All players will be removed.")) {
    try {
      const chatRef = doc(db, "quibbllobbies", currentUserEmail);
      const snapshot = await getDoc(chatRef);
      const chat = snapshot.exists() && snapshot.data().chat ? snapshot.data().chat : [];

      chat.push({
        user: "System",
        email: "system@quibbl",
        message: `Host has left the lobby. Returning in 5 seconds...`,
        isCorrect: false,
        timestamp: Date.now()
      });

      await setDoc(chatRef, {
        chat: chat,
        lobbyClosed: true
      }, { merge: true });

      localStorage.removeItem("quibblHost");
      localStorage.removeItem("reviewingSet");
      localStorage.removeItem("countdownFinished");

      setTimeout(() => {
        window.location.href = "quibbl.html";
      }, 5000);

    } catch (err) {
      console.error("Error closing lobby:", err);
      alert("Failed to close lobby.");
    }
  }
}

  } else {
    try {
      const lobbyRef = doc(db, "quibbllobbies", host);
      const snapshot = await getDoc(lobbyRef);
      const userName = localStorage.getItem("username") || currentUserEmail;

      if (snapshot.exists()) {
        const data = snapshot.data();
        const updatedPlayers = (data.players || []).map(p =>
  p.email === currentUserEmail ? { ...p, left: true } : p
);

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



// --- CLOSE LOBBY ---
window.closeLobby = async function () {
  if (currentUserEmail !== currentLobbyHost) {
    showCustomAlert("Only the host can close the lobby.", 'error');
    return;
  }

  try {
    if (lobbyDocRef) {
      await deleteDoc(lobbyDocRef);
      showCustomAlert("Lobby closed.", 'success');
      localStorage.removeItem("reviewingSet");

      window.location.reload();
    } else {
      console.warn("No active lobby reference found.");
    }
  } catch (error) {
    console.error("Error closing lobby:", error);
    showCustomAlert("Failed to close the lobby. Check console for details.", 'error');
  }
};
// --- SEARCH FUNCTIONALITY ---
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
function updateStartButtonState() {
  const startBtn = document.querySelector(".start-btn");
  if (!startBtn) return;

  // Check if all players are ready
  const allReady = acceptedPlayers.length > 0 && acceptedPlayers.every(p => p.ready);

  // Check if a flashcard set is selected
  const selectedSet = localStorage.getItem("reviewingSet");
  const numCardsSelected = selectedSet && JSON.parse(selectedSet).numCardsToDisplay;


  if (allReady && selectedSet && numCardsSelected && currentUserEmail === currentLobbyHost) {

    startBtn.style.backgroundColor = "#28a745"; // Green
    startBtn.style.color = "white";
    startBtn.style.cursor = "pointer";
  } else {
    startBtn.style.backgroundColor = "#171717"; // Default
    startBtn.style.color = "#fff";
    startBtn.style.cursor = "not-allowed";
  }
}
function updateQuibblTitle(title) {
  const titleElement = document.querySelector(".quibbl-title");
  if (titleElement) {
    titleElement.textContent = title ? `Quibbl - ${title}` : "Quibbl";
  }
}
function startCountdown(timeRemaining) {
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


// Reset gameStartTime
if (lobbyDocRef) {
  setDoc(lobbyDocRef, { gameStartTime: null }, { merge: true })
  .then(() => console.log("gameStartTime reset"))
  .catch(err => console.error("Failed to reset gameStartTime:", err));

}

console.log("Countdown finished. Game start triggered.");


    }
  }, 1000);
}
import { addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

window.submitAnswer = async function () {
  const input = document.getElementById("chatInputField");
  const message = input?.value?.trim();
  if (!message || !currentUserEmail) return;



  let username = localStorage.getItem("username");

if (!username) {
  try {
    const nameDoc = await getDoc(doc(db, "usernames", currentUserEmail));
    if (nameDoc.exists()) {
      username = nameDoc.data().username || currentUserEmail;
      localStorage.setItem("username", username);
    } else {
      username = currentUserEmail;
    }
  } catch (err) {
    console.error("Error fetching username:", err);
    username = currentUserEmail;
  }
}

  const host = localStorage.getItem("quibblHost");

  const answerLower = message.toLowerCase();
const correctAnswer = (window.currentCorrectAnswer || "").toLowerCase();
const isCorrect = answerLower === correctAnswer;
window.correctAnswerTracker = window.correctAnswerTracker || {};

if (isCorrect && window.correctAnswerTracker[currentUserEmail]) {
  // User already submitted correct answer, and they're repeating it again
  if (input) input.value = "";

  // Show silent message (private)
  const chatContainer = document.getElementById("chatContainer");
  if (chatContainer) {
    const div = document.createElement("div");
    div.textContent = "✔️ You already answered this correctly.";
    div.style.color = "#888";
    div.style.fontStyle = "italic";
    div.style.fontSize = "13px";
    div.style.marginTop = "4px";
    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  return;
}

if (isCorrect) {
  window.correctAnswerTracker[currentUserEmail] = true;
}


const gameRef = doc(db, "gamestartquibbl", currentLobbyHost);
const gameSnap = await getDoc(gameRef);
if (gameSnap.exists()) {
  const data = gameSnap.data();
const players = data.players || [];
const updatedPlayers = players.map(player => {
  if (player.email === currentUserEmail && isCorrect) {
    return {
      ...player,
      correctScore: (player.correctScore || 0) + 1
    };
  }
  return player;
});

await setDoc(gameRef, {
  players: updatedPlayers
}, { merge: true });

}







  console.log("You submitted:", message, "Expected:", window.currentCorrectAnswer);



 if (host) {
  try {
    const lobbyChatRef = doc(db, "quibbllobbies", host);
    const lobbySnap = await getDoc(lobbyChatRef);
    const currentChat = lobbySnap.exists() && lobbySnap.data().chat ? lobbySnap.data().chat : [];

    currentChat.push({
      user: username,
      email: currentUserEmail,
      message,
      isCorrect,
      timestamp: Date.now()
    });

    await setDoc(lobbyChatRef, { chat: currentChat }, { merge: true });
  } catch (err) {
    console.error("Failed to save chat:", err);
  }
}


  if (input) input.value = "";
  
};
function canInvite() {
  const reviewingSet = JSON.parse(localStorage.getItem("reviewingSet") || "{}");
  return reviewingSet.title && reviewingSet.numCardsToDisplay;
}
document.addEventListener("DOMContentLoaded", () => {
  const inputField = document.getElementById("chatInputField");
  if (inputField) {
    inputField.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        window.submitAnswer();
        inputField.value = ""; // ✅ Clear the input after submit
      }
    });
  }
});
function listenForScores(hostEmail) {
  const gameRef = doc(db, "gamestartquibbl", hostEmail);
  onSnapshot(gameRef, async (snapshot) => {
  if (snapshot.exists()) {
    const data = snapshot.data();
    const players = data.players || [];

   

    const scoreDivs = document.querySelectorAll(".score-values span");
    const scoreNames = document.querySelectorAll(".score-names span");
    const scorePairs = document.querySelectorAll(".score-values > span");
    const combinedPlayers = data.players || [];

    scorePairs.forEach((pair, index) => {
      const player = combinedPlayers[index];
      if (!player) return;

      const correctSpan = pair.querySelector(".correct");
      const wrongSpan = pair.querySelector(".wrong");

      const isLeft = player.left === true;

      if (correctSpan && wrongSpan) {
        correctSpan.textContent = player.correctScore || 0;
        wrongSpan.textContent = player.incorrectScore || 0;

        if (scoreNames[index])
          scoreNames[index].textContent =
            player.email === currentLobbyHost ? "P1 (Host):" : `P${index + 1}:`;

        if (isLeft) {
          pair.classList.add("player-left");
          if (scoreNames[index]) scoreNames[index].classList.add("player-left");
        } else {
          pair.classList.remove("player-left");
          if (scoreNames[index]) scoreNames[index].classList.remove("player-left");
        }
      }
    });

    // Fill empty slots
    for (let i = combinedPlayers.length; i < 5; i++) {
      if (scoreNames[i]) scoreNames[i].textContent = "No Player";
      if (scorePairs[i]) {
        const correctSpan = scorePairs[i].querySelector(".correct");
        const wrongSpan = scorePairs[i].querySelector(".wrong");
        if (correctSpan) correctSpan.textContent = "0";
        if (wrongSpan) wrongSpan.textContent = "0";
      }
    }
  }
});

}
// --- KICK PLAYER ---
window.kickPlayer = async function (emailToKick) {
  if (!lobbyDocRef || currentUserEmail !== currentLobbyHost) return;

  try {
    // Update Firestore
    const snapshot = await getDoc(lobbyDocRef);
    if (!snapshot.exists()) return;

    const data = snapshot.data();
    const updatedPlayers = (data.players || []).filter(p => p.email !== emailToKick);

    const updatedChat = data.chat || [];
    const userDoc = await getDoc(doc(db, "usernames", emailToKick));
    const kickedName = userDoc.exists() ? userDoc.data().username : emailToKick;

    updatedChat.push({
      user: "System",
      email: "system@quibbl",
      message: `${kickedName} was kicked from the lobby.`,
      isCorrect: false,
      timestamp: Date.now()
    });

    await setDoc(lobbyDocRef, {
      players: updatedPlayers,
      chat: updatedChat
    }, { merge: true });

    // Clear their invitation (just in case)
    await setDoc(doc(db, "invitations_quibbl", emailToKick), {
      invitedBy: null
    }, { merge: true });

    console.log(`${emailToKick} was kicked.`);
  } catch (err) {
    console.error("Failed to kick player:", err);
    alert("Failed to kick player. Check console.");
  }
};
async function recordQuibblWinners(players) {
  if (!players || players.length === 0) return;

  const highest = Math.max(...players.map(p => p.correctScore || 0));
  const winners = players.filter(p => (p.correctScore || 0) === highest);

  for (const winner of winners) {
    const winnerRef = doc(db, "quibblwinner", winner.email);
    await setDoc(winnerRef, { wins: increment(1) }, { merge: true });
  }
}
