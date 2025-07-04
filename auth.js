// auth.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCndfcWksvEBhzJDiQmJj_zSRI6FSVNUC0",
  authDomain: "flipcards-7adab.firebaseapp.com",
  projectId: "flipcards-7adab",
  storageBucket: "flipcards-7adab.firebasestorage.app",
  messagingSenderId: "836765717736",
  appId: "1:836765717736:web:ff749a40245798307b655d",
  measurementId: "G-M26MWQZBJ0"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Generate or load device ID from localStorage
function getDeviceId() {
  let id = localStorage.getItem('deviceId');
  if (!id) {
    id = 'device-' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('deviceId', id);
  }
  return id;
}

window.login = async function () {
  const email = document.querySelector('input[name="username"]').value;
  const password = document.querySelector('input[name="password"]').value;

  if (!email || !password) {
    alert("Please enter email and password.");
    return;
  }

  const approvedRef = doc(db, "approved_emails", email);
  const approvedSnap = await getDoc(approvedRef);
  if (!approvedSnap.exists() || approvedSnap.data().allowed !== true) {
    alert("This email is not whitelisted.");
    return;
  }

  const deviceId = getDeviceId();
  const userDocRef = doc(db, "users", email);
  const userSnap = await getDoc(userDocRef);

  // BLOCK if user exists and device doesn't match
  if (userSnap.exists()) {
    const data = userSnap.data();
    if (data.deviceId && data.deviceId !== deviceId) {
      alert("This account is already active on another device.");
      return;
    }
  }

  // Try sign in or create user
  try {
    await signInWithEmailAndPassword(auth, email, password);
    // ✅ Update device info
    await setDoc(userDocRef, {
      deviceId: deviceId,
      lastLogin: serverTimestamp()
    }, { merge: true });

    window.location.href = "lobby.html";
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      try {
        await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(userDocRef, {
          deviceId: deviceId,
          lastLogin: serverTimestamp()
        });
        window.location.href = "lobby.html";
      } catch (err) {
        alert("Account creation failed: " + err.message);
      }
    } else {
      alert("Login failed: " + error.message);
    }
  }
};
