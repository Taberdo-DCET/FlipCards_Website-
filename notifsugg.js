// notifsugg.js

import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { getFirestore, collection, query, where, onSnapshot, doc, updateDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { db } from "./firebaseinit.js";

const auth = getAuth();

// Function to display the notification toast
// In notifsugg.js

// Function to display the notification toast
function showNotificationToast(notificationData, docId) {
    // Find the toast element in lobby.html
    const toast = document.getElementById('suggestionNotificationToast');
    const messageEl = document.getElementById('suggestionNotificationMessage');

    if (!toast || !messageEl) {
        console.error("Notification toast elements not found in the DOM.");
        return;
    }

    // Populate the toast with the notification content
    messageEl.innerHTML = `<strong>${notificationData.title}</strong><br>${notificationData.message}`;
    
    // ▼▼▼ THIS IS THE FIX ▼▼▼
    // Remove the 'hidden' class to make the element visible before showing it
    toast.classList.remove('hidden');
    
    // Show the toast by triggering the animation
    toast.classList.add('show');

    // Handle the dismiss button click
    const dismissBtn = document.getElementById('dismissSuggestionNotificationBtn');
    
    const dismissHandler = async () => {
        toast.classList.remove('show'); // Hide the toast
        // Mark the notification as 'read' in Firestore so it doesn't show again
        const notifRef = doc(db, 'notifications', docId);
        await updateDoc(notifRef, { read: true });
        
        // Clean up the event listener
        dismissBtn.removeEventListener('click', dismissHandler);
    };
    dismissBtn.addEventListener('click', dismissHandler, { once: true });

    // Optional: Auto-hide the toast after some time

}


// Listen for authentication state changes
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is logged in, set up a listener for their notifications
        const notificationsCol = collection(db, 'notifications');
        const q = query(
            notificationsCol, 
            where('recipientEmail', '==', user.email),
            where('read', '==', false) // Only get unread notifications
        );

        // onSnapshot listens for real-time changes
        onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                // When a new notification is added, show it
                if (change.type === 'added') {
                    const notificationData = change.doc.data();
                    const docId = change.doc.id;
                    showNotificationToast(notificationData, docId);
                }
            });
        });

    } else {
        // User is logged out, no need to listen for notifications
        console.log("User is not logged in. No notification listener attached.");
    }
});