import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";

// Firebase config
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
const rtdb = getDatabase(app);
const auth = getAuth();

document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.getElementById("memberSidebar");
  const openBtn = document.getElementById("openMemberList");
  const memberList = document.getElementById("memberList");

  if (!sidebar || !openBtn || !memberList) return;

  openBtn.addEventListener("click", () => {
    sidebar.classList.toggle("show");
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      sidebar.classList.remove("show");
    }
  });

  onAuthStateChanged(auth, async (user) => {
    if (!user) return;

    const snapshot = await getDocs(collection(db, "approved_emails"));
    const users = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      users.push({
        email: doc.id,
        uid: data.uid || "",
        role: (data.role || "prepper").toLowerCase()
      });
    });

    const roles = {
      Admin: [],
      Moderator: [],
      "Beta Tester": [],
      Prepper: [],
    };

    const icons = {
      Admin: "👑 Admins",
      Moderator: "🛡️ Moderators",
      "Beta Tester": "🔥 Beta Testers",
      Prepper: "📦 Preppers",
    };

    // Listen for presence
    const statusRef = ref(rtdb, "/status");
    onValue(statusRef, (statusSnap) => {
      const onlineMap = statusSnap.val() || {};
      memberList.innerHTML = "";

      Object.keys(roles).forEach(key => roles[key] = []);

      users.forEach(user => {
        const roleString = user.role || "prepper";
        const roleArray = roleString.split(',').map(r => r.trim().toLowerCase());

        const mainRole =
          roleArray.includes("admin") ? "Admin" :
          roleArray.includes("moderator") ? "Moderator" :
          roleArray.includes("beta tester") || roleArray.includes("betatester") ? "Beta Tester" :
          "Prepper";

        const shortEmail = user.email.length > 22 ? user.email.substring(0, 18) + "..." : user.email;
        const isOnline = user.uid && onlineMap[user.uid]?.online === true;
        const dotHTML = isOnline ? `<span class="online-dot"></span>` : "";

        const badgeIcons = {
          admin: "admin.png",
          moderator: "moderator.png",
          "beta tester": "betatester.png",
          betatester: "betatester.png",
          prepper: "prepper.png",
          verified: "verified.png"
        };

        const badgeHTML = roleArray.map(r => {
          const badge = badgeIcons[r];
          if (!badge) return "";
          return `<img src="${badge}" alt="${r}" class="role-badge" title="${r}">`;
        }).join(" ");

        const li = document.createElement("li");
        const verifiedHTML = roleArray.includes("verified")
  ? `<img src="${badgeIcons.verified}" alt="verified" class="role-badge" title="Verified">`
  : "";

const otherBadgesHTML = roleArray
  .filter(r => r !== "verified")
  .map(r => {
    const badge = badgeIcons[r];
    if (!badge) return "";
    return `<img src="${badge}" alt="${r}" class="role-badge" title="${r}">`;
  }).join(" ");

li.innerHTML = `
  <div class="email-container">
    ${verifiedHTML}
    <span class="email" title="${user.email}">${shortEmail}</span>
  </div>
  ${dotHTML}
  <span class="badge-container">${otherBadgesHTML}</span>
`;



        roles[mainRole].push(li);
      });

      Object.keys(roles).forEach(role => {
        if (roles[role].length === 0) return;

        const wrapper = document.createElement("div");
        wrapper.classList.add("role-section");

        const title = document.createElement("div");
        title.classList.add("role-title");
        title.textContent = icons[role];

        const ul = document.createElement("ul");
        ul.classList.add("role-list");

        roles[role].forEach(li => ul.appendChild(li));
        wrapper.appendChild(title);
        wrapper.appendChild(ul);
        memberList.appendChild(wrapper);
      });
    });
  });
});
