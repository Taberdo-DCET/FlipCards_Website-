import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { app } from './firebaseinit.js';

const auth = getAuth(app);

document.getElementById("guestLoginBtn").addEventListener("click", () => {
  const blocked = localStorage.getItem('guestBlocked');
  if (blocked === 'true') {
    showGuestModal("⛔ Guest access is no longer available. Contact us to avail a slot.");
    return;
  }

  // ✅ Only set start time if it doesn’t exist
  if (!localStorage.getItem('guestStartTime')) {
    localStorage.setItem('guestStartTime', Date.now());
  }

  localStorage.setItem('guestBlocked', 'false');

  signInAnonymously(auth)
    .then((userCredential) => {
      const user = userCredential.user;
      console.log("Signed in anonymously as:", user.uid);
      window.location.href = "lobby.html";
    })
    .catch((error) => {
      console.error("Anonymous sign-in failed:", error.message);
    });
});
