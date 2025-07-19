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
  "taberdorphael189@gmail.com"
];

// ✅ Fetch total card count from user_card_stats
async function getFlashcardCount(email) {
  const statsRef = doc(db, "user_card_stats", email);
  const snap = await getDoc(statsRef);
  if (snap.exists()) {
    const data = snap.data();
    return typeof data.totalCards === "number" ? data.totalCards : 0;
  }
  return 0;
}
async function getDefiDropCount(email) {
  const ref = doc(db, "defidrop_scores", email);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data();
    return typeof data.totalCorrect === "number" ? data.totalCorrect : 0;
  }
  return 0;
}

document.addEventListener("DOMContentLoaded", () => {
  const leaderboardBtn = document.getElementById("leaderboardsBtn");
  const leaderboardModal = document.getElementById("leaderboardModal");
  const dots = document.querySelector(".leaderboard-dots");
  const achievementsModal = document.getElementById("achievementsModal");
const profileBtn = document.getElementById("openAchievementsFromProfile");
if (profileBtn && achievementsModal) {
  profileBtn.addEventListener("click", async () => {
    const profileModal = document.getElementById("profileModal");
    const profileEmail = document.getElementById("userEmail")?.textContent?.trim();
    const loggedInEmail = auth.currentUser?.email;

    const titleEl = document.getElementById("achievementsTitle");

    if (profileModal && !profileModal.classList.contains("hidden") && profileEmail) {
      // ✅ Viewing someone else's profile
      const mod = await import('./profile.js');
      mod.openAchievementsForUser(profileEmail);
    } else if (loggedInEmail) {
      // ✅ Viewing self directly
      if (titleEl) {
        titleEl.textContent = "🏅 Your Achievements";
      }

      const [cardCount, defidropCount] = await Promise.all([
        getFlashcardCount(loggedInEmail),
        getDefiDropCount(loggedInEmail)
      ]);

      const cardLabel = document.getElementById("flashcardCountLabel");
      const defidropLabel = document.getElementById("defidropCountLabel");

      achievementsModal.classList.remove("hidden");
      const box = achievementsModal.querySelector('.achievements-box');
      box.classList.remove('animate-expand');
      void box.offsetWidth;
      box.classList.add('animate-expand');

      if (cardLabel) {
        cardLabel.textContent = `Total Created Flashcard${cardCount !== 1 ? 's' : ''}: ${cardCount}`;
      }
      if (defidropLabel) {
        defidropLabel.textContent = `${defidropCount} DefiDrop Correct`;
      }
    }
  });
}



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

  if (dots && achievementsModal) {
    dots.addEventListener("click", async () => {
      const title = document.getElementById("achievementsTitle");
if (title) {
  title.textContent = "🏅 Your Achievements";
}

      achievementsModal.classList.remove("hidden");

      const box = achievementsModal.querySelector('.achievements-box');
      box.classList.remove('animate-expand');
      void box.offsetWidth;
      box.classList.add('animate-expand');

      const user = auth.currentUser;
      if (user) {
  const [cardCount, defidropCount] = await Promise.all([
    getFlashcardCount(user.email),
    getDefiDropCount(user.email)
  ]);

  const cardLabel = document.getElementById("flashcardCountLabel");
  if (cardLabel) {
    cardLabel.textContent = `Total Created Flashcard${cardCount !== 1 ? 's' : ''}: ${cardCount}`;
  }

  const defidropLabel = document.getElementById("defidropCountLabel");
  if (defidropLabel) {
    defidropLabel.textContent = `${defidropCount} DefiDrop Correct`;
  }
}

    });
  }
});

async function loadLeaderboards() {
  const levelEl = document.getElementById("levelLeaderboard");
  const defidropEl = document.getElementById("defidropLeaderboard");

  if (!levelEl || !defidropEl) return;

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
      const username = typeof data.username === 'string' ? data.username.trim() : usernameMap[email] || fallback;
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


  const medals = ['🥇', '🥈', '🥉'];
  const colors = ['#FFD700', '#C0C0C0', '#CD7F32'];

  const topLevels = [...levelUsers].sort((a, b) => b.level - a.level).slice(0, 10);
  const topDefidrop = [...defidropUsers].sort((a, b) => b.defidrop - a.defidrop).slice(0, 10);

  async function withAvatars(userList) {
    return await Promise.all(userList.map(async user => {
      let avatar = 'Group-10.png';
      try {
        const avatarRef = ref(storage, `avatars/${user.email}`);
        avatar = await getDownloadURL(avatarRef);
      } catch {}
      return { ...user, avatar };
    }));
  }

  const [topLevelsWithAvatars, topDefidropWithAvatars] = await Promise.all([
    withAvatars(topLevels),
    withAvatars(topDefidrop)
  ]);

  levelEl.innerHTML = topLevelsWithAvatars.map((u, i) => {
    const rank = i < medals.length
      ? `<span class="glow-rank" style="background: transparent;">${medals[i]}</span>`
      : `<span style="color: white; background: transparent;">#${i + 1}</span>`;
    const color = i < colors.length ? colors[i] : 'white';

    return `
      <li style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0;">
        <span style="display: flex; align-items: center; gap: 8px; background: transparent;">
          ${rank}
          <img src="${u.avatar}" alt="avatar" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover; border: 1px solid #888;">
          <span style="color: ${color}; background: transparent; cursor: pointer;">
  ${u.display}
  ${u.role?.includes("verified") ? `<img src="verified.png" title="Verified" class="role-badge2 rol" style="background: transparent;">` : ""}
  ${u.role?.includes("first") ? `<img src="first.png" title="First User" class="role-badge2 rol" style="background: transparent;">` : ""}
</span>

        </span>
        <span style="font-weight: bold; color: white; background: transparent;">Lvl ${u.level}</span>
      </li>
    `;
  }).join("");

  defidropEl.innerHTML = topDefidropWithAvatars.map((u, i) => {
    const rank = i < medals.length
      ? `<span class="glow-rank" style="background: transparent;">${medals[i]}</span>`
      : `<span style="color: white; background: transparent;">#${i + 1}</span>`;
    const color = i < colors.length ? colors[i] : 'white';

    return `
      <li style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0;">
        <span style="display: flex; align-items: center; gap: 8px; background: transparent;">
          ${rank}
          <img src="${u.avatar}" alt="avatar" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover; border: 1px solid #888;">
          <span style="color: ${color}; background: transparent; cursor: pointer;">
  ${u.display}
  ${u.role?.includes("verified") ? `<img src="verified.png" title="Verified" class="role-badge2 rol" style="background: transparent;">` : ""}
  ${u.role?.includes("first") ? `<img src="first.png" title="First User" class="role-badge2 rol" style="background: transparent;">` : ""}
</span>

        </span>
        <span style="font-weight: bold; color: white; background: transparent;">${u.defidrop} correct</span>
      </li>
    `;
  }).join("");
}
