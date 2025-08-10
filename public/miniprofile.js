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
    <div class="avatar-wrapper" style="position: relative; display: inline-block; width: 50px; height: 50px;">
  <img id="miniProfileAvatar" src="Group-10.png" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%;">
</div>
<img id="goldBorderOverlay" src="goldborder.png" alt="Border" style="display: none; position: absolute; top: 0; left: 0; width: 50px; height: 50px; pointer-events: none;">
<img id="adminBorderOverlay" src="adminborder.png" alt="Admin Border" style="display: none; position: absolute; top: 0; left: 0; width: 50px; height: 50px; pointer-events: none;">
<img id="agaBorderOverlay" src="agacustomborder.png" alt="AGA Border" style="display: none; position: absolute; top: 0; left: 0; width: 50px; height: 50px; pointer-events: none;">
<img id="coadminBorderOverlay" src="coadminborder.png" alt="Coadmin Border" style="display: none; position: absolute; top: 0; left: 0; width: 50px; height: 50px; pointer-events: none;">
<img id="persBorderOverlay" src="firstplacedefi.png" alt="Pers Border" style="display: none; position: absolute; top: 0; left: 0; width: 50px; height: 50px; pointer-events: none;">
<img id="secondBorderOverlay" src="seconddefiborder.png" alt="Second Border" style="display: none; position: absolute; top: 0; left: 0; width: 50px; height: 50px; pointer-events: none;">
<img id="firstUserOverlay" src="firstuser.png" alt="First User Border" style="display: none; position: absolute; top: 0; left: 0; width: 50px; height: 50px; pointer-events: none;">

    <div class="mini-profile-info">

      <div class="username-level-wrapper">
        <span id="miniProfileUsername">Loading...</span>
        <img id="verifiedBadge" src="verified.svg" alt="verified" style="display:none; width:16px; height:16px;"/>
        <img id="firstBadge" src="first.png" alt="first" style="display:none; width:16px; height:16px;"/>
        <span id="miniProfileLevel" class="level-badge">Lvl 0</span>
        <span id="miniProfileLevelBadge"></span>
      </div>
      <span id="miniProfileEmail">Loading...</span>
    </div>
  `;
  document.body.appendChild(miniProfile);

  // Load from localStorage instantly
  const cachedProfile = JSON.parse(localStorage.getItem("miniProfileData") || "null");
  if (cachedProfile) {
    populateMiniProfile(cachedProfile);
  }

  // Firebase auth listener
 onAuthStateChanged(auth, async (user) => {
  if (!user) {
    localStorage.removeItem("miniProfileData");
    populateMiniProfile({
      email: "Not Logged In",
      username: "Guest",
      level: 0,
      verified: false,
      first: false,
      avatar: "Group-10.png"
    });
    return;
  }

  // If this is a guest (anonymous) account, show "Guest" immediately
  if (user.isAnonymous) {
    populateMiniProfile({
      email: "Guest",
      username: "Guest",
      level: 0,
      verified: false,
      first: false,
      avatar: "guestpic.png"
    });
    return;
  }

  // Otherwise, fetch their real profile data
  await fetchAndCacheUserData(user.email);
});

});

/**
 * Populate the mini profile UI
 */
function populateMiniProfile(data) {
  document.getElementById("miniProfileEmail").textContent = data.email || "Not Logged In";
  document.getElementById("miniProfileUsername").textContent = data.username || "Guest";
  document.getElementById("miniProfileLevel").textContent = `Lvl ${data.level || 0}`;
  document.getElementById("miniProfileAvatar").src = data.avatar || "Group-10.png";
  document.getElementById("verifiedBadge").style.display = data.verified ? "inline-block" : "none";
document.getElementById("firstBadge").style.display = data.first ? "inline-block" : "none";

document.getElementById("goldBorderOverlay").style.display = data.goldborder ? "block" : "none";
document.getElementById("adminBorderOverlay").style.display = data.adminborder ? "block" : "none";
document.getElementById("agaBorderOverlay").style.display = data.agaborder ? "block" : "none";
document.getElementById("coadminBorderOverlay").style.display = data.coadminborder ? "block" : "none";
document.getElementById("persBorderOverlay").style.display = data.persborder ? "block" : "none";
document.getElementById("secondBorderOverlay").style.display = data.secondborder ? "block" : "none";
document.getElementById("firstUserOverlay").style.display = data.firstuser ? "block" : "none";






  // Determine level badge
  let levelBadgeHTML = "";
  const level = data.level || 0;
if (level >= 0 && level <= 4) {
  levelBadgeHTML = `<img src="level0.png" alt="Level ${level}" class="role-badge" title="Level ${level}">`;
} else if (level >= 5 && level <= 14) {
  levelBadgeHTML = `<img src="level5.png" alt="Level ${level}" class="role-badge" title="Level ${level}>`;
}
else if (level >= 15 && level <= 24) {
  levelBadgeHTML = `<img src="level15.png" alt="Level ${level}" class="role-badge" title="Level ${level}">`;
} else if (level >= 25 && level <= 34) {
  levelBadgeHTML = `<img src="level25.png" alt="Level ${level}" class="role-badge" title="Level ${level}">`;
} else if (level >= 35 &&level <= 49) {
  levelBadgeHTML = `<img src="level35.png" alt="Level ${level}" class="role-badge" title="Level ${level}">`;
} else if (level >= 50 && level<= 64) {
  levelBadgeHTML = `<img src="level50.png" alt="Level ${level}" class="role-badge" title="Level ${level}">`;
}
 else if (level >= 65 && level <= 99) {
  levelBadgeHTML = `<img src="level65.png" alt="Level ${level}" class="role-badge" title="Level ${level}">`;
}
  document.getElementById("miniProfileLevelBadge").innerHTML = levelBadgeHTML;
}


/**
 * Fetch user data from Firestore and cache it
 */
async function fetchAndCacheUserData(email) {
  try {
    // Fetch username
    const usernameDoc = doc(db, "usernames", email);
    const usernameSnap = await getDoc(usernameDoc);
    const username = usernameSnap.exists() ? usernameSnap.data().username || "No Username" : "No Username";

    // Fetch roles and level
    const userDocRef = doc(db, "approved_emails", email);
    const userSnap = await getDoc(userDocRef);
    let level = 1, roles = "";
    if (userSnap.exists()) {
      const data = userSnap.data();
      level = data.level || 1;
      roles = (data.role || "").toLowerCase();
    }

    const verified = roles.includes("verified");
    
    const first = roles.includes("first");
    const goldborder = roles.includes("goldborder");
    const adminborder = roles.includes("admn");
const agaborder = roles.includes("aga");
const coadminborder = roles.includes("co");
const persborder = roles.includes("pers");
const secondborder = roles.includes("sec");
const firstuser = roles.includes("1st");


    // Fetch avatar
    let avatarUrl = "Group-10.png";
    try {
      const { getStorage, ref, getDownloadURL } = await import("https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js");
      const storage = getStorage(app);
      const avatarRef = ref(storage, `avatars/${email}`);
      avatarUrl = await getDownloadURL(avatarRef);
    } catch {
      console.warn("No avatar found, using default.");
    }

    const profileData = { email, username, level, verified, first, goldborder, adminborder, agaborder, coadminborder, persborder, secondborder, firstuser,avatar: avatarUrl };
    localStorage.setItem("miniProfileData", JSON.stringify(profileData));
    populateMiniProfile(profileData);
  } catch (error) {
    console.error("Failed to fetch user data:", error);
  }
}
