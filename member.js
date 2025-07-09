import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getFirestore, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
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

  onAuthStateChanged(auth, (user) => {
    if (!user) return;

    onSnapshot(collection(db, "approved_emails"), (snapshot) => {
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
        Pioneer: [],
        Moderator: [],
        "Beta Tester": [],
        Prepper: [],
        Test: []
      };

      const icons = {
        Admin: "👑 Admins",
        Pioneer: "💎 Pioneers",
        Moderator: "🛡️ Moderators",
        "Beta Tester": "🔥 Beta Testers",
        Prepper: "📦 Preppers",
        Test: "🤖 Test Accounts"
      };

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
            roleArray.includes("pioneer") ? "Pioneer" :
            roleArray.includes("moderator") ? "Moderator" :
            roleArray.includes("beta tester") || roleArray.includes("betatester") ? "Beta Tester" :
            roleArray.includes("test") ? "Test" :
            "Prepper";

          const shortEmail = user.email.length > 22
            ? user.email.substring(0, 18) + "..."
            : user.email;

          let dotHTML = "";
          const userStatus = onlineMap[user.uid];
          const now = Date.now();
          const last = userStatus?.lastActive || 0;
          const diff = now - last;

          if (userStatus?.online === true) {
            dotHTML = `<span class="online-dot green"></span>`;
          } else if (diff <= 3 * 60 * 1000 + 1000) {
            dotHTML = `<span class="online-dot orange"></span>`;
          } else {
            dotHTML = `<span class="online-dot red"></span>`;
          }

          const badgeIcons = {
            admin: "admin.png",
            pioneer: "pioneer.png",
            moderator: "moderator.png",
            "beta tester": "betatester.png",
            betatester: "betatester.png",
            prepper: "prepper.png",
            test: "test.png",
            verified: "verified.png"
          };

          const verifiedHTML = roleArray.includes("verified")
            ? `<img src="${badgeIcons.verified}" alt="verified" class="role-badge" title="Verified">`
            : "";

          const otherBadgesHTML = roleArray
            .filter(r => r !== "verified")
            .map(r => {
              const badge = badgeIcons[r];
              if (!badge) return "";
              const larger = r === "test" ? 'style="width:24px;height:24px;"' : "";
              return `<img src="${badge}" alt="${r}" class="role-badge" title="${r}" ${larger}>`;
            }).join(" ");

          const li = document.createElement("li");
          li.innerHTML = `
            <div class="email-container">
              ${verifiedHTML}
              ${dotHTML}
              <span class="email" title="${user.email}" data-uid="${user.uid}">${shortEmail}</span>
            </div>
            <span class="badge-container">${otherBadgesHTML}</span>
          `;

          roles[mainRole].push(li);
        });

        Object.entries(roles).forEach(([role, elements]) => {
          if (elements.length === 0) return;

          const wrapper = document.createElement("div");
          wrapper.classList.add("role-section");

          const title = document.createElement("div");
          title.classList.add("role-title");
          title.textContent = icons[role];

          const ul = document.createElement("ul");
          ul.classList.add("role-list");

          elements.forEach(li => ul.appendChild(li));
          wrapper.appendChild(title);
          wrapper.appendChild(ul);
          memberList.appendChild(wrapper);
        });
      });
    });
  });
});
