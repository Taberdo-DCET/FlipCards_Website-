import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";

const auth = getAuth();

const guestStart = parseInt(localStorage.getItem("guestStartTime") || "0");
const guestBlocked = localStorage.getItem("guestBlocked") === "true";
const timeSince = Date.now() - guestStart;

// ⏳ Block if time has already passed
if (guestStart > 0 && timeSince > (5 * 24 * 60 * 60 * 1000) && !guestBlocked) {
  localStorage.setItem("guestBlocked", "true");
}

// ⛔ Redirect blocked guests away from other pages
if (guestBlocked && !location.pathname.endsWith('index.html')) {
  location.href = 'index.html';
}

// 🔁 Monitor auth state
onAuthStateChanged(auth, (user) => {
  const wasGuest = sessionStorage.getItem("wasGuest") === "true";

  // 🟥 Guest just signed out
  if (!user && wasGuest) {
    localStorage.setItem("guestBlocked", "true");
    sessionStorage.removeItem("wasGuest");
    return;
  }

  // 🟩 Guest is signed in
  if (user?.isAnonymous) {
    sessionStorage.setItem("wasGuest", "true");

    const guestStart = parseInt(localStorage.getItem("guestStartTime") || "0");
    const isBlocked = localStorage.getItem("guestBlocked") === "true";

    if (isBlocked) {
      showGuestModal("⏱️ Your guest session has expired. Contact us to avail a slot.", true);
      auth.signOut();
      return;
    }

    const timerElement = createTimerBox();

    function updateCountdown() {
      const now = Date.now();
      const secondsLeft = Math.max(0, (5 * 24 * 60 * 60) - Math.floor((now - guestStart) / 1000));
      const days = Math.floor(secondsLeft / (60 * 60 * 24));
let remainingSeconds = secondsLeft % (60 * 60 * 24);
const hours = String(Math.floor(remainingSeconds / (60 * 60))).padStart(2, '0');
remainingSeconds %= (60 * 60);
const minutes = String(Math.floor(remainingSeconds / 60)).padStart(2, '0');
const seconds = String(remainingSeconds % 60).padStart(2, '0');

timerElement.querySelector("span").textContent = `⏳ ${days}d ${hours}:${minutes}:${seconds}`;

      if (secondsLeft <= 0) {
        localStorage.setItem("guestBlocked", "true");
        showGuestModal("⏱️ Your guest session has expired. Contact us to avail a slot.", true);
        auth.signOut();
      }
    }

    updateCountdown();
    setInterval(updateCountdown, 1000);
  }

  // 🟦 Logged-in normal user
  if (user && !user.isAnonymous) {
    localStorage.removeItem("guestBlocked");
    sessionStorage.removeItem("wasGuest");
  }

  // 🟨 Show timer even on login page after guest logs out
  if (!user && location.pathname.endsWith("index.html") && guestStart > 0 && !guestBlocked) {
    const timerElement = createTimerBox();

    function updateCountdown() {
    const now = Date.now();
    // --- CORRECT CALCULATION AND DISPLAY BELOW ---
    const secondsLeft = Math.max(0, (5 * 24 * 60 * 60) - Math.floor((now - guestStart) / 1000)); // Use 5 days
    const days = Math.floor(secondsLeft / (60 * 60 * 24));
    let remainingSeconds = secondsLeft % (60 * 60 * 24);
    const hours = String(Math.floor(remainingSeconds / (60 * 60))).padStart(2, '0');
    remainingSeconds %= (60 * 60);
    const minutes = String(Math.floor(remainingSeconds / 60)).padStart(2, '0');
    const seconds = String(remainingSeconds % 60).padStart(2, '0');
    timerElement.querySelector("span").textContent = `⏳ ${days}d ${hours}:${minutes}:${seconds}`; // Use new format
    // --- END CORRECT PART ---

    if (secondsLeft <= 0) {
        localStorage.setItem("guestBlocked", "true");
        showGuestModal("⏱️ Your guest session has expired. Contact us to avail a slot.", true);
        // No auth.signOut() needed here as user is already signed out
    }
}

    updateCountdown();
    setInterval(updateCountdown, 1000);
  }
});

// ✅ Create and inject timer box
function createTimerBox() {
  let timer = document.getElementById("guestCountdownBox");
  if (!timer) {
    timer = document.createElement("div");
    timer.id = "guestCountdownBox";
    timer.style.position = "fixed";
    timer.style.bottom = "20px";
    timer.style.right = "20px";
    timer.style.padding = "10px 18px";
    timer.style.borderRadius = "12px";
    timer.style.background = "#171717";
    timer.style.color = "#fff";
    timer.style.fontFamily = "QilkaBold, sans-serif";
    timer.style.fontSize = "16px";
    timer.style.boxShadow = "inset 4px 4px 8px #0f0f0f, inset -4px -4px 8px #1f1f1f";
    timer.style.border = "1px solid #2c2c2c";
    timer.style.zIndex = "2000";
    timer.style.userSelect = "none";
    timer.style.cursor = "default";

    const label = document.createElement("span");
    label.textContent = "⏳ 5d 00:00:00";
    label.style.background = "transparent";
    label.style.color = "white";
    timer.appendChild(label);

    const tooltip = document.createElement("div");
    tooltip.textContent = "Free trial session timer (5 days)";
    tooltip.style.position = "absolute";
    tooltip.style.bottom = "130%";
    tooltip.style.right = "0";
    tooltip.style.background = "#2a2a2a";
    tooltip.style.color = "#fff";
    tooltip.style.padding = "6px 10px";
    tooltip.style.borderRadius = "8px";
    tooltip.style.fontSize = "13px";
    tooltip.style.whiteSpace = "nowrap";
    tooltip.style.boxShadow = "0 2px 6px rgba(0,0,0,0.4)";
    tooltip.style.opacity = "0";
    tooltip.style.transition = "opacity 0.2s ease";
    tooltip.style.pointerEvents = "none";

    timer.appendChild(tooltip);

    timer.addEventListener("mouseenter", () => {
      tooltip.style.opacity = "1";
    });
    timer.addEventListener("mouseleave", () => {
      tooltip.style.opacity = "0";
    });

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        document.body.appendChild(timer);
      });
    } else {
      document.body.appendChild(timer);
    }
  }
  return timer;
}

// ✅ Modal for expired sessions

