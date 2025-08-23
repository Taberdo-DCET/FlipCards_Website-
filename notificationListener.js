import { db, auth } from './firebaseinit.js';
import { collection, query, where, onSnapshot, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

let unsubscribe = null;

auth.onAuthStateChanged(user => {
    if (user) {
        listenForNotifications(user.email);
    } else if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
    }
});

function listenForNotifications(userEmail) {
    if (unsubscribe) unsubscribe(); // Prevent multiple listeners

    const q = query(
        collection(db, "notifications"),
        where("recipientEmail", "==", userEmail),
        where("status", "==", "unread")
    );

    unsubscribe = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
            if (change.type === "added") {
                const notification = { id: change.doc.id, ...change.doc.data() };

                // Use the existing custom alert function, which is now global
                if (window.showCustomAlert) {
                    window.showCustomAlert(notification.message, 'error'); // 'error' type for red styling
                } else {
                    alert(notification.message); // Fallback
                }

                // Delete the notification after showing it so it doesn't appear again
                const notifRef = doc(db, 'notifications', notification.id);
                await deleteDoc(notifRef);
            }
        });
    });
}