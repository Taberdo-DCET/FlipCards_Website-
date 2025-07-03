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
  getDoc
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

// Firebase config (yours)
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

window.login = async function () {
  const email = document.querySelector('input[name="username"]').value;
  const password = document.querySelector('input[name="password"]').value;

  if (!email || !password) {
    alert("Please enter email and password.");
    return;
  }

  const userDocRef = doc(db, "approved_emails", email);
  const docSnap = await getDoc(userDocRef);

  if (!docSnap.exists() || docSnap.data().allowed !== true) {
    alert("This email is not whitelisted.");
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
    // ✅ Redirect to lobby.html on success
    window.location.href = "lobby.html";
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      try {
        await createUserWithEmailAndPassword(auth, email, password);
        // ✅ Redirect after successful account creation
        window.location.href = "lobby.html";
      } catch (createErr) {
        alert("Error creating account: " + createErr.message);
      }
    } else {
      alert("Login failed: " + error.message);
    }
  }
};
