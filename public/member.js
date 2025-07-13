import { db, rtdb, auth } from "./firebaseinit.js";
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";

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
  "Co Admin": [],
  Pioneer: [],
  Moderator: [],
  "Beta Tester": [],
  Prepper: [],
  Test: []
};

const icons = {
  Admin: "👑 Admins",
  "Co Admin": "🎖️ Co Admins",
  Pioneer: "💎 Pioneers",
  Moderator: "🛡️ Moderators",
  "Beta Tester": "🔥 Beta Testers",
  Prepper: "📦 Preppers",
  Test: "🤖 Test Accounts"
};


      const badgeIcons = {
  admin: "admin.png",
  coadmin: "coadmin.png",
  pioneer: "pioneer.png",
  moderator: "moderator.png",
  "beta tester": "betatester.png",
  betatester: "betatester.png",
  prepper: "prepper.png",
  test: "test.png",
  verified: "verified.png",
  first: "first.png",
  hearted: "hearted.png",
  trophy: "trophy.png",
  friend: "friend.png",
  bronze: "bronze.png",
  silver: "silver.png",
  gold: "gold.png",
  sponsor: "sponsor.png"
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
  roleArray.includes("coadmin") ? "Co Admin" :
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

          const firstHTML = roleArray.includes("first")
            ? `<img src="${badgeIcons.first}" alt="first" class="role-badge" title="First User">`
            : "";

          const verifiedHTML = roleArray.includes("verified")
            ? `<img src="${badgeIcons.verified}" alt="verified" class="role-badge" title="Verified">`
            : "";

          const mainBadgesHTML = roleArray
            .filter(r =>
              ["admin", "coadmin", "pioneer", "moderator", "beta tester", "betatester", "prepper", "test"]
              .includes(r))
            .map(r => {
              const badge = badgeIcons[r];
              if (!badge) return "";
              return `<img src="${badge}" alt="${r}" class="role-badge" title="${r}">`;
            }).join(" ");

          const achievementBadgesHTML = roleArray
            .filter(r =>
              ["hearted", "trophy", "friend", "bronze", "silver", "gold", "sponsor"].includes(r))
            .map(r => {
              const badge = badgeIcons[r];
              return badge ? `<img src="${badge}" alt="${r}" class="role-badge" title="${r}">` : "";
            }).join(" ");

          const li = document.createElement("li");
          li.innerHTML = `
            <div class="email-container" style="position: relative;">
              ${dotHTML}${verifiedHTML}${firstHTML}
              <div style="display: flex; flex-direction: column;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span class="email" title="${user.email}" data-uid="${user.uid}">${shortEmail}</span>
                </div>
                <span class="badge-container achievement-badges">${achievementBadgesHTML}</span>
              </div>
              <span class="badge-container main-badges">${mainBadgesHTML}</span>
            </div>
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
