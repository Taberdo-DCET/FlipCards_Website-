// profile.js

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCndfcWksvEBhzJDiQmJj_zSRI6FSVNUC0",
  authDomain: "flipcards-7adab.firebaseapp.com",
  projectId: "flipcards-7adab",
  storageBucket: "flipcards-7adab.appspot.com",
  messagingSenderId: "836765717736",
  appId: "1:836765717736:web:ff749a40245798307b655d",
  measurementId: "G-M26MWQZBJ0"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

let currentUser = null;

firebase.auth().onAuthStateChanged(user => {
  currentUser = user;
});

document.addEventListener("DOMContentLoaded", () => {
  const profileBtn = document.querySelector(".music-icon.profile");
  const profileModal = document.getElementById("profileModal");
  const avatarInput = document.getElementById("avatarInput");
  const avatarPreview = document.getElementById("avatarPreview");
  const emailSpan = document.getElementById("userEmail");
  const logoutButton = document.querySelector(".neumorphic-button[href='index.html']")?.parentElement?.querySelector("button");

  profileBtn.addEventListener("click", () => {
    profileModal.classList.remove("hidden");
    if (currentUser) {
      emailSpan.textContent = currentUser.email;
    } else {
      emailSpan.textContent = "Not logged in";
    }
  });

  window.addEventListener("click", (e) => {
    if (e.target === profileModal) {
      profileModal.classList.add("hidden");
    }
  });

  avatarInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      const base64Image = e.target.result;
      avatarPreview.src = base64Image;
      localStorage.setItem("userAvatar", base64Image);
    };
    reader.readAsDataURL(file);
  });

  const savedAvatar = localStorage.getItem("userAvatar");
  if (savedAvatar) {
    avatarPreview.src = savedAvatar;
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", (e) => {
      e.preventDefault();
      firebase.auth().signOut().then(() => {
        sessionStorage.setItem("loggedOut", "true");
        window.location.href = "index.html";
      });
    });
  }
});
