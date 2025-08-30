import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import {
  getFirestore, collection, getDocs, addDoc, doc, updateDoc, deleteDoc,
  query, orderBy, onSnapshot, serverTimestamp, Timestamp, where
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import {
  getAuth, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { getStorage, ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js";
import { setDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCndfcWksvEBhzJDiQmJj_zSRI6FSVNUC0",
  authDomain: "flipcards-7adab.firebaseapp.com",
  projectId: "flipcards-7adab",
  storageBucket: "flipcards-7adab.firebasestorage.app",
  messagingSenderId: "836765717736",
  appId: "1:836765717736:web:ff749a40245798307b655d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth();
const storage = getStorage(app);

let currentUser = null;
let selectedUser = null;
let activeUnsubscribe = null;
let allUserDocs = [];

const messagesContainer = document.querySelector(".messages");
const input = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const emojiBtn = document.getElementById("emojiBtn");
const chatNavbar = document.getElementById("chatNavbar");
const sidebarHeader = document.querySelector(".sidebar-header");
const userListContainer = document.querySelector(".user-list");

const emojis = ["😊", "😂", "❤️", "🔥", "👍", "🥺", "😭", "🥰", "😎", "😡", "😅", "🤔", "🎉", "🙄"];

emojiBtn.addEventListener("click", () => {
  let picker = document.getElementById("emojiPicker");
  if (picker) {
    picker.remove();
    return;
  }

  picker = document.createElement("div");
  picker.id = "emojiPicker";
  picker.style.position = "absolute";
  picker.style.bottom = "70px";
  picker.style.right = "90px";
  picker.style.background = "#1a1a1a";
  picker.style.padding = "10px";
  picker.style.borderRadius = "10px";
  picker.style.boxShadow = "0 0 10px #000";
  picker.style.display = "grid";
  picker.style.gridTemplateColumns = "repeat(5, 1fr)";
  picker.style.gap = "8px";
  picker.style.zIndex = "999";

  emojis.forEach(e => {
    const btn = document.createElement("button");
    btn.textContent = e;
    btn.style.fontSize = "20px";
    btn.style.background = "transparent";
    btn.style.border = "none";
    btn.style.cursor = "pointer";
    btn.addEventListener("click", () => {
      input.value += e;
      input.focus();
    });
    picker.appendChild(btn);
  });

  document.body.appendChild(picker);
});

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user.email;
    const userDoc = await getDoc(doc(db, "usernames", user.email));
const approvedDoc = await getDoc(doc(db, "approved_emails", user.email));

let username = userDoc.exists() ? userDoc.data().username : "";
const role = approvedDoc.exists() ? approvedDoc.data().role || "" : "";
if (!username) username = user.email.split("@")[0];

renderSidebarHeader(username, user.email, role);

    populateUserList();
  } else {
    alert("You must be logged in to access the chat.");
    window.location.href = "login.html";
  }
});

sendBtn.addEventListener("click", async () => {
  const text = input.value.trim();
  if (!text || !selectedUser || !currentUser) return;

  const chatId = getChatId(currentUser, selectedUser);

  await addDoc(collection(db, 'chats', chatId, 'messages'), {
    sender: currentUser,
    text,
    timestamp: serverTimestamp(),
    readBy: [currentUser],
    readByMap: {
      [currentUser]: Timestamp.now()
    },
    deleted: false,
    expiredAt: null,
    heartedBy: null
  });
  addChatXP();
  input.value = "";

  requestAnimationFrame(() => {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  });
});

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendBtn.click();
});

function getChatId(userA, userB) {
  return [userA, userB].sort().join("_to_");
}

async function loadMessages(user1, user2) {
  const chatId = getChatId(user1, user2);

  if (typeof activeUnsubscribe === 'function') {
    activeUnsubscribe();
  }

  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const q = query(messagesRef, orderBy('timestamp'));

  activeUnsubscribe = onSnapshot(q, snapshot => {
    if (selectedUser !== user2) return;

    messagesContainer.innerHTML = "";

    snapshot.forEach(doc => {
      const msg = doc.data();
      const isSender = msg.sender === currentUser;

      const div = document.createElement("div");
      div.className = `message ${isSender ? 'sent' : 'received'} slide-in`;
      div.id = doc.id;

      const meta = document.createElement("div");
      meta.style.fontSize = "0.75em";
      meta.style.color = "#bbb";
      meta.style.marginBottom = "4px";
      meta.textContent = `${msg.sender} • ${msg.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || ''}`;

      const body = document.createElement("div");
      body.textContent = msg.text;

      const countdown = document.createElement("div");
      countdown.className = "countdown";

      const heartBtn = document.createElement("img");
      heartBtn.className = "heart-button";
      heartBtn.style.width = "20px";
      heartBtn.style.height = "20px";
      heartBtn.style.cursor = "pointer";
      heartBtn.style.alignSelf = "flex-end";
      heartBtn.style.marginTop = "6px";

      const isHearted = !!msg.heartedBy;
      const youHearted = msg.heartedBy === currentUser;

      if (isHearted && isSender) {
        heartBtn.src = "hearted.png";
        heartBtn.title = "Someone loved this";
      } else if (isHearted && youHearted) {
        heartBtn.src = "liked.png";
        heartBtn.title = "You liked this";
      } else {
        heartBtn.src = "notliked.png";
        heartBtn.title = "React with heart";
      }

      if (!isSender) {
        heartBtn.addEventListener("click", async () => {
          const newState = msg.heartedBy === currentUser ? null : currentUser;
          await updateDoc(doc.ref, {
            heartedBy: newState
          });
        });
      }

      div.appendChild(meta);
      div.appendChild(body);

      const bottomRow = document.createElement("div");
      bottomRow.style.display = "flex";
      bottomRow.style.justifyContent = "space-between";
      bottomRow.style.alignItems = "center";
      bottomRow.appendChild(countdown);
      bottomRow.appendChild(heartBtn);

      div.appendChild(bottomRow);

      const wrapper = document.createElement("div");
      wrapper.style.display = "flex";
      wrapper.style.width = "100%";
      wrapper.appendChild(div);
      messagesContainer.appendChild(wrapper);

      if (msg.deleted) div.classList.add("deleted");

      if (!isSender && !(msg.readBy || []).includes(currentUser)) {
        const observer = new IntersectionObserver(async (entries) => {
          if (entries[0].isIntersecting) {
            observer.unobserve(div);
            await updateDoc(doc.ref, {
              readBy: [...(msg.readBy || []), currentUser],
              readByMap: {
                ...(msg.readByMap || {}),
                [currentUser]: Timestamp.now()
              }
            });
            startCountdown(div, countdown, doc.ref, msg);
          }
        }, { threshold: 1.0 });
        observer.observe(div);
      } else {
        startCountdown(div, countdown, doc.ref, msg);
      }
    });

    requestAnimationFrame(() => {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
  });
}

function startCountdown(div, countdownEl, docRef, msg) {
  let expireStart = msg.expiredAt?.toMillis?.();
  if (!expireStart) {
    const readByMap = msg.readByMap || {};
    const othersRead = Object.entries(readByMap).filter(([user]) => user !== msg.sender);
    if (othersRead.length > 0) {
      expireStart = Math.max(...othersRead.map(([_, ts]) => ts.toMillis?.() || 0));
    }
  }

  if (expireStart) {
    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = 5 * 60 * 1000 - (now - expireStart);

      if (remaining <= 0) {
        clearInterval(interval);
        if (!msg.deleted) {
          updateDoc(docRef, {
            text: "🗑️ Message expired after 10 minutes.",
            deleted: true,
            expiredAt: Timestamp.now()
          });
        } else {
          deleteDoc(docRef).catch(err => console.error("Failed to delete", err));
          div.parentElement?.remove();
        }
      } else {
        countdownEl.textContent = `Deleting in ${Math.ceil(remaining / 1000)}s`;
      }
    }, 1000);
  } else {
    countdownEl.textContent = "";
  }
}
function renderSidebarHeader(username, email, role) {
  const header = document.getElementById("sidebarHeader");
  header.innerHTML = ""; // Clear old content

  // Avatar
  const avatarImg = document.createElement("img");
  avatarImg.src = "Group-10.png";
  avatarImg.style.width = "50px";
  avatarImg.style.height = "50px";
  avatarImg.style.borderRadius = "50%";
  avatarImg.style.objectFit = "cover";
  avatarImg.style.border = "2px solid #ffcf00";

  (async () => {
    try {
      const avatarRef = ref(storage, `avatars/${email}`);
      const url = await getDownloadURL(avatarRef);
      avatarImg.src = url;
    } catch {
      avatarImg.src = "Group-10.png";
    }
  })();

  // Info container
  const infoDiv = document.createElement("div");
  infoDiv.style.display = "flex";
  infoDiv.style.flexDirection = "column";

  // Username and badges
  const topRow = document.createElement("div");
  topRow.style.display = "flex";
  topRow.style.alignItems = "center";
  topRow.style.gap = "6px";

  const usernameSpan = document.createElement("span");
  usernameSpan.textContent = username;
  usernameSpan.style.fontWeight = "bold";
  usernameSpan.style.fontSize = "1.1em";

  const badgeContainer = document.createElement("span");
  badgeContainer.style.display = "flex";
  badgeContainer.style.gap = "4px";
if (role.toLowerCase().includes("plus")) {
    const plusBadge = document.createElement("img");
    plusBadge.src = "plas.png";
    plusBadge.alt = "plus";
    plusBadge.title = "FlipCards+";
    plusBadge.style.width = "29px";
    plusBadge.style.height = "21px";
    badgeContainer.appendChild(plusBadge);
  }
  if (role.toLowerCase().includes("verified")) {
    const verifiedBadge = document.createElement("img");
    verifiedBadge.src = "verified.svg";
    verifiedBadge.alt = "verified";
    verifiedBadge.title = "Verified";
    verifiedBadge.style.width = "16px";
    verifiedBadge.style.height = "16px";
    badgeContainer.appendChild(verifiedBadge);
  }

  if (role.toLowerCase().includes("first")) {
    const firstBadge = document.createElement("img");
    firstBadge.src = "first.png";
    firstBadge.alt = "first";
    firstBadge.title = "First User";
    firstBadge.style.width = "16px";
    firstBadge.style.height = "16px";
    badgeContainer.appendChild(firstBadge);
  }

  topRow.appendChild(usernameSpan);
  topRow.appendChild(badgeContainer);

  // Email line
  const emailSpan = document.createElement("span");
  emailSpan.textContent = email;
  emailSpan.style.fontSize = "0.9em";
  emailSpan.style.color = "#aaa";

  infoDiv.appendChild(topRow);
  infoDiv.appendChild(emailSpan);

  header.appendChild(avatarImg);
  header.appendChild(infoDiv);
}

