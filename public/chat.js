// Firebase imports and config
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import {
  getFirestore, collection, getDocs, addDoc, doc, updateDoc,
  query, orderBy, onSnapshot, serverTimestamp, where, setDoc, getDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import {
  getAuth, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { getStorage, ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCndfcWksvEBhzJDiQmJj_zSRI6FSVNUC0",
  authDomain: "flipcards-7adab.firebaseapp.com",
  projectId: "flipcards-7adab",
  storageBucket: "flipcards-7adab.firebasestorage.app",
  messagingSenderId: "836765717736",
  appId: "1:836765717736:web:ff749a40245798307b655d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth();
const storage = getStorage(app);

// Global variables and DOM elements
let currentUser = null;
let selectedUser = null;
let activeUnsubscribe = null;
let allUserDocs = [];
let currentUserFriends = []; // Add this line
let unreadStatus = {}; // Add this line

const messagesContainer = document.querySelector(".messages");
const input = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const emojiBtn = document.getElementById("emojiBtn");
const chatNavbar = document.getElementById("chatNavbar");
const userListContainer = document.querySelector(".user-list");
const friendsListContainer = document.getElementById("friendsListContainer"); 

const emojis = ["😊", "😂", "❤️", "🔥", "👍", "🥺", "😭", "🥰", "😎", "😡", "😅", "🤔", "🎉", "🙄", "🙏", "👌", "💯", "🤯"];

// Event Listeners
emojiBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  toggleEmojiPicker();
});

document.addEventListener('click', (event) => {
    const picker = document.getElementById('emojiPicker');
    if (picker && !picker.contains(event.target) && !emojiBtn.contains(event.target)) {
        picker.remove();
    }
});

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user.email;
    const userDoc = await getDoc(doc(db, "usernames", user.email));
    const approvedDoc = await getDoc(doc(db, "approved_emails", user.email));

    let username = userDoc.exists() ? userDoc.data().username : user.email.split("@")[0];
    const role = approvedDoc.exists() ? approvedDoc.data().role || "" : "";
    
    renderSidebarHeader(username, user.email, role);
    populateUserList();
  } else {
    alert("You must be logged in to access the chat.");
    window.location.href = "login.html";
  }
});

sendBtn.addEventListener("click", sendMessage);
input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});


// Functions
function toggleEmojiPicker() {
  let picker = document.getElementById("emojiPicker");
  if (picker) {
    picker.remove();
    return;
  }

  picker = document.createElement("div");
  picker.id = "emojiPicker";

  emojis.forEach(e => {
    const btn = document.createElement("button");
    btn.textContent = e;
    btn.addEventListener("click", () => {
      input.value += e;
      input.focus();
    });
    picker.appendChild(btn);
  });

  document.body.appendChild(picker);
}

// REPLACE the existing sendMessage function with this one

