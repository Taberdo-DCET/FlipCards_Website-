import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import {
  getFirestore, collection, getDocs, addDoc, doc, updateDoc, deleteDoc,
  query, orderBy, onSnapshot, serverTimestamp, Timestamp, where
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import {
  getAuth, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCndfcWksvEBhzJDiQmJj_zSRI6FSVNUC0",
  authDomain: "flipcards-7adab.firebaseapp.com",
  projectId: "flipcards-7adab",
  storageBucket: "flipcards-7adab.appspot.com",
  messagingSenderId: "836765717736",
  appId: "1:836765717736:web:ff749a40245798307b655d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth();

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

async function populateUserList() {
  const snapshot = await getDocs(collection(db, 'approved_emails'));
  allUserDocs = [];

  snapshot.forEach(doc => {
    const data = doc.data();
    if (doc.id !== currentUser) {
      allUserDocs.push({ email: doc.id, role: data.role || "" });
    }
  });

  renderUserList(allUserDocs);
}

function renderUserList(userArray) {
  userListContainer.innerHTML = "";

  userArray.forEach(user => {
    const email = user.email;
    const role = user.role.toLowerCase();

    const userDiv = document.createElement("div");
    userDiv.className = "user";
    userDiv.dataset.email = email;

    const alertDot = document.createElement("span");
    alertDot.className = "dot";
    alertDot.textContent = "●";
    alertDot.style.display = "none";

    const emailRow = document.createElement("div");
    emailRow.style.display = "flex";
    emailRow.style.alignItems = "center";
    emailRow.style.justifyContent = "space-between";
    emailRow.style.gap = "8px";
    emailRow.style.width = "100%";

    const emailText = document.createElement("span");
    emailText.className = "email";
    emailText.textContent = email;

    const badgeContainer = document.createElement("span");
    badgeContainer.style.display = "flex";
    badgeContainer.style.gap = "4px";

    if (role.includes("verified")) {
      const badge = document.createElement("img");
      badge.src = "verified.png";
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

    emailRow.appendChild(emailText);
    emailRow.appendChild(badgeContainer);

    userDiv.appendChild(alertDot);
    userDiv.appendChild(emailRow);

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
      loadMessages(currentUser, selectedUser);
    });

    userListContainer.appendChild(userDiv);
  });
}

document.getElementById("userSearch").addEventListener("input", (e) => {
  const term = e.target.value.toLowerCase();
  const filtered = allUserDocs.filter(u => u.email.toLowerCase().includes(term));
  renderUserList(filtered);
});
