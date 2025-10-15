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
async function getBlitzScore(email) {
  if (!email) return 0;
  try {
    const ref = doc(db, "blitzcorrect", email); // Checks blitzcorrect collection
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      // Reads the totalScore field
      return typeof data.totalScore === "number" ? data.totalScore : 0;
    }
    return 0;
  } catch (err) {
    console.error("Error fetching Blitz score:", err);
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
    const blitzLabel = document.getElementById("blitzCountLabel"); // Changed ID
    const quibblWinsLabel = document.getElementById("quibblWinsLabel");

    if (titleEl) titleEl.textContent = title;
    if (cardLabel) cardLabel.textContent = "Loading flashcards...";
    if (blitzLabel) blitzLabel.textContent = "Loading Blitz score..."; // Changed text

    if (!email) {
      if (cardLabel) cardLabel.textContent = "Guest accounts have no achievements.";
      if (blitzLabel) blitzLabel.textContent = "";
      return;
    }

    try {
      const [cardCount, blitzScore, quibblWins] = await Promise.all([
        getFlashcardCount(email),
        getBlitzScore(email), // Changed function call
        getQuibblWins(email)
      ]);

      if (cardLabel) {
        cardLabel.textContent =
          cardCount > 0 ? `Total Created Flashcards: ${cardCount}` : "No flashcards created yet.";
      }

      if (blitzLabel) {
        blitzLabel.textContent =
          blitzScore > 0 ? `${blitzScore} Blitz Total Score` : "No Blitz records yet."; // Changed text
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
    } catch (err) {
      console.error("Error fetching achievements:", err);
      if (cardLabel) cardLabel.textContent = "Error loading data.";
      if (blitzLabel) blitzLabel.textContent = "";
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
    const blitzEl = document.getElementById("blitzLeaderboard");
    const quibblEl = document.getElementById("quibblLeaderboard");
    if (!levelEl || !blitzEl || !quibblEl) return;

    try {
        const usersRef = collection(db, "approved_emails");
        const usernamesRef = collection(db, "usernames");
        const blitzRef = collection(db, "blitzcorrect");
        const quibblRef = collection(db, "quibblwinner");

        const [usersSnap, usernamesSnap, blitzSnap, quibblSnap] = await Promise.all([
            getDocs(usersRef),
            getDocs(usernamesRef),
            getDocs(blitzRef),
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

        const blitzUsers = blitzSnap.docs
            .filter(doc => !blockedEmails.includes(doc.id))
            .map(doc => {
                const data = doc.data();
                const email = doc.id;
                const fallback = email.split("@")[0];
                const username = usernameMap[email] || fallback;
                return {
                    email,
                    display: username,
                    blitzScore: data.totalScore || 0,
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

        const quibblMedals = [`<img src="rank1quibbl.png" alt="1st" class="role-badge2">`, `<img src="rank2quibbl.png" alt="2nd" class="role-badge2">`, `<img src="rank3quibbl.png" alt="3rd" class="role-badge2">`];
        const levelMedals = [`<img src="rank1XP.png" alt="1st" class="role-badge2">`, `<img src="rank2XP.png" alt="2nd" class="role-badge2">`, `<img src="rank3XP.png" alt="3rd" class="role-badge2">`];
        const blitzMedals = [`<img src="rank1.png" alt="1st" class="role-badge2">`, `<img src="rank2.png" alt="2nd" class="role-badge2">`, `<img src="rank3.png" alt="3rd" class="role-badge2">`];

        const topLevels = [...levelUsers].sort((a, b) => b.level - a.level).slice(0, 10);
        const topBlitz = [...blitzUsers].sort((a, b) => b.blitzScore - a.blitzScore).slice(0, 10);
        const topQuibbl = [...quibblUsers].sort((a, b) => b.wins - a.wins).slice(0, 10);

        const topLevelEmails = topLevels.slice(0, 3).map(u => u.email);
        const topBlitzEmails = topBlitz.slice(0, 3).map(u => u.email);
        const topQuibblEmails = topQuibbl.slice(0, 3).map(u => u.email);

        localStorage.setItem('topLevelEmails', JSON.stringify(topLevelEmails));
        localStorage.setItem('topBlitzEmails', JSON.stringify(topBlitzEmails));
        localStorage.setItem('topQuibblEmails', JSON.stringify(topQuibblEmails));

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

        const [topLevelsWithAvatars, topBlitzWithAvatars, topQuibblWithAvatars] = await Promise.all([
            withAvatars(topLevels),
            withAvatars(topBlitz),
            withAvatars(topQuibbl)
        ]);

        // --- HELPER FUNCTIONS NOW INCLUDED INSIDE ---
        function generateRow(u, i, medals, valueLabel, valueKey) {
            const rank = i < medals.length ?
                `<span class="glow-rank" style="background: transparent;">${medals[i]}</span>` :
                `<span style="color: white; background: transparent;">#${i + 1}</span>`;
            const color = i < 3 ? ['#FFD700', '#C0C0C0', '#CD7F32'][i] : 'white';
            const valueDisplay = valueKey === 'level' ?
                `Lvl ${u.level}` :
                valueKey === 'blitzScore' ?
                `Score: ${u.blitzScore}` :
                `<span style="display: flex; align-items: center; font-weight: bold; color: white; background: transparent;">
                    ${u.wins} <img src="quibblstar.png" alt="Star" style="width: 28px; height: 28px; margin-right: 4px; border: none;">
                </span>`;
            return `<li style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0;">
                <span style="display: flex; align-items: center; gap: 8px; background: transparent;">
                    ${rank}
                    <img src="${u.avatar}" alt="avatar" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover; border: 1px solid #888;">
                    <span style="color: ${color}; background: transparent; cursor: pointer;">
                        ${u.display}
                        ${u.role?.includes("plus") ? `<img src="plass.png" title="FlipCards+" class="role-badge2 rol plus-badge">` : ""}
                        ${u.role?.includes("verified") ? `<img src="verified.svg" title="Verified" class="role-badge2 rol">` : ""}
                        ${u.role?.includes("first") ? `<img src="first.png" title="First User" class="role-badge2 rol">` : ""}
                    </span>
                </span>
                <span style="font-weight: bold; color: white;">${valueDisplay}</span>
            </li>`;
        }

        function renderLeaderboard(el, users, medals, valueLabel, valueKey, containerId) {
    if (!el) return;
    el.innerHTML = '';
    
    // Show top 3 by default
    const top3 = users.slice(0, 3);
    top3.forEach((user, index) => {
        el.innerHTML += generateRow(user, index, medals, valueLabel, valueKey);
    });

    // If there are more than 3 users, create the expandable section
    if (users.length > 3) {
        const moreContainer = document.createElement("div");
        moreContainer.id = containerId;
        moreContainer.className = "leaderboard-expand hidden"; // Starts hidden

        const restOfUsers = users.slice(3);
        restOfUsers.forEach((user, index) => {
            moreContainer.innerHTML += generateRow(user, index + 3, medals, valueLabel, valueKey);
        });
        el.appendChild(moreContainer);

        // Create the toggle button
        const button = document.createElement("button");
        button.className = "neumorphic-button";
        button.textContent = "Show More";
        button.style.cssText = 'width: 100%; margin-top: 10px; font-size: 12px; padding: 8px;';
        button.onclick = () => toggleMore(containerId); // This calls the toggle function
        el.appendChild(button);
    }
}
        // --- END OF HELPER FUNCTIONS ---

        renderLeaderboard(levelEl, topLevelsWithAvatars, levelMedals, "Lvl", "level", "moreLevel");
        renderLeaderboard(blitzEl, topBlitzWithAvatars, blitzMedals, "Score", "blitzScore", "moreBlitz");
        renderLeaderboard(quibblEl, topQuibblWithAvatars, quibblMedals, "Stars", "wins", "moreQuibbl");

    } catch (err) {
        console.error("Error loading leaderboards:", err);
        if (levelEl) levelEl.innerHTML = "<li>Error loading leaderboard</li>";
        if (blitzEl) blitzEl.innerHTML = "<li>Error loading leaderboard</li>";
        if (quibblEl) quibblEl.innerHTML = "<li>Error loading leaderboard</li>";
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
// leaderboard.js

// ▼▼▼ ADD THIS ENTIRE FUNCTION TO THE VERY END OF THE FILE ▼▼▼
function toggleMore(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const button = container.nextElementSibling; // The button is the next sibling after the container

    const isHidden = container.classList.contains("hidden");
    if (isHidden) {
        container.classList.remove("hidden");
        container.classList.remove("leaderboard-collapse");
        container.classList.add("leaderboard-expand");
        if (button) button.textContent = "Show Less";
    } else {
        container.classList.add("leaderboard-collapse");
        container.classList.remove("leaderboard-expand");
        // Wait for the collapse animation to finish before hiding
        setTimeout(() => container.classList.add("hidden"), 390);
        if (button) button.textContent = "Show More";
    }
}
