import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js';
import {
  getFirestore, collection, query, orderBy, onSnapshot, addDoc,
  serverTimestamp, Timestamp, doc, getDocs, deleteDoc, where, updateDoc
} from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js';
import {
  getAuth, onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js';

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

let currentUser = null;
let selectedUser = null;
let activeUnsubscribe = null;
let allUserEmails = [];

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
    sidebarHeader.textContent = currentUser;
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
    expiredAt: null
  });

  input.value = "";
});
input.addEventListener("keydown", async (e) => {
  if (e.key === "Enter") {
    sendBtn.click();
  }
});

async function markMessagesAsRead(chatId, fromUser) {
  const q = query(
    collection(db, 'chats', chatId, 'messages'),
    where("sender", "==", fromUser)
  );
  const snapshot = await getDocs(q);
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const readBy = new Set(data.readBy || []);
    const readByMap = data.readByMap || {};

    if (!readBy.has(currentUser)) {
      readBy.add(currentUser);
      readByMap[currentUser] = Timestamp.now();

      await updateDoc(docSnap.ref, {
        readBy: Array.from(readBy),
        readByMap: readByMap
      });
    }
  }
}

async function loadMessages(user1, user2) {
  const chatId = getChatId(user1, user2);
  await markMessagesAsRead(chatId, user2);

  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const q = query(messagesRef, orderBy('timestamp'));

  if (typeof activeUnsubscribe === 'function') {
    activeUnsubscribe();
  }

  activeUnsubscribe = onSnapshot(q, snapshot => {
    if (selectedUser !== user2) return;

    snapshot.forEach(doc => {
      const msg = doc.data();

      const existing = document.getElementById(doc.id);
      if (existing) existing.remove();

      const div = document.createElement("div");
      div.className = `message ${msg.sender === currentUser ? 'sent' : 'received'} slide-in`;
      if (msg.deleted) div.classList.add("deleted");
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

      div.appendChild(meta);
      div.appendChild(body);
      div.appendChild(countdown);
      messagesContainer.appendChild(div);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;

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
              updateDoc(doc.ref, {
                text: "🗑️ Message expired after 10 minutes.",
                deleted: true,
                expiredAt: Timestamp.now()
              });
            } else {
              deleteDoc(doc.ref).catch(err => console.error("Failed to delete", err));
              div.remove();
            }
          } else {
            countdown.textContent = `Deleting in ${Math.ceil(remaining / 1000)}s`;
          }
        }, 1000);
      } else {
        countdown.textContent = "";
      }
    });
  });
}

function getChatId(userA, userB) {
  return [userA, userB].sort().join("_to_");
}

async function populateUserList() {
  const snapshot = await getDocs(collection(db, 'approved_emails'));
  allUserEmails = [];

  snapshot.forEach(doc => {
    const email = doc.id;
    if (email !== currentUser) {
      allUserEmails.push(email);
    }
  });

  renderUserList(allUserEmails);
}

function renderUserList(filteredEmails) {
  userListContainer.innerHTML = "";

  filteredEmails.forEach(email => {
    const userDiv = document.createElement("div");
    userDiv.className = "user";
    userDiv.dataset.email = email;

    const alertDot = document.createElement("span");
    alertDot.className = "dot";
    alertDot.textContent = "●";
    alertDot.style.display = "none";

    const emailText = document.createElement("span");
    emailText.className = "email";
    emailText.textContent = email;

    userDiv.appendChild(alertDot);
    userDiv.appendChild(emailText);

    const chatId = getChatId(currentUser, email);
    const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('timestamp'));

    onSnapshot(q, snapshot => {
      let showDot = false;
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.sender === email && !(data.readBy || []).includes(currentUser) && !data.deleted) {
          showDot = true;
        }
      });
      alertDot.style.display = showDot ? "inline" : "none";
    });

    userDiv.addEventListener("click", () => {
      selectedUser = email;
      chatNavbar.textContent = `Chatting with: ${email}`;
      document.querySelectorAll(".user").forEach(el => el.classList.remove("active-user"));
      userDiv.classList.add("active-user");

      alertDot.style.display = "none";
      messagesContainer.innerHTML = "";
      loadMessages(currentUser, selectedUser);
    });

    userListContainer.appendChild(userDiv);
  });
}

document.getElementById("userSearch").addEventListener("input", (e) => {
  const term = e.target.value.toLowerCase();
  const filtered = allUserEmails.filter(email => email.toLowerCase().includes(term));
  renderUserList(filtered);
});
