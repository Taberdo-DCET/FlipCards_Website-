import { db, auth } from './firebaseinit.js';
// Import all the necessary v9 functions from the Firestore SDK
import {
  collection, query, where, onSnapshot, doc, getDoc, updateDoc, setDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

let unsubscribe = null;

auth.onAuthStateChanged(user => {
    // --- DEBUG LOG 1 ---
    console.log('[Invitation Listener] Auth state changed. User:', user ? user.email : 'No user');
    if (user) {
        listenForInvitations(user.email);
    } else {
        if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
        }
    }
});

function listenForInvitations(userEmail) {
    if (unsubscribe) unsubscribe();

    // --- DEBUG LOG 2 ---
    console.log(`[Invitation Listener] Setting up listener for invitations sent to: ${userEmail}`);

    const invitationsRef = collection(db, "invclass");
    const q = query(
        invitationsRef,
        where("recipientEmail", "==", userEmail),
        where("status", "==", "pending")
    );

    unsubscribe = onSnapshot(q, (snapshot) => {
        // --- DEBUG LOG 3 ---
        console.log(`[Invitation Listener] Snapshot received. Size: ${snapshot.size}. Metadata has pending writes: ${snapshot.metadata.hasPendingWrites}`);

        if (snapshot.empty) {
            console.log('[Invitation Listener] Query is empty. No pending invitations found.');
        }

        snapshot.docChanges().forEach((change) => {
            // --- DEBUG LOG 4 ---
            console.log(`[Invitation Listener] A document change was detected. Type: "${change.type}"`);

            if (change.type === "added") {
                const invitation = { id: change.doc.id, ...change.doc.data() };
                // --- DEBUG LOG 5 ---
                console.log('[Invitation Listener] New invitation found! Data:', invitation);
                showInvitationToast(invitation);
            }
        });
    }, (error) => {
        // --- DEBUG LOG for ERRORS ---
        console.error('[Invitation Listener] CRITICAL ERROR in onSnapshot listener:', error);
    });
}

async function showInvitationToast(invitation) {
    // --- DEBUG LOG 6 ---
    console.log('[Invitation Listener] showInvitationToast() function called for invitation ID:', invitation.id);

    const toast = document.getElementById('invitationToast');
    const messageEl = document.getElementById('invitationMessage');
    const acceptBtn = document.getElementById('acceptInviteBtn');
    const declineBtn = document.getElementById('declineInviteBtn');

    let senderName = invitation.senderEmail;
    try {
        const usernameDocRef = doc(db, 'usernames', invitation.senderEmail);
        const usernameDocSnap = await getDoc(usernameDocRef);
        if (usernameDocSnap.exists() && usernameDocSnap.data().username) {
            senderName = usernameDocSnap.data().username;
        }
    } catch (e) { console.error(e); }

    messageEl.textContent = `${senderName} has invited you to join the class "${invitation.className}"`;
    toast.classList.remove('hidden'); // First, make the element visible
toast.classList.add('show');      // Then, trigger the slide-in animation

    acceptBtn.onclick = async () => {
        await handleInvite(invitation, 'accepted');
        toast.classList.remove('show');
    };

    declineBtn.onclick = async () => {
        await handleInvite(invitation, 'declined');
        toast.classList.remove('show');
    };
}

async function handleInvite(invitation, newStatus) {
  const user = auth.currentUser;
  if (!user) return;

  // Update the invitation's status to 'accepted' or 'declined'
  const invRef = doc(db, 'invclass', invitation.id);
  await updateDoc(invRef, { status: newStatus });

  if (newStatus === 'accepted') {
    // Add the user to the class's members subcollection
    const memberRef = doc(db, 'Class', invitation.creatorEmail, 'userClasses', invitation.classId, 'members', user.email);
    await setDoc(memberRef, {
        joinedAt: new Date()
    });

    // Show the success alert
    showCustomAlert(`Successfully joined "${invitation.className}"!`, 'success');

    // Dispatch an event to tell the other script to refresh the dropdown
    document.dispatchEvent(new CustomEvent('class-joined'));
  }
}