// leaderboard.js
import { db } from './firebaseinit.js';
import {
  collection, getDocs, doc, getDoc
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import {
  getStorage, ref, getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";

const storage = getStorage();
const auth = getAuth();

const blockedEmails = [
  "YOURREVIEWERHELPER@gmail.com",
  "firebaseaccount@gmail.com",
  "rap@gmail.com",
  "raph5728@gmail.com",
  "testaccount@gmail.com",
  "taberdoraphael189@gmail.com"
];

// Fetch total card count
async function getFlashcardCount(email) {
  if (!email) return 0;
  try {
    const statsRef = doc(db, "user_card_stats", email);
    const snap = await getDoc(statsRef);
    if (snap.exists()) {
      const data = snap.data();
      return typeof data.totalCards === "number" ? data.totalCards : 0;
    }
    return 0;
  } catch (err) {
    console.error("Error fetching flashcard count:", err);
    return 0;
  }
}
// Fetch total Quibbl Wins
async function getQuibblWins(email) {
  if (!email) return 0;
  try {
    const ref = doc(db, "quibblwinner", email);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      return typeof data.wins === "number" ? data.wins : 0;
    }
    return 0;
  } catch (err) {
    console.error("Error fetching Quibbl wins:", err);
    return 0;
  }
}

// Fetch total DefiDrop count
async function getDefiDropCount(email) {
  if (!email) return 0;
  try {
    const ref = doc(db, "defidrop_scores", email);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      return typeof data.totalCorrect === "number" ? data.totalCorrect : 0;
    }
    return 0;
  } catch (err) {
    console.error("Error fetching DefiDrop count:", err);
    return 0;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const leaderboardBtn = document.getElementById("leaderboardsBtn");
const leaderboardSidenav = document.getElementById("leaderboardSidenav");
const leaderboardBackdrop = document.getElementById("leaderboardBackdrop");
const closeBtn = document.getElementById("closeLeaderboardBtn");
const leaderboardMenuBtn = document.getElementById("leaderboardMenuBtn");
const achievementsModal = document.getElementById("achievementsModal");
const profileBtn = document.getElementById("openAchievementsFromProfile");
function openSidenav() {
  leaderboardSidenav.classList.add("open");
  leaderboardBackdrop.classList.remove("hidden");
  loadLeaderboards();
}

function closeSidenav() {
  leaderboardSidenav.classList.remove("open");
  leaderboardBackdrop.classList.add("hidden");
}

  // Populate achievements modal
  async function populateAchievements(email, title = "🏅 Achievements") {
    const titleEl = document.getElementById("achievementsTitle");
    const cardLabel = document.getElementById("flashcardCountLabel");
    const defidropLabel = document.getElementById("defidropCountLabel");
    const quibblWinsLabel = document.getElementById("quibblWinsLabel");



    if (titleEl) titleEl.textContent = title;
    if (cardLabel) cardLabel.textContent = "Loading flashcards...";
    if (defidropLabel) defidropLabel.textContent = "Loading DefiDrop...";

    if (!email) {
      if (cardLabel) cardLabel.textContent = "Guest accounts have no achievements.";
      if (defidropLabel) defidropLabel.textContent = "";
      return;
    }

    try {
      const [cardCount, defidropCount, quibblWins] = await Promise.all([
  getFlashcardCount(email),
  getDefiDropCount(email),
  getQuibblWins(email)
]);


      if (cardLabel) {
        cardLabel.textContent =
          cardCount > 0 ? `Total Created Flashcards: ${cardCount}` : "No flashcards created yet.";
      }

      if (defidropLabel) {
        defidropLabel.textContent =
          defidropCount > 0 ? `${defidropCount} DefiDrop Correct` : "No DefiDrop records yet.";
      }
     if (quibblWinsLabel) {
  if (quibblWins > 0) {
    quibblWinsLabel.innerHTML = `
  <span style="font-weight:bold; font-size:14px; margin-right:4px; background: transparent; color: white;">${quibblWins}</span>
  <img src="quibblstar.png" alt="Quibbl Star" class="star-icon" style="width: 20px; height: 20px; vertical-align: middle;">
`;

  } else {
    quibblWinsLabel.textContent = "No Quibbl wins yet.";
  }
}

console.log("Quibbl Wins for", email, "→", quibblWins);


    } catch (err) {
      console.error("Error fetching achievements:", err);
      if (cardLabel) cardLabel.textContent = "Error loading data.";
      if (defidropLabel) defidropLabel.textContent = "";
    }
  }

  // Profile Achievements button
  if (profileBtn && achievementsModal) {
    profileBtn.addEventListener("click", async () => {
      const profileModal = document.getElementById("profileModal");
      const profileEmail = document.getElementById("userEmail")?.textContent?.trim();
      const loggedInEmail = auth.currentUser?.email || null;

      achievementsModal.classList.remove("hidden");
      achievementsModal.style.zIndex = "10000"; // ensure top visibility
      const box = achievementsModal.querySelector('.achievements-box');
      box.classList.remove('animate-expand');
      void box.offsetWidth;
      box.classList.add('animate-expand');
      achievementsModal.querySelectorAll('.fade-content').forEach(el => {
  el.style.opacity = "1";
});


      if (profileModal && !profileModal.classList.contains("hidden") && profileEmail) {
        try {
          const mod = await import('./profile.js');
          if (mod.openAchievementsForUser) {
            mod.openAchievementsForUser(profileEmail);
          } else {
            populateAchievements(profileEmail, `🏅 Achievements of ${profileEmail}`);
          }
        } catch (err) {
          console.error("Error loading profile.js:", err);
          populateAchievements(profileEmail, `🏅 Achievements of ${profileEmail}`);
        }
      } else {
        populateAchievements(loggedInEmail, "🏅 Your Achievements");
      }
    });
  }

  // Leaderboard modal
  leaderboardBtn?.addEventListener("click", openSidenav);
closeBtn?.addEventListener("click", closeSidenav);
leaderboardBackdrop?.addEventListener("click", closeSidenav);
leaderboardMenuBtn?.addEventListener("click", () => {
  // First, close the leaderboard sidenav
  closeSidenav();

  // After a short delay, open the achievements modal
  setTimeout(() => {
    achievementsModal.classList.remove("hidden");
    // Trigger the pop-in animation
    const box = achievementsModal.querySelector('.achievements-box');
    box.classList.remove('animate-expand');
    void box.offsetWidth;
    box.classList.add('animate-expand');

    // Populate it with the current user's data
    populateAchievements(auth.currentUser?.email, "🏅 Your Achievements");
  }, 250); // Delay matches the sidenav's closing animation time
});

  // Achievements from 3 dots
  
    // Refresh leaderboard data right when page finishes loading
  loadLeaderboards();

});

