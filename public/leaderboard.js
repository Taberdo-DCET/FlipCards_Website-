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
  const leaderboardModal = document.getElementById("leaderboardModal");
  const dots = document.querySelector(".leaderboard-dots");
  const achievementsModal = document.getElementById("achievementsModal");
  const profileBtn = document.getElementById("openAchievementsFromProfile");

  // Populate achievements modal
  async function populateAchievements(email, title = "🏅 Achievements") {
    const titleEl = document.getElementById("achievementsTitle");
    const cardLabel = document.getElementById("flashcardCountLabel");
    const defidropLabel = document.getElementById("defidropCountLabel");

    if (titleEl) titleEl.textContent = title;
    if (cardLabel) cardLabel.textContent = "Loading flashcards...";
    if (defidropLabel) defidropLabel.textContent = "Loading DefiDrop...";

    if (!email) {
      if (cardLabel) cardLabel.textContent = "Guest accounts have no achievements.";
      if (defidropLabel) defidropLabel.textContent = "";
      return;
    }

    try {
      const [cardCount, defidropCount] = await Promise.all([
        getFlashcardCount(email),
        getDefiDropCount(email)
      ]);

      if (cardLabel) {
        cardLabel.textContent =
          cardCount > 0 ? `Total Created Flashcards: ${cardCount}` : "No flashcards created yet.";
      }

      if (defidropLabel) {
        defidropLabel.textContent =
          defidropCount > 0 ? `${defidropCount} DefiDrop Correct` : "No DefiDrop records yet.";
      }
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
  if (leaderboardBtn && leaderboardModal) {
    leaderboardBtn.addEventListener("click", () => {
      leaderboardModal.classList.remove("hidden");
      loadLeaderboards();
    });

    leaderboardModal.addEventListener("click", (e) => {
      if (e.target === leaderboardModal) {
        leaderboardModal.classList.add("hidden");
      }
    });
  }

  // Achievements from 3 dots
  if (dots && achievementsModal) {
    dots.addEventListener("click", async () => {
      // Hide leaderboard to avoid overlap
      leaderboardModal?.classList.add("hidden");

      achievementsModal.classList.remove("hidden");
      achievementsModal.style.zIndex = "10000"; // ensure top visibility
      const box = achievementsModal.querySelector('.achievements-box');
      box.classList.remove('animate-expand');
      void box.offsetWidth;
      box.classList.add('animate-expand');
      achievementsModal.querySelectorAll('.fade-content').forEach(el => {
  el.style.opacity = "1";
});


      const title = document.getElementById("achievementsTitle");
      const cardLabel = document.getElementById("flashcardCountLabel");
      const defidropLabel = document.getElementById("defidropCountLabel");

      if (title) title.textContent = "🏅 Your Achievements";
      cardLabel.textContent = "Loading flashcards...";
      defidropLabel.textContent = "Loading DefiDrop...";

      const user = auth.currentUser;
      if (!user) {
        cardLabel.textContent = "Please log in to see your achievements.";
        defidropLabel.textContent = "";
        return;
      }

      try {
        const [cardCount, defidropCount] = await Promise.all([
          getFlashcardCount(user.email),
          getDefiDropCount(user.email)
        ]);

        cardLabel.textContent =
          cardCount > 0 ? `Total Created Flashcards: ${cardCount}` : "No flashcards created yet.";
        defidropLabel.textContent =
          defidropCount > 0 ? `${defidropCount} DefiDrop Correct` : "No DefiDrop records yet.";
      } catch (err) {
        console.error("Error loading achievements via 3 dots:", err);
        cardLabel.textContent = "Error loading data.";
        defidropLabel.textContent = "";
      }
    });
  }
    // Refresh leaderboard data right when page finishes loading
  loadLeaderboards();

});

// Load Leaderboards
async function loadLeaderboards() {
  const levelEl = document.getElementById("levelLeaderboard");
  const defidropEl = document.getElementById("defidropLeaderboard");

  if (!levelEl || !defidropEl) return;

  try {
    const usersRef = collection(db, "approved_emails");
    const usernamesRef = collection(db, "usernames");
    const defidropRef = collection(db, "defidrop_scores");

    const [usersSnap, usernamesSnap, defidropSnap] = await Promise.all([
      getDocs(usersRef),
      getDocs(usernamesRef),
      getDocs(defidropRef)
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

    levelEl.innerHTML = topLevelsWithAvatars.map((u, i) => {
      const rank = i < levelMedals.length
  ? `<span class="glow-rank" style="background: transparent;">${levelMedals[i]}</span>`
  : `<span style="color: white; background: transparent;">#${i + 1}</span>`;

      const color = i < colors.length ? colors[i] : 'white';

      return `
        <li style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0;">
          <span style="display: flex; align-items: center; gap: 8px; background: transparent;">
            ${rank}
            <img src="${u.avatar}" alt="avatar" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover; border: 1px solid #888;">
            <span style="color: ${color}; background: transparent; cursor: pointer;">
              ${u.display}
              ${u.role?.includes("verified") ? `<img src="verified.svg" title="Verified" class="role-badge2 rol" style="background: transparent;">` : ""}
              ${u.role?.includes("first") ? `<img src="first.png" title="First User" class="role-badge2 rol" style="background: transparent;">` : ""}
            </span>
          </span>
          <span style="font-weight: bold; color: white; background: transparent;">Lvl ${u.level}</span>
        </li>
      `;
    }).join("");

    defidropEl.innerHTML = topDefidropWithAvatars.map((u, i) => {
      const rank = i < defidropMedals.length
  ? `<span class="glow-rank" style="background: transparent;">${defidropMedals[i]}</span>`
  : `<span style="color: white; background: transparent;">#${i + 1}</span>`;

      const color = i < colors.length ? colors[i] : 'white';

      return `
        <li style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0;">
          <span style="display: flex; align-items: center; gap: 8px; background: transparent;">
            ${rank}
            <img src="${u.avatar}" alt="avatar" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover; border: 1px solid #888;">
            <span style="color: ${color}; background: transparent; cursor: pointer;">
              ${u.display}
              ${u.role?.includes("verified") ? `<img src="verified.svg" title="Verified" class="role-badge2 rol" style="background: transparent;">` : ""}
              ${u.role?.includes("first") ? `<img src="first.png" title="First User" class="role-badge2 rol" style="background: transparent;">` : ""}
            </span>
          </span>
          <span style="font-weight: bold; color: white; background: transparent;"> Score: ${u.defidrop}</span>
        </li>
      `;
    }).join("");
  } catch (err) {
    console.error("Error loading leaderboards:", err);
    if (levelEl) levelEl.innerHTML = "<li>Error loading leaderboard</li>";
    if (defidropEl) defidropEl.innerHTML = "<li>Error loading leaderboard</li>";
  }
}
