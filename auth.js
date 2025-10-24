// auth.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  increment
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

// --- (Firebase config remains the same) ---
const firebaseConfig = {
  apiKey: "AIzaSyCndfcWksvEBhzJDiQmJj_zSRI6FSVNUC0",
  authDomain: "flipcards-7adab.firebaseapp.com",
  projectId: "flipcards-7adab",
  storageBucket: "flipcards-7adab.firebasestorage.app",
  messagingSenderId: "836765717736",
  appId: "1:836765717736:web:ff749a40245798307b655d",
  measurementId: "G-M26MWQZBJ0",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- State variables to hold user details during signup ---
let tempEmail = "";
let tempPassword = "";
// --- NEW HELPER FUNCTION FOR CUSTOM ALERT ---
function showCustomAlert(title, message) {
    const modal = document.getElementById('customAlertModal');
    const titleEl = document.getElementById('customAlertTitle');
    const messageEl = document.getElementById('customAlertMessage');
    const closeBtn = document.getElementById('customAlertCloseBtn');

    titleEl.textContent = title;
    messageEl.innerHTML = message; // Use innerHTML to allow for bolding/breaks

    // Show the modal
    modal.classList.remove('hidden');
    modal.classList.add('visible');

    // Add a one-time event listener to the close button
    const closeHandler = () => {
        modal.classList.remove('visible');
        // Use a timeout to hide it after the animation
        setTimeout(() => modal.classList.add('hidden'), 300);
        closeBtn.removeEventListener('click', closeHandler);
    };
    closeBtn.addEventListener('click', closeHandler);
}
function showSuccessModal(message) {
    const successModal = document.getElementById('successModal');
    const messageEl = document.getElementById('successModalMessage');
    const proceedBtn = document.getElementById('proceedToLoginBtn');
    const loginModal = document.getElementById('loginModal'); // Get reference to login modal

    messageEl.textContent = message;

    // Show the success modal
    successModal.classList.remove('hidden');
    successModal.classList.add('visible');

    // Add a one-time event listener to the proceed button
    const proceedHandler = () => {
        // Close success modal
        successModal.classList.remove('visible');
        setTimeout(() => successModal.classList.add('hidden'), 300);

        // Open login modal
        loginModal.classList.add('visible');

        proceedBtn.removeEventListener('click', proceedHandler); // Clean up listener
    };
    proceedBtn.addEventListener('click', proceedHandler);
}
// --- EVENT LISTENERS ---
document.addEventListener("DOMContentLoaded", () => {
  const loginModal = document.getElementById('loginModal');
  const signupModal = document.getElementById('signupModal');
  const invitationModal = document.getElementById('invitationModal');

  document.getElementById("signupLink")?.addEventListener("click", (e) => {
    e.preventDefault();
    loginModal.classList.remove("visible");
    signupModal.classList.add("visible");
    document.getElementById("signupForm").reset(); // Clear the form
  });

  document.getElementById("cancelSignup")?.addEventListener("click", () => {
    signupModal.classList.remove("visible");
  });

  document.getElementById("submitInvitationCode")?.addEventListener("click", verifyCodeAndFinalizeAccount);

  document.getElementById("cancelInvitation")?.addEventListener("click", () => {
    invitationModal.classList.remove("visible");
  });
});

// --- NEW SIGNUP FLOW ---

// STEP 1: User submits their desired email/password.
window.handleSignupRequest = async function() {
  const email = document.getElementById("signupEmail").value;
  const password = document.getElementById("signupPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const errorP = document.getElementById("signupError");
  const createBtn = document.getElementById("createAccountBtn");
  errorP.textContent = "";

  // --- Validation ---
  if (!email || !password || !confirmPassword) {
    errorP.textContent = "Please fill in all fields."; return;
  }
  if (password !== confirmPassword) {
    errorP.textContent = "Passwords do not match."; return;
  }
  if (password.length < 6) {
    errorP.textContent = "Password must be at least 6 characters."; return;
  }

  createBtn.textContent = "Requesting...";
  createBtn.disabled = true;

  try {
    // Generate a unique code for this user
    const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Create a document in the 'NewUsers' collection with the email as the ID
    const newUserRef = doc(db, "NewUsers", email);
    await setDoc(newUserRef, {
        email: email,
        code: generatedCode, // This is the code you will give them
        requestedAt: serverTimestamp(),
        status: "pending"
    });

    // Store credentials for the next step
    tempEmail = email;
    tempPassword = password;
    
    // Success! Close the signup modal and show the invitation modal
    document.getElementById('signupModal').classList.remove('visible');
    document.getElementById('invitationModal').classList.add('visible');
    
    // For you, the admin, to see the code easily during testing
    //... inside handleSignupRequest
    // Use the new custom alert
    const alertMessage = `Your request for <strong>${email}</strong> has been received. Please follow the instructions below to get your activation code.`;
    showCustomAlert("Request Sent!", alertMessage);
//...

  } catch (error) {
    console.error("Error during account request:", error);
    errorP.textContent = "An error occurred. Please try again.";
  }

  createBtn.textContent = "Create Account";
  createBtn.disabled = false;
};


// STEP 2: User enters the code you gave them.
// STEP 2: User enters the code you gave them.
async function verifyCodeAndFinalizeAccount() {
    const enteredCode = document.getElementById('invitationCodeInput').value.trim();
    const referralCode = document.getElementById('referralCodeInput').value.trim(); // Get the referral code
    const errorP = document.getElementById('invitationError');
    const submitBtn = document.getElementById('submitInvitationCode');
    errorP.textContent = '';

    if (!enteredCode) {
        errorP.textContent = 'Please enter an invitation code.'; return;
    }
    if (!tempEmail || !tempPassword) {
        errorP.textContent = 'Session expired. Please start over.'; return;
    }

    submitBtn.textContent = "Verifying...";
    submitBtn.disabled = true;

    try {
        const newUserRef = doc(db, "NewUsers", tempEmail);
        const newUserSnap = await getDoc(newUserRef);

        if (newUserSnap.exists() && newUserSnap.data().code === enteredCode) {
            // --- CODE IS CORRECT ---
            
            // 1. Create the user in Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(auth, tempEmail, tempPassword);
            const user = userCredential.user;

            // --- [NEW] PROCESS REFERRAL CODE (if provided) ---
            if (referralCode) {
                const referralRef = doc(db, "Referral", "Paid");
                // Use dot notation to increment a field within the document
                const referralUpdate = {
                    [referralCode]: increment(1)
                };
                // setDoc with merge:true will create or update the field
                await setDoc(referralRef, referralUpdate, { merge: true });
            }
            // --- END OF NEW REFERRAL LOGIC ---

            // 2. Add them to the 'approved_emails' collection
            const approvedEmailRef = doc(db, "approved_emails", tempEmail);
            await setDoc(approvedEmailRef, {
                allowed: true,
                uid: user.uid,
                createdAt: serverTimestamp(),
                slots: 10,
                role: "prepper",
                maxPublicSets: 4,
                referredBy: referralCode || null // Optionally save who referred them
            });

            // 3. Create their main document in the 'users' collection
            const userDocRef = doc(db, "users", user.uid);
            await setDoc(userDocRef, {
                email: user.email,
                uid: user.uid,
                createdAt: serverTimestamp(),
                role: 'user'
            });

            // 4. Update the original request to mark it as completed
            await updateDoc(newUserRef, { status: "completed", uid: user.uid });

            showSuccessModal("You can now log in with your new credentials.");
            document.getElementById('invitationModal').classList.remove('visible');
            
            tempEmail = "";
            tempPassword = "";
            
        } else {
            errorP.textContent = 'The code you entered is incorrect.';
        }

    } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
            errorP.textContent = 'This email has already been registered.';
        } else {
            console.error("Final account creation error:", error);
            errorP.textContent = 'An error occurred. Please try again.';
        }
    }

    submitBtn.textContent = "Create Account";
    submitBtn.disabled = false;
}


// --- LOGIN FUNCTION ---
// (No changes needed here, it inherits the old whitelisting logic from your original file)
window.login = async function () {
  const loginBtn = document.getElementById("loginBtn");
  const email = document.querySelector('.login-modal-form input[name="username"]').value;
  const password = document.querySelector('.login-modal-form input[name="password"]').value;

  loginBtn.textContent = "Logging In...";
  loginBtn.disabled = true;

  try {
    const approvedRef = doc(db, "approved_emails", email);
    const approvedSnap = await getDoc(approvedRef);

    if (!approvedSnap.exists() || approvedSnap.data().allowed !== true) {
      alert("This account is not approved for access.");
      loginBtn.textContent = "Login";
      loginBtn.disabled = false;
      return;
    }

    await signInWithEmailAndPassword(auth, email, password);
    localStorage.removeItem("guestStartTime");
    localStorage.removeItem("guestBlocked");
    sessionStorage.setItem("justLoggedIn", "true");
    window.location.href = "lobby.html";

  } catch (error) {
    alert("Login failed: Incorrect email or password.");
    console.error("Login error:", error);
  } finally {
    if (loginBtn) {
        loginBtn.textContent = "Login";
        loginBtn.disabled = false;
    }
  }
};