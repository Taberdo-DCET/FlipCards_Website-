import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { app } from "./firebaseinit.js";

const auth = getAuth(app);
const db = getFirestore(app);

document.addEventListener("DOMContentLoaded", () => {
  // Create the mini profile modal
  const miniProfile = document.createElement("div");
  miniProfile.id = "miniProfile";
  miniProfile.innerHTML = `
    <img id="miniProfileAvatar" src="Group-10.png" alt="Avatar">
    <div class="mini-profile-info">
      <div class="username-level-wrapper">
        <span id="miniProfileUsername">Loading...</span>
        <img id="verifiedBadge" src="verified.png" alt="verified" style="display:none; width:16px; height:16px;"/>
        <img id="firstBadge" src="first.png" alt="first" style="display:none; width:16px; height:16px;"/>
        <span id="miniProfileLevel" class="level-badge">Lvl 0</span>
      </div>
      <span id="miniProfileEmail">Loading...</span>
    </div>
  `;
  document.body.appendChild(miniProfile);

  // Slide-in animation
  miniProfile.style.animation = "slideInFromLeft 0.5s ease-out forwards";

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      const email = user.email;
      document.getElementById("miniProfileEmail").textContent = email;

      // Fetch username
      const usernameDoc = doc(db, "usernames", email);
      const usernameSnap = await getDoc(usernameDoc);
      document.getElementById("miniProfileUsername").textContent =
        usernameSnap.exists() ? usernameSnap.data().username || "No Username" : "No Username";

      // Fetch roles and level
      try {
        const userDocRef = doc(db, "approved_emails", email);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          document.getElementById("miniProfileLevel").textContent = `Lvl ${data.level || 1}`;

          const roles = (data.role || "").toLowerCase();

          // Show verified badge if role includes "verified"
          if (roles.includes("verified")) {
            document.getElementById("verifiedBadge").style.display = "inline-block";
          }

          // Show first badge if role includes "first"
          if (roles.includes("first")) {
            document.getElementById("firstBadge").style.display = "inline-block";
          }
        }
      } catch (e) {
        console.warn("User data not found:", e);
      }

      // Fetch avatar
      try {
        const { getStorage, ref, getDownloadURL } = await import("https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js");
        const storage = getStorage(app);
        const avatarRef = ref(storage, `avatars/${email}`);
        const avatarUrl = await getDownloadURL(avatarRef);
        document.getElementById("miniProfileAvatar").src = avatarUrl;
      } catch (e) {
        console.warn("No avatar found, using default.");
      }
    } else {
      document.getElementById("miniProfileUsername").textContent = "Guest";
      document.getElementById("miniProfileEmail").textContent = "Not Logged In";
      document.getElementById("miniProfileLevel").textContent = "Lvl 0";
    }
  });
});