async function sendMessage() {
  const text = input.value.trim();
  if (!text || !selectedUser || !currentUser) return;

  const chatId = getChatId(currentUser, selectedUser);

  // Add the message with a 'disappearing' flag
  await addDoc(collection(db, 'chats', chatId, 'messages'), {
    sender: currentUser,
    text,
    timestamp: serverTimestamp(),
    readBy: [currentUser], // The sender has "read" it by sending it
    disappearing: true      // Flag this message for deletion after being read
  });
reorderAndRerender(selectedUser);
  input.value = "";
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function getChatId(userA, userB) {
  return [userA, userB].sort().join("_to_");
}

async function loadMessages(user1, user2) {
  const chatId = getChatId(user1, user2);

  if (activeUnsubscribe) {
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

      // When messages are loaded, find any that are unread by the current user and update them.
      if (msg.sender !== currentUser && !msg.readBy.includes(currentUser)) {
          console.log(`[LOAD_MESSAGES] Message ${doc.id} is unread. Marking as read now.`); // LOG
          updateDoc(doc.ref, { 
              readBy: [...msg.readBy, currentUser] 
          });

          if (msg.disappearing && msg.readBy.length + 1 >= 2) {
              setTimeout(() => {
                  deleteDoc(doc.ref);
              }, 300000); // 5 minutes
          }
      }

      // ... (The rest of the function to display messages remains the same) ...
      const messageWrapper = document.createElement('div');
      messageWrapper.className = `message-wrapper ${isSender ? 'sent' : 'received'}`;
      const messageDiv = document.createElement('div');
      messageDiv.className = `message ${isSender ? 'sent' : 'received'}`;
      messageDiv.textContent = msg.text;
      const metaDiv = document.createElement('div');
      metaDiv.className = 'message-meta';
      const isSeenByReceiver = msg.readBy && msg.readBy.length >= 2;

      if (isSender && msg.disappearing) {
        if (isSeenByReceiver) {
          const seenIndicator = document.createElement('span');
          seenIndicator.className = 'seen-indicator';
          seenIndicator.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Seen`;
          metaDiv.appendChild(seenIndicator);
        } else {
          const pendingIndicator = document.createElement('span');
          pendingIndicator.className = 'disappearing-indicator';
          pendingIndicator.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
          metaDiv.appendChild(pendingIndicator);
        }
      }
      const timeText = msg.timestamp ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      metaDiv.append(timeText);
      messageDiv.appendChild(metaDiv);
      messageWrapper.appendChild(messageDiv);
      messagesContainer.appendChild(messageWrapper);
    });

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  });
}

async function renderSidebarHeader(username, email) {
  const header = document.getElementById("sidebarHeader");
  header.innerHTML = '';
  const avatarImg = document.createElement("img");
  avatarImg.src = `https://placehold.co/100x100/2c2c2c/ffffff?text=${username.charAt(0).toUpperCase()}`;
  
  const infoDiv = document.createElement('div');
  infoDiv.className = 'user-info';
  infoDiv.innerHTML = `<div class="username">${username}</div><div class="email">${email}</div>`;

  header.appendChild(avatarImg);
  header.appendChild(infoDiv);

  try {
    const avatarRef = ref(storage, `avatars/${email}`);
    const url = await getDownloadURL(avatarRef);
    avatarImg.src = url;
  } catch {
    // Keep placeholder
  }
}

async function populateUserList() {
  const approvedSnapshot = await getDocs(collection(db, 'approved_emails'));
  const usernameSnapshot = await getDocs(collection(db, 'usernames'));

  const usernameMap = {};
  usernameSnapshot.forEach(doc => {
    usernameMap[doc.id] = doc.data().username || "";
  });

  allUserDocs = [];
  approvedSnapshot.forEach(doc => {
    if (doc.id !== currentUser) {
      allUserDocs.push({
        email: doc.id,
        username: usernameMap[doc.id] || doc.id.split('@')[0],
        role: doc.data().role || ""
      });
    }
  });
  renderUserList(allUserDocs);
  loadFriendsFromFirestore();
}

function renderUserList(userArray) {
  userListContainer.innerHTML = "";
  userArray.forEach(user => {
    const isFriend = currentUserFriends.includes(user.email);
    const userDiv = createUserElement(user, isFriend); // Use a helper function
    userListContainer.appendChild(userDiv);
  });
}

function selectUser(user, avatarUrl) {
    selectedUser = user.email;
    const isFriend = currentUserFriends.includes(user.email);

    chatNavbar.innerHTML = `
        <div class="navbar-user-info">
            <img src="${avatarUrl}" alt="avatar">
            <div>${user.username}</div>
        </div>
        <div class="navbar-menu-container">
            <div class="navbar-menu-btn">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
            </div>
            <div class="navbar-menu">
                <button class="friend-action-btn" id="navbar-friend-action">
                    ${isFriend ? 'Remove Friend' : 'Add Friend'}
                </button>
            </div>
        </div>
    `;

    document.querySelector('.navbar-menu-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelector('.navbar-menu').classList.toggle('show');
    });

    document.getElementById('navbar-friend-action').addEventListener('click', () => {
        if (isFriend) {
            removeFriend(user.email);
        } else {
            addFriend(user.email);
        }
        document.querySelector('.navbar-menu').classList.remove('show');
    });

    document.querySelectorAll('.user').forEach(el => el.classList.remove('active-user'));
    document.querySelectorAll(`.user[data-email="${user.email}"]`).forEach(el => {
        el.classList.add('active-user');
    });

    loadMessages(currentUser, selectedUser);
}

// --- START: ADD THIS NEW FUNCTION ---

function reorderAndRerender(userEmail) {
    // Find the user's current position in the list
    const userIndex = allUserDocs.findIndex(doc => doc.email === userEmail);

    // If the user exists and is not already at the top of the list
    if (userIndex > 0) {
        // Remove the user from their current position
        const [userToMove] = allUserDocs.splice(userIndex, 1);

        // Add the user to the very beginning of the list
        allUserDocs.unshift(userToMove);

        // --- Redraw both lists based on the new order ---

        // 1. Redraw the "All Users" list
        renderUserList(allUserDocs);

        // 2. Redraw the "Friends" list, preserving the new order
        friendsListContainer.innerHTML = "";
        allUserDocs.forEach(user => {
            if (currentUserFriends.includes(user.email)) {
                addFriendToList(user);
            }
        });
    }
}

// --- END: ADD THIS NEW FUNCTION ---
// --- Add these new functions ---

async function addFriend(friendEmail) {
    const userDocRef = doc(db, "chatfriends", currentUser);
    await setDoc(userDocRef, { 
        friends: [...currentUserFriends, friendEmail] 
    }, { merge: true });
    
    // Refresh the UI
    populateUserList();
}

async function removeFriend(friendEmail) {
    const userDocRef = doc(db, "chatfriends", currentUser);
    const updatedFriends = currentUserFriends.filter(email => email !== friendEmail);
    await setDoc(userDocRef, { friends: updatedFriends }, { merge: true });

    // Refresh the UI
    populateUserList();
}
document.getElementById('userSearch').addEventListener('input', e => {
    const term = e.target.value.toLowerCase();
    const filtered = allUserDocs.filter(u => u.email.toLowerCase().includes(term) || u.username.toLowerCase().includes(term));
    renderUserList(filtered);
});

async function loadFriendsFromFirestore() {
    const container = document.getElementById("friendsListContainer");
    container.innerHTML = "";

    const userDocRef = doc(db, "chatfriends", currentUser);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
        currentUserFriends = userDoc.data().friends || [];
        currentUserFriends.forEach(friendEmail => {
            const friendUser = allUserDocs.find(u => u.email === friendEmail);
            if (friendUser) {
                addFriendToList(friendUser);
            }
        });
    } else {
        currentUserFriends = [];
    }
}

function addFriendToList(user) {
    const userDiv = createUserElement(user, true); // Use a helper function, isFriend is true
    friendsListContainer.appendChild(userDiv);
}
// Add this new function
function updateSectionCounters() {
    const friendsBadge = document.getElementById('friends-unread-count');
    const usersBadge = document.getElementById('users-unread-count');

    let friendsCount = 0;
    let usersCount = 0;

    for (const email in unreadStatus) {
        if (unreadStatus[email]) {
            usersCount++;
            if (currentUserFriends.includes(email)) {
                friendsCount++;
            }
        }
    }

    // LOG: See the calculated counts
    console.log(`UPDATE_COUNTERS: Friends Unread = ${friendsCount}, All Users Unread = ${usersCount}`);

    // Update Friends badge
    if (friendsCount > 0) {
        friendsBadge.textContent = friendsCount;
        friendsBadge.classList.add('show');
    } else {
        friendsBadge.classList.remove('show');
    }

    // Update All Users badge
    if (usersCount > 0) {
        usersBadge.textContent = usersCount;
        usersBadge.classList.add('show');
    } else {
        usersBadge.classList.remove('show');
    }
}
// --- Collapsible List Logic ---
document.getElementById('friends-header').addEventListener('click', function() {
    this.classList.toggle('active');
    const arrow = this.querySelector('.dropdown-arrow');
    arrow.classList.toggle('rotate');
    const content = document.getElementById('friendsListContainer');
    content.classList.toggle('open');
});

document.getElementById('users-header').addEventListener('click', function() {
    this.classList.toggle('active');
    const arrow = this.querySelector('.dropdown-arrow');
    arrow.classList.toggle('rotate');
    const content = document.querySelector('.user-list');
    content.classList.toggle('open');
});
// --- Add this new helper function and listener at the end of the file ---

function createUserElement(user, isFriend) {
    const userDiv = document.createElement('div');
    userDiv.className = 'user';
    userDiv.dataset.email = user.email;

    // --- 3-Dot Menu ---
    const menuContainer = document.createElement('div');
    menuContainer.className = 'dots-menu-container';
    
    const dotsBtn = document.createElement('div');
    dotsBtn.className = 'dots-menu-btn';
    dotsBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>`;
    
    const dotsMenu = document.createElement('div');
    dotsMenu.className = 'dots-menu';
    
    const actionBtn = document.createElement('button');
    actionBtn.className = 'friend-action-btn';
    actionBtn.textContent = isFriend ? 'Remove Friend' : 'Add Friend';
    
    actionBtn.addEventListener('click', () => {
        if (isFriend) {
            removeFriend(user.email);
        } else {
            addFriend(user.email);
        }
    });

    dotsMenu.appendChild(actionBtn);
    
    dotsBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent user selection click
        // Close other menus before opening a new one
        document.querySelectorAll('.dots-menu.show').forEach(menu => menu.classList.remove('show'));
        dotsMenu.classList.toggle('show');
    });

    // --- Avatar ---
    const avatarImg = document.createElement('img');
    avatarImg.src = `https://placehold.co/80x80/2c2c2c/ffffff?text=${user.username.charAt(0).toUpperCase()}`;
    getDownloadURL(ref(storage, `avatars/${user.email}`)).then(url => avatarImg.src = url).catch(() => {});

    // --- User Details ---
    // --- User Details ---
    const userDetailsDiv = document.createElement('div');
    userDetailsDiv.className = 'user-details';
    
    const usernameDiv = document.createElement('div');
    usernameDiv.className = 'username';

    // Create a separate span for the text to allow for ellipsis
    const usernameText = document.createElement('span');
    usernameText.className = 'username-text';
    usernameText.textContent = user.username;
    
    usernameDiv.appendChild(usernameText); // Add the text span first

    // Add badges after the text span
    // Add badges after the text span
    const role = user.role.toLowerCase();
    if (role.includes('verified')) {
        const badgeImg = document.createElement('img');
        badgeImg.src = "verified.svg"; // Make sure this path is correct
        badgeImg.className = 'badge';
        badgeImg.title = 'Verified';
        usernameDiv.appendChild(badgeImg);
    }
    if (role.includes('first')) {
        const badgeImg = document.createElement('img');
        badgeImg.src = "./first.png"; // Use local first.png
        badgeImg.className = 'badge';
        badgeImg.title = 'First';
        usernameDiv.appendChild(badgeImg);
    }
    if (role.includes('plus')) {
        const badgeImg = document.createElement('img');
        badgeImg.src = "./plass.png"; // Use local plass.png
        badgeImg.className = 'badge';
        badgeImg.title = 'Plus';
        usernameDiv.appendChild(badgeImg);
    }
    
    const emailDiv = document.createElement('div');
    emailDiv.className = 'email';
    emailDiv.textContent = user.email;

    userDetailsDiv.appendChild(usernameDiv);
    userDetailsDiv.appendChild(emailDiv);
        // This is the new block that replaces the one above.
    // It handles both unread counts AND reordering the list.

    const chatId = getChatId(currentUser, user.email);
    const q = query(collection(db, 'chats', chatId, 'messages'), where('readBy', 'not-in', [[currentUser]]));
    
   onSnapshot(q, snapshot => {
    let hasUnread = false;
    let isNewMessage = false;

    // Check for newly added messages
    snapshot.docChanges().forEach((change) => {
        if (change.type === "added" && change.doc.data().sender === user.email) {
            isNewMessage = true;
        }
    });
    
    // Check if there are ANY messages from this user that are not yet "Seen"
    snapshot.forEach(doc => {
        const msgData = doc.data();
        if (msgData.sender === user.email && msgData.readBy.length < 2) {
            hasUnread = true;
        }
    });

    // LOG: See what the listener has decided
    console.log(`[LISTENER for ${user.email}]: Does this user have unread messages? ${hasUnread}`);

    unreadStatus[user.email] = hasUnread;
    updateSectionCounters();

    const userContainers = document.querySelectorAll(`.user[data-email="${user.email}"]`);
    
    if (hasUnread) {
        userContainers.forEach(container => container.classList.add('unread'));
    } else {
        // This will now correctly trigger when messages are marked as read
        userContainers.forEach(container => container.classList.remove('unread'));
    }

    if (isNewMessage) {
        reorderAndRerender(user.email);
    }
});
    userDiv.appendChild(dotsBtn);
    userDiv.appendChild(avatarImg);
    userDiv.appendChild(userDetailsDiv);
    userDiv.appendChild(dotsMenu); // Add menu to the end for positioning

    userDiv.addEventListener('click', (e) => {
        if (!dotsBtn.contains(e.target)) {
            selectUser(user, avatarImg.src);
        }
    });

    return userDiv;
}

// Close dropdown menu if user clicks outside of it
window.addEventListener('click', function(event) {
    document.querySelectorAll('.dots-menu').forEach(menu => {
        if (!menu.contains(event.target) && !menu.previousElementSibling.contains(event.target)) {
            menu.classList.remove('show');
        }
    });
});