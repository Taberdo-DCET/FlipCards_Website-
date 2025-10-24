import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { getFirestore, doc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js"; // <-- Added onSnapshot
import { app } from "./firebaseinit.js";

const auth = getAuth(app);
const db = getFirestore(app);
let referralCodeListenerUnsubscribe = null;

document.addEventListener("DOMContentLoaded", () => {
  // Create the referral code notification element
const referralNotification = document.createElement("div");
referralNotification.id = "referralNotification";
referralNotification.classList.add("referral-notification", "hidden"); // Start hidden
referralNotification.innerHTML = `
  <span>Set your unique Referral Code in your Profile Settings!</span>
`;
document.body.appendChild(referralNotification); // Add it to the page
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
        <img id="plusBadge" src="plass.png" alt="plus" title="FlipCards+" class="plus-badgemini" style="display:none; width:16px; height:16px;"/>
        <img id="verifiedBadge" src="verified.svg" alt="verified" style="display:none; width:16px; height:16px;"/>
        <img id="firstBadge" src="first.png" alt="first" style="display:none; width:16px; height:16px;"/>
        <span id="miniProfileLevel" class="level-badge">Lvl 0</span>
        <span id="miniProfileLevelBadge"></span>
      </div>
      <span id="miniProfileEmail">Loading...</span>
    </div>
    <button id="miniProfileToggle" class="mini-profile-toggle-btn" aria-label="Toggle profile">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
    </button>
  `;
  document.body.appendChild(miniProfile);
const toggleButton = document.getElementById('miniProfileToggle');

// Check localStorage for the saved state when the page loads
if (localStorage.getItem('miniProfileMinimized') === 'true') {
  miniProfile.classList.add('minimized');
}

// Add the click event listener to the button
toggleButton.addEventListener('click', () => {
    // Toggle the 'minimized' class on the profile element
    const isNowMinimized = miniProfile.classList.toggle('minimized');
    
    // Save the new state to localStorage
    localStorage.setItem('miniProfileMinimized', isNowMinimized);
});
  // Load from localStorage instantly
  const cachedProfile = JSON.parse(localStorage.getItem("miniProfileData") || "null");
  if (cachedProfile) {
    populateMiniProfile(cachedProfile);
  }

  // Firebase auth listener
 onAuthStateChanged(auth, async (user) => {
  if (referralCodeListenerUnsubscribe) {
    console.log("Detaching previous referral code listener."); // Debug log
    referralCodeListenerUnsubscribe(); // Call the unsubscribe function
    referralCodeListenerUnsubscribe = null; // Reset the variable
  }
  // Hide notification when logged out/guest
  const notificationElement = document.getElementById("referralNotification");
  if (notificationElement) notificationElement.classList.add("hidden");
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

  // ▼▼▼ ADD REAL-TIME LISTENER SETUP HERE ▼▼▼
  console.log(`Setting up referral code listener for ${user.email}`); // Debug log
  const referralChoiceDocRef = doc(db, "ReferralCodeChoice", user.email);
  

  // Attach the listener and store the unsubscribe function
  referralCodeListenerUnsubscribe = onSnapshot(referralChoiceDocRef, (docSnap) => {
    if (!auth.currentUser || auth.currentUser.isAnonymous) return; // Extra check

    if (docSnap.exists()) {
      // User HAS set a code
      console.log("Referral code document exists, hiding notification."); // Debug log
      if (notificationElement) notificationElement.classList.add("hidden");
    } else {
      // User has NOT set a code
      console.log("Referral code document does NOT exist, showing notification."); // Debug log
      if (notificationElement) notificationElement.classList.remove("hidden");
    }
  }, (error) => {
      console.error("Error listening to ReferralCodeChoice:", error);
      // Hide notification on listener error
      if (notificationElement) notificationElement.classList.add("hidden");
  });
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
   document.getElementById("plusBadge").style.display = data.plus ? "inline-block" : "none";
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
  levelBadgeHTML = `<img src="level5.png" alt="Level ${level}" class="role-badge" title="Level ${level}">`;
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
 else if (level >= 65 && level <= 84) {
  levelBadgeHTML = `<img src="level65.png" alt="Level ${level}" class="role-badge" title="Level ${level}">`;
}else if (level >= 85 && level <= 99) {
  levelBadgeHTML = `<img src="level85.png" alt="Level ${level}" class="role-badge" title="Level ${level}">`;
}else if (level >= 100 && level <= 120) {
  levelBadgeHTML = `<img src="level100.png" alt="Level ${level}" class="role-badge" title="Level ${level}">`;
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

    // Fetch roles, level, and referral code
    const userDocRef = doc(db, "approved_emails", email);
    const userSnap = await getDoc(userDocRef);
    let level = 1, roles = "", referralCode = null; // <-- Initialize referralCode
    if (userSnap.exists()) {
      const data = userSnap.data();
      level = data.level || 1;
      roles = (data.role || "").toLowerCase();
    }

    // Role checks
    const verified = roles.includes("verified");
    const plus = roles.includes("plus");
    const first = roles.includes("first");
    const goldborder = roles.includes("goldborder");
    const adminborder = roles.includes("admn");
    const agaborder = roles.includes("aga");
    const coadminborder = roles.includes("co");
    const persborder = roles.includes("pers");
    const secondborder = roles.includes("sec");
    const firstuser = roles.includes("1st");


    // Fetch avatar
    let avatarUrl = "Group-10.png"; // Default avatar
    try {
      // Dynamically import storage functions only when needed
      const { getStorage, ref, getDownloadURL } = await import("https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js");
      const storage = getStorage(app);
      const avatarRef = ref(storage, `avatars/${email}`);
      avatarUrl = await getDownloadURL(avatarRef);
    } catch {
      console.warn("No avatar found for user, using default.");
    }

    // Construct profile data object including all roles
    const profileData = {
        email,
        username,
        level,
        plus,
        verified,
        first,
        goldborder,
        adminborder,
        agaborder,
        coadminborder,
        persborder,
        secondborder,
        firstuser,
        avatar: avatarUrl
    };

    // Cache data and update UI
    localStorage.setItem("miniProfileData", JSON.stringify(profileData));
    populateMiniProfile(profileData);

  } catch (error) {
    console.error("Failed to fetch user data:", error);
    // Hide notification on error as well
    document.getElementById("referralNotification")?.classList.add("hidden");
  }
}