async function populateUserList() {
  const approvedSnapshot = await getDocs(collection(db, 'approved_emails'));
  const usernameSnapshot = await getDocs(collection(db, 'usernames'));

  const usernameMap = {};
  usernameSnapshot.forEach(doc => {
    const data = doc.data();
    usernameMap[doc.id] = data.username || "";
  });

  allUserDocs = [];
  approvedSnapshot.forEach(doc => {
    const data = doc.data();
    if (doc.id !== currentUser) {
      allUserDocs.push({
        email: doc.id,
        username: usernameMap[doc.id] || "",
        role: data.role || ""
      });
    }
  });

  renderUserList(allUserDocs);
  await loadFriendsFromFirestore();

}

function renderUserList(userArray) {
  userListContainer.innerHTML = "";

  userArray.forEach(user => {
    const email = user.email;
    const role = user.role.toLowerCase();

    const userDiv = document.createElement("div");
    userDiv.className = "user";
    userDiv.dataset.email = email;
    userDiv.style.display = "flex";
    userDiv.style.alignItems = "center";
    userDiv.style.gap = "10px";

    const avatarImg = document.createElement("img");
    avatarImg.src = "Group-10.png";
    avatarImg.style.width = "40px";
    avatarImg.style.height = "40px";
    avatarImg.style.borderRadius = "50%";
    avatarImg.style.objectFit = "cover";
    avatarImg.style.border = "2px solid #ffcf00"; // Change #ffcf00 to any color you like
avatarImg.style.boxShadow = "0 0 4px rgba(0,0,0,0.5)"; // Optional shadow for better visibility

    (async () => {
      try {
        const safeEmail = email;
        const avatarRef = ref(storage, `avatars/${safeEmail}`);
        const url = await getDownloadURL(avatarRef);
        avatarImg.src = url;
      } catch (error) {
        console.warn(`No avatar found for ${email}, using default.`);
        avatarImg.src = "Group-10.png";
      }
    })();

    const textContainer = document.createElement("div");
    textContainer.style.display = "flex";
    textContainer.style.flexDirection = "column";
    textContainer.style.flexGrow = "1";
    textContainer.style.overflow = "hidden";

    const topRow = document.createElement("div");
    topRow.style.display = "flex";
    topRow.style.alignItems = "center";
    topRow.style.justifyContent = "space-between";
    topRow.style.gap = "8px";

    const displayName = user.username ? user.username : email.split("@")[0];
    const nameSpan = document.createElement("span");
    nameSpan.className = "username";
    nameSpan.textContent = displayName;
    nameSpan.style.fontWeight = "bold";
    nameSpan.style.whiteSpace = "nowrap";
    nameSpan.style.overflow = "hidden";
    nameSpan.style.textOverflow = "ellipsis";

    const badgeContainer = document.createElement("span");
    badgeContainer.style.display = "flex";
    badgeContainer.style.gap = "4px";
if (role.includes("plus")) {
      const badge = document.createElement("img");
      badge.src = "plas.png";
      badge.alt = "plus";
      badge.title = "FlipCards+";
      badge.className = "role-badge plus-badge";
      badgeContainer.appendChild(badge);
    }
    if (role.includes("verified")) {
      const badge = document.createElement("img");
      badge.src = "verified.svg";
      badge.alt = "verified";
      badge.title = "Verified";
      badge.className = "role-badge";
      badgeContainer.appendChild(badge);
    }

    if (role.includes("first")) {
      const badge = document.createElement("img");
      badge.src = "first.png";
      badge.alt = "first";
      badge.title = "First User";
      badge.className = "role-badge";
      badgeContainer.appendChild(badge);
    }

    // Place badges immediately after the username
const nameBadgeWrapper = document.createElement("div");
nameBadgeWrapper.style.display = "flex";
nameBadgeWrapper.style.alignItems = "center";
nameBadgeWrapper.style.gap = "4px";

nameBadgeWrapper.appendChild(nameSpan);
nameBadgeWrapper.appendChild(badgeContainer);

topRow.style.justifyContent = "flex-start"; // Align all to the left
topRow.appendChild(nameBadgeWrapper);


    const emailSpan = document.createElement("span");
    emailSpan.className = "email";
    emailSpan.textContent = email;
    emailSpan.style.fontSize = "12px";
    emailSpan.style.color = "#888";
    emailSpan.style.whiteSpace = "nowrap";
    emailSpan.style.overflow = "hidden";
    emailSpan.style.textOverflow = "ellipsis";

    textContainer.appendChild(topRow);
    textContainer.appendChild(emailSpan);

    const alertDot = document.createElement("span");
    alertDot.className = "dot";
    alertDot.textContent = "●";
    alertDot.style.display = "none";
    alertDot.style.marginLeft = "auto";

    // Plus button
const plusBtn = document.createElement("button");
plusBtn.textContent = "+";
plusBtn.style.width = "14px";
plusBtn.style.height = "14px";
plusBtn.style.border = "none";
plusBtn.style.borderRadius = "50%";
plusBtn.style.background = "#ffcf00";
plusBtn.style.color = "#000000ff";
plusBtn.style.cursor = "pointer";
plusBtn.style.fontWeight = "bold";
plusBtn.style.fontSize = "12px";
plusBtn.style.display = "flex";
plusBtn.style.alignItems = "center";
plusBtn.style.justifyContent = "center";
plusBtn.style.padding = "0";

(async () => {
  const userDoc = await getDoc(doc(db, "chatfriends", currentUser));
  const existingFriends = userDoc.exists() ? userDoc.data().friends || [] : [];
  if (existingFriends.includes(user.email)) {
    plusBtn.textContent = "✓";
    plusBtn.style.background = "#28a745";
    plusBtn.style.color = "#ffffff";
  }
})();

// On click, add user to selectedUsersContainer
plusBtn.addEventListener("click", (e) => {
  e.stopPropagation(); // prevent chat open

  // Add user to friends
  addToSelectedUsers(user, avatarImg.src);

  // Change button to green check
  plusBtn.textContent = "✓";
  plusBtn.style.background = "#28a745"; // green background
  plusBtn.style.color = "#ffffff";
});


userDiv.appendChild(plusBtn);
userDiv.appendChild(avatarImg);

    userDiv.appendChild(textContainer);
    userDiv.appendChild(alertDot);

    const chatId = getChatId(currentUser, email);
    const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('timestamp'));

    onSnapshot(q, snapshot => {
  let showDot = false;
  let latestMessageTime = 0;

  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.timestamp?.toMillis && data.timestamp.toMillis() > latestMessageTime) {
      latestMessageTime = data.timestamp.toMillis();
    }

    if (data.sender === email && !(data.readBy || []).includes(currentUser) && !data.deleted) {
      showDot = true;
    }
  });

  alertDot.style.display = showDot ? "inline" : "none";

  // Move user to top if they sent a message
  if (latestMessageTime > 0) {
    userDiv.dataset.lastMessageTime = latestMessageTime;
    reorderUserList();
  }
});


    userDiv.addEventListener("click", () => {
  selectedUser = email;

  // Clear previous content
  chatNavbar.innerHTML = "";

  // Create container for avatar + username
  const navContainer = document.createElement("div");
  navContainer.style.display = "flex";
  navContainer.style.alignItems = "center";
  navContainer.style.gap = "8px";

  // Avatar
  const navAvatar = document.createElement("img");
  navAvatar.src = avatarImg.src;  // Use the user's avatar
  navAvatar.style.width = "32px";
  navAvatar.style.height = "32px";
  navAvatar.style.borderRadius = "50%";
  navAvatar.style.objectFit = "cover";
  navAvatar.style.border = "1px solid #ffcf00";

  // Username + badges
  const nameBadgeWrapper = document.createElement("div");
  nameBadgeWrapper.style.display = "flex";
  nameBadgeWrapper.style.alignItems = "center";
  nameBadgeWrapper.style.gap = "4px";

  const nameSpan = document.createElement("span");
  nameSpan.textContent = displayName;
  nameSpan.style.fontWeight = "bold";
  nameSpan.style.fontSize = "1em";

  nameBadgeWrapper.appendChild(nameSpan);
if (role.includes("plus")) {
    const plusBadge = document.createElement("img");
    plusBadge.src = "plas.png";
    plusBadge.alt = "plus";
    plusBadge.title = "FlipCards+";
    plusBadge.className = "role-badge plus-badge";
    nameBadgeWrapper.appendChild(plusBadge);
  }
  // Badges
  if (role.includes("verified")) {
    const verifiedBadge = document.createElement("img");
    verifiedBadge.src = "verified.svg";
    verifiedBadge.alt = "verified";
    verifiedBadge.title = "Verified";
    verifiedBadge.className = "role-badge";
    nameBadgeWrapper.appendChild(verifiedBadge);
  }
  if (role.includes("first")) {
    const firstBadge = document.createElement("img");
    firstBadge.src = "first.png";
    firstBadge.alt = "first";
    firstBadge.title = "First User";
    firstBadge.className = "role-badge";
    nameBadgeWrapper.appendChild(firstBadge);
  }

  navContainer.appendChild(navAvatar);
  navContainer.appendChild(nameBadgeWrapper);

  chatNavbar.appendChild(navContainer);

  // Highlight logic
  document.querySelectorAll(".user").forEach(el => el.classList.remove("active-user"));
  userDiv.classList.add("active-user");
  document.querySelectorAll(".selected-users div").forEach(el => el.classList.remove("active-friend"));

  alertDot.style.display = "none";
  loadMessages(currentUser, selectedUser);
});



    userListContainer.appendChild(userDiv);
  });
}
function reorderUserList() {
  const users = Array.from(userListContainer.querySelectorAll(".user"));
  users.sort((a, b) => {
    const timeA = parseInt(a.dataset.lastMessageTime || 0);
    const timeB = parseInt(b.dataset.lastMessageTime || 0);
    return timeB - timeA;
  });
  users.forEach(user => userListContainer.appendChild(user));
}

