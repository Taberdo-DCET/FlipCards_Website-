import { db } from './firebaseinit.js';
import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import {
  doc, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

// 🔢 XP cap per level: starts at 1200, +500 per level
function xpNeededForLevel(level) {
  return 1200 + (level - 1) * 500;
}

async function addXP(amount = 10) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return;

  const userRef = doc(db, "approved_emails", user.email);
  const docSnap = await getDoc(userRef);

  let currentXP = 0;
  let level = 1;

  if (docSnap.exists()) {
    const data = docSnap.data();
    currentXP = data.xp || 0;
    level = data.level || 1;
  }

  let newXP = currentXP + amount;
  let leveledUp = false;

  while (newXP >= xpNeededForLevel(level)) {
    newXP -= xpNeededForLevel(level);
    level++;
    leveledUp = true;
  }

  await setDoc(userRef, { xp: newXP, level }, { merge: true });

  // 🧩 Update profile modal UI if it's visible
  const levelText = document.getElementById("userLevelText");
  const xpText = document.getElementById("xpText");
  const xpFill = document.getElementById("xpFill");

  if (levelText && xpText && xpFill) {
    const maxXP = xpNeededForLevel(level);
    levelText.textContent = `Lvl ${level}`;
    xpText.textContent = `${newXP} / ${maxXP} XP`;
    xpFill.style.width = `${Math.min(100, (newXP / maxXP) * 100)}%`;

    // ✨ Floating XP label
    const msg = document.createElement("div");
    msg.textContent = `+${amount} XP!`;
    msg.style.cssText = `
      position: absolute;
      color: #ffcf00;
      font-size: 12px;
      top: -20px;
      left: 50%;
      transform: translateX(-50%);
      animation: fadeUp 1s ease-out forwards;
    `;
    xpFill.parentElement.appendChild(msg);
    setTimeout(() => msg.remove(), 1000);
  }

  if (leveledUp) {
    alert("🎉 Level Up!");
  }
}

// ⏱ XP for time spent: +rewardXP every intervalMinutes
function startTimedXP(intervalMinutes = 10, rewardXP = 45) {
  const intervalMs = intervalMinutes * 60 * 1000;

  setInterval(() => {
    if (typeof addXP === "function") {
      addXP(rewardXP);
      console.log(`⏱ +${rewardXP} XP for staying ${intervalMinutes} minutes.`);
    }
  }, intervalMs);
}

// 🌍 Global access
window.addXP = addXP;
window.addChatXP = () => addXP(5);
window.startTimedXP = startTimedXP;
