// profile-notifications.js

import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { getStorage, ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js";
import { app } from "./firebaseinit.js";

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const NOTIFICATION_DISMISS_KEY = 'profileNotificationDismissedUntil';
const TWELVE_HOURS = 12 * 60 * 60 * 1000;

async function checkProfileCompletion(user) {
    const notificationContainer = document.getElementById('profile-notification');
    const notificationMessage = document.getElementById('notification-message');
    if (!notificationContainer || !notificationMessage) return;

    // Check if notification is currently dismissed
    const dismissedUntil = localStorage.getItem(NOTIFICATION_DISMISS_KEY);
    if (dismissedUntil && new Date().getTime() < parseInt(dismissedUntil)) {
        notificationContainer.classList.add('hidden');
        return; // Don't show if dismissed
    }

    const missingItems = [];

    // 1. Check for username
    try {
        const usernameDocSnap = await getDoc(doc(db, "usernames", user.email));
        if (!usernameDocSnap.exists() || !usernameDocSnap.data().username) {
            missingItems.push("username");
        }
    } catch (error) {
        console.error("Error checking username:", error);
        missingItems.push("username");
    }

    // 2. Check for profile picture
    try {
        await getDownloadURL(ref(storage, `avatars/${user.email}`));
    } catch (error) {
        missingItems.push("profile picture");
    }

    if (missingItems.length > 0) {
        const message = `Please complete your profile: you're missing a ${missingItems.join(' and ')}.`;
        notificationMessage.textContent = message;
        // Use 'show' class to trigger animation
        notificationContainer.classList.remove('hidden');
        notificationContainer.classList.add('show');
    } else {
        notificationContainer.classList.add('hidden');
        notificationContainer.classList.remove('show');
    }
}

function handleDismissNotification() {
    const notificationContainer = document.getElementById('profile-notification');
    if (!notificationContainer) return;

    // Set dismissal time in localStorage
    const dismissalTime = new Date().getTime() + TWELVE_HOURS;
    localStorage.setItem(NOTIFICATION_DISMISS_KEY, dismissalTime.toString());

    // Trigger the dismissing animation
    notificationContainer.classList.remove('show');
    notificationContainer.classList.add('dismissing');

    // After the animation ends, hide it completely
    setTimeout(() => {
        notificationContainer.classList.add('hidden');
        notificationContainer.classList.remove('dismissing');
    }, 500); // Must match the animation duration in CSS
}

// Initial check when the page loads
onAuthStateChanged(auth, (user) => {
    const notificationContainer = document.getElementById('profile-notification');
    if (user) {
        checkProfileCompletion(user);
    } else {
        if (notificationContainer) {
            notificationContainer.classList.add('hidden');
            notificationContainer.classList.remove('show');
        }
    }
});

// Add click listener for the new dismiss button
document.addEventListener('DOMContentLoaded', () => {
    const dismissBtn = document.getElementById('dismiss-notification');
    if (dismissBtn) {
        dismissBtn.addEventListener('click', handleDismissNotification);
    }
});