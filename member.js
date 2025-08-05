import { db, rtdb, auth } from "./firebaseinit.js";
import { collection, onSnapshot, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";

const usernameCache = {};
let lastProfileEmail = null;
let loaderShownThisSession = false;

document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.getElementById("memberSidebar");
  const openBtn = document.getElementById("openMemberList");
  const memberList = document.getElementById("memberList");

  if (!sidebar || !openBtn || !memberList) return;

openBtn.addEventListener("click", () => {
  const wasOpen = sidebar.classList.contains("show");
  sidebar.classList.toggle("show");

  // Move mini profile when sidebar is open
  const miniProfile = document.getElementById("miniProfile");
  if (miniProfile) {
    miniProfile.classList.toggle("sidebar-open", sidebar.classList.contains("show"));
  }

  if (!wasOpen) {
    loaderShownThisSession = false; // Reset loader for new session
  }
  if (wasOpen) {
    setTimeout(() => location.reload(), 500); // 500ms delay
  }
});


document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && sidebar.classList.contains("show")) {
    sidebar.classList.remove("show");

    // Reset mini profile position
    const miniProfile = document.getElementById("miniProfile");
    if (miniProfile) {
      miniProfile.classList.remove("sidebar-open");
    }

    setTimeout(() => location.reload(), 300); // 300ms delay
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
  role: (data.role || "prepper").toLowerCase(),
  level: data.level || 1 // Add level tracking
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
        verified: "verified.svg",
        first: "first.png",
        hearted: "hearted.png",
        trophy: "trophy.png",
        friend: "friend.png",
        bronze: "bronze.png",
        silver: "silver.png",
        gold: "gold.png",
        platinum: "platinum.png",
        diamond: "diamond.png",
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

          // Get top rank data from localStorage
const topLevel = JSON.parse(localStorage.getItem('topLevelEmails') || "[]");
const topDefi = JSON.parse(localStorage.getItem('topDefidropEmails') || "[]");
const topQuibbl = JSON.parse(localStorage.getItem('topQuibblEmails') || "[]");

let rankBadgeHTML = "";

// Check XP Top 3
if (topLevel[0] === user.email) {
  rankBadgeHTML = `<img src="rank1XP.png" class="role-badge" title="Top 1 in XP Level Leaderboards">`;
} else if (topLevel[1] === user.email) {
  rankBadgeHTML = `<img src="rank2XP.png" class="role-badge" title="Top 2 in XP Level Leaderboards">`;
} else if (topLevel[2] === user.email) {
  rankBadgeHTML = `<img src="rank3XP.png" class="role-badge" title="Top 3 in XP Level Leaderboards">`;
}

// Check DefiDrop Top 3 (append, not replace)
if (topDefi[0] === user.email) {
  rankBadgeHTML += ` <img src="rank1.png" class="role-badge" title="Top 1 in DefiDrop">`;
} else if (topDefi[1] === user.email) {
  rankBadgeHTML += ` <img src="rank2.png" class="role-badge" title="Top 2 in DefiDrop">`;
} else if (topDefi[2] === user.email) {
  rankBadgeHTML += ` <img src="rank3.png" class="role-badge" title="Top 3 in DefiDrop">`;
}
// ✅ Add this — Check Quibbl Top 3
if (topQuibbl[0] === user.email) {
  rankBadgeHTML += ` <img src="rank1quibbl.png" class="role-badge" title="Top 1 in Quibbl Stars">`;
} else if (topQuibbl[1] === user.email) {
  rankBadgeHTML += ` <img src="rank2quibbl.png" class="role-badge" title="Top 2 in Quibbl Stars">`;
} else if (topQuibbl[2] === user.email) {
  rankBadgeHTML += ` <img src="rank3quibbl.png" class="role-badge" title="Top 3 in Quibbl Stars">`;
}

const mainBadgesHTML = roleArray
  .filter(r =>
    ["admin", "coadmin", "pioneer", "moderator", "beta tester", "betatester", "prepper", "test"]
      .includes(r))
  .map(r => {
    const badge = badgeIcons[r];
    return badge ? `<img src="${badge}" alt="${r}" class="role-badge" title="${r}">` : "";
  }).join(" ");



          const achievementBadgesHTML = roleArray
  .filter(r =>
    ["hearted", "trophy", "friend", "bronze", "silver", "gold", "platinum", "diamond", "sponsor"].includes(r))
  .map(r => {
    const badge = badgeIcons[r];
    let customTitle = r;

    if (r === "diamond") customTitle = "Diamond Tier Spender";  // ← Customize this tooltip here
    if (r === "platinum") customTitle = "Platinum Tier Spender";
    if (r === "gold") customTitle = "Gold Tier Spender";
    if (r === "silver") customTitle = "Silver Tier Spender";
    if (r === "bronze") customTitle = "Bronze Tier Spender";

    return badge ? `<img src="${badge}" alt="${r}" class="role-badge" title="${customTitle}">` : "";
  }).join(" ");


let levelBadgeHTML = "";
if (user.level >= 0 && user.level <= 4) {
  levelBadgeHTML = `<img src="level0.png" alt="Level ${user.level}" class="role-badge" title="Level ${user.level}">`;
} else if (user.level >= 5 && user.level <= 14) {
  levelBadgeHTML = `<img src="level5.png" alt="Level ${user.level}" class="role-badge" title="Level ${user.level}">`;
}
else if (user.level >= 15 && user.level <= 24) {
  levelBadgeHTML = `<img src="level15.png" alt="Level ${user.level}" class="role-badge" title="Level ${user.level}">`;
} else if (user.level >= 25 && user.level <= 34) {
  levelBadgeHTML = `<img src="level25.png" alt="Level ${user.level}" class="role-badge" title="Level ${user.level}">`;
} else if (user.level >= 35 && user.level <= 49) {
  levelBadgeHTML = `<img src="level35.png" alt="Level ${user.level}" class="role-badge" title="Level ${user.level}">`;
} else if (user.level >= 50 && user.level <= 64) {
  levelBadgeHTML = `<img src="level50.png" alt="Level ${user.level}" class="role-badge" title="Level ${user.level}">`;
}
 else if (user.level >= 65 && user.level <= 99) {
  levelBadgeHTML = `<img src="level65.png" alt="Level ${user.level}" class="role-badge" title="Level ${user.level}">`;
}


          const li = document.createElement("li");
          li.innerHTML = `
  <div class="email-container" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
    <div class="left-info" style="display: flex; flex-direction: column; gap: 2px;">
      <div style="display: flex; align-items: center; gap: 6px;">
        ${dotHTML}
        <span class="username email" title="${user.email}" data-uid="${user.uid}" 
          style="font-weight:bold; background: transparent; color: white;">Loading...</span>
        ${verifiedHTML}${firstHTML}
      </div>
      <span class="email user-email" title="${user.email}" data-uid="${user.uid}" 
        style="font-size:11px; opacity:0.6; background: transparent; color: white;">
        ${shortEmail}
      </span>
     <span class="badge-container achievement-badges">
  ${achievementBadgesHTML}
  ${levelBadgeHTML}
</span>
<span class="badge-container rank-badges">
  ${rankBadgeHTML}
</span>


    </div>
    <div class="main-badges-wrapper" style="display: flex; gap: 4px; align-items: center; justify-content: flex-end;">
      ${mainBadgesHTML}
    </div>
  </div>
`;


          // Fetch username from Firestore
          const usernameSpan = li.querySelector(".username");
          const emailForUser = user.email;

          if (usernameCache[emailForUser]) {
            usernameSpan.textContent = usernameCache[emailForUser];
          } else {
            (async () => {
              try {
                const usernameDoc = await getDoc(doc(db, "usernames", emailForUser));
                if (usernameDoc.exists() && usernameDoc.data().username) {
                  usernameCache[emailForUser] = usernameDoc.data().username;
                  usernameSpan.textContent = usernameCache[emailForUser];
                } else {
                  usernameCache[emailForUser] = shortEmail;
                  usernameSpan.textContent = shortEmail;
                  usernameSpan.nextElementSibling?.remove();
                }
              } catch (err) {
                console.error("Failed to load username:", err);
                usernameSpan.textContent = shortEmail;
              }
            })();
          }

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

          // Hover logic
          setTimeout(() => {
            wrapper.querySelectorAll(".email").forEach(el => {
              el.addEventListener("mouseenter", () => {
                const email = el.getAttribute("title");

                if (lastProfileEmail === email) return;
                lastProfileEmail = email;

                if (!loaderShownThisSession) {
  showLoader();
  loaderShownThisSession = true;
}


                import('./profile.js').then(mod => {
                  mod.openUserProfile(email);

                  const sidebar = document.getElementById("memberSidebar");
                  const modal = document.getElementById("profileModal");

if (sidebar && modal) {
  const rect = sidebar.getBoundingClientRect();
  modal.style.position = "fixed";
  modal.style.top = `${rect.top + 20}px`;
  modal.style.left = `${rect.right + 10}px`;

  // Add animation class
  modal.classList.remove("animate-show");
  void modal.offsetWidth; // Force reflow to restart animation
  modal.classList.add("animate-show");
}


                  const checkInterval = setInterval(() => {
                    if (modal && !modal.classList.contains("hidden")) {
                      hideLoader();
                      clearInterval(checkInterval);

                      const achBtn = modal.querySelector(".profile-leaderboard-btn");
                      if (achBtn) {
                        achBtn.onclick = () => mod.openAchievementsForUser(email);
                      }
                    }
                  }, 100);
                });
              });

              
            });
          }, 0);
        });
      });
    });
  });
});
