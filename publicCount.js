import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  query,
  where,
  doc as firestoreDoc
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";

const firebaseConfig = {
  apiKey: "AIzaSyCndfcWksvEBhzJDiQmJj_zSRI6FSVNUC0",
  authDomain: "flipcards-7adab.firebaseapp.com",
  projectId: "flipcards-7adab",
  storageBucket: "flipcards-7adab.firebasestorage.app",
  messagingSenderId: "836765717736",
  appId: "1:836765717736:web:ff749a40245798307b655d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const usageSpan = document.getElementById("publicUsage");

onAuthStateChanged(auth, async (user) => {
  if (!user || !usageSpan) return;

  let max = 2;
  try {
    const approvalSnap = await getDoc(firestoreDoc(db, "approved_emails", user.email));
    if (approvalSnap.exists()) {
      const data = approvalSnap.data();
      if (typeof data.maxPublicSets === "number") {
        max = data.maxPublicSets;
      }
    }
  } catch (err) {
    console.warn("No approval record or error fetching max:", err);
  }

  try {
    const q = query(
      collection(db, "flashcard_sets"),
      where("user", "==", user.email),
      where("public", "==", true)
    );
    const snapshot = await getDocs(q);
    const count = snapshot.size;

    usageSpan.textContent = `Public Sets: ${count} / ${max} used`;
    usageSpan.style.color = count >= max ? "#ff4d4d" : "#bbbbbb";
  } catch (err) {
    console.error("Failed to load public set count:", err);
  }
});
