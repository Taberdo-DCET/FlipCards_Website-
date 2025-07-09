import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { getDatabase, ref, onDisconnect, update } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";

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
const auth = getAuth(app);
const rtdb = getDatabase(app);

onAuthStateChanged(auth, (user) => {
  if (!user) return;

  const statusRef = ref(rtdb, `/status/${user.uid}`);
  let inactiveTimer = null;

  // Update status to active
  function setActive() {
    update(statusRef, {
      online: true,
      lastActive: Date.now()
    });
  }

  // Update status to inactive
  function setInactive() {
    update(statusRef, {
      online: false,
      lastActive: Date.now()
    });
  }

  // Reset activity timer based on interaction
  function resetActivityTimer() {
    clearTimeout(inactiveTimer);

    setActive(); // Mark as online and update lastActive

    inactiveTimer = setTimeout(() => {
      setInactive(); // Set offline after 3 minutes of inactivity
    }, 3 * 60 * 1000);
  }

  // Monitor user interactions
  ['click', 'keydown', 'mousemove', 'touchstart'].forEach(event => {
    document.addEventListener(event, resetActivityTimer, { passive: true });
  });

  // Initial setup
  resetActivityTimer();

  // Handle unexpected disconnects
  onDisconnect(statusRef).set({
    online: false,
    lastActive: Date.now()
  });
});
