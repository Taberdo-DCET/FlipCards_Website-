import { getFirestore, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";

const db = getFirestore();
const auth = getAuth();

export function checkUserStatus() {
  onAuthStateChanged(auth, async user => {
    if (!user) return;

    try {
      const userDocRef = doc(db, "users", user.email);

      // ✅ Listen to changes in real-time
      onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const now = new Date();
          const suspendUntil = data.suspendUntil?.toDate?.();

          if (suspendUntil && suspendUntil > now) {
            window.location.href = "/suspended.html";
          }
        }
      });
    } catch (err) {
      console.error("Error listening to user status:", err);
    }
  });
}