document.getElementById("userSearch").addEventListener("input", (e) => {
  const term = e.target.value.toLowerCase();
  const filtered = allUserDocs.filter(u => u.email.toLowerCase().includes(term) || (u.username && u.username.toLowerCase().includes(term)));
  renderUserList(filtered);
});
async function addToSelectedUsers(user, avatarUrl) {
  const container = document.getElementById("selectedUsersContainer");

  // If already added, skip
  if (container.querySelector(`[data-email="${user.email}"]`)) return;

  const selectedDiv = document.createElement("div");
  selectedDiv.dataset.email = user.email;
  selectedDiv.style.display = "flex";
  selectedDiv.style.alignItems = "center";
  selectedDiv.style.gap = "6px";
  selectedDiv.style.padding = "5px 10px";
  selectedDiv.style.border = "1px solid #ffcf00";
  selectedDiv.style.borderRadius = "8px";
  selectedDiv.style.background = "#202020";
  selectedDiv.style.cursor = "pointer";

  // Minus button
  const minusBtn = document.createElement("button");
  minusBtn.textContent = "-";
  minusBtn.style.width = "14px";
  minusBtn.style.height = "14px";
  minusBtn.style.border = "none";
  minusBtn.style.borderRadius = "50%";
  minusBtn.style.background = "#ff4d4d";
  minusBtn.style.color = "#fff";
  minusBtn.style.cursor = "pointer";
  minusBtn.style.fontWeight = "bold";
  minusBtn.style.fontSize = "16px";
  minusBtn.style.display = "flex";
  minusBtn.style.alignItems = "center";
  minusBtn.style.justifyContent = "center";
  minusBtn.style.padding = "0";

  minusBtn.addEventListener("click", async (e) => {
    e.stopPropagation();

    // Remove from Firestore
    const userDocRef = doc(db, "chatfriends", currentUser);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      let friends = userDoc.data().friends || [];
      friends = friends.filter(friend => friend !== user.email);
      await setDoc(userDocRef, { friends }, { merge: true });
    }

    // Remove from DOM
    selectedDiv.remove();

    // Reset the plus button in user list
    const userEntry = document.querySelector(`.user[data-email="${user.email}"] button`);
    if (userEntry) {
      userEntry.textContent = "+";
      userEntry.style.background = "#ffcf00";
      userEntry.style.color = "#000000ff";
    }
  });

  // Avatar
  const img = document.createElement("img");
  img.src = avatarUrl;
  img.style.width = "24px";
  img.style.height = "24px";
  img.style.borderRadius = "50%";
  img.style.objectFit = "cover";

  // Username and badges
  const nameContainer = document.createElement("div");
  nameContainer.style.display = "flex";
  nameContainer.style.alignItems = "center";
  nameContainer.style.gap = "4px";

  const name = document.createElement("span");
  name.textContent = user.username || user.email.split("@")[0];
  name.style.fontSize = "12px";
  name.style.color = "#f0f0f0";
  nameContainer.appendChild(name);

