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
const input = document.querySelector(".input-area input");
const sendBtn = document.querySelector(".input-area button");
const sidebarHeader = document.querySelector(".sidebar-header");
const userListContainer = document.querySelector(".user-list");

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
  const expireAt = Timestamp.fromDate(new Date(Date.now() + 30 * 60 * 1000));

  await addDoc(collection(db, 'chats', chatId, 'messages'), {
    sender: currentUser,
    text,
    timestamp: serverTimestamp(),
    expireAt,
    readBy: [currentUser] // sender has read their own message
  });

  input.value = "";
});
input.addEventListener("keydown", async (e) => {
  if (e.key === "Enter") {
    sendBtn.click();
  }
});
async function deleteExpiredMessages(chatId) {
  const now = Timestamp.now();
  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const q = query(messagesRef, where('expireAt', '<=', now));
  const snapshot = await getDocs(q);

  snapshot.forEach(docSnap => {
    const el = document.getElementById(docSnap.id);
    if (el) {
      el.classList.add('fade-out');
      setTimeout(() => {
        if (el.parentNode) el.parentNode.removeChild(el);
        deleteDoc(docSnap.ref);
      }, 500);
    } else {
      deleteDoc(docSnap.ref);
    }
  });
}

async function markMessagesAsRead(chatId, fromUser) {
  const q = query(
    collection(db, 'chats', chatId, 'messages'),
    where("sender", "==", fromUser)
  );
  const snapshot = await getDocs(q);
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const readBy = new Set(data.readBy || []);
    if (!readBy.has(currentUser)) {
      readBy.add(currentUser);
      await updateDoc(docSnap.ref, { readBy: Array.from(readBy) });
    }
  }
}

async function loadMessages(user1, user2) {
  const chatId = getChatId(user1, user2);
  await deleteExpiredMessages(chatId);
  await markMessagesAsRead(chatId, user2);

  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const q = query(messagesRef, orderBy('timestamp'));

  if (typeof activeUnsubscribe === 'function') {
    activeUnsubscribe();
  }

  activeUnsubscribe = onSnapshot(q, snapshot => {
    if (selectedUser !== user2) return;

    const seen = new Set();
    snapshot.forEach(doc => {
      if (seen.has(doc.id)) return;
      seen.add(doc.id);

      if (document.getElementById(doc.id)) return;

      const msg = doc.data();
      const div = document.createElement("div");
      div.className = `message ${msg.sender === currentUser ? 'sent' : 'received'} slide-in`;
      div.id = doc.id;

      const meta = document.createElement("div");
      meta.style.fontSize = "0.75em";
      meta.style.color = "#bbb";
      meta.style.marginBottom = "4px";
      meta.textContent = `${msg.sender} • ${msg.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || ''}`;

      const body = document.createElement("div");
      body.textContent = msg.text;

      div.appendChild(meta);
      div.appendChild(body);
      messagesContainer.appendChild(div);

      messagesContainer.scrollTop = messagesContainer.scrollHeight;
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
        if (data.sender === email && !(data.readBy || []).includes(currentUser)) {
          showDot = true;
        }
      });
      alertDot.style.display = showDot ? "inline" : "none";
    });

    userDiv.addEventListener("click", () => {
      selectedUser = email;
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