// Load Leaderboards
async function loadLeaderboards() {
  const levelEl = document.getElementById("levelLeaderboard");
  const defidropEl = document.getElementById("defidropLeaderboard");
 const quibblEl = document.getElementById("quibblLeaderboard");
  if (!levelEl || !defidropEl) return;

  try {
    const usersRef = collection(db, "approved_emails");
    const usernamesRef = collection(db, "usernames");
    const defidropRef = collection(db, "defidrop_scores");

    const quibblRef = collection(db, "quibblwinner");
const [usersSnap, usernamesSnap, defidropSnap, quibblSnap] = await Promise.all([
  getDocs(usersRef),
  getDocs(usernamesRef),
  getDocs(defidropRef),
  getDocs(quibblRef)
]);


    const usernameMap = {};
    usernamesSnap.forEach(doc => {
      const data = doc.data();
      if (data.username && typeof data.username === 'string') {
        usernameMap[doc.id] = data.username.trim();
      }
    });

    const levelUsers = usersSnap.docs
      .filter(doc => !blockedEmails.includes(doc.id))
      .map(doc => {
        const data = doc.data();
        const email = doc.id;
        const fallback = email.split("@")[0];
        const username = typeof data.username === 'string'
          ? data.username.trim()
          : usernameMap[email] || fallback;
        return {
          email,
          display: username,
          level: data.level || 1,
          role: (data.role || "").toLowerCase()
        };
      });

    const roleMap = {};
    usersSnap.forEach(doc => {
      const data = doc.data();
      roleMap[doc.id] = (data.role || "").toLowerCase();
    });

    const defidropUsers = defidropSnap.docs
      .filter(doc => !blockedEmails.includes(doc.id))
      .map(doc => {
        const data = doc.data();
        const email = doc.id;
        const fallback = email.split("@")[0];
        const username = usernameMap[email] || fallback;
        return {
          email,
          display: username,
          defidrop: data.totalCorrect || 0,
          role: roleMap[email] || ""
        };
      });
const quibblUsers = quibblSnap.docs
  .map(doc => {
    const data = doc.data();
    const email = doc.id;
    const fallback = email.split("@")[0];
    const username = usernameMap[email] || fallback;
    return {
      email,
      display: username,
      wins: data.wins || 0,
      role: roleMap[email] || ""
    };
  });

const quibblMedals = [
  `<img src="rank1quibbl.png" alt="1st" class="role-badge2">`,
  `<img src="rank2quibbl.png" alt="2nd" class="role-badge2">`,
  `<img src="rank3quibbl.png" alt="3rd" class="role-badge2">`
];

    // Medals for Top Levels (XP)
const levelMedals = [
  `<img src="rank1XP.png" alt="1st" class="role-badge2">`,
  `<img src="rank2XP.png" alt="2nd" class="role-badge2">`,
  `<img src="rank3XP.png" alt="3rd" class="role-badge2">`
];

// Medals for Top DefiDrop
const defidropMedals = [
  `<img src="rank1.png" alt="1st" class="role-badge2">`,
  `<img src="rank2.png" alt="2nd" class="role-badge2">`,
  `<img src="rank3.png" alt="3rd" class="role-badge2">`
];


    const colors = ['#FFD700', '#C0C0C0', '#CD7F32'];

    const topLevels = [...levelUsers].sort((a, b) => b.level - a.level).slice(0, 10);
    const topDefidrop = [...defidropUsers].sort((a, b) => b.defidrop - a.defidrop).slice(0, 10);
    const topLevelEmails = topLevels.slice(0, 3).map(u => u.email);
const topDefidropEmails = topDefidrop.slice(0, 3).map(u => u.email);
localStorage.setItem('topLevelEmails', JSON.stringify(topLevelEmails));
localStorage.setItem('topDefidropEmails', JSON.stringify(topDefidropEmails));



    async function withAvatars(userList) {
      return await Promise.all(userList.map(async user => {
        let avatar = 'Group-10.png';
        try {
          const avatarRef = ref(storage, `avatars/${user.email}`);
          avatar = await getDownloadURL(avatarRef);
        } catch {
          // default avatar
        }
        return { ...user, avatar };
      }));
    }

    const [topLevelsWithAvatars, topDefidropWithAvatars] = await Promise.all([
      withAvatars(topLevels),
      withAvatars(topDefidrop)
    ]);
const topQuibbl = [...quibblUsers].sort((a, b) => b.wins - a.wins).slice(0, 10);
const topQuibblWithAvatars = await withAvatars(topQuibbl);
const topQuibblEmails = topQuibbl.slice(0, 3).map(u => u.email);
localStorage.setItem('topQuibblEmails', JSON.stringify(topQuibblEmails));

function renderLeaderboard(el, users, medals, valueLabel, valueKey, containerId) {
  const top3 = users.slice(0, 3);
  const remaining = users.slice(3);

  el.innerHTML = `
    ${top3.map((u, i) => generateRow(u, i, medals, valueLabel, valueKey)).join('')}
    <div id="${containerId}" class="hidden">
      ${remaining.map((u, i) => generateRow(u, i + 3, medals, valueLabel, valueKey)).join('')}
    </div>
    <div style="text-align: center; margin-top: 10px;">
  <button class="neumorphic-button2" onclick="toggleMore('${containerId}', this)">Show More</button>
</div>

  `;
}

function generateRow(u, i, medals, valueLabel, valueKey) {
  const rank = i < medals.length
    ? `<span class="glow-rank" style="background: transparent;">${medals[i]}</span>`
    : `<span style="color: white; background: transparent;">#${i + 1}</span>`;

  const color = i < 3 ? ['#FFD700', '#C0C0C0', '#CD7F32'][i] : 'white';

  const valueDisplay = valueKey === 'level'
    ? `Lvl ${u.level}`
    : valueKey === 'defidrop'
      ? `Score: ${u.defidrop}`
      : `
  <span style="display: flex; align-items: center; font-weight: bold; color: white; background: transparent;">
    ${u.wins}
    <img src="quibblstar.png" alt="Star" style="width: 28px; height: 28px; margin-right: 4px; border: none;">
  </span>
`;


  return `
    <li style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0;">
      <span style="display: flex; align-items: center; gap: 8px; background: transparent;">
        ${rank}
        <img src="${u.avatar}" alt="avatar" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover; border: 1px solid #888;">
        <span style="color: ${color}; background: transparent; cursor: pointer;">
          ${u.display}
          ${/* ▼▼▼ ADD THIS LINE ▼▼▼ */''}
          ${u.role?.includes("plus") ? `<img src="plass.png" title="FlipCards+" class="role-badge2 rol plus-badge">` : ""}
          ${u.role?.includes("verified") ? `<img src="verified.svg" title="Verified" class="role-badge2 rol">` : ""}
          ${u.role?.includes("first") ? `<img src="first.png" title="First User" class="role-badge2 rol">` : ""}
        </span>
      </span>
      <span style="font-weight: bold; color: white;">${valueDisplay}</span>
    </li>
  `;
}

window.toggleMore = (id, btn) => {
  const section = document.getElementById(id);
  const isHidden = section.classList.contains("hidden");

  if (isHidden) {
    section.classList.remove("hidden", "leaderboard-collapse");
    section.classList.add("leaderboard-expand");
    btn.textContent = "Show Less";
  } else {
    section.classList.remove("leaderboard-expand");
    section.classList.add("leaderboard-collapse");

    // Delay hiding to let animation finish
    setTimeout(() => {
      section.classList.add("hidden");
      section.classList.remove("leaderboard-collapse");
    }, 400);

    btn.textContent = "Show More";
  }
};



renderLeaderboard(levelEl, topLevelsWithAvatars, levelMedals, "Lvl", "level", "moreLevel");
renderLeaderboard(defidropEl, topDefidropWithAvatars, defidropMedals, "Score", "defidrop", "moreDefidrop");
renderLeaderboard(quibblEl, topQuibblWithAvatars, quibblMedals, "Stars", "wins", "moreQuibbl");


  } catch (err) {
    console.error("Error loading leaderboards:", err);
    if (levelEl) levelEl.innerHTML = "<li>Error loading leaderboard</li>";
    if (defidropEl) defidropEl.innerHTML = "<li>Error loading leaderboard</li>";
  }
}
auth.onAuthStateChanged(async (user) => {
  if (user) {
    const wins = await getQuibblWins(user.email);
    const label = document.getElementById("quibblWinsLabel");

    if (label) {
      if (wins > 0) {
        label.innerHTML = `
          <span style="font-weight:bold; font-size:14px; margin-right:4px; background: transparent; color: white;">${wins}</span>
          <img src="quibblstar.png" alt="Quibbl Star" class="star-icon" style="width: 38px; height: 38px; vertical-align: middle;">
        `;
      } else {
        label.textContent = "No Quibbl wins yet.";
      }
    }
  }
});

import { onSnapshot } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

// Real-time countdown sync
const countdownRef = doc(db, "leaderboard_config", "countdown");
const countdownEl = document.getElementById("leaderboardCountdown");

onSnapshot(countdownRef, (docSnap) => {
  if (docSnap.exists()) {
    const endTime = docSnap.data().endTime?.toDate();
    if (!endTime) return;

    function updateCountdown() {
      const now = new Date();
      const diff = endTime - now;

      if (diff <= 0) {
        countdownEl.textContent = "00:00:00:00";
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      countdownEl.textContent = `${String(days).padStart(2, "0")}:${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    updateCountdown(); // initial
    clearInterval(window._countdownTimer);
    window._countdownTimer = setInterval(updateCountdown, 1000);
  }
});