if (user.role) {
    const role = user.role.toLowerCase();
    
    // Add this new block to check for the 'plus' role
    if (role.includes("plus")) {
      const plusBadge = document.createElement("img");
      plusBadge.src = "plas.png";
      plusBadge.alt = "plus";
      plusBadge.title = "FlipCards+";
      plusBadge.className = "role-badge plus-badge";
      nameContainer.appendChild(plusBadge);
    }

    if (role.includes("verified")) {
      const verifiedBadge = document.createElement("img");
      verifiedBadge.src = "verified.svg";
      verifiedBadge.alt = "verified";
      verifiedBadge.title = "Verified";
      verifiedBadge.className = "role-badge";
      nameContainer.appendChild(verifiedBadge);
    }
    if (role.includes("first")) {
      const firstBadge = document.createElement("img");
      firstBadge.src = "first.png";
      firstBadge.alt = "first";
      firstBadge.title = "First User";
      firstBadge.className = "role-badge";
      nameContainer.appendChild(firstBadge);
    }
  }

  selectedDiv.addEventListener("click", () => {
  selectedUser = user.email;

  // Clear previous content
  chatNavbar.innerHTML = "";

  // Create container for avatar + username
  const navContainer = document.createElement("div");
  navContainer.style.display = "flex";
  navContainer.style.alignItems = "center";
  navContainer.style.gap = "8px";

  // Avatar
  const navAvatar = document.createElement("img");
  navAvatar.src = img.src; // Friend's avatar
  navAvatar.style.width = "32px";
  navAvatar.style.height = "32px";
  navAvatar.style.borderRadius = "50%";
  navAvatar.style.objectFit = "cover";
  navAvatar.style.border = "1px solid #ffcf00";

  // Username + badges
  const nameBadgeWrapper = document.createElement("div");
  nameBadgeWrapper.style.display = "flex";
  nameBadgeWrapper.style.alignItems = "center";
  nameBadgeWrapper.style.gap = "4px";

  const nameSpan = document.createElement("span");
  nameSpan.textContent = user.username || user.email.split("@")[0];
  nameSpan.style.fontWeight = "bold";
  nameSpan.style.fontSize = "1em";

  nameBadgeWrapper.appendChild(nameSpan);

  // Badges
  const role = user.role.toLowerCase();
  if (role.includes("plus")) {
      const plusBadge = document.createElement("img");
      plusBadge.src = "plas.png";
      plusBadge.alt = "plus";
      plusBadge.title = "FlipCards+";
      plusBadge.className = "role-badge plus-badge";
      nameContainer.appendChild(plusBadge);
    }
  if (role.includes("verified")) {
    const verifiedBadge = document.createElement("img");
    verifiedBadge.src = "verified.svg";
    verifiedBadge.alt = "verified";
    verifiedBadge.title = "Verified";
    verifiedBadge.className = "role-badge";
    nameBadgeWrapper.appendChild(verifiedBadge);
  }
  if (role.includes("first")) {
    const firstBadge = document.createElement("img");
    firstBadge.src = "first.png";
    firstBadge.alt = "first";
    firstBadge.title = "First User";
    firstBadge.className = "role-badge";
    nameBadgeWrapper.appendChild(firstBadge);
  }

  navContainer.appendChild(navAvatar);
  navContainer.appendChild(nameBadgeWrapper);

  chatNavbar.appendChild(navContainer);

  // Highlight logic
  document.querySelectorAll(".selected-users div").forEach(el => el.classList.remove("active-friend"));
  selectedDiv.classList.add("active-friend");
  document.querySelectorAll(".user").forEach(el => el.classList.remove("active-user"));

  loadMessages(currentUser, selectedUser);
});


  selectedDiv.appendChild(minusBtn);
  selectedDiv.appendChild(img);
  selectedDiv.appendChild(nameContainer);
  container.appendChild(selectedDiv);

  // Save to Firestore
  const userDocRef = doc(db, "chatfriends", currentUser);
  const userDoc = await getDoc(userDocRef);

  let friends = [];
  if (userDoc.exists()) {
    friends = userDoc.data().friends || [];
  }
  if (!friends.includes(user.email)) {
    friends.push(user.email);
    await setDoc(userDocRef, { friends }, { merge: true });
  }
}

async function loadFriendsFromFirestore() {
  const container = document.getElementById("selectedUsersContainer");
  container.innerHTML = "";

  const userDocRef = doc(db, "chatfriends", currentUser);
  const userDoc = await getDoc(userDocRef);

  if (userDoc.exists()) {
    const friends = userDoc.data().friends || [];
    friends.forEach(friendEmail => {
      const friendUser = allUserDocs.find(u => u.email === friendEmail);
      if (friendUser) {
        (async () => {
  try {
    const avatarRef = ref(storage, `avatars/${friendEmail}`);
    const avatarUrl = await getDownloadURL(avatarRef);
    addToSelectedUsers(friendUser, avatarUrl);
  } catch (error) {
    console.warn(`No avatar found for ${friendEmail}, using default.`);
    addToSelectedUsers(friendUser, "Group-10.png");
  }
})();

      }
    });
  }
}


