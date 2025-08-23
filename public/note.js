
// note.js — Firestore-backed Notes with local fallback + auto-numbered docs
// Structure: notepad/{email}/notes/{number}
// ----- Custom Alert Function -----
function showCustomAlert(message, type = 'info') { // type can be 'success' or 'error'
  const modal = document.getElementById('customAlertModal');
  const content = modal.querySelector('.custom-alert-content');
  const msgEl = document.getElementById('customAlertMessage');
  const okBtn = document.getElementById('customAlertOkBtn');

  if (!modal || !msgEl || !okBtn) {
    console.error("Custom alert elements not found!");
    alert(message); // Fallback to default alert
    return;
  }

  msgEl.textContent = message;

  // Reset classes and add the new one for styling
  content.classList.remove('success', 'error');
  if (type === 'success' || type === 'error') {
    content.classList.add(type);
  }

  modal.classList.remove('hidden');

  // Focus the OK button for accessibility
  okBtn.focus();

  // Use a one-time listener for the OK button to close the modal
  okBtn.onclick = () => {
    modal.classList.add('hidden');
    okBtn.onclick = null; // Clean up the listener
  };
}
// ▼▼▼ ADD THIS NEW FUNCTION ▼▼▼
function showCustomConfirm(message) {
  return new Promise(resolve => {
    const modal = document.getElementById('customConfirmModal');
    const content = modal.querySelector('.custom-alert-content');
    const msgEl = document.getElementById('confirmMessage');
    const confirmBtn = document.getElementById('confirmBtn');
    const cancelBtn = document.getElementById('cancelBtn');

    if (!modal || !msgEl || !confirmBtn || !cancelBtn) {
      resolve(window.confirm(message)); // Fallback to default confirm
      return;
    }

    msgEl.textContent = message;

    // Add error class for red top border styling
    content.classList.add('error');
    modal.classList.remove('hidden');

    // Use one-time listeners
    confirmBtn.onclick = () => {
      modal.classList.add('hidden');
      resolve(true); // User confirmed
    };
    cancelBtn.onclick = () => {
      modal.classList.add('hidden');
      resolve(false); // User canceled
    };
  });
}
// ▲▲▲ END OF NEW FUNCTION ▲▲▲
window.showCustomAlert = showCustomAlert; // Make it globally accessible
(function () {
  // ----- Your Firebase config -----
  const firebaseConfig = {
    apiKey: "AIzaSyCndfcWksvEBhzJDiQmJj_zSRI6FSVNUC0",
    authDomain: "flipcards-7adab.firebaseapp.com",
    databaseURL: "https://flipcards-7adab-default-rtdb.firebaseio.com",
    projectId: "flipcards-7adab",
    storageBucket: "flipcards-7adab.firebasestorage.app",
    messagingSenderId: "836765717736",
    appId: "1:836765717736:web:ff749a40245798307b655d",
    measurementId: "G-M26MWQZBJ0"
  };

  // ----- DOM refs -----
  const openBtn = document.querySelector('.music-icon.notes'); // trigger you already have
  const backdrop = document.getElementById('noteBackdrop');
  const closeBtn = document.getElementById('noteCloseBtn');
  const addBtn = document.getElementById('noteAddBtn');
  const searchInput = document.getElementById('noteSearch');
  const list = document.getElementById('noteList');
  const noteModal = document.getElementById('noteModal');

// Create the new view for class info and append it to the modal
// ▼▼▼ REPLACE THE OLD classInfoView CREATION CODE WITH THIS ▼▼▼
// in note.js

// ▼▼▼ REPLACE THE OLD classInfoView CREATION CODE WITH THIS ▼▼▼
const classInfoView = document.createElement('div');
classInfoView.id = 'classInfoView';
classInfoView.className = 'class-info-view hidden'; // Start hidden
// REPLACE the innerHTML with this updated version
// REPLACE the entire innerHTML string with this corrected version
// in note.js

// REPLACE the innerHTML with this updated version
classInfoView.innerHTML = `
  <nav id="classInfoSidenav" class="class-info-sidenav">
    <div class="sidenav-photo-container">
      <img id="classInfoSidenavPhoto" src="" alt="Class Photo">
      <button id="classConfigureBtn">Configure</button>
    </div>

    <div class="sidenav-collapsed-actions">
      <button id="announcementBtnIcon" class="sidenav-icon-btn announce" title="Make Announcement"><img src="announce.png" alt="Announce"></button>
      <button id="classLogsBtnIcon" class="sidenav-icon-btn" title="Class Logs">
  <img src="logsclass.png" alt="Logs">
  <span class="notification-dot hidden"></span>
</button>
      <button id="classActionBtnIcon" class="sidenav-icon-btn action-btn" title="Leave/Delete Class"></button>
    </div>

    <div class="sidenav-content">
      <h6>Class Members</h6>
      <button id="inviteMembersBtn" class="invite-btn">+ Invite</button>
      <ul id="classInfoMemberList"></ul>
      <div class="sidenav-footer-actions">
        <button id="announcementBtnFull" class="class-action-btn announce">Make Announcement</button>
        <button id="classLogsBtnFull" class="class-action-btn logs">Class Logs<span class="notification-dot hidden"></span></button>
        <button id="classActionBtnFull" class="class-action-btn">Action</button>
      </div>
    </div>
  </nav>

  <main id="classInfoMain" class="class-info-main">
    <div id="classInfoBodyPanel">
        <div class="class-main-header">
            <h2 id="classInfoName"></h2>
            <p id="classInfoSection"></p>
        </div>
        <div class="class-main-body">
            <h4>Description</h4>
            <p id="classInfoDescription"></p>
            <br/>
            <h4>Flashcard Sets</h4>
            <p><i>(Flashcard sets for this class will be shown here... Coming Soon~)</i></p>
        </div>
    </div>
    <div id="classSharedNotesPanel" class="hidden">
        <div id="classNoteList" class="class-note-list"></div>
    </div>

    <div id="classAnnouncementsPanel" class="hidden">
      </div>
    </main>

  <nav class="class-info-right-nav">
    <button id="viewInfoBtn" class="right-nav-btn active" title="Class Info"><img src="classpage.png" alt="Class Info Icon"></button>
    <button id="viewNotesBtn" class="right-nav-btn" title="Class Shared Notes"><img src="notepage.png" alt="Shared Notes Icon"></button>
    <button id="viewAnnouncementsBtn" class="right-nav-btn" title="Announcements"><img src="announcementsclass.png" alt="Announcements Icon"></button>
  </nav>
`;
list.parentNode.insertBefore(classInfoView, list.nextSibling);
// ▲▲▲ END OF REPLACEMENT ▲▲▲

// Add click listener to the photo to toggle the sidenav
const sidenav = document.getElementById('classInfoSidenav');
const sidenavPhoto = document.getElementById('classInfoSidenavPhoto');
if (sidenav && sidenavPhoto) {
  sidenavPhoto.addEventListener('click', () => {
    sidenav.classList.toggle('sidenav-expanded');
  });
}
// ▲▲▲ END OF REPLACEMENT ▲▲▲
const noteTitle = document.getElementById('noteTitle');

// Create and add the "Create Class +" button
// ▼▼▼ REPLACE THE OLD "Create Class +" BUTTON CODE WITH THIS ▼▼▼

// Create and add the "Create Class +" button
if (noteTitle) {
  // ▼▼▼ PASTE THE NEW DROPDOWN CODE HERE ▼▼▼
  const dropdownContainer = document.createElement('div');
  dropdownContainer.className = 'class-dropdown';

  const dropdownBtn = document.createElement('button');
  dropdownBtn.id = 'classDropdownBtn';
  dropdownBtn.textContent = 'My Notes ▼';

  const dropdownContent = document.createElement('div');
  dropdownContent.id = 'classDropdownContent';

  dropdownContainer.appendChild(dropdownBtn);
  dropdownContainer.appendChild(dropdownContent);

  // Insert dropdown before the "Create Class" button
  noteTitle.parentNode.insertBefore(dropdownContainer, noteTitle.nextSibling);

  // Dropdown toggle logic
  dropdownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownContent.classList.toggle('show');
  });

  // Close dropdown when clicking elsewhere
  window.addEventListener('click', (e) => {
    if (!dropdownContainer.contains(e.target)) {
      dropdownContent.classList.remove('show');
    }
  });
// ▼▼▼ REPLACE THE OLD displayClassInfo FUNCTION WITH THIS ▼▼▼


// --- New Action Functions ---

async function handleDeleteClass(creatorEmail, classId, className) {
  const confirmed = await showCustomConfirm('Are you sure you want to permanently delete this class? This will notify all members and cannot be undone.');
  if (!confirmed) return;

  try {
    const membersRef = db.collection('Class').doc(creatorEmail).collection('userClasses').doc(classId).collection('members');
    const membersSnapshot = await membersRef.get();
    const memberEmails = membersSnapshot.docs.map(doc => doc.id);

    // 1. Create a notification for each member (in parallel)
    const notificationPromises = memberEmails.map(email => {
      if (email === creatorEmail) return Promise.resolve(); // Don't notify the creator
      return db.collection('notifications').add({
        recipientEmail: email,
        message: `The class "${className}" has been deleted by the creator.`,
        status: 'unread',
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
    });
    await Promise.all(notificationPromises);

    // 2. Delete each member document from the subcollection (in parallel)
    const deleteMemberPromises = memberEmails.map(email => membersRef.doc(email).delete());
    await Promise.all(deleteMemberPromises);

    // 3. Finally, delete the main class document
    await db.collection('Class').doc(creatorEmail).collection('userClasses').doc(classId).delete();

    showCustomAlert('Class and all members successfully deleted.', 'success');

    // Reset view to "My Notes" and refresh dropdown
    document.querySelector('#classDropdownContent button').click();
    await populateClassDropdown();

  } catch (error) {
    console.error('Error deleting class:', error);
    showCustomAlert('Failed to delete class.', 'error');
  }
}

async function handleLeaveClass(creatorEmail, classId, userEmail) {
  const confirmed = await showCustomConfirm('Are you sure you want to leave this class?');
  if (!confirmed) return;

  try {
    await db.collection('Class').doc(creatorEmail).collection('userClasses').doc(classId).collection('members').doc(userEmail).delete();

    const invQuery = await db.collection('invclass')
      .where('recipientEmail', '==', userEmail)
      .where('classId', '==', classId)
      .limit(1).get();

    if (!invQuery.empty) {
      await invQuery.docs[0].ref.update({ status: 'declined' });
    }

    showCustomAlert('You have left the class.', 'success');

    document.querySelector('#classDropdownContent button').click();
    await populateClassDropdown();
  } catch (error) {
    console.error('Error leaving class:', error);
    showCustomAlert('Failed to leave the class.', 'error');
  }
}

// --- New Action Functions ---


  // Function to fetch and show user's classes
  // ▼▼▼ REPLACE THE OLD populateClassDropdown FUNCTION WITH THIS ▼▼▼

// ▲▲▲ END OF REPLACEMENT ▲▲▲

  // Populate dropdown when the main modal opens
 
  // ▲▲▲ END OF NEW DROPDOWN CODE ▲▲▲

  const createClassBtn = document.createElement('button');
  createClassBtn.textContent = 'Create Class +';
  createClassBtn.id = 'createClassBtn';
  createClassBtn.style.cssText = `
    padding: 8px 14px;
    font-family: 'Satoshi', sans-serif;
    font-size: 14px;
    font-weight: 600;
    color: #111;
    background: #fff;
    border: 1px solid #000;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
  `;
  noteTitle.insertAdjacentElement('afterend', createClassBtn);
// ▼▼▼ ADD THIS EVENT LISTENER ▼▼▼
createClassBtn.addEventListener('click', () => {
  // First, ensure the modal is reset to its "create" state
  closeAndResetCreateModal();
  // Then, show the modal
  document.getElementById('createClassBackdrop').classList.remove('hidden');
});
// ▲▲▲ END OF NEW EVENT LISTENER ▲▲▲



}
// ▼▼▼ PASTE THIS ENTIRE BLOCK OF NEW FUNCTIONS HERE ▼▼▼

// --- Real-time Listener Management ---
function detachMemberListener() {
  if (memberListenerUnsubscribe) {
    console.log('[Real-time] Detaching member listener.');
    memberListenerUnsubscribe();
    memberListenerUnsubscribe = null;
  }
}

function detachDropdownListeners() {
  if (dropdownListenersUnsubscribe.length > 0) {
    console.log('[Real-time] Detaching dropdown listeners.');
    dropdownListenersUnsubscribe.forEach(unsub => unsub());
    dropdownListenersUnsubscribe = [];
  }
}

// --- Class Info Display (Now with Real-time Members) ---
// in note.js

// in note.js
// ▼▼▼ PASTE THE NEW SETUP FUNCTION HERE ▼▼▼
// in note.js

// REPLACE the existing function with this new version
function setupClassInfoNav() {
    const viewInfoBtn = document.getElementById('viewInfoBtn');
    const viewNotesBtn = document.getElementById('viewNotesBtn');
    const viewAnnouncementsBtn = document.getElementById('viewAnnouncementsBtn');

    const infoPanel = document.getElementById('classInfoBodyPanel');
    const notesPanel = document.getElementById('classSharedNotesPanel');
    const announcementsPanel = document.getElementById('classAnnouncementsPanel');

    const allBtns = [viewInfoBtn, viewNotesBtn, viewAnnouncementsBtn];
    const allPanels = [infoPanel, notesPanel, announcementsPanel];

    const safelyRun = (element, action) => { if (element) action(element); };

    async function handleTabClick(activeBtn, activePanel) {
             // ▼▼▼ THIS IS THE NEW ANIMATION RESET LOGIC ▼▼▼
        // If we are leaving the announcements tab, reset the cards for the next visit
        if (!announcementsPanel.classList.contains('hidden')) {
            const announcementCards = announcementsPanel.querySelectorAll('.announcement-card.is-visible');
            announcementCards.forEach(card => card.classList.remove('is-visible'));
        }
        // ▲▲▲ END OF NEW LOGIC ▲▲▲
        allBtns.forEach(btn => safelyRun(btn, b => b.classList.remove('active')));
        allPanels.forEach(panel => safelyRun(panel, p => p.classList.add('hidden')));

        safelyRun(activeBtn, b => b.classList.add('active'));
        safelyRun(activePanel, p => p.classList.remove('hidden'));

        // ▼▼▼ NEW LOGIC: If the announcements tab is clicked, update the last viewed time ▼▼▼
        if (activeBtn === viewAnnouncementsBtn) {
            activeBtn.classList.remove('has-unread'); // Immediately remove pulse
            const user = auth.currentUser;
            const { id: classId } = window.activeClassContext;
            if (user && classId) {
                const lastViewedRef = db.collection('users').doc(user.email)
                                        .collection('lastViewedAnnouncements').doc(classId);
                await lastViewedRef.set({
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            const announcementCardsToAnimate = announcementsPanel.querySelectorAll('.announcement-card');
            announcementCardsToAnimate.forEach((card, index) => {
              setTimeout(() => {
                card.classList.add('is-visible');
              }, index * 200); 
            });
        }
        // ▲▲▲ END OF NEW LOGIC ▲▲▲
        
    }

    if (!window.classViewTabsInitialized) {
        safelyRun(viewInfoBtn, btn => btn.addEventListener('click', () => handleTabClick(btn, infoPanel)));
        safelyRun(viewNotesBtn, btn => btn.addEventListener('click', () => handleTabClick(btn, notesPanel)));
        safelyRun(viewAnnouncementsBtn, btn => btn.addEventListener('click', () => handleTabClick(btn, announcementsPanel)));
        window.classViewTabsInitialized = true;
    }
}

// This is the function you were looking fo
// REPLACE the existing displayClassInfo function with this one
async function displayClassInfo(data) {
    window.classViewTabsInitialized = false;
    setupClassInfoNav();
    document.getElementById('classInfoName').textContent = data.className || 'N/A';
    document.getElementById('classInfoSection').textContent = 'Section: ' + (data.section || 'N/A');
    document.getElementById('classInfoDescription').textContent = data.description || 'No description provided.';
    document.getElementById('classInfoSidenavPhoto').src = data.imageUrl || 'Group-100.png';

    const memberList = document.getElementById('classInfoMemberList');
    const user = auth.currentUser;
    const creatorEmail = data.createdBy;
    const classId = window.activeClassContext?.id;

    // Detach any previous listeners to prevent duplicates
    detachMemberListener();
    memberList.innerHTML = '<li>Loading members...</li>';

    const membersRef = db.collection('Class').doc(creatorEmail).collection('userClasses').doc(classId).collection('members');

    // This real-time listener now controls all permissions AND renders the member list
    memberListenerUnsubscribe = membersRef.onSnapshot(async (membersSnapshot) => {
        const memberDocs = membersSnapshot.docs;
        const currentUserEmail = user ? user.email : null;

        // --- 1. Real-time Permission Check ---
        const isCreatorOrCoCreator = (currentUserEmail === creatorEmail) ||
                                     memberDocs.some(doc => doc.id === currentUserEmail && doc.data().role === 'creator');
        
        // --- 2. Update All Buttons Based on Real-time Role ---
        const inviteBtn = document.getElementById('inviteMembersBtn');
        const announcementBtnFull = document.getElementById('announcementBtnFull');
        const announcementBtnIcon = document.getElementById('announcementBtnIcon');
        const configureBtn = document.getElementById('classConfigureBtn');
        const actionBtnFull = document.getElementById('classActionBtnFull');
        const actionBtnIcon = document.getElementById('classActionBtnIcon');
        const logsBtnFull = document.getElementById('classLogsBtnFull');
        const logsBtnIcon = document.getElementById('classLogsBtnIcon');

        // Setup Invite Button
        if (inviteBtn) {
            inviteBtn.onclick = async () => {
                if (isCreatorOrCoCreator) {
                    document.getElementById('inviteUsersModal').classList.remove('hidden');
                    await populateInviteList();
                } else {
                    showCustomAlert('Only the Creator and Co-Creators can invite other Preppers.', 'error');
                }
            };
        }

        // Setup Announcement, Configure, and Log Buttons
        [announcementBtnFull, announcementBtnIcon, configureBtn, logsBtnFull, logsBtnIcon].forEach(btn => {
            if(btn) btn.style.display = isCreatorOrCoCreator ? (btn.id.includes('Icon') ? 'grid' : 'block') : 'none';
        });

        if (isCreatorOrCoCreator) {
            announcementBtnFull.onclick = () => openAnnouncementModal(creatorEmail, classId);
            announcementBtnIcon.onclick = () => openAnnouncementModal(creatorEmail, classId);
            configureBtn.onclick = () => openClassModalForEdit(data);
        }
        
        // Log buttons are visible to everyone
        logsBtnFull.style.display = 'block';
        logsBtnIcon.style.display = 'grid';
        logsBtnFull.onclick = () => openLogsModal(creatorEmail, classId);
        logsBtnIcon.onclick = () => openLogsModal(creatorEmail, classId);


        // Setup Leave/Delete Buttons
        actionBtnIcon.className = 'sidenav-icon-btn action-btn';
        if (currentUserEmail === creatorEmail) {
            actionBtnFull.textContent = 'Delete Class';
            actionBtnIcon.innerHTML = `<img src="deleteclass.png" alt="Delete">`;
            actionBtnFull.onclick = () => handleDeleteClass(creatorEmail, classId, data.className);
            actionBtnIcon.onclick = () => handleDeleteClass(creatorEmail, classId, data.className);
        } else {
            actionBtnFull.textContent = 'Leave Class';
            actionBtnIcon.innerHTML = `<img src="leaveclass.png" alt="Leave">`;
            actionBtnFull.onclick = () => handleLeaveClass(creatorEmail, classId, currentUserEmail);
            actionBtnIcon.onclick = () => handleLeaveClass(creatorEmail, classId, currentUserEmail);
        }

        // --- 3. Render the Member List (This was the missing part) ---
        let membersHtml = '';
        const memberEmails = memberDocs.map(doc => doc.id);
        if (!memberEmails.includes(creatorEmail)) {
            memberEmails.unshift(creatorEmail);
        }

        for (const email of memberEmails) {
            const memberDoc = memberDocs.find(doc => doc.id === email);
            const memberData = memberDoc ? memberDoc.data() : {};
            let displayName = email.split('@')[0];
            let avatarUrl = 'Group-100.png';
            let roleBadgeHtml = '';

            const [usernameDoc, roleDoc] = await Promise.all([
                db.collection('usernames').doc(email).get(),
                db.collection('approved_emails').doc(email).get()
            ]);

            if (usernameDoc.exists && usernameDoc.data().username) {
                displayName = usernameDoc.data().username;
            }
            
            if (displayName.length > 9) {
                displayName = displayName.substring(0, 9) + "...";
            }

            if (roleDoc.exists) {
                const roles = roleDoc.data().role || '';
                if (roles.includes('verified')) {
                    roleBadgeHtml = `<img src="verified.svg" alt="Verified" class="member-role-badge">`;
                } else if (roles.includes('first')) {
                    roleBadgeHtml = `<img src="first.png" alt="First User" class="member-role-badge">`;
                }
            }

            try {
                const avatarRef = storage.ref(`avatars/${email}`);
                avatarUrl = await avatarRef.getDownloadURL();
            } catch (error) { /* Silently fail to default avatar */ }

            const isOriginalCreator = email === creatorEmail;
            const isCoCreator = memberData.role === 'creator';

            let optionsButtonHtml = '';
            if (currentUserEmail === creatorEmail && !isOriginalCreator) {
                optionsButtonHtml = `<button class="member-options-btn" data-email="${email}" data-name="${displayName}" data-role="${isCoCreator ? 'creator' : 'member'}">⋮</button>`;
            }

            membersHtml += `
                <li class="member-item">
                    <img src="${avatarUrl}" alt="Avatar" class="member-avatar">
                    <div class="member-details">
                        <span class="member-name">${displayName}${roleBadgeHtml}</span>
                        ${isOriginalCreator ? '<span class="creator-badge">Creator</span>' : ''}
                        ${isCoCreator ? '<span class="creator-badge" style="background-color:#87CEEB; color:#00334d;">Co-Creator</span>' : ''}
                    </div>
                    ${optionsButtonHtml}
                </li>
            `;
        }
        memberList.innerHTML = membersHtml || '<li>No members yet.</li>';
    }, error => {
        console.error("Error fetching class members:", error);
        memberList.innerHTML = '<li>Error loading members.</li>';
    });
    
    // Final calls to update the other tabs
    displayClassNotes(creatorEmail, classId);
    displayAnnouncements(creatorEmail, classId);
    updateLogsNotification(creatorEmail, classId);
}
// in note.js

// PASTE THIS ENTIRE NEW BLOCK AFTER displayClassInfo

const memberActionsPopover = document.getElementById('memberActionsPopover');
let activeMemberTarget = null;

// in note.js

// REPLACE the existing openMemberOptionsMenu function
function openMemberOptionsMenu(targetButton, email, name, role) { // Added 'role'
    activeMemberTarget = { email, name, role }; // Store role
    const btnRect = targetButton.getBoundingClientRect();

    const promoteBtn = document.getElementById('promoteMemberBtn');

    // ▼▼▼ THIS IS THE NEW LOGIC ▼▼▼
    if (role === 'creator') {
        promoteBtn.textContent = 'Demote';
        promoteBtn.className = 'member-action-button unpromote'; // Use new CSS class
    } else {
        promoteBtn.textContent = 'Promote';
        promoteBtn.className = 'member-action-button promote';
    }
    // ▲▲▲ END OF NEW LOGIC ▲▲▲

    memberActionsPopover.classList.remove('hidden');
    memberActionsPopover.style.top = `${btnRect.top}px`;
    memberActionsPopover.style.left = `${btnRect.right + 5}px`;
}

function closeMemberOptionsMenu() {
    memberActionsPopover.classList.add('hidden');
    activeMemberTarget = null;
}
// in note.js

// REPLACE your existing function with this new version
async function handleKickMember() {
    if (!activeMemberTarget) return;

    const { email, name } = activeMemberTarget;
    const { creatorEmail, id: classId, name: className } = window.activeClassContext;

    const confirmed = await showCustomConfirm(`Are you sure you want to kick ${name} from the class?`);
    closeMemberOptionsMenu();
    if (!confirmed) return;

    try {
        // Action 1: Remove the user from the class's members list
        const memberRef = db.collection('Class').doc(creatorEmail)
                            .collection('userClasses').doc(classId)
                            .collection('members').doc(email);
        await memberRef.delete();

        // ▼▼▼ THIS IS THE CRUCIAL FIX ▼▼▼
        // Action 2: Find and update the original invitation status to 'kicked'
        // This is what makes the class disappear from their dropdown in real-time.
        const invQuery = await db.collection('invclass')
                                 .where('recipientEmail', '==', email)
                                 .where('classId', '==', classId)
                                 .limit(1).get();

        if (!invQuery.empty) {
            const invDocRef = invQuery.docs[0].ref;
            await invDocRef.update({ status: 'kicked' });
        }

        // Action 3: Send a notification to the kicked user
        await db.collection('notifications').add({
            recipientEmail: email,
            message: `You have been kicked from the class "${className}".`,
            status: 'unread',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Log the activity for the creator's record
        await logClassActivity(classId, creatorEmail, `${name} was kicked from the class.`);
        showCustomAlert(`${name} has been kicked.`, 'success');

    } catch (error) {
        console.error("Error kicking member:", error);
        showCustomAlert('Failed to kick member.', 'error');
    }
}
async function handlePromoteMember() {
    if (!activeMemberTarget) return;
    const { email, name } = activeMemberTarget;
    const confirmed = await showCustomConfirm(`Promote ${name} to Co-Creator? They will get full permissions.`);
    closeMemberOptionsMenu();
    if (!confirmed) return;

    try {
        const { creatorEmail, id: classId } = window.activeClassContext;
        const memberRef = db.collection('Class').doc(creatorEmail).collection('userClasses').doc(classId).collection('members').doc(email);
        await memberRef.set({ role: 'creator' }, { merge: true });
        await logClassActivity(classId, creatorEmail, `${name} was promoted to Co-Creator.`);
        showCustomAlert(`${name} is now a Co-Creator.`, 'success');
    } catch (error) {
        console.error("Error promoting member:", error);
        showCustomAlert('Failed to promote member.', 'error');
    }
}
// in note.js

// PASTE THIS NEW FUNCTION AFTER handlePromoteMember
async function handleDemoteMember() {
    if (!activeMemberTarget) return;
    const { email, name } = activeMemberTarget;
    const confirmed = await showCustomConfirm(`Demote ${name}? They will lose all creator permissions.`);
    closeMemberOptionsMenu();
    if (!confirmed) return;

    try {
        const { creatorEmail, id: classId } = window.activeClassContext;
        const memberRef = db.collection('Class').doc(creatorEmail).collection('userClasses').doc(classId).collection('members').doc(email);
        // Update the role back to 'member' or remove it
        await memberRef.set({ role: 'member' }, { merge: true }); 
        await logClassActivity(classId, creatorEmail, `${name} was demoted to a member.`);
        showCustomAlert(`${name} is no longer a Co-Creator.`, 'success');
    } catch (error) {
        console.error("Error demoting member:", error);
        showCustomAlert('Failed to demote member.', 'error');
    }
}
// Event delegation for member options
const memberListContainer = document.getElementById('classInfoMemberList');
memberListContainer.addEventListener('click', (e) => {
    const optionsBtn = e.target.closest('.member-options-btn');
    if (optionsBtn) {
        e.stopPropagation();
        const email = optionsBtn.dataset.email;
        const name = optionsBtn.dataset.name;
        const role = optionsBtn.dataset.role; // <-- Get the role
        openMemberOptionsMenu(optionsBtn, email, name, role); // <-- Pass the role
    }
});

// Attach listeners to the popover buttons
document.getElementById('promoteMemberBtn').addEventListener('click', () => {
    if (activeMemberTarget && activeMemberTarget.role === 'creator') {
        handleDemoteMember(); // <-- If they are a creator, call demote
    } else {
        handlePromoteMember(); // <-- Otherwise, call promote
    }
});
document.getElementById('kickMemberBtn').addEventListener('click', handleKickMember);

// Close popover when clicking elsewhere
window.addEventListener('click', () => {
    if (!memberActionsPopover.classList.contains('hidden')) {
        closeMemberOptionsMenu();
    }
});
// --- Action Functions (Delete/Leave) ---
async function handleDeleteClass(creatorEmail, classId, className) {
  const confirmed = await showCustomConfirm('Are you sure you want to permanently delete this class? This will notify all members and cannot be undone.');
  if (!confirmed) return;
  try {
    const membersRef = db.collection('Class').doc(creatorEmail).collection('userClasses').doc(classId).collection('members');
    const membersSnapshot = await membersRef.get();
    const memberEmails = membersSnapshot.docs.map(doc => doc.id);
    const notificationPromises = memberEmails.map(email => {
      if (email === creatorEmail) return Promise.resolve();
      return db.collection('notifications').add({
        recipientEmail: email, message: `The class "${className}" has been deleted by the creator.`, status: 'unread', timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
    });
    await Promise.all(notificationPromises);
    const deleteMemberPromises = memberEmails.map(email => membersRef.doc(email).delete());
    await Promise.all(deleteMemberPromises);
    await db.collection('Class').doc(creatorEmail).collection('userClasses').doc(classId).delete();
    showCustomAlert('Class and all members successfully deleted.', 'success');
    document.querySelector('#classDropdownContent button').click();
  } catch (error) {
    console.error('Error deleting class:', error);
    showCustomAlert('Failed to delete class.', 'error');
  }
}

async function handleLeaveClass(creatorEmail, classId, userEmail) {
  const confirmed = await showCustomConfirm('Are you sure you want to leave this class?');
  if (!confirmed) return;
  try {
    await db.collection('Class').doc(creatorEmail).collection('userClasses').doc(classId).collection('members').doc(userEmail).delete();
    const invQuery = await db.collection('invclass').where('recipientEmail', '==', userEmail).where('classId', '==', classId).limit(1).get();
    if (!invQuery.empty) {
      await invQuery.docs[0].ref.update({ status: 'declined' });
    }
    showCustomAlert('You have left the class.', 'success');
    document.querySelector('#classDropdownContent button').click();
  } catch (error) {
    console.error('Error leaving class:', error);
    showCustomAlert('Failed to leave the class.', 'error');
  }
}

// --- Dropdown Rendering and Real-time Listeners ---
function renderDropdown(classesMap) {
  const dropdownContent = document.getElementById('classDropdownContent');
  const dropdownBtn = document.getElementById('classDropdownBtn');
  dropdownContent.innerHTML = '';

  const myNotesOption = document.createElement('button');
  myNotesOption.textContent = 'My Notes';
  myNotesOption.onclick = () => {
    dropdownBtn.textContent = 'My Notes ▼';
    dropdownContent.classList.remove('show');
    list.classList.remove('hidden');
    classInfoView.classList.add('hidden');
    window.activeClassContext = null;
    detachMemberListener();
  };
  dropdownContent.appendChild(myNotesOption);

  classesMap.forEach((classData, classId) => {
    const classOption = document.createElement('button');
    classOption.textContent = classData.className;
    classOption.onclick = () => {
      dropdownBtn.textContent = `${classData.className} ▼`;
      dropdownContent.classList.remove('show');
      window.activeClassContext = { id: classId, name: classData.className, creatorEmail: classData.createdBy };
      list.classList.add('hidden');
      classInfoView.classList.remove('hidden');
      displayClassInfo(classData);
    };
    dropdownContent.appendChild(classOption);
  });
}

function attachDropdownListeners() {
  const user = auth.currentUser;
  if (!user) return;

  detachDropdownListeners();

  let createdClasses = new Map();
  let joinedClasses = new Map();

  const createdRef = db.collection('Class').doc(user.email).collection('userClasses');
  const unsubCreated = createdRef.onSnapshot(snapshot => {
    snapshot.docChanges().forEach(change => {
      if (change.type === 'removed') createdClasses.delete(change.doc.id);
      else createdClasses.set(change.doc.id, { id: change.doc.id, ...change.doc.data() });
    });
    renderDropdown(new Map([...createdClasses, ...joinedClasses]));
  });

  const joinedRef = db.collection('invclass').where('recipientEmail', '==', user.email).where('status', '==', 'accepted');
  const unsubJoined = joinedRef.onSnapshot(async snapshot => {
    const classDetailPromises = snapshot.docs.map(doc => {
      const invite = doc.data();
      return db.collection('Class').doc(invite.creatorEmail).collection('userClasses').doc(invite.classId).get();
    });
    const classDocs = await Promise.all(classDetailPromises);
    joinedClasses.clear();
    classDocs.forEach(doc => {
      if (doc.exists) joinedClasses.set(doc.id, { id: doc.id, ...doc.data() });
    });
    renderDropdown(new Map([...createdClasses, ...joinedClasses]));
  });

  dropdownListenersUnsubscribe.push(unsubCreated, unsubJoined);
}
// ▲▲▲ END OF NEW FUNCTION BLOCK ▲▲▲
// ▲▲▲ END OF REPLACEMENT ▲▲▲
// ▲▲▲ END OF NEW CODE ▲▲▲
  // === Build the Preview Modal (smaller, sits above Notepad modal) ===
const previewBackdrop = document.createElement('div');
previewBackdrop.id = 'notePreviewBackdrop';
previewBackdrop.style.cssText = `
  position: fixed; inset: 0; background: rgba(0,0,0,.65);
  display: none; place-items: center; z-index: 10000;
`;

const previewModal = document.createElement('div');
previewModal.id = 'notePreviewModal';
previewModal.style.cssText = `
  width: min(84vw, 960px); height: min(74vh, 680px);
  background: #171717; color:#fff; border-radius:18px; border:1px solid #000;
  
  display:flex; flex-direction:column; overflow:hidden;
  animation: notePop 140ms ease-out; /* <-- ADD THIS LINE */
`;

const previewTopbar = document.createElement('div');
previewTopbar.style.cssText = `
  display:grid; grid-template-columns:1fr auto auto; align-items:center; gap:12px;
  padding:14px 16px; border-bottom:1px solid rgba(0, 0, 0, 0.06);
  background: linear-gradient(180deg,#1a1a1a 0%, #171717 100%);
`;


const previewTitleHeading = document.createElement('h4');
previewTitleHeading.id = 'notePreviewTitle';
previewTitleHeading.textContent = 'Title: (Untitled)';

previewTitleHeading.style.cssText = `margin:0; font:600 16px 'Satoshi',sans-serif; letter-spacing:.3px;`;

const previewCloseBtn = document.createElement('button');
previewCloseBtn.id = 'notePreviewCloseBtn';
previewCloseBtn.textContent = '×';
previewCloseBtn.title = 'Close';
previewCloseBtn.style.cssText = `all:unset; cursor:pointer; padding:4px 8px; font-size:22px; line-height:1;`;

previewTopbar.appendChild(previewTitleHeading);

// NEW: How to Use button (left of the X)
const howToBtn = document.createElement('button');
howToBtn.type = 'button';
howToBtn.textContent = 'How to Use';
howToBtn.title = 'How to Use';
howToBtn.className = 'howto-btn attract'; // CSS drives style + pulse

previewTopbar.appendChild(howToBtn);
// ▼ ADD: Review Mode button (sits between How To and the close "×")
const reviewBtn = document.createElement('button');
reviewBtn.type = 'button';
reviewBtn.id = 'reviewModeBtn';
reviewBtn.textContent = 'Review Mode';
reviewBtn.title = 'Enlarge editor for focused reviewing';
reviewBtn.style.cssText = `
  padding:6px 10px; border-radius:8px; border:1px solid #333;
  background:#1e1e1e; color:#eee; cursor:pointer;
`;
// make room for the extra button
previewTopbar.style.gridTemplateColumns = '1fr auto auto auto';
previewTopbar.appendChild(reviewBtn);
// ▼ ADD: Review Mode behavior
function resizeOverlaysForReview() {
  const ov = previewEditorWrap.querySelector('#noteDrawOverlay');
  console.log(`%c[Review] resizeOverlaysForReview: Running.`, 'color: #eab308', { overlayElementFound: !!ov });
  if (!ov) return;

  if (previewModal.classList.contains('review-mode') && previewEditorWrap?.dataset?.baseW) {
    const w = parseFloat(previewEditorWrap.dataset.baseW);
    const h = parseFloat(previewEditorWrap.dataset.baseH || Math.max(previewText.scrollHeight, previewText.clientHeight));
    console.log('[Review] resizeOverlaysForReview: Sizing saved overlay for REVIEW MODE from dataset:', { width: w, height: h });
    ov.style.width  = w + 'px';
    ov.style.height = h + 'px';
    ov.style.left = '0px';
    ov.style.top  = '0px';
    return;
  }

  const w = previewText.clientWidth;
  const h = Math.max(previewText.scrollHeight, previewText.clientHeight);
  console.log('[Review] resizeOverlaysForReview: Sizing saved overlay for NORMAL MODE from live content:', { width: w, height: h });
  ov.style.width  = w + 'px';
  ov.style.height = h + 'px';
  ov.style.left = '0px';
  ov.style.top  = '0px';
}

function applyReviewScale() {
  const inReview = previewModal.classList.contains('review-mode');
  console.log(`%c[Review] applyReviewScale: Running. In Review Mode: ${inReview}`, 'color: #3b82f6');

  if (!inReview) {
    console.log('[Review] applyReviewScale: Exiting Review Mode. Clearing fixed styles.');
    previewEditorWrap.style.transform = '';
    previewEditorWrap.style.width = '';
    previewEditorWrap.style.height = '';
    delete previewEditorWrap.dataset.baseW;
    delete previewEditorWrap.dataset.baseH;
    return;
  }

  const baseW = String(previewEditorWrap.clientWidth);
  const baseH = String(Math.max(previewEditorWrap.scrollHeight, previewEditorWrap.clientHeight));
  console.log('[Review] applyReviewScale: Recorded base dimensions:', { baseW: parseFloat(baseW), baseH: parseFloat(baseH) });
  
  previewEditorWrap.dataset.baseW = baseW;
  previewEditorWrap.dataset.baseH = baseH;

  console.log('[Review] applyReviewScale: Locking layout dimensions to base values.');
  previewEditorWrap.style.width = baseW + 'px';
  previewEditorWrap.style.height = baseH + 'px';

  const bodyRect = previewBody.getBoundingClientRect();
  const availW = bodyRect.width  - 16;
  const availH = bodyRect.height - 16;
  
  const s = Math.max(0.5, Math.min(availW / parseFloat(baseW), availH / parseFloat(baseH)));
  console.log('[Review] applyReviewScale: Calculated scale:', { availW: availW, availH: availH, scale: s });

  console.log(`[Review] applyReviewScale: Applying transform: scale(${s})`);
  previewEditorWrap.style.transform = `scale(${s})`;
}



reviewBtn.addEventListener('click', async () => {
  // NEW: Check if draw mode is on and has strokes before proceeding
  if (drawModeOn && drawHasStrokes) {
    const confirmed = await showCustomConfirm('Continue in Review Mode? Click the save button (✏️) first to avoid losing your drawing.');
    if (!confirmed) {
      return; // Stop if the user cancels
    }
    // If confirmed, programmatically click the draw button to save the drawing and exit draw mode.
    btnDraw.click();
  }

  // --- The original logic now runs after the confirmation check ---
  const enabling = !previewModal.classList.contains('review-mode');

  previewBackdrop.classList.toggle('review-mode', enabling);
  previewModal.classList.toggle('review-mode', enabling);
  previewText.classList.toggle('review-mode', enabling);

  if (enabling) {
    previewRibbon.style.display = 'none';

    if (!previewModal.dataset.origW) {
      previewModal.dataset.origW = previewModal.style.width || '';
      previewModal.dataset.origH = previewModal.style.height || '';
    }
    previewModal.style.width  = 'min(98vw, 1400px)';
    previewModal.style.height = 'min(94vh, 900px)';
    
    // This part is now handled by the confirmation logic above, but we keep the rest.
    btnDraw.disabled = true;
    btnDraw.title = 'Drawing is disabled in Review Mode';
    drawPalette.style.display = 'none';
    drawPalette.style.opacity = '0';
    drawPalette.style.transform = 'translateX(10px)';

    let ov = document.getElementById('noteDrawOverlay');
    if (!ov && currentPreviewNote?.drawLayer?.src) {
      ov = document.createElement('img');
      ov.id = 'noteDrawOverlay';
      ov.src = currentPreviewNote.drawLayer.src;
      ov.style.position = 'absolute';
      ov.style.pointerEvents = 'none';
      ov.style.zIndex = '3';
      ov.style.left = '0px';
      ov.style.top  = '0px';
      previewEditorWrap.appendChild(ov);
    }
    if (ov) ov.style.display = 'block';
    annotationStatus.textContent = '<-- Click to Save';
  } else {
    // NEW: Only show the ribbon if the note is NOT shared
    if (!currentPreviewNote?.isShared) {
        previewRibbon.style.display = 'flex';
    }

    previewModal.style.width  = previewModal.dataset.origW || '';
    previewModal.style.height = previewModal.dataset.origH || '';
    delete previewEditorWrap.dataset.baseW;
    delete previewEditorWrap.dataset.baseH;
    btnDraw.disabled = false;
    btnDraw.title = 'Freehand drawing';
const _ov = document.getElementById('noteDrawOverlay');
if (_ov) _ov.style.display = 'none'; // Always hide overlay when exiting review mode

// --- THIS IS THE DEFINITIVE FIX ---
// When exiting review mode, drawing should ALWAYS be considered off.
drawModeOn = false;
btnDraw.classList.remove('active');
annotationStatus.textContent = '<-- Click to Add Drawing/Notes';
  }

  reviewBtn.classList.toggle('active', enabling);
  reviewBtn.textContent = enabling ? 'Exit Review' : 'Review Mode';
  
  const onTransEnd = (ev) => {
    if (ev.target !== previewModal || (ev.propertyName !== 'width' && ev.propertyName !== 'height')) return;
    applyReviewScale(); 
    resizeOverlaysForReview();
    if (!previewModal.classList.contains('review-mode')) {
      previewModal.removeEventListener('transitionend', onTransEnd);
    }
  };

  requestAnimationFrame(() => {
    applyReviewScale();
    resizeOverlaysForReview();
  });

  previewModal.addEventListener('transitionend', onTransEnd);
});


// Keep things correct on window resize while preview is open
window.addEventListener('resize', () => {
  if (previewBackdrop.style.display === 'grid') {
     applyReviewScale();
    // Always let the overlay image grow/shrink with the editor
    resizeOverlaysForReview();

    // Only touch the canvas if draw mode is actually ON
    if (drawModeOn && typeof syncDrawCanvasSize === 'function') {
      syncDrawCanvasSize();
    }
  }
  
});


previewTopbar.appendChild(previewCloseBtn);


const previewBody = document.createElement('div');
previewBody.style.cssText = `
  display:grid; grid-template-rows:auto 1fr; gap:14px;
  padding:14px 16px; height:100%;
`;

// Title input (same class as card title for consistent styling)
const previewTitleInput = document.createElement('input');
previewTitleInput.id = 'notePreviewTitleInput';
previewTitleInput.className = 'note-card-title';
previewTitleInput.placeholder = 'Input Title';

// Big editable text
const previewText = document.createElement('div');
previewText.id = 'notePreviewText';
previewText.className = 'note-text';
previewText.contentEditable = 'true';
previewText.spellcheck = false;
// Always paste as plain text to avoid bringing inline styles or backgrounds
previewText.addEventListener('paste', (e) => {
  e.preventDefault();
  const txt = (e.clipboardData || window.clipboardData).getData('text/plain');
  document.execCommand('insertText', false, txt);
});

previewText.style.height = '100%';
previewText.style.maxHeight = '100%';
previewText.style.overflowY = 'auto';


// Keep the title:
previewBody.appendChild(previewTitleInput);

// ▼ NEW: Ribbon + Checklist container
const previewRibbon = document.createElement('div');
previewRibbon.id = 'previewRibbon';
previewRibbon.style.cssText = `
  display:flex; gap:8px; align-items:center;
  padding:6px 0; border-bottom:1px dashed #2a2a2a;
`;

const btnChecklist = document.createElement('button');
btnChecklist.type = 'button';
btnChecklist.id = 'btnChecklist';
btnChecklist.textContent = '☑︎';
btnChecklist.title = 'Add checklist items';
btnChecklist.style.cssText = `
  padding:6px 10px; border-radius:8px; border:1px solid #333;
  background:#1e1e1e; color:#eee; cursor:pointer;
`;

previewRibbon.appendChild(btnChecklist);
// ▶ Image button + hidden file input (JPG/PNG) — inserts image at caret in previewText
const btnImage = document.createElement('button');
btnImage.type = 'button';
btnImage.id = 'btnImage';
btnImage.textContent = '🖼️';
btnImage.title = 'Insert image (JPG/PNG)';
btnImage.style.cssText = `
  padding:6px 10px; border-radius:8px; border:1px solid #333;
  background:#1e1e1e; color:#eee; cursor:pointer;
`;

// keep the picker out of sight but in the DOM
const imgPicker = document.createElement('input');
imgPicker.type = 'file';
imgPicker.accept = 'image/png, image/jpeg';
imgPicker.multiple = true;
imgPicker.style.display = 'none';

// add to ribbon / body
previewRibbon.appendChild(btnImage);
previewBody.appendChild(imgPicker);

// ==================================================================
// START: UPDATED PDF and PPTX Logic with Firebase Storage
// ==================================================================

// Helper function to show a temporary message in the editor
function showEditorMessage(message, isPersistent = false) {
    const originalContent = previewText.innerHTML;
    previewText.innerHTML = `<div style="text-align: center; opacity: 0.7; padding: 20px;"><i>${message}</i></div>`;
    
    if (isPersistent) {
        return () => {}; // Return an empty function if the message should stay
    }
    
    return () => { // Return a function to restore original content
        if (previewText.innerHTML.includes(message)) {
            previewText.innerHTML = originalContent;
        }
    };
}

// Helper to convert a canvas to a Blob
function canvasToBlob(canvas, type = 'image/jpeg', quality = 0.85) {
    return new Promise(resolve => {
        canvas.toBlob(blob => resolve(blob), type, quality);
    });
}







// ==================================================================
// END: UPDATED PDF and PPTX Logic
// ==================================================================
// ▶ Undo button
const btnUndo = document.createElement('button');
btnUndo.type = 'button';
btnUndo.id = 'btnUndo';
btnUndo.textContent = '↶';
btnUndo.title = 'Undo';
btnUndo.className = 'undo-redo-btn'; // Use new shared class
btnUndo.disabled = true; // Start disabled
previewRibbon.appendChild(btnUndo);

// ▶ Redo button
const btnRedo = document.createElement('button');
btnRedo.type = 'button';
btnRedo.id = 'btnRedo';
btnRedo.textContent = '↷';
btnRedo.title = 'Redo';
btnRedo.className = 'undo-redo-btn'; // Use new shared class
btnRedo.disabled = true; // Start disabled
previewRibbon.appendChild(btnRedo);
// ▶ Draw button → toggles drawing mode; palette slides in on the right
const btnDraw = document.createElement('button');
btnDraw.type = 'button';
btnDraw.id = 'btnDraw';
btnDraw.textContent = '✏️';
btnDraw.title = 'Freehand drawing';
btnDraw.style.cssText = `
  padding:6px 10px; border-radius:8px; border:1px solid #333;
  background:#1e1e1e; color:#eee; cursor:pointer;
  transition: transform 120ms ease;
`;
previewRibbon.appendChild(btnDraw);

// Small color palette that slides in to the RIGHT of the draw button
const drawPalette = document.createElement('div');
drawPalette.id = 'drawPalette';
drawPalette.style.cssText = `
  position: absolute; display: none; z-index: 5;
  padding: 8px; border-radius: 10px; border: 1px solid #000; background: #171717;
  box-shadow: 6px 6px 12px #0f0f0f, -6px -6px 12px #1f1f1f,
              inset 1px 1px 0 rgba(255,255,255,0.04), inset -1px -1px 0 rgba(0,0,0,0.55);
  gap: 6px; width: auto; display: none;   /* keep hidden initially */
  opacity: 0; transform: translateX(10px); transition: opacity 180ms ease, transform 180ms ease;
`;
previewBody.appendChild(drawPalette);
// ── Annotations status label (right side of the ribbon)
const annotationStatus = document.createElement('span');
annotationStatus.id = 'annotationStatus';
annotationStatus.textContent = '<-- Click to Add Drawing/Notes';
annotationStatus.style.cssText = `
  margin-left:auto;
  font:600 12px 'Satoshi',sans-serif;
  letter-spacing:.3px;
  opacity:.8;
  user-select:none;
`;
previewRibbon.appendChild(annotationStatus);
// ▶ PDF button + hidden file input
const btnPdf = document.createElement('button');
btnPdf.type = 'button';
btnPdf.id = 'btnPdf';
btnPdf.title = 'Import from PDF as Images';
btnPdf.style.cssText = `
  padding: 6px 10px; border-radius: 8px; border: 1px solid #333;
  background: #1e1e1e; color: #eee; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
`;
const pdfIcon = document.createElement('img');
pdfIcon.src = 'PDF.png';
pdfIcon.alt = 'PDF';
pdfIcon.style.cssText = 'width: 16px; height: 16px;';
btnPdf.appendChild(pdfIcon);

const pdfPicker = document.createElement('input');
pdfPicker.type = 'file';
pdfPicker.accept = '.pdf';
pdfPicker.style.display = 'none';

previewRibbon.appendChild(btnPdf);
previewBody.appendChild(pdfPicker);

btnPdf.addEventListener('click', () => {
    if (!auth?.currentUser || !currentPreviewNote) {
        alert("Please open a note before uploading a file.");
        return;
    }
    pdfPicker.click();
});

pdfPicker.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file || !auth?.currentUser || !currentPreviewNote) return;

    btnPdf.disabled = true;
    const originalIconHTML = btnPdf.innerHTML;
    
    let restoreEditor = () => {}; 

    try {
        restoreEditor = showEditorMessage(`Processing PDF... please wait.`);
        
        if (typeof pdfjsLib === 'undefined') throw new Error("PDF.js library is not loaded.");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let allImagesHtml = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            btnPdf.innerHTML = `${i}/${pdf.numPages}`;
            
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: context, viewport: viewport }).promise;

            const blob = await canvasToBlob(canvas);
            
            const userEmail = auth.currentUser.email;
            const noteId = currentPreviewNote.id;
            const filePath = `notepad/${userEmail}/${noteId}/pdf_page_${Date.now()}_${i}.jpg`;
            const storageRef = storage.ref(filePath);
            const uploadTask = await storageRef.put(blob);
            const downloadURL = await uploadTask.ref.getDownloadURL();
            
            allImagesHtml += `<div class="img-block"><img src="${downloadURL}" alt="PDF Page ${i}" style="max-width: 95%; height: auto; display: block; margin: 10px auto; border: 1px solid #333; border-radius: 4px;" /></div>`;
        }

        restoreEditor(); 
        previewText.innerHTML += `<div>${allImagesHtml}</div>`;
        previewText.dispatchEvent(new InputEvent('input', { bubbles: true }));

        // CORRECTED: If in draw mode, resize the canvas to fit the new content
        if (drawModeOn) {
            syncDrawCanvasSize();
        }

    } catch (error) {
        console.error('Error processing PDF and uploading to Storage:', error);
        restoreEditor();
        previewText.innerHTML += `<p><i>Failed to process PDF: ${error.message}</i></p>`;
    } finally {
        btnPdf.disabled = false;
        btnPdf.innerHTML = originalIconHTML;
        pdfPicker.value = '';
    }
});

// ---- DRAWING COLORS (edit freely later) ----
const DRAW_COLORS = [
  '#ffffff', // white
  '#0ea5e9', // sky-500
  '#22c55e', // green-500
  '#eab308', // yellow-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#f97316', // orange-500
  '#14b8a6', // teal-500
  '#000000ff',
  '#00ff0dff'
];
// -------------------------------------------



// a wrapper that holds the checklist rows (initially empty)
const previewChecklistWrap = document.createElement('div');
previewChecklistWrap.id = 'previewChecklist';
previewChecklistWrap.style.cssText = `
  display:flex; flex-direction:column; gap:6px;
  padding:8px 0; max-height:30vh; overflow:auto;
`;

previewBody.appendChild(previewRibbon);

// Wrap the editor so we can overlay a drawing canvas on top without saving the canvas element
const previewEditorWrap = document.createElement('div');
previewEditorWrap.id = 'notePreviewEditorWrap';
previewEditorWrap.style.cssText = `
  position: relative;   /* anchor for the overlay canvas */
  height: 100%;
  transform-origin: top left;   /* so scale() zooms from the top-left corner */
`;

previewEditorWrap.appendChild(previewText);
previewBody.appendChild(previewEditorWrap);



previewModal.appendChild(previewTopbar);
previewModal.appendChild(previewBody);
previewBackdrop.appendChild(previewModal);
document.body.appendChild(previewBackdrop);
// ▼ ADD ONCE: scoped CSS for Review Mode (no global side effects)
// ▼ ADD ONCE: scoped CSS for Review Mode (no global side effects)
if (!document.getElementById('noteReviewModeCSS')) {
  const styleTag = document.createElement('style');
  styleTag.id = 'noteReviewModeCSS';
  styleTag.textContent = `
    /* Darken backdrop a bit more in review */
    #notePreviewBackdrop.review-mode { background: rgba(0,0,0,0.88); }

    /* Make the modal almost full-screen when reviewing */
    #notePreviewModal.review-mode {
      width: min(98vw, 1400px);
      height: min(94vh, 900px);
      transition: width .18s ease, height .18s ease;
    }

    /* Ensure images grow to the wider viewport */
    #notePreviewText.review-mode .img-block img,
    #notePreviewText.review-mode img {
      max-width: 100%; height: auto;
    }

    /* Visual hint on the toggle */
    #reviewModeBtn.active { background:#2a2a2a; }
  `;
  document.head.appendChild(styleTag);
}


// === HOW TO USE — Small Modal ===
const howToBackdrop = document.createElement('div');
howToBackdrop.id = 'howToBackdrop';
howToBackdrop.style.cssText = `
  position: fixed; inset: 0;
  background: rgba(0,0,0,.55);
  display: none; place-items: center;
  z-index: 10001;
`;

const howToModal = document.createElement('div');
howToModal.id = 'howToModal';
howToModal.setAttribute('role', 'dialog');
howToModal.setAttribute('aria-modal', 'true');
howToModal.style.cssText = `
  width: min(92vw, 520px);
  background: #151515;
  color: #fff;
  border-radius: 14px;
  border: 1px solid #2a2a2a;
  box-shadow: 0 10px 28px rgba(0,0,0,.45);
  padding: 18px 18px 16px 18px;
  font-family: 'Satoshi', sans-serif;
`;

const howToTop = document.createElement('div');
howToTop.style.cssText = `
  display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 8px;
  margin-bottom: 8px;
`;

const howToTitle = document.createElement('h5');
howToTitle.textContent = 'How to Use';
howToTitle.style.cssText = `
  margin: 0;
  font: 700 16px 'Satoshi', sans-serif;
  letter-spacing: .2px;
`;

const howToClose = document.createElement('button');
howToClose.type = 'button';
howToClose.textContent = '×';
howToClose.title = 'Close';
howToClose.style.cssText = `
  all: unset; cursor: pointer; padding: 4px 8px;
  font-size: 22px; line-height: 1;
  color: #fff; border-radius: 8px;
`;
howToClose.addEventListener('mouseenter', () => howToClose.style.color = '#ff4d4d');
howToClose.addEventListener('mouseleave', () => howToClose.style.color = '#fff');

const howToBody = document.createElement('div');
howToBody.style.cssText = `
  background: #181818;
  border: 1px solid #272727;
  border-radius: 10px;
  padding: 14px 14px 12px;
  font: 500 13px 'Satoshi', sans-serif;
  line-height: 1.6;
`;

// Exact text with italicized parentheticals
howToBody.innerHTML = `
  <p style="margin: 0 0 10px 0;">
    To use FlipNote’s Annotation feature (Beta), please upload all the necessary images from your PDF or PPTX file first.

  </p>
  <p style="margin: 0;">
    Also, add any required comments via typing before applying annotations. This helps prevent stretching or misalignment of your markings.
    <em>(We’re working on fixing this issue.)</em>
  </p>
`;

howToTop.appendChild(howToTitle);
howToTop.appendChild(howToClose);
howToModal.appendChild(howToTop);
howToModal.appendChild(howToBody);
howToBackdrop.appendChild(howToModal);
document.body.appendChild(howToBackdrop);

// Open/close behavior
function openHowTo() {
  howToBackdrop.style.display = 'grid';
  document.body.style.overflow = 'hidden'; // <-- ADD THIS LINE
}
function closeHowTo() {
  howToBackdrop.style.display = 'none';
  document.body.style.overflow = ''; // <-- ADD THIS LINE
}

howToBtn.addEventListener('click', openHowTo);

// When the 'x' button is clicked, close the modal and set the flag.
howToClose.addEventListener('click', () => {
  closeHowTo();
  localStorage.setItem('seenNotesHowTo', 'true');
});

// click outside to close


// Also set the flag when the user presses ESC to close it.
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && howToBackdrop.style.display !== 'none') {
    closeHowTo();
    localStorage.setItem('seenNotesHowTo', 'true');
  }
});


// === Cleaning helpers: remove background / inline colors and force white text ===
// === Cleaning helpers: remove background / inline colors and force white text (with logs) ===
// === Cleaning helpers: remove *all* inline styles/classes and force white text (with logs) ===
function clearBgAndMakeTextWhite() {
  const all = previewText.querySelectorAll('*');
  let scanned = all.length, touched = 0, removedBg = 0, removedColor = 0, removedStyles = 0, removedBgAttr = 0;

  console.log('[ClearBG] start', { scanned });

  all.forEach(node => {
    if (node.nodeType !== 1) return;

    // e.g. <td bgcolor="...">
    if (node.hasAttribute('bgcolor')) {
      node.removeAttribute('bgcolor');
      removedBgAttr++; touched++;
    }

    // drop ALL inline styles (count bg/color for the logs)
    if (node.hasAttribute('style')) {
      if (node.style.background || node.style.backgroundColor) removedBg++;
      if (node.style.color || node.style.webkitTextFillColor) removedColor++;
      node.removeAttribute('style');
      removedStyles++; touched++;
    }

    // drop classes that might carry CSS backgrounds
    // drop classes that might carry CSS backgrounds — but keep our checkbox UI classes
if (node.className) {
  const isOurCheckbox = node.matches?.('input[type="checkbox"].check-box') || node.classList?.contains('check-row');
  if (!isOurCheckbox) {
    // Be conservative: only strip classes on generic spans; keep classes on inputs/divs we own
    if (node.tagName === 'SPAN') {
      node.removeAttribute('class');
      touched++;
    }
  }
}

  });

  // safety: strip any lingering inline background in raw HTML
  previewText.innerHTML = previewText.innerHTML
    .replace(/\sstyle="[^"]*background[^"]*"/gi, '')
    .replace(/\sstyle='[^']*background[^']*'/gi, '');

  // ensure the root editor itself has no bg, and text is white
  previewText.style.removeProperty('background');
  previewText.style.removeProperty('background-color');
  previewText.style.color = '#fff';

  const withBg = previewText.querySelectorAll('[style*="background"], [class]').length;
  console.log('[ClearBG] done', { scanned, touched, removedBg, removedColor, removedStyles, removedBgAttr, withBg });
  return { scanned, touched, removedBg, removedColor, removedStyles, removedBgAttr, withBg };
}



// Click → clean current content (preserves caret) and save
// Click → clean current content (preserves caret) and save (with logs)
// Click → clean (with logs), keep caret, save



// Toggle state for "checkbox mode"
let checkboxModeOn = false;

// === Insert checkboxes into the preview textarea ===

// Insert a checkbox line at the current caret in previewText
function insertCheckboxAtCaret() {
  // Ensure the textarea has focus and we have a selection
  previewText.focus();
  const sel = window.getSelection();
  if (!sel) return;
  let range = sel.rangeCount ? sel.getRangeAt(0) : null;
  if (!range) {
    // place caret at end if no range yet
    setContentEditableCaretIndex(previewText, previewText.innerText.length);
    range = window.getSelection().getRangeAt(0);
  }

  // Build a single checkbox row
  const row = document.createElement('div');
  row.className = 'check-row';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.className = 'check-box';
  box.setAttribute('contenteditable', 'false');

  row.appendChild(box);
  row.appendChild(document.createTextNode(' '));   // space before label text
  row.appendChild(document.createTextNode(''));    // empty label the user will type into

  // Insert at caret
  range.deleteContents();
  range.insertNode(row);

  // Place caret at the end of the new row (so the user can type the label)
  const after = document.createRange();
  after.selectNodeContents(row);
  after.collapse(false);
  sel.removeAllRanges();
  sel.addRange(after);

  // Trigger save
  previewText.dispatchEvent(new InputEvent('input', { bubbles: true }));
}

// When user clicks the Ribbon -> Checkbox button, insert a new checkbox row
// Ribbon button acts as ON/OFF toggle for "checkbox mode"
// Ribbon button acts as ON/OFF toggle AND inserts a checkbox immediately when turned ON
btnChecklist.addEventListener('click', () => {
  checkboxModeOn = !checkboxModeOn;
  btnChecklist.classList.toggle('active', checkboxModeOn);
  btnChecklist.textContent = checkboxModeOn ? '☑︎' : '☑︎';
  btnChecklist.title = checkboxModeOn
    ? 'Checkbox mode: ON — Enter spawns a checkbox'
    : 'Checkbox mode: OFF — Enter inserts a normal line';

  // NEW: if turning ON, spawn the first checkbox right away
  if (checkboxModeOn) {
    // ensure caret is in the preview editor; if not, move it to the end
    if (document.activeElement !== previewText) {
      setContentEditableCaretIndex(previewText, previewText.innerText.length);
    }
    insertCheckboxAtCaret();
  }
});
// === Image insertion into the preview textarea ===
function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function insertImageAtCaretFromFile(file) {
  // guard: accept only jpg/png
  if (!/^image\/(png|jpe?g)$/i.test(file.type)) return;

  // get data URL
  const dataUrl = await readAsDataURL(file);

  // ensure caret exists
  previewText.focus();
  const sel = window.getSelection();
  let range = sel && sel.rangeCount ? sel.getRangeAt(0) : null;
  if (!range) {
    setContentEditableCaretIndex(previewText, previewText.innerText.length);
    range = window.getSelection().getRangeAt(0);
  }

  // build an <img> inside a block for clean layout
// build an <img> inside a centered block for clean layout
const img = document.createElement('img');
img.src = dataUrl;
img.alt = file.name || 'image';
img.style.maxWidth = '100%';
img.style.height = 'auto';
img.style.display = 'block';
img.style.margin = '0 auto';          // ← center the image itself

const block = document.createElement('div');
block.className = 'img-block';
block.style.margin = '12px 0';    // let CSS center the image; no flex here


block.appendChild(img);


  // insert at caret
  range.deleteContents();
  range.insertNode(block);

  // place caret after the image block
  const after = document.createRange();
  after.setStartAfter(block);
  after.collapse(true);
  sel.removeAllRanges();
  sel.addRange(after);

  // trigger save so Firestore/local gets the updated HTML
  previewText.dispatchEvent(new InputEvent('input', { bubbles: true }));
}
function insertImageAtCaretFromDataURL(dataUrl, altText = 'drawing') {
  // ensure caret exists
  previewText.focus();
  const sel = window.getSelection();
  let range = sel && sel.rangeCount ? sel.getRangeAt(0) : null;
  if (!range) {
    setContentEditableCaretIndex(previewText, previewText.innerText.length);
    range = window.getSelection().getRangeAt(0);
  }

  const img = document.createElement('img');
  img.src = dataUrl;
  img.alt = altText;
  img.style.maxWidth = '100%';
  img.style.height = 'auto';
  img.style.display = 'block';
  img.style.margin = '0 auto';

  const block = document.createElement('div');
  block.className = 'img-block';
  block.style.margin = '12px 0';
  block.appendChild(img);

  range.deleteContents();
  range.insertNode(block);

  const after = document.createRange();
  after.setStartAfter(block);
  after.collapse(true);
  sel.removeAllRanges();
  sel.addRange(after);

  previewText.dispatchEvent(new InputEvent('input', { bubbles: true }));
}
// === Drawing overlay ===
let drawModeOn = false;
let _editorRO = null; // ResizeObserver for previewText (set per-open, cleared on close)

let drawColor = '#ffffff';
let drawWidth = 3;
let drawHasStrokes = false;
let drawHistory = [];
let redoHistory = [];
// NEW: track bounds of the strokes so we can crop
let bboxMinX, bboxMinY, bboxMaxX, bboxMaxY;
let drawHasBase = false;   // ← whether we drew the existing overlay into the canvas

function bboxReset() {
  bboxMinX = Infinity; bboxMinY = Infinity;
  bboxMaxX = -Infinity; bboxMaxY = -Infinity;
}
function bboxExpand(x, y, r = drawWidth / 2 + 2) {
  // expand by brush radius + tiny padding
  bboxMinX = Math.min(bboxMinX, x - r);
  bboxMinY = Math.min(bboxMinY, y - r);
  bboxMaxX = Math.max(bboxMaxX, x + r);
  bboxMaxY = Math.max(bboxMaxY, y + r);
}
const drawCanvas = document.createElement('canvas');
drawCanvas.id = 'noteDrawCanvas';
drawCanvas.style.cssText = `
  position: absolute; left: 0; top: 0; pointer-events: none;  /* enabled only in draw mode */
  z-index: 1000;                                              /* sit above everything in the editor */
  touch-action: none;                                         /* prevent touch scrolling while drawing */
`;


let drawCtx = null;
function updateUndoRedoState() {
  // Can't undo if there's only the initial blank state left
  btnUndo.disabled = drawHistory.length <= 1;
  btnRedo.disabled = redoHistory.length === 0;
}
// Put canvas inside the editor wrapper so it scrolls with the editor
// Prepare the TEXTAREA as a positioning context; we’ll attach the canvas only in draw mode
previewText.style.position = 'relative';



// Build color swatches in the palette
function makeDrawSwatch(c) {
  const b = document.createElement('button');
  b.type = 'button';
  b.title = c;
  b.style.cssText = `
    width:22px; height:22px; border-radius:6px; border:1px solid #333;
    background:${c}; cursor:pointer;
  `;
  b.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    drawColor = c;
    if (drawCtx) drawCtx.strokeStyle = drawColor;

    // keep drawing armed & cursor consistent after clicking the swatch
    drawCanvas.style.pointerEvents = 'auto';
    drawCanvas.style.cursor = 'crosshair';
    previewText.style.cursor = 'crosshair';
  });
  return b;
}

DRAW_COLORS.forEach(c => drawPalette.appendChild(makeDrawSwatch(c)));

// Utility: size the canvas to the editor (DPR-aware)
function syncDrawCanvasSize() {
  const cssW = previewText.clientWidth;
  const cssH = Math.max(previewText.scrollHeight, previewText.clientHeight);
  const dpr  = window.devicePixelRatio || 1;
  console.log(`%c[Review] syncDrawCanvasSize: Sizing live canvas from live content.`, 'color: #22c55e', { cssW, cssH, dpr });

  drawCanvas.style.left = '0px';
  drawCanvas.style.top  = '0px';
  drawCanvas.style.width  = cssW + 'px';
  drawCanvas.style.height = cssH + 'px';

  drawCanvas.width  = Math.max(1, Math.floor(cssW * dpr));
  drawCanvas.height = Math.max(1, Math.floor(cssH * dpr));

  drawCtx = drawCanvas.getContext('2d');
  drawCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawCtx.lineJoin = 'round';
  drawCtx.lineCap = 'round';
  drawCtx.strokeStyle = drawColor;
  drawCtx.lineWidth = drawWidth;
}





// Toggle draw mode + show/hide palette
// Toggle draw mode + show/hide palette
btnDraw.addEventListener('click', async () => {
  const cur = currentPreviewNote;
  if (!cur) {
    console.warn('[DRAW] no currentPreviewNote; open a note first');
    return;
  }
  // Block drawing entirely while in Review Mode
  if (previewModal.classList.contains('review-mode')) {
    // tiny feedback so users know it's disabled
    btnDraw.style.transform = 'scale(0.96)';
    setTimeout(() => { btnDraw.style.transform = ''; }, 160);
    return;
  }

    drawModeOn = !drawModeOn;
  btnDraw.classList.toggle('active', drawModeOn);

  // Update the status label
  annotationStatus.textContent = drawModeOn ? '<-- Click to Save' : '<-- Click to Add Drawing/Notes';


  if (drawModeOn) {
    // position palette to the RIGHT of the draw button
    const btnRect = btnDraw.getBoundingClientRect();
    const bodyRect = previewBody.getBoundingClientRect();
    drawPalette.style.left = `${Math.min(bodyRect.width - 12, btnRect.right - bodyRect.left + 12)}px`;
    drawPalette.style.top  = `${Math.max(6, btnRect.top - bodyRect.top - 6)}px`;
    drawPalette.style.display = 'flex';
    // slide in
    requestAnimationFrame(() => {
      drawPalette.style.opacity = '1';
      drawPalette.style.transform = 'translateX(0)';
    });

    // enable canvas
    // enable canvas
// enable canvas
syncDrawCanvasSize();
drawHasStrokes = false;
drawHasBase = false;
bboxReset();

// NEW: Reset history and button states
drawHistory = [];
redoHistory = [];

// If there's an existing drawing on the canvas (from a previous session),
// make THAT the initial state for the undo history.
if (drawHasBase || drawHasStrokes) {
    const initialState = drawCanvas.toDataURL();
    drawHistory.push(initialState);
} else {
    // Otherwise, start with a truly blank state.
    const blankState = drawCanvas.toDataURL();
    drawHistory.push(blankState);
}
updateUndoRedoState();

// ensure canvas is the last child → highest within this stacking context
previewText.appendChild(drawCanvas);

// let canvas take the mouse; make it obvious we're drawing
drawCanvas.style.pointerEvents = 'auto';
drawCanvas.style.cursor = 'crosshair';
previewText.style.cursor = 'crosshair';

// stop the editor from stealing focus/selection while drawing
previewText.style.userSelect = 'none';
previewText.style.caretColor = 'transparent';

console.log('[DRAW][ON] size=', drawCanvas.width, drawCanvas.height, 'dpr=', window.devicePixelRatio);





    // If there is an existing overlay saved for this note, draw it onto the canvas
    // Try note.drawLayer first; if missing, fall back to the DOM overlay currently shown
const source = (cur.drawLayer && cur.drawLayer.src)
  ? {
      src:   cur.drawLayer.src,
      left:  cur.drawLayer.left  || 0,
      top:   cur.drawLayer.top   || 0,
      width: cur.drawLayer.width,
      height:cur.drawLayer.height
    }
  : (() => {
      const dom = document.getElementById('noteDrawOverlay');
      if (!dom) return null;
      const wrapR = previewEditorWrap.getBoundingClientRect();
      const r = dom.getBoundingClientRect();
      return {
        src:   dom.src,
        left:  parseFloat(dom.style.left)   || (r.left - wrapR.left),
        top:   parseFloat(dom.style.top)    || (r.top  - wrapR.top),
        width: parseFloat(dom.style.width)  || r.width,
        height:parseFloat(dom.style.height) || r.height
      };
    })();

if (source && source.src) {
  console.log('[DRAW][ON] loading base overlay', { ...source, srcLen: source.src.length });
  const base = new Image();
  base.onload = () => {
  // Stretch the saved layer to the full current canvas (full scrollHeight)
const dpr = window.devicePixelRatio || 1;
const W = drawCanvas.width  / dpr;
const H = drawCanvas.height / dpr;
drawCtx.drawImage(base, 0, 0, W, H);

// bbox = whole canvas so re-export keeps the full area
bboxExpand(0, 0, 0);
bboxExpand(W, H, 0);

    drawHasBase = true;
    console.log('[DRAW][ON] base painted, bbox=', { bboxMinX, bboxMinY, bboxMaxX, bboxMaxY });
  };
  base.onerror = (e) => console.warn('[DRAW][ON] base image failed to load', e);
  base.src = source.src;
} else {
  console.log('[DRAW][ON] no base overlay to load');
}


  } else {
     const overlay = document.getElementById('noteDrawOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
    // hide palette (slide out)
    drawPalette.style.opacity = '0';
    drawPalette.style.transform = 'translateX(10px)';
    setTimeout(() => { drawPalette.style.display = 'none'; }, 180);

    // commit drawing ONLY if there are new strokes
    console.log('[DRAW][OFF] drawHasStrokes=', drawHasStrokes, 'drawHasBase=', drawHasBase);
    if (drawHasStrokes) {
      const exp = exportFullCanvasWEBP(); // { src,left,top,width,height }

      console.log('[DRAW][OFF] export result:', exp ? { ...exp, srcLen: exp.src.length } : null);

      if (exp && exp.src) {
        // replace old overlay with the new merged export
        document.getElementById('noteDrawOverlay')?.remove();

        const overlay = document.createElement('img');
overlay.id = 'noteDrawOverlay';
overlay.src = exp.src;
overlay.style.position = 'absolute';
overlay.style.pointerEvents = 'none';
overlay.style.zIndex = '3';
overlay.style.left = exp.left + 'px';
overlay.style.top  = exp.top  + 'px';
overlay.style.width  = exp.width  + 'px';
overlay.style.height = exp.height + 'px';
previewText.appendChild(overlay);                // ← inside the scroller


        const idx = notes.findIndex(n => n.id === cur.id);
if (idx >= 0) notes[idx].drawLayer = exp;
// keep the currently-open preview note in sync too
currentPreviewNote.drawLayer = exp;

console.log('[DRAW][OFF] persisting drawLayer… note.id=', cur.id);
await persist(cur.id, { drawLayer: exp });
console.log('[DRAW][OFF] persist requested for note.id=', cur.id);

      } else {
        console.warn('[DRAW][OFF] export returned nothing; skip persist');
      }
    } else {
      console.log('[DRAW][OFF] no new strokes → keep existing overlay, skip export/persist');
    }
    drawHasStrokes = false;
    drawHasBase = false;

   // clear and disable canvas
const ctx = drawCtx;
if (ctx) ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
drawCanvas.style.pointerEvents = 'none';
drawCanvas.style.cursor = '';

// restore editor interaction
previewText.style.userSelect = '';
previewText.style.caretColor = '';
previewText.style.cursor = '';
// ensure the canvas is not in the DOM when draw mode is OFF
if (drawCanvas.parentNode) {
  drawCanvas.parentNode.removeChild(drawCanvas);
}


  }
});


// Keep canvas in sync with layout changes
window.addEventListener('resize', () => {
  if (drawModeOn) syncDrawCanvasSize();
  const w = previewText.clientWidth;
  const h = Math.max(previewText.scrollHeight, previewText.clientHeight);
  const ov = document.getElementById('noteDrawOverlay');
  if (ov) {
    ov.style.width  = w + 'px';
    ov.style.height = h + 'px';
    ov.style.left = '0px';
    ov.style.top  = '0px';
  }
});





// Drawing handlers (Pointer events)
let drawing = false;
let lastX = 0, lastY = 0;

function localPointFromEvent(e) {
  // Use the CANVAS box so coords match exactly (excludes scrollbar width)
  const rect = drawCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  return { x, y };
}





drawCanvas.addEventListener('pointerdown', (e) => {
    if (!drawModeOn || previewModal.classList.contains('review-mode')) return;

  // if something disabled pointer-events, re-enable now
  if (drawCanvas.style.pointerEvents !== 'auto') {
    drawCanvas.style.pointerEvents = 'auto';
    drawCanvas.style.cursor = 'crosshair';
    previewText.style.cursor = 'crosshair';
  }

  e.preventDefault();               // stop text selection / focus changes
  e.stopPropagation();
  console.log('[DRAW] pointerdown');
  drawCanvas.setPointerCapture?.(e.pointerId);
  drawing = true;
  const p = localPointFromEvent(e);
  lastX = p.x; lastY = p.y;
  drawCtx.strokeStyle = drawColor;
  drawCtx.lineWidth = drawWidth;
  bboxExpand(p.x, p.y);
});



drawCanvas.addEventListener('pointermove', (e) => {
    if (!drawModeOn || !drawing || previewModal.classList.contains('review-mode')) return;

  e.preventDefault();
  const p = localPointFromEvent(e);
  drawCtx.beginPath();
  drawCtx.moveTo(lastX, lastY);
  drawCtx.lineTo(p.x, p.y);
  drawCtx.stroke();
  lastX = p.x; lastY = p.y;
  drawHasStrokes = true;
  bboxExpand(p.x, p.y);
});



function endStroke(e) {
  if (!drawModeOn || !drawing || previewModal.classList.contains('review-mode')) return;
  drawing = false;
  drawCanvas.releasePointerCapture?.(e.pointerId);

  // NEW: Save state to history after a stroke is finished
  if (drawHasStrokes) {
    const dataUrl = drawCanvas.toDataURL();
    drawHistory.push(dataUrl);
    redoHistory = []; // Clear redo history on new action
    updateUndoRedoState();
  }
}
drawCanvas.addEventListener('pointerup', endStroke);
drawCanvas.addEventListener('pointercancel', endStroke);
function undoLast() {
  if (drawHistory.length <= 1) return; // Guard against undoing the initial state

  redoHistory.push(drawHistory.pop());
  const prevState = drawHistory[drawHistory.length - 1];

  const img = new Image();
  img.onload = () => {
    const cssW = drawCanvas.clientWidth;
    const cssH = drawCanvas.clientHeight;
    drawCtx.clearRect(0, 0, cssW, cssH); // Use CSS dimensions for clearing
    drawCtx.drawImage(img, 0, 0, cssW, cssH); // And for drawing to handle scaling
  };
  img.src = prevState;
  updateUndoRedoState();
}

function redoNext() {
  if (redoHistory.length === 0) return;

  const nextState = redoHistory.pop();
  drawHistory.push(nextState);

  const img = new Image();
  img.onload = () => {
    const cssW = drawCanvas.clientWidth;
    const cssH = drawCanvas.clientHeight;
    // It's good practice to clear before redrawing.
    drawCtx.clearRect(0, 0, cssW, cssH);
    drawCtx.drawImage(img, 0, 0, cssW, cssH); // Use CSS dimensions here as well
  };
  img.src = nextState;
  updateUndoRedoState();
}

btnUndo.addEventListener('click', undoLast);
btnRedo.addEventListener('click', redoNext);
// Export only the ink area, optionally downscale, and compress to JPEG to fit Firestore limits
function exportFullCanvasWEBP() {
  if (!drawCtx) return null;
  // Match the canvas size which uses scrollHeight
  const cssW = previewText.clientWidth;
  const cssH = Math.max(previewText.scrollHeight, previewText.clientHeight);
  const pxW  = drawCanvas.width;
  const pxH  = drawCanvas.height;

  const out = document.createElement('canvas');
  out.width = cssW; out.height = cssH;
  const octx = out.getContext('2d');
  octx.clearRect(0, 0, cssW, cssH);
  octx.drawImage(drawCanvas, 0, 0, pxW, pxH, 0, 0, cssW, cssH);

  let src = out.toDataURL('image/webp', 0.7); // a bit more compressed—full canvas can be big
  if (src.length > 1_200_000) {               // safety squeeze if needed
    const try2 = out.toDataURL('image/webp', 0.55);
    if (try2.length < src.length) src = try2;
  }
  return { src, left: 0, top: 0, width: cssW, height: cssH };
}








// ribbon button → open picker
btnImage.addEventListener('click', () => {
  imgPicker.click();
});

// picker change → insert each selected image sequentially
imgPicker.addEventListener('change', async (e) => {
  const files = Array.from(e.target.files || []);
  for (const f of files) {
    await insertImageAtCaretFromFile(f);
  }
  // CORRECTED: If in draw mode, resize the canvas to fit the new image
  if (drawModeOn) {
    syncDrawCanvasSize();
  }
  imgPicker.value = '';

  // ADD THIS LINE to update the button's visibility
  updateReviewButtonVisibility();
});



// Keep checkbox state in the saved HTML (toggle the "checked" attribute)
previewText.addEventListener('change', (e) => {
  if (e.target && e.target.matches('input[type="checkbox"]')) {
    if (e.target.checked) e.target.setAttribute('checked', '');
    else e.target.removeAttribute('checked');
    // Trigger save
    previewText.dispatchEvent(new InputEvent('input', { bubbles: true }));
  }
});

// Pressing Enter inside a checkbox row inserts the next checkbox row
// When checkbox mode is ON, Enter inserts a new checkbox line at the caret.
// Shift+Enter still inserts a normal newline.
previewText.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && checkboxModeOn) {
    e.preventDefault();
    insertCheckboxAtCaret();
  }
});




  // ----- Local fallback key -----
  const LS_KEY = 'flipcards.notes.fallback';

  // ----- State -----
  let db = null;
  let auth = null;
  let storage = null; // Firebase Storage reference
  let notes = [];    // local cache for render/search
  let memberListenerUnsubscribe = null;
let dropdownListenersUnsubscribe = [];
  let query = '';
  let unsubscribe = null;
  let firebaseReady = false;
  // focus/scroll coordination after render()
let pendingFocusId = null;   // the id we want to focus after render/snapshot
let pendingScrollId = null;  // the id we want to scroll into view
let currentPreviewNote = null;   // ← which note is open in the small preview modal


  ensureFirebase().then(ok => attachRealtime(ok));


  // ======================================
  // Firebase loader (compat SDK, no bundler)
  // ======================================
  function injectScript(src) {
    return new Promise((resolve, reject) => {
      // don't inject twice
      if ([...document.scripts].some(s => s.src.includes(src))) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function ensureFirebase() {
    if (firebaseReady) return true;
    try {
      await injectScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
      await injectScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js');
      await injectScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js');
      await injectScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-storage-compat.js'); // ADDED STORAGE SDK

      if (!window.firebase?.apps?.length) {
        window.firebase.initializeApp(firebaseConfig);
      }
      auth = window.firebase.auth();
      db = window.firebase.firestore();
      storage = window.firebase.storage(); // Initialize Storage
      firebaseReady = true;
      // Re-attach the listener once a user is known
auth.onAuthStateChanged((u) => {
  // only attach if not already attached and we now have an email
  if (u?.email && !unsubscribe) {
    attachRealtime(true);
  }
});

      return true;
    } catch (e) {
      console.error('Firebase load/init failed:', e);
      return false;
    }
  }

  // Get user email: Auth > localStorage > global override
  function getEmail() {
    const aUser = auth?.currentUser;
    if (aUser?.email) return aUser.email;
    const ls = localStorage.getItem('userEmail');
    if (ls) return ls;
    return window.FC_USER_EMAIL || null;
  }

  // =====================
  // Modal open/close
  // =====================
openBtn?.addEventListener('click', async () => {
  // 1) Slide miniProfile out, then hide it
  const mp = document.getElementById('miniProfile');
  if (mp) {
    mp.classList.remove('mp-slide-in');
    mp.classList.add('mp-slide-out');
    mp.addEventListener('animationend', function onEnd() {
      mp.style.display = 'none';          // fully disappear after slide
      mp.removeEventListener('animationend', onEnd);
    }, { once: true });
  }

  // 2) Proceed as before
  await ensureFirebase();
  openModal();
});




  closeBtn?.addEventListener('click', () => closeModal());

  document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  // Close the preview first if it's open
  if (previewBackdrop.style.display === 'grid') {
    closePreview();
    return;
  }
  // Otherwise close the base Notepad modal
  if (!backdrop.classList.contains('hidden')) {
    closeModal();
  }
});


function openModal() {
  console.log("--- openModal() called ---");
  console.log("Body overflow BEFORE change:", document.body.style.overflow);
   // ▼▼▼ ADD THESE TWO LINES ▼▼▼
    list.classList.remove('hidden');
    classInfoView.classList.add('hidden');
    // ▲▲▲
    attachDropdownListeners(); //  ADD THIS LINE
  backdrop.classList.remove('hidden');
  backdrop.setAttribute('aria-hidden', 'false'); // <-- ADD THIS LINE
    document.documentElement.style.overflow = 'hidden'; // Lock the <html> tag
  document.body.style.overflow = 'hidden';         // Lock the <body> tag
    // ▼▼▼ ADD THIS NEW LOGIC ▼▼▼
  // Check localStorage and show the "How to Use" modal if it's the user's first time.
  if (localStorage.getItem('seenNotesHowTo') !== 'true') {
    openHowTo();
  }
  // ▲▲▲ END OF NEW LOGIC ▲▲▲
  console.log("Body overflow AFTER change:", document.body.style.overflow);
  setTimeout(() => searchInput?.focus(), 60);
}
function closeModal() {
  // Add the class that triggers the CSS animation
  backdrop.classList.add('is-closing');

  // Listen for the animation to complete, then hide the element
  backdrop.addEventListener('animationend', () => {
    backdrop.classList.add('hidden');
    backdrop.classList.remove('is-closing'); // Reset for next time
  }, { once: true }); // The listener removes itself after running once

  // --- The rest of the cleanup can run immediately ---
  backdrop.setAttribute('aria-hidden', 'true');
  document.documentElement.style.overflow = ''; // Restore <html> scroll
  detachDropdownListeners(); // ADD THIS LINE
  detachMemberListener();    // ADD THIS LINE
  document.body.style.overflow = '';         // Restore <body> scroll

  // Restore miniProfile (slide back in)
  const mp = document.getElementById('miniProfile');
  if (mp) {
    mp.style.display = '';                // unhide
    mp.classList.remove('mp-slide-out');  // clear previous state
    mp.classList.add('mp-slide-in');      // play slide-in
  }
}

// === Preview modal logic ===
let previewSaveTitle = null;
let previewSaveText  = null;
function updateReviewButtonVisibility() {
  // Read the live content directly from the editor
  const content = previewText.innerHTML || '';

  const isPdfNote = content.includes('alt="PDF Page');
  const hasImages = content.includes('<img');

  // Hide the button if the note is from a PDF OR if it has no images
  if (isPdfNote || !hasImages) {
    reviewBtn.style.display = 'none';
  } else {
    reviewBtn.style.display = ''; // Use '' to revert to its default style
  }
}
// REPLACE the existing function with this new version

function openPreview(note, isShared = false) { // <-- Added 'isShared' parameter
  const previewRibbon = document.getElementById('previewRibbon');

  // ▼▼▼ THIS IS THE NEW LOGIC ▼▼▼
  // Hide ribbon for shared notes, show for personal notes
  if (isShared) {
    previewRibbon.style.display = 'none';
    // Also make the text non-editable for shared notes
    previewText.contentEditable = 'false';
    previewTitleInput.readOnly = true;
  } else {
    previewRibbon.style.display = 'flex';
    // Make sure text is editable for personal notes
    previewText.contentEditable = 'true';
    previewTitleInput.readOnly = false;
  }
  // ▲▲▲ END OF NEW LOGIC ▲▲▲

  // --- The rest of the function remains the same ---
  previewTitleHeading.textContent = 'Title: ' + (note.title?.trim() || '(Untitled)');
  previewTitleInput.value = note.title || '';
  previewText.innerHTML = note.text || '';
  currentPreviewNote = note;
currentPreviewNote.isShared = isShared; // Remember if the note is shared
  updateReviewButtonVisibility();
  console.log('[DRAW][state] currentPreviewNote =', currentPreviewNote?.id);
  annotationStatus.textContent = drawModeOn ? '<-- Click to Save' : '<-- Click to Add Drawing/Notes';

  if (!drawModeOn && drawCanvas.parentNode) {
    drawCanvas.parentNode.removeChild(drawCanvas);
  }

  const existing = document.getElementById('noteDrawOverlay');
  if (existing) existing.remove();

  if (note.drawLayer && note.drawLayer.src) {
    console.log('[DRAW][rehydrate] found drawLayer for note.id=', note.id);
    const overlay = document.createElement('img');
    overlay.id = 'noteDrawOverlay';
    overlay.src = note.drawLayer.src;
    overlay.style.position = 'absolute';
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = '3';
    overlay.style.left = '0px';
    overlay.style.top = '0px';
    previewText.appendChild(overlay);
    overlay.style.display = 'block';
    requestAnimationFrame(() => {
      resizeOverlaysForReview();
    });
  } else {
    console.log('[DRAW][rehydrate] no drawLayer for note.id=', note.id);
  }

  previewSaveTitle = debounce(async (val) => { await persist(note.id, { title: val }); }, 200);
  previewSaveText = debounce(async (val) => { await persist(note.id, { text: val }); }, 200);

  previewTitleInput.oninput = () => {
    if (isShared) return; // Prevent editing shared note titles
    const val = previewTitleInput.value;
    const idx = notes.findIndex(n => n.id === note.id);
    if (idx >= 0) notes[idx].title = val;
    previewTitleHeading.textContent = 'Title: ' + (val.trim() || '(Untitled)');
    previewSaveTitle(val);
  };
  previewText.oninput = () => {
    if (isShared) return; // Prevent editing shared note text
    const val = previewText.innerHTML;
    const idx = notes.findIndex(n => n.id === note.id);
    if (idx >= 0) notes[idx].text = val;
    previewSaveText(val);
  };

  checkboxModeOn = false;
  btnChecklist.classList.remove('active');
  btnChecklist.textContent = '☑︎';
  btnChecklist.title = 'Checkbox mode: OFF — Enter inserts a normal line';

  previewBackdrop.style.display = 'grid';
  document.body.style.overflow = 'hidden';

  if (typeof ResizeObserver !== 'undefined') {
    try { _editorRO && _editorRO.disconnect(); } catch {}
    _editorRO = new ResizeObserver(() => {
      applyReviewScale();
      resizeOverlaysForReview();
      if (drawModeOn && typeof syncDrawCanvasSize === 'function') {
        syncDrawCanvasSize();
      }
    });
    if (previewText && previewText.isConnected) {
      _editorRO.observe(previewText);
    }
  }

  setTimeout(() => previewTitleInput?.focus(), 30);
}

// Replace the function above with this new version
async function closePreview() {
  // If drawing is on and the user has drawn something, ask for confirmation.
  if (drawModeOn && drawHasStrokes) {
    const confirmed = await showCustomConfirm('Are you sure you want to exit? Your drawing progress will be lost.');
    if (!confirmed) {
      return; // Stop the function if the user clicks "Cancel"
    }
  }

  // If the user confirms OR if drawing wasn't active, proceed with the original cleanup.
  drawModeOn = false;
  drawHasStrokes = false; // Ensure progress is always discarded
  btnDraw.classList.remove('active');
  drawPalette.style.display = 'none';
  drawPalette.style.opacity = '0';
  drawPalette.style.transform = 'translateX(10px)';
  const ov = previewText.querySelector('#noteDrawOverlay');
  if (ov) ov.remove();
  if (drawCtx) {
    try { drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height); } catch {}
  }
  if (drawCanvas.parentNode) drawCanvas.parentNode.removeChild(drawCanvas);
  previewText.style.userSelect = '';
  previewText.style.caretColor = '';
  previewText.style.cursor = '';
  previewTitleInput.oninput = null;
  previewText.oninput = null;
  currentPreviewNote = null;
  annotationStatus.textContent = '<-- Click to Add Drawing/Notes';
  previewBackdrop.style.display = 'none';
  document.body.style.overflow = '';
  previewModal.classList.remove('review-mode');
  previewBackdrop.classList.remove('review-mode');
  previewText.classList.remove('review-mode');
  const _rmBtn = document.getElementById('reviewModeBtn');
  if (_rmBtn) {
    _rmBtn.classList.remove('active');
    _rmBtn.textContent = 'Review Mode';
  }
  if (previewModal.dataset.origW) previewModal.style.width  = previewModal.dataset.origW || '';
  if (previewModal.dataset.origH) previewModal.style.height = previewModal.dataset.origH || '';
  try { _editorRO && _editorRO.disconnect(); } catch {}
  _editorRO = null;
  delete previewEditorWrap.dataset.baseW;
  delete previewEditorWrap.dataset.baseH;
  previewEditorWrap.style.transform = '';
  previewEditorWrap.style.width = '';
  previewText.scrollLeft = 0;
  previewEditorWrap.scrollLeft = 0;
  console.log('[DRAW][state] cleared currentPreviewNote and removed canvas/overlay');
}



// Close interactions
previewCloseBtn?.addEventListener('click', () => {
  // If in review mode, clicking "X" should exit review mode first.
  if (previewModal.classList.contains('review-mode')) {
    reviewBtn.click(); // Programmatically click the review button to exit the mode.
    closePreview();
  } else {
    // Otherwise, close the preview modal as normal.
    closePreview();
  }
});


  // =====================
  // Realtime attach
  // =====================
  function attachRealtime(firebaseOK) {
    const email = getEmail();

    // already listening
    if (unsubscribe) return;

    if (firebaseOK && db && email) {
      const colRef = db.collection('notepad').doc(email).collection('notes');
unsubscribe = colRef.orderBy('index', 'desc').onSnapshot(
  (qs) => {
notes = qs.docs.map(d => ({
  id: d.id,
  index: d.data().index,
  prevIndex: d.data().prevIndex ?? null,
  title: d.data().title || '',
  text: d.data().text || '',
  checklist: Array.isArray(d.data().checklist) ? d.data().checklist : [],
  pinned: !!d.data().pinned,
  color: d.data().color || null,
  drawLayer: d.data().drawLayer || null  // ← NEW
}));



    console.log('[SNAPSHOT] size:', qs.size, 'pendingFocusId:', pendingFocusId, 'pendingScrollId:', pendingScrollId);
    render();

    if (pendingFocusId) {
      const id = pendingFocusId;
      // clear flags first so we don’t loop
      pendingFocusId = null;
      const doScroll = !!pendingScrollId && pendingScrollId === id;
      pendingScrollId = null;

      // wait one frame so layout is final
      requestAnimationFrame(() => {
        console.log('[SNAPSHOT] focusing after render →', id, 'doScroll:', doScroll);
        focusNote(id, 'title', doScroll);
      });
    }
  },
  (err) => {
    console.error('Firestore realtime error:', err);
    notes = loadLocal();
    render();
  }
);

    }
  }

  // =====================
  // Create a new note
  // =====================
  addBtn?.addEventListener('click', async () => {
    const email = getEmail();
      // If search is active, clear it so the new (empty) note is visible
  if (query) {
    query = '';
    if (searchInput) searchInput.value = '';
  }

    if (db && email) {
        console.log('[ADD] click; email:', email, 'db?', !!db);

      try {
        const colRef = db.collection('notepad').doc(email).collection('notes');
        // Compute next number (index)
        const snap = await colRef.orderBy('index', 'desc').limit(1).get();
        const nextIndex = snap.empty ? 1 : Number(snap.docs[0].data().index) + 1;
 const docId = String(nextIndex);
console.log('[ADD] click; email:', email, 'db?', !!db);

// tell the snapshot what to focus/scroll after it re-renders
pendingFocusId = docId;
pendingScrollId = docId;

await colRef.doc(docId).set({
  index: nextIndex,
  prevIndex: null,
  title: '',
  text: '',
  checklist: [],
  pinned: false,
  color: null          // ← NEW
});


// Optimistic update (guarded)
if (!notes.some(n => String(n.id) === String(docId))) {
  notes.push({ id: docId, index: nextIndex, prevIndex: null, title: '', text: '', checklist: [], pinned: false, color: null });

  console.log('[ADD] optimistic push → render() + focus', docId);
  render();
  // keep immediate UX snappy; snapshot will re-focus too, that’s fine
  focusNote(docId, 'title', true);
}



// Optional: remove the delayed second focus to avoid double calls
// setTimeout(() => focusNote(docId), 150);

      } catch (e) {
        console.error('Add note failed, using local fallback:', e);
        addLocal();
      }
    } else {
      addLocal();
    }
  });

function addLocal() {
  const nextIndex = (notes.reduce((m, n) => Math.max(m, n.index || 0), 0) || 0) + 1;

  // If search is active, clear it so the new note is visible
  if (query) {
    query = '';
    if (searchInput) searchInput.value = '';
  }

  const id = String(nextIndex);
  notes.push({ id, index: nextIndex, title: '', text: '', checklist: [], pinned: false, color: null });


  // set flags so our post-render focus path is consistent with cloud path
  pendingFocusId = id;
  pendingScrollId = id;

  saveLocal();
  render();
  console.log('[ADD:local] pushed + render() → focus', id);
  focusNote(id, 'title', true);
}




  // =====================
  // Search
  // =====================
  let searchTimer;
  searchInput?.addEventListener('input', (e) => {
    query = e.target.value.trim().toLowerCase();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(render, 120);
  });
// Sort helper: pinned first; within pinned = newest first; within unpinned = oldest first
function sortNotes(a, b) {
  if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;   // pinned first
  if (a.pinned && b.pinned) return (b.index || 0) - (a.index || 0); // pinned: newer→older
  return (a.index || 0) - (b.index || 0);                    // unpinned: older→newer
}
const filtered = query
  ? notes.filter(/* …as-is… */)
  : notes;
filtered.sort(sortNotes);

console.log('[RENDER] query =', query, 'notes.length =', notes.length, 'filtered.length =', filtered.length);

  // =====================
  // Render
  // =====================
function render() {
  // 1) Remember where focus is (title vs text) and caret
  const active = document.activeElement;
  const activeCard = active?.closest?.('.note-card');

  let keep = null;
  if (activeCard) {
    const isTitle = active.classList?.contains('note-card-title');
    let caret = null;

    if (isTitle && typeof active.selectionStart === 'number') {
      caret = active.selectionStart;                  // input[type=text]
    } else if (active.classList?.contains('note-text')) {
      caret = getContentEditableCaretIndex(active);   // contentEditable
    }

    keep = { id: activeCard.dataset.id, isTitle, caret };
  }

  // 2) Rebuild list (your existing code unchanged) …
  list.innerHTML = '';
  const filtered = query
    ? notes.filter(n =>
        (n.title || '').toLowerCase().includes(query) ||
        (n.text  || '').toLowerCase().includes(query))
    : notes;
filtered.sort(sortNotes);

  if (!filtered.length) {
    const empty = document.createElement('div');
    empty.className = 'note-empty';
    const email = getEmail();
    empty.textContent = query
      ? 'No matching notes.'
      : (db && email ? 'Click + to create your first note.' : 'Sign in or set an email to save notes online.');
    list.appendChild(empty);
    return;
  }

  filtered.forEach(n => list.appendChild(renderCard(n)));

  // 3) Restore focus + caret
  if (keep) {
    const selector = keep.isTitle ? '.note-card-title' : '.note-text';
    const el = list.querySelector(`[data-id="${keep.id}"] ${selector}`);
    if (el) {
      el.focus();
      if (keep.isTitle && keep.caret != null && typeof el.setSelectionRange === 'function') {
        try { el.setSelectionRange(keep.caret, keep.caret); } catch {}
      } else if (!keep.isTitle && keep.caret != null) {
        setContentEditableCaretIndex(el, keep.caret);
      }
    }
  }
}



  function renderCard(note) {
    const wrap = document.createElement('div');
    wrap.className = 'note-card';
    wrap.dataset.id = note.id;
    wrap.style.position = 'relative';

    // Apply saved color (if any)
if (note.color) {
  wrap.style.background = note.color;
  wrap.style.backgroundColor = note.color;
}

    // If this note has a saved color, apply it
if (note.color) {
  wrap.style.background = note.color;
  wrap.style.backgroundColor = note.color;
}

// If pinned, mark the card and show a small badge
if (note.pinned) {
  wrap.classList.add('is-pinned');
  const badge = document.createElement('div');
  badge.className = 'note-pin-badge';
  badge.textContent = '📌';
  wrap.appendChild(badge);
}

    const head = document.createElement('div');
    head.className = 'note-card-header';

    const title = document.createElement('input');
    title.className = 'note-card-title';
    title.value = note.title || '';
    title.placeholder = 'Input Title';
    const saveTitle = debounce(async (val) => {
  await persist(note.id, { title: val });
}, 200);

title.addEventListener('input', () => {
  const val = title.value;
  const idx = notes.findIndex(n => n.id === note.id);
  if (idx >= 0) notes[idx].title = val;   // keep local cache in sync immediately
  saveTitle(val);                          // debounce server write
});

title.addEventListener('blur', async () => {
  const val = title.value;
  const idx = notes.findIndex(n => n.id === note.id);
  if (idx >= 0) notes[idx].title = val;
  await persist(note.id, { title: val });  // flush on blur to avoid losing changes
});


    const tools = document.createElement('div');
    tools.className = 'note-card-tools';

    const del = document.createElement('button');
    del.className = 'note-tool';
    del.title = 'Delete';
    del.textContent = '🗑';
    del.addEventListener('click', async () => {
      await remove(note.id);
    });

    tools.appendChild(del);
    head.appendChild(title);
    head.appendChild(tools);

    const text = document.createElement('div');
    text.className = 'note-text';
    text.contentEditable = 'true';
    text.spellcheck = false;
    text.innerHTML = note.text || '';

    const saveText = debounce(async (val) => {
  await persist(note.id, { text: val });
}, 200);

text.addEventListener('input', () => {
  const val = text.innerHTML;

  const idx = notes.findIndex(n => n.id === note.id);
  if (idx >= 0) notes[idx].text = val;     // keep local cache up-to-date instantly
  saveText(val);                            // debounce server write
});

text.addEventListener('blur', async () => {
  const val = text.innerHTML;

  const idx = notes.findIndex(n => n.id === note.id);
  if (idx >= 0) notes[idx].text = val;
  await persist(note.id, { text: val });    // flush on blur so snapshot won't wipe it
});
// Keep checkbox state when clicked inside the card editor
text.addEventListener('change', (e) => {
  if (e.target && e.target.matches('input[type="checkbox"]')) {
    // mirror the property into the HTML attribute so it persists
    if (e.target.checked) e.target.setAttribute('checked', '');
    else e.target.removeAttribute('checked');

    // re-use the existing input saver on this editor
    text.dispatchEvent(new InputEvent('input', { bubbles: true }));
  }
});
// ▼▼▼ ADD THE NEW "ADD TO CLASS" BUTTON HERE ▼▼▼
const addToClassBtn = document.createElement('button');
addToClassBtn.className = 'note-card-action-btn note-add-to-class';
addToClassBtn.type = 'button';
addToClassBtn.title = 'Add to Class';
addToClassBtn.innerHTML = `<img src="sharetoclass.png" alt="Add to Class">`;
addToClassBtn.addEventListener('click', () => {
    openAddToClassModal(note);
});
// ▲▲▲ END OF NEW BUTTON ▲▲▲
// ▶ Expand button → opens Preview Modal
const expandBtn = document.createElement('button');
expandBtn.className = 'note-expand note-card-action-btn';
expandBtn.type = 'button';
expandBtn.title = 'Expand';
expandBtn.textContent = '⤢';
// Minimal inline position in case CSS isn't present:
expandBtn.style.cssText = 'position:absolute; right:10px; bottom:10px; width:32px; height:32px; border-radius:10px; border:1px solid #000; background:#171717; color:#fff; cursor:pointer;';

// Change the line to this
expandBtn.addEventListener('click', () => {
  openPreview(note, false); // <-- Add false here
});


// ▶ Pin button → move card to top
const pinBtn = document.createElement('button');
pinBtn.className = 'note-pin note-card-action-btn';
pinBtn.type = 'button';
pinBtn.title = 'Pin to top';
pinBtn.textContent = '📌';
// reflect pinned state visually
pinBtn.classList.toggle('active', !!note.pinned);

// place it to the LEFT of the expand button
pinBtn.style.cssText = 'position:absolute; right:50px; bottom:10px; width:32px; height:32px; border-radius:10px; border:1px solid #000; background:#171717; color:#fff; cursor:pointer;';
pinBtn.title = note.pinned ? 'Unpin' : 'Pin to top';
// ▶ Color button → small palette popup
const colorBtn = document.createElement('button');
colorBtn.className = 'note-color note-card-action-btn';
colorBtn.type = 'button';
colorBtn.title = 'Color';
colorBtn.textContent = '🎨';
// match button look/position with the others (left of 📌)
colorBtn.style.cssText = 'position:absolute; right:90px; bottom:10px; width:32px; height:32px; border-radius:10px; border:1px solid #000; background:#171717; color:#fff; cursor:pointer;';

// Small popup palette (appears to the LEFT of the color button)
const colorPop = document.createElement('div');
colorPop.className = 'note-color-pop';
colorPop.style.cssText = `
  position:absolute; display:none; z-index:5;
  padding:8px; border-radius:10px; border:1px solid #000; background:#171717;
  box-shadow: 6px 6px 12px #0f0f0f, -6px -6px 12px #1f1f1f, inset 1px 1px 0 rgba(255,255,255,0.04), inset -1px -1px 0 rgba(0,0,0,0.55);
  gap:6px; flex-wrap:wrap; width:168px;
`;


// ---- Palette (CHANGE THESE COLORS ANYTIME) ----
const COLORS = [
  '#1f2937', // slate-800 (default-ish)
  '#0ea5e9', // sky-500
  '#22c55e', // green-500
  '#eab308', // yellow-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#f97316', // orange-500
  '#14b8a6', // teal-500
  '#64748b', // slate-500
  '#ffffffff', // white
  '#f2ff00ff',
  '#ff0000ff',
  '#640D5F', // purple-900
  '#CFAB8D',
  '#3E0703',
  '#FFDCDC',
  '#111827'  // gray-900 (nearly black)
];
// ----------------------------------------------

// Build swatches
function makeSwatch(c) {
  const sw = document.createElement('button');
  sw.type = 'button';
  sw.title = c || 'None';
  sw.style.cssText = `
    width:22px; height:22px; border-radius:6px; border:1px solid #333;
    background:${c || 'transparent'};
    cursor:pointer;
  `;
  sw.addEventListener('click', async (e) => {
    e.stopPropagation();
    await applyColor(c || null);
    colorPop.style.display = 'none';
  });
  return sw;
}

// “None” swatch (clear color)
const none = makeSwatch(null);
none.textContent = '×';
none.style.color = '#fff';
none.style.fontSize = '14px';
none.style.display = 'grid';
none.style.placeItems = 'center';

colorPop.appendChild(none);
COLORS.forEach(c => colorPop.appendChild(makeSwatch(c)));

async function applyColor(c) {
  // update UI immediately
  wrap.style.background = c || '';
  wrap.style.backgroundColor = c || '';

  // update cache + persist
  const idx = notes.findIndex(n => n.id === note.id);
  if (idx >= 0) notes[idx].color = c || null;

  await persist(note.id, { color: c || null });
}

// Toggle + position the popup (to the LEFT of the button)
colorBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const showing = colorPop.style.display !== 'none';
  colorPop.style.display = showing ? 'none' : 'flex';

  if (!showing) {
    // position relative to the card so it sits left of the color button
    const btnRect = colorBtn.getBoundingClientRect();
    const wrapRect = wrap.getBoundingClientRect();
    const left = (btnRect.left - wrapRect.left) - (168 + 12); // pop width + gap
    const top  = (btnRect.top  - wrapRect.top);
    colorPop.style.left = `${Math.max(6, left)}px`;
    colorPop.style.top  = `${Math.max(6, top - 40)}px`;
  }
});


// Click outside → close palette for this card
document.addEventListener('click', (ev) => {
  if (!wrap.contains(ev.target)) colorPop.style.display = 'none';
});

pinBtn.addEventListener('click', async (e) => {
  e.stopPropagation();

  const i = notes.findIndex(n => n.id === note.id);
  if (i < 0) return;

  if (!notes[i].pinned) {
    // --- PIN ---
    const nextIndex = (notes.reduce((m, n) => Math.max(m, n.index || 0), 0) || 0) + 1;
    const prev = notes[i].index || 0;

    // optimistic local
    notes[i].prevIndex = prev;
    notes[i].index = nextIndex;
    notes[i].pinned = true;

    // move to front now
    const [item] = notes.splice(i, 1);
    notes.unshift(item);

    render();

    // persist
    await persist(note.id, { pinned: true, prevIndex: prev, index: nextIndex });
  } else {
    // --- UNPIN ---
    const prev = notes[i].prevIndex ?? notes[i].index ?? 0;

    // optimistic local
    notes[i].pinned = false;
    notes[i].index = prev;
    notes[i].prevIndex = null;

    // re-sort locally by index desc so it falls back into place
    notes.sort(sortNotes);


    render();

    // persist (delete prevIndex if Firestore is available; else set null)
    let patch = { pinned: false, index: prev, prevIndex: null };
    if (window.firebase?.firestore?.FieldValue?.delete) {
      patch.prevIndex = window.firebase.firestore.FieldValue.delete();
    }
    await persist(note.id, patch);
  }
});





    wrap.appendChild(head);
wrap.appendChild(text);
wrap.appendChild(addToClassBtn); 
wrap.appendChild(colorBtn);
wrap.appendChild(colorPop);
wrap.appendChild(pinBtn);
wrap.appendChild(expandBtn);
return wrap;


  }
// PASTE this entire block of new functions here

let activeNoteForAdding = null;

function openAddToClassModal(note) {
    activeNoteForAdding = note;
    document.getElementById('addToClassTitle').textContent = `Add "${note.title || 'Untitled Note'}" to...`;
    populateAddToClassList();
    document.getElementById('addToClassBackdrop').classList.remove('hidden');
}

function closeAddToClassModal() {
    document.getElementById('addToClassBackdrop').classList.add('hidden');
    activeNoteForAdding = null;
}

// in note.js

// REPLACE the existing function with this new version
async function populateAddToClassList() {
    const listElement = document.getElementById('addToClassList');
    listElement.innerHTML = '<li>Loading your classes...</li>';
    const user = auth.currentUser;
    if (!user) {
        listElement.innerHTML = '<li>You must be logged in.</li>';
        return;
    }

    try {
        const classesMap = new Map();

        // Query 1: Get classes created by the user
        const createdClassesRef = db.collection('Class').doc(user.email).collection('userClasses');
        const createdSnapshot = await createdClassesRef.get();
        createdSnapshot.forEach(doc => {
            classesMap.set(doc.id, { id: doc.id, creatorEmail: user.email, ...doc.data() });
        });

        // Query 2: Get classes where the user is a co-creator
        const coCreatorQuery = db.collectionGroup('members')
                                 .where('role', '==', 'creator');
        const coCreatorSnapshot = await coCreatorQuery.get();

        for (const memberDoc of coCreatorSnapshot.docs) {
            // Only consider classes where the current user is a co-creator but not the original creator
            if (memberDoc.id === user.email) {
                const classRef = memberDoc.ref.parent.parent; // Navigate up to the class document
                if (!classesMap.has(classRef.id)) {
                    const classDoc = await classRef.get();
                    if (classDoc.exists) {
                       const classData = classDoc.data();
                       classesMap.set(classDoc.id, { id: classDoc.id, creatorEmail: classData.createdBy, ...classData });
                    }
                }
            }
        }

        if (classesMap.size === 0) {
            listElement.innerHTML = '<li>You have no classes available to add notes to.</li>';
            return;
        }

        let classHtml = '';
        classesMap.forEach(classData => {
            classHtml += `
                <li>
                    <button class="neumorphic-button" data-class-id="${classData.id}" data-creator-email="${classData.creatorEmail}" style="width: 100%; text-align: left;">
                        ${classData.className}
                    </button>
                </li>
            `;
        });
        listElement.innerHTML = classHtml;

        // Add event listeners
        listElement.querySelectorAll('button').forEach(button => {
            button.addEventListener('click', (e) => {
                const classId = e.currentTarget.dataset.classId;
                const creatorEmail = e.currentTarget.dataset.creatorEmail;
                addNoteToClass(creatorEmail, classId);
            });
        });

    } catch (error) {
        console.error("Error fetching classes for 'Add to Class' modal:", error);
        listElement.innerHTML = '<li>Could not load classes. Check console for index errors.</li>';
        // NOTE: This query might require a Firestore index. If it fails, the console will provide a link to create it.
    }
}

async function addNoteToClass(creatorEmail, classId) {
    if (!activeNoteForAdding) return;

    const noteData = {
        title: activeNoteForAdding.title || '',
        text: activeNoteForAdding.text || '',
        drawLayer: activeNoteForAdding.drawLayer || null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        addedBy: auth.currentUser.email
    };

    try {
        const classNotesRef = db.collection('Class').doc(creatorEmail).collection('userClasses').doc(classId).collection('notes');
        await classNotesRef.doc(activeNoteForAdding.id).set(noteData);
        showCustomAlert('Note successfully added to class!', 'success');
         await logClassActivity(classId, creatorEmail, `Note "${noteData.title || 'Untitled'}"  by the Creator/Co Creator.`);
        closeAddToClassModal();
    } catch (error) {
        console.error("Error adding note to class:", error);
        showCustomAlert('Failed to add note.', 'error');
    }
}
// PASTE THIS NEW FUNCTION HERE
// ======================================
// ▼▼▼ NEW FUNCTION TO DISPLAY CLASS NOTES ▼▼▼
// ======================================
let classNotesUnsubscribe = null; // To manage the real-time listener

// REPLACE the existing displayClassNotes function with this one

// REPLACE the existing displayClassNotes function with this one

function displayClassNotes(creatorEmail, classId) {
  const noteListContainer = document.getElementById('classNoteList');
  if (!noteListContainer) return;

  if (classNotesUnsubscribe) {
    classNotesUnsubscribe();
  }

  noteListContainer.innerHTML = '<div class="note-empty">Loading notes...</div>';
  const classNotesRef = db.collection('Class').doc(creatorEmail).collection('userClasses').doc(classId).collection('notes');

  classNotesUnsubscribe = classNotesRef.onSnapshot(async (snapshot) => {
    if (snapshot.empty) {
      noteListContainer.innerHTML = '<div class="note-empty">No notes have been shared to this class yet.</div>';
      return;
    }

    const cardPromises = snapshot.docs.map(doc => {
      const noteData = { id: doc.id, ...doc.data() };
      // ▼▼▼ THIS LINE IS UPDATED ▼▼▼
      return renderSharedNoteCard(noteData, creatorEmail); // Pass creatorEmail here
    });

    const noteCards = await Promise.all(cardPromises);

    noteListContainer.innerHTML = '';
    noteCards.forEach(card => noteListContainer.appendChild(card));

  }, error => {
    console.error("Error fetching class notes: ", error);
    noteListContainer.innerHTML = '<div class="note-empty">Could not load notes.</div>';
  });
}

// A simplified card renderer for shared notes
// REPLACE the existing function with this new version

// A card renderer for shared notes, now with an expand button
// REPLACE the existing function with this new async version

// A card renderer for shared notes that now fetches the username
// REPLACE the existing function with this new version

// REPLACE the existing function with this new version

async function renderSharedNoteCard(note, creatorEmail) {
  const wrap = document.createElement('div');
  wrap.className = 'note-card';
  wrap.dataset.id = note.id;

  const head = document.createElement('div');
  head.className = 'note-card-header';
  const title = document.createElement('div');
  title.className = 'note-card-title';
  title.textContent = note.title || '(Untitled)';
  title.style.cssText = `background-color: transparent; box-shadow: none; padding: 0;`;
  head.appendChild(title);

  const text = document.createElement('div');
  text.className = 'note-text';
  text.innerHTML = note.text || '';
  text.contentEditable = 'false';

  const expandBtn = document.createElement('button');
  expandBtn.className = 'note-expand note-card-action-btn';
  expandBtn.type = 'button';
  expandBtn.title = 'Expand Note';
  expandBtn.textContent = '⤢';
  expandBtn.addEventListener('click', () => {
    openPreview(note, true);
  });

  wrap.appendChild(head);
  wrap.appendChild(text);

  // --- Permission logic for the delete button ---
  const user = auth.currentUser;
  let isAllowedToDelete = false;

  if (user) {
    // Check if the user is the original creator
    if (user.email === creatorEmail) {
      isAllowedToDelete = true;
    } else {
      // If not, check if they are a co-creator
      const classId = window.activeClassContext.id;
      const memberDoc = await db.collection('Class').doc(creatorEmail)
                                .collection('userClasses').doc(classId)
                                .collection('members').doc(user.email).get();
      if (memberDoc.exists && memberDoc.data().role === 'creator') {
        isAllowedToDelete = true;
      }
    }
  }

  // ▼▼▼ THIS SECTION HAS BEEN REORDERED TO FIX STACKING ▼▼▼

  // 1. Add the footer FIRST.
  if (note.addedBy) {
    const footer = document.createElement('div');
    footer.textContent = 'Loading author...';
    footer.style.cssText = `font-size: 11px; opacity: 0.6; text-align: left; margin-top: 8px; padding-left: 4px;`;
    wrap.appendChild(footer);
    const username = await getUsernameFromEmail(note.addedBy);
    footer.textContent = `Added by: ${username}`;
  }

  // 2. Add the delete button (if applicable) SECOND.
  if (isAllowedToDelete) {
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'note-delete-shared note-card-action-btn';
    deleteBtn.type = 'button';
    deleteBtn.title = 'Delete Note from Class';
    deleteBtn.innerHTML = `<img src="deleteclass.png" alt="Delete">`;
    deleteBtn.addEventListener('click', () => {
      handleDeleteSharedNote(creatorEmail, window.activeClassContext.id, note.id);
    });
    wrap.appendChild(deleteBtn);
  }

  // 3. Add the expand button LAST so it's on the very top.
  wrap.appendChild(expandBtn);

  // ▲▲▲ END OF REORDERED SECTION ▲▲▲

  return wrap;
}
// PASTE THIS NEW FUNCTION AFTER renderSharedNoteCard

async function handleDeleteSharedNote(creatorEmail, classId, noteId) {
  const confirmed = await showCustomConfirm('Are you sure you want to delete this note from the class? This cannot be undone.');
  if (!confirmed) return;

  try {
    const noteRef = db.collection('Class').doc(creatorEmail)
                      .collection('userClasses').doc(classId)
                      .collection('notes').doc(noteId);

    await noteRef.delete();
    showCustomAlert('Note removed from class successfully.', 'success');
     await logClassActivity(classId, creatorEmail, `The Creator/Co Creator Removed a Shared Note from the Class.`);
    // The real-time listener will automatically update the UI
  } catch (error) {
    console.error("Error deleting shared note:", error);
    showCustomAlert('Failed to remove the note.', 'error');
  }
}
// in note.js

// PASTE THIS NEW FUNCTION AFTER handleDeleteSharedNote
/**
 * Logs an activity for a specific class to Firestore.
 * @param {string} classId The ID of the class.
 * @param {string} creatorEmail The email of the class creator.
 * @param {string} message The log message.
 */
async function logClassActivity(classId, creatorEmail, message) {
  if (!classId || !creatorEmail || !message) return;

  try {
    const logsRef = db.collection('Class').doc(creatorEmail)
                      .collection('userClasses').doc(classId)
                      .collection('logs');

    await logsRef.add({
      message: message,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error("Failed to log class activity:", error);
  }
}// in note.js

// PASTE THIS NEW BLOCK AFTER logClassActivity
let logsUnsubscribe = null; // To manage the real-time listener for logs
let inviteListMemberUnsubscribe = null; // <-- ADD THIS LINE

// in note.js

// REPLACE the existing openLogsModal function
async function openLogsModal(creatorEmail, classId) {
  const logsBackdrop = document.getElementById('classLogsBackdrop');
  logsBackdrop.classList.remove('hidden');
  displayClassLogs(creatorEmail, classId);

  // Mark logs as read
  const user = auth.currentUser;
  if (user) {
    const lastViewedRef = db.collection('users').doc(user.email).collection('lastViewedLogs').doc(classId);
    await lastViewedRef.set({
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Immediately hide the dots
    document.querySelector('#classLogsBtnIcon .notification-dot').classList.add('hidden');
    document.querySelector('#classLogsBtnFull .notification-dot').classList.add('hidden');
    updateLogsNotification(creatorEmail, classId);
  }
}

function closeLogsModal() {
  const logsBackdrop = document.getElementById('classLogsBackdrop');
  logsBackdrop.classList.add('hidden');
  // Detach the real-time listener when the modal is closed to save resources
  if (logsUnsubscribe) {
    logsUnsubscribe();
    logsUnsubscribe = null;
  }
}
// in note.js

// PASTE THIS NEW FUNCTION AFTER closeLogsModal
let logNotificationUnsubscribe = null;

function updateLogsNotification(creatorEmail, classId) {
  const user = auth.currentUser;
  if (!user) return;

  const logsDotIcon = document.querySelector('#classLogsBtnIcon .notification-dot');
  const logsDotFull = document.querySelector('#classLogsBtnFull .notification-dot');
  if (!logsDotIcon || !logsDotFull) return;

  // Detach any previous listener
  if (logNotificationUnsubscribe) logNotificationUnsubscribe();

  const lastViewedRef = db.collection('users').doc(user.email).collection('lastViewedLogs').doc(classId);

  lastViewedRef.get().then(lastViewedDoc => {
    const lastViewedTimestamp = lastViewedDoc.exists ? lastViewedDoc.data().timestamp : null;

    const logsQuery = lastViewedTimestamp 
      ? db.collection('Class').doc(creatorEmail).collection('userClasses').doc(classId).collection('logs').where('timestamp', '>', lastViewedTimestamp)
      : db.collection('Class').doc(creatorEmail).collection('userClasses').doc(classId).collection('logs');

    logNotificationUnsubscribe = logsQuery.onSnapshot(snapshot => {
      const unreadCount = snapshot.size;

      if (unreadCount > 0) {
        logsDotIcon.textContent = unreadCount;
        logsDotFull.textContent = unreadCount;
        logsDotIcon.classList.remove('hidden');
        logsDotFull.classList.remove('hidden');
      } else {
        logsDotIcon.classList.add('hidden');
        logsDotFull.classList.add('hidden');
      }
    });
  });
}
function displayClassLogs(creatorEmail, classId) {
  const logsList = document.getElementById('classLogsList');
  if (!logsList) return;

  logsList.innerHTML = `<li>Loading logs...</li>`;
  const logsRef = db.collection('Class').doc(creatorEmail)
                    .collection('userClasses').doc(classId)
                    .collection('logs').orderBy('timestamp', 'desc');

  logsUnsubscribe = logsRef.onSnapshot(snapshot => {
    if (snapshot.empty) {
      logsList.innerHTML = `<li>No activities have been logged for this class yet.</li>`;
      return;
    }

    let logsHtml = '';
    snapshot.forEach(doc => {
      const log = doc.data();
      const date = log.timestamp ? log.timestamp.toDate().toLocaleString() : 'Just now';
      logsHtml += `
        <li>
          <span class="log-message">${log.message}</span>
          <span class="log-timestamp">${date}</span>
        </li>
      `;
    });
    logsList.innerHTML = logsHtml;

  }, error => {
    console.error("Error fetching class logs:", error);
    logsList.innerHTML = `<li>Could not load logs.</li>`;
  });
}
// in note.js
// in note.js

// PASTE THIS NEW BLOCK AFTER displayClassLogs
// in note.js

// in note.js

// REPLACE your existing function with this one
// in note.js

// REPLACE your existing function with this one
let announcementsUnsubscribe = null;

function displayAnnouncements(creatorEmail, classId) {
  const announcementsPanel = document.getElementById('classAnnouncementsPanel');
  const announcementsBtn = document.getElementById('viewAnnouncementsBtn');
  if (!announcementsPanel || !announcementsBtn) return;

  if (announcementsUnsubscribe) {
    announcementsUnsubscribe();
  }

  announcementsPanel.innerHTML = '<div class="note-empty">Loading announcements...</div>';
  const announcementsRef = db.collection('Class').doc(creatorEmail)
                             .collection('userClasses').doc(classId)
                             .collection('announcements').orderBy('timestamp', 'desc');

  announcementsUnsubscribe = announcementsRef.onSnapshot(async (snapshot) => {
    const user = auth.currentUser;
    if (!user) return;

    // Get the timestamp of the latest announcement
    const latestTimestamp = !snapshot.empty ? snapshot.docs[0].data().timestamp : null;

    if (latestTimestamp) {
      // Check when the user last viewed the announcements for this class
      const lastViewedRef = db.collection('users').doc(user.email).collection('lastViewedAnnouncements').doc(classId);
      const lastViewedDoc = await lastViewedRef.get();

      if (!lastViewedDoc.exists || lastViewedDoc.data().timestamp < latestTimestamp) {
        announcementsBtn.classList.add('has-unread'); // Add pulse animation
      } else {
        announcementsBtn.classList.remove('has-unread');
      }
    } else {
        announcementsBtn.classList.remove('has-unread');
    }

    if (snapshot.empty) {
      announcementsPanel.innerHTML = '<div class="note-empty">No announcements have been posted yet.</div>';
      return;
    }

    let announcementsHtml = '';

    for (const doc of snapshot.docs) {
      const announcement = doc.data();
      const username = await getUsernameFromEmail(announcement.postedBy);
      const date = announcement.timestamp ? announcement.timestamp.toDate().toLocaleString() : 'Just now';

      // ▼▼▼ NEW: Conditionally add a delete button ▼▼▼
      let deleteButtonHtml = '';
      if (user && user.email === creatorEmail) {
        deleteButtonHtml = `<button class="announcement-delete-btn" data-doc-id="${doc.id}">🗑</button>`;
      }
      // ▲▲▲ END OF NEW CODE ▲▲▲

      announcementsHtml += `
        <div class="announcement-card">
          <div class="announcement-header">
            <h4 class="announcement-title">${announcement.title}</h4>
            ${deleteButtonHtml}
          </div>
          <p class="announcement-description">${announcement.description}</p>
          <div class="announcement-meta">
            Posted by ${username} on ${date}
          </div>
        </div>
      `;
    }
    announcementsPanel.innerHTML = announcementsHtml;

    // Add event listeners to the new delete buttons
    announcementsPanel.querySelectorAll('.announcement-delete-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const docId = e.currentTarget.dataset.docId;
        handleDeleteAnnouncement(creatorEmail, classId, docId);
      });
    });
    // ▼▼▼ NEW ANIMATION LOGIC ▼▼▼
    // After adding the cards to the DOM, animate them one by one
    const announcementCards = announcementsPanel.querySelectorAll('.announcement-card');
    announcementCards.forEach((card, index) => {
      setTimeout(() => {
        card.classList.add('is-visible');
      }, index * 200); // 100ms delay between each card
    });
    // ▲▲▲ END OF NEW LOGIC ▲▲▲
  }, error => {
    console.error("Error fetching announcements:", error);
    announcementsPanel.innerHTML = '<div class="note-empty">Could not load announcements.</div>';
  });
}
// in note.js

// PASTE THIS NEW FUNCTION AFTER displayAnnouncements
async function handleDeleteAnnouncement(creatorEmail, classId, announcementId) {
    const confirmed = await showCustomConfirm('Are you sure you want to delete this announcement?');
    if (!confirmed) return;

    try {
        const announcementRef = db.collection('Class').doc(creatorEmail)
                                  .collection('userClasses').doc(classId)
                                  .collection('announcements').doc(announcementId);

        await announcementRef.delete();

        await logClassActivity(classId, creatorEmail, `Deleted an announcement.`);
        showCustomAlert('Announcement deleted.', 'success');
        // The real-time listener will automatically update the UI

    } catch (error) {
        console.error("Error deleting announcement:", error);
        showCustomAlert('Failed to delete announcement.', 'error');
    }
}
// PASTE THIS NEW BLOCK AFTER displayClassLogs
// ======================================
// ▼▼▼ ANNOUNCEMENT MODAL FUNCTIONS ▼▼▼
// ======================================
let activeClassForAnnouncement = null;

function openAnnouncementModal(creatorEmail, classId) {
    activeClassForAnnouncement = { creatorEmail, classId };
    document.getElementById('announcementBackdrop').classList.remove('hidden');
}

function closeAnnouncementModal() {
    document.getElementById('announcementBackdrop').classList.add('hidden');
    document.getElementById('announcementTitle').value = '';
    document.getElementById('announcementDescription').value = '';
    activeClassForAnnouncement = null;
}

async function handlePostAnnouncement() {
    const user = auth.currentUser;
    if (!user || !activeClassForAnnouncement) return;

    const title = document.getElementById('announcementTitle').value.trim();
    const description = document.getElementById('announcementDescription').value.trim();

    if (!title || !description) {
        return showCustomAlert('Title and description are required.', 'error');
    }

    const postBtn = document.getElementById('postAnnouncementBtn');
    postBtn.disabled = true;
    postBtn.textContent = 'Posting...';

    try {
        const { creatorEmail, classId } = activeClassForAnnouncement;
        const announcementsRef = db.collection('Class').doc(creatorEmail)
                                   .collection('userClasses').doc(classId)
                                   .collection('announcements');

        await announcementsRef.add({
            title,
            description,
            postedBy: user.email,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        await logClassActivity(classId, creatorEmail, `Posted an announcement: "${title}"`);
        showCustomAlert('Announcement posted successfully!', 'success');
        closeAnnouncementModal();

    } catch (error) {
        console.error("Error posting announcement:", error);
        showCustomAlert('Failed to post announcement.', 'error');
    } finally {
        postBtn.disabled = false;
        postBtn.textContent = 'Post Announcement';
    }
}

// Hook up the new modal's buttons
document.getElementById('closeAnnouncementModalBtn').addEventListener('click', closeAnnouncementModal);
document.getElementById('postAnnouncementBtn').addEventListener('click', handlePostAnnouncement);
document.getElementById('announcementBackdrop').addEventListener('click', (e) => {
    if (e.target.id === 'announcementBackdrop') {
        closeAnnouncementModal();
    }
});
// Hook up the close button and backdrop click for the new modal
document.getElementById('closeLogsModalBtn').addEventListener('click', closeLogsModal);
document.getElementById('classLogsBackdrop').addEventListener('click', (e) => {
    if (e.target.id === 'classLogsBackdrop') {
        closeLogsModal();
    }
});
// PASTE THIS NEW FUNCTION AFTER renderSharedNoteCard

/**
 * Fetches a user's username from Firestore using their email.
 * Falls back to the first part of the email if no username is found.
 * @param {string} email The user's email address.
 * @returns {Promise<string>} The username or truncated email.
 */
async function getUsernameFromEmail(email) {
  if (!email) return 'Unknown';
  try {
    const userDoc = await db.collection('usernames').doc(email).get();
    if (userDoc.exists && userDoc.data().username) {
      return userDoc.data().username;
    } else {
      // Fallback if the user has no username set
      return email.split('@')[0];
    }
  } catch (error) {
    console.error("Error fetching username:", error);
    // Fallback in case of an error
    return email.split('@')[0];
  }
}
  // =====================
  // Firestore/local persistence
  // =====================
async function persist(id, patch) {
  const email = getEmail();
  if (db && email) {
    try {
      if (patch && patch.drawLayer && patch.drawLayer.src) {
        console.log('[PERSIST] note=', id, 'drawLayer:', {
          left: patch.drawLayer.left, top: patch.drawLayer.top,
          width: patch.drawLayer.width, height: patch.drawLayer.height,
          srcLen: patch.drawLayer.src.length
        });
      } else {
        console.log('[PERSIST] note=', id, 'keys=', Object.keys(patch || {}));
      }
      const docRef = db.collection('notepad').doc(email).collection('notes').doc(id);
      await docRef.set({ ...patch }, { merge: true });
      console.log('[PERSIST] success for note=', id);
    } catch (e) {
      console.error('Persist failed, local fallback:', e);
      // local fallback …

        // local fallback
        const idx = notes.findIndex(n => n.id === id);
        if (idx >= 0) {
          notes[idx] = { ...notes[idx], ...patch };
          saveLocal();
          render();
        }
      }
    } else {
      // local fallback
      const idx = notes.findIndex(n => n.id === id);
      if (idx >= 0) {
        notes[idx] = { ...notes[idx], ...patch };
        saveLocal();
        render();
      }
    }
  }

  async function remove(id) {
    const email = getEmail();
    if (db && email) {
      try {
  await db.collection('notepad').doc(email).collection('notes').doc(id).delete();
  // Optimistic UI update so the card disappears immediately
  notes = notes.filter(n => n.id !== id);
  render();
} catch (e) {
  console.error('Delete failed, local fallback:', e);
  notes = notes.filter(n => n.id !== id);
  saveLocal();
  render();
}

    } else {
      notes = notes.filter(n => n.id !== id);
      saveLocal();
      render();
    }
  }

  function loadLocal() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; }
    catch { return []; }
  }
  function saveLocal() {
    localStorage.setItem(LS_KEY, JSON.stringify(notes));
  }
function _dbg(el) {
  if (!el) return null;
  return {
    tag: el.tagName,
    id: el.id || undefined,
    class: (el.className || '').toString().slice(0, 60) || undefined,
    scrollTop: el.scrollTop,
    clientHeight: el.clientHeight,
    scrollHeight: el.scrollHeight
  };
}
function focusNote(id, which = 'text', doScroll = true) {
  console.log('[focusNote] request', { id, which, doScroll });

  const card = list?.querySelector?.(`[data-id="${id}"]`);
  const selector = which === 'title' ? '.note-card-title' : '.note-text';
  const el = card ? card.querySelector(selector) : null;

  console.log('[focusNote] list?', !!list, 'card found?', !!card, 'el found?', !!el);

  if (!card) {
    // Inspect DOM a bit to see what we have
    console.log('[focusNote] list children count:', list?.children?.length);
    console.log('[focusNote] sample ids:', Array.from(list?.children || []).slice(0, 5).map(n => n?.dataset?.id));
  }

  if (doScroll && card) {
    const scroller = getScrollParent(card) || list || document.scrollingElement || document.body;
    console.log('[focusNote] scroller picked:', _dbg(scroller));
    requestAnimationFrame(() => {
      try {
        const scRect = scroller.getBoundingClientRect
          ? scroller.getBoundingClientRect()
          : { top: 0, height: window.innerHeight };
        const cardRect = card.getBoundingClientRect();
        const delta = (cardRect.top - scRect.top) - (scRect.height / 2 - cardRect.height / 2);

        console.log('[focusNote] pre-scroll', {
          scRectTop: scRect.top, scH: scRect.height,
          cardTop: cardRect.top, cardH: cardRect.height,
          delta, scrollerScrollTopBefore: scroller.scrollTop
        });

        scroller.scrollBy({ top: delta, behavior: 'smooth' });

        setTimeout(() => {
          console.log('[focusNote] post-scroll', { scrollerScrollTopAfter: scroller.scrollTop });
        }, 250);
      } catch (err) {
        console.warn('[focusNote] scrollBy failed; using scrollIntoView', err);
        card.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    });
  }

  if (el) {
    el.focus();
    console.log('[focusNote] focused element:', selector);
  } else {
    console.log('[focusNote] nothing to focus for selector:', selector);
  }
}
function getScrollParent(el) {
  let node = el?.parentElement;
  let i = 0;
  while (node) {
    const style = getComputedStyle(node);
    const oy = style.overflowY;
    const ox = style.overflowX;
    const canScroll = ((oy === 'auto' || oy === 'scroll' || oy === 'overlay') && node.scrollHeight > node.clientHeight)
                   || ((ox === 'auto' || ox === 'scroll' || ox === 'overlay') && node.scrollWidth > node.clientWidth);
    console.log('[getScrollParent] check#' + (i++), _dbg(node), { oy, ox, canScroll });
    if (canScroll) return node;
    node = node.parentElement;
  }
  console.log('[getScrollParent] none found');
  return null;
}




// --- Caret helpers for contentEditable .note-text ---
function getContentEditableCaretIndex(el) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;

  // caret range
  const range = sel.getRangeAt(0);
  // total range from start of element to caret
  const preRange = document.createRange();
  preRange.selectNodeContents(el);
  preRange.setStart(el, 0);
  try { preRange.setEnd(range.endContainer, range.endOffset); }
  catch { return null; }

  return preRange.toString().length;
}

function setContentEditableCaretIndex(el, idx) {
  // clamp
  const textLen = el.innerText.length;
  const pos = Math.max(0, Math.min(idx ?? 0, textLen));

  // walk text nodes to find the node/offset where this pos lands
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
  let node, remaining = pos;
  while ((node = walker.nextNode())) {
    const len = node.nodeValue.length;
    if (remaining <= len) {
      const range = document.createRange();
      range.setStart(node, remaining);
      range.collapse(true);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      return;
    }
    remaining -= len;
  }

  // fallback: place at end
  el.focus();
}

  function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
  // ======================================
// ▼▼▼ INVITE USERS MODAL LOGIC HERE ▼▼▼
// ======================================
const inviteModal = document.getElementById('inviteUsersModal');
const closeInviteBtn = document.getElementById('closeInviteModalBtn');
const inviteUserList = document.getElementById('inviteUserList');
const inviteUserSearch = document.getElementById('inviteUserSearch');

// We need to get the button *after* its parent (classInfoView) is created.
// A short timeout ensures the element is in the DOM.



// Close Modal Logic
const closeInviteModal = () => inviteModal.classList.add('hidden');
closeInviteBtn.addEventListener('click', closeInviteModal);
inviteModal.addEventListener('click', (e) => {
  if (e.target === inviteModal) {
    closeInviteModal();
  }
});

// Search/Filter Logic
inviteUserSearch.addEventListener('input', () => {
  const searchTerm = inviteUserSearch.value.toLowerCase();
  const allUsers = inviteUserList.querySelectorAll('li');
  allUsers.forEach(userItem => {
    const username = userItem.querySelector('.invite-user-name').textContent.toLowerCase();
    if (username.includes(searchTerm)) {
      userItem.style.display = 'flex';
    } else {
      userItem.style.display = 'none';
    }
  });
});

// Function to fetch and display all users
async function populateInviteList() {
  const inviteUserList = document.getElementById('inviteUserList');
  inviteUserList.innerHTML = `<li>Loading users...</li>`;

  const { creatorEmail, id: classId } = window.activeClassContext;
  if (!creatorEmail || !classId) {
    inviteUserList.innerHTML = `<li>Could not identify the current class.</li>`;
    return;
  }

  // Detach any previous listener
  if (inviteListMemberUnsubscribe) {
    inviteListMemberUnsubscribe();
  }

  // Listen for real-time changes to the members list
  const membersRef = db.collection('Class').doc(creatorEmail)
                       .collection('userClasses').doc(classId)
                       .collection('members');

  inviteListMemberUnsubscribe = membersRef.onSnapshot(async (membersSnapshot) => {
    // Create a set of current members for quick lookup, always including the creator
    const currentMemberEmails = new Set(membersSnapshot.docs.map(doc => doc.id));
    currentMemberEmails.add(creatorEmail);

    try {
      const usersSnapshot = await db.collection('usernames').get();
      if (usersSnapshot.empty) {
        inviteUserList.innerHTML = `<li>No registered users found.</li>`;
        return;
      }

      let userHtml = '';
      let usersAvailableToInvite = 0;

      for (const doc of usersSnapshot.docs) {
        const email = doc.id;

        // If the user is already in the class, skip them
        if (currentMemberEmails.has(email)) {
          continue;
        }

        usersAvailableToInvite++;
        const username = doc.data().username || email;
        let avatarUrl = 'Group-100.png';
        let roleBadgeHtml = '';

        try {
          const avatarRef = storage.ref(`avatars/${email}`);
          avatarUrl = await avatarRef.getDownloadURL();
        } catch (error) { /* Use default avatar */ }

        const roleDoc = await db.collection('approved_emails').doc(email).get();
        if (roleDoc.exists) {
          const roles = roleDoc.data().role || '';
          if (roles.includes('verified')) roleBadgeHtml = `<img src="verified.svg" alt="Verified" class="member-role-badge">`;
          else if (roles.includes('first')) roleBadgeHtml = `<img src="first.png" alt="First User" class="member-role-badge">`;
        }

        userHtml += `
          <li>
            <img src="${avatarUrl}" alt="Avatar" class="invite-user-avatar">
            <div class="invite-user-details">
              <span class="invite-user-name">${username}</span>
              ${roleBadgeHtml}
            </div>
            <button class="invite-user-add-btn" data-email="${email}" title="Invite ${username}">+</button>
          </li>
        `;
      }

      if (usersAvailableToInvite === 0) {
        inviteUserList.innerHTML = `<li>All registered users are already in this class.</li>`;
      } else {
        inviteUserList.innerHTML = userHtml;
      }

      // Add event listeners to the new invite buttons
      inviteUserList.querySelectorAll('.invite-user-add-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const emailToInvite = btn.dataset.email;
          const user = auth.currentUser;

          btn.textContent = '...';
          btn.disabled = true;

          try {
            await db.collection('invclass').add({
              senderEmail: user.email,
              recipientEmail: emailToInvite,
              classId: window.activeClassContext.id,
              className: window.activeClassContext.name,
              creatorEmail: window.activeClassContext.creatorEmail,
              status: 'pending',
              timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            showCustomAlert(`Invitation sent to ${emailToInvite}!`, 'success');
            await logClassActivity(window.activeClassContext.id, window.activeClassContext.creatorEmail, `An invitation was sent to ${emailToInvite}.`);
            btn.textContent = '✓';
          } catch (error) {
            console.error("Error sending invitation:", error);
            showCustomAlert('Failed to send invitation.', 'error');
            btn.textContent = '+';
            btn.disabled = false;
          }
        });
      });

    } catch (error) {
      console.error("Error fetching users for invite list:", error);
      inviteUserList.innerHTML = `<li>Error loading users.</li>`;
    }
  });
}
// ▼▼▼ REPLACE YOUR EXISTING PHOTO LOGIC BLOCK WITH THIS ONE ▼▼▼
const addPhotoButton = document.getElementById('addClassPhotoBtn');
const classImagePreview = document.getElementById('classImagePreview');
const classPhotoInput = document.getElementById('classPhotoInput');

// 1. NEW: Function to update the button text based on the image source
function updatePhotoButtonText() {
  if (classImagePreview.src.includes('Group-100.png')) {
    addPhotoButton.textContent = 'Add Photo';
  } else {
    addPhotoButton.textContent = 'Edit Photo';
  }
}

// 2. When the user clicks the "Add Photo" / "Edit Photo" button, open the file picker.
if (addPhotoButton && classPhotoInput) {
  addPhotoButton.addEventListener('click', (e) => {
    e.preventDefault(); // Prevents the button from submitting a form
    classPhotoInput.click();
  });
}

// 3. When a file is selected, update the preview image AND the button text.
if (classPhotoInput && classImagePreview) {
  classPhotoInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        classImagePreview.src = e.target.result;
        updatePhotoButtonText(); // Call the new function here
      };
      reader.readAsDataURL(file);
    }
  });
}
// ▲▲▲ END OF REPLACEMENT ▲▲▲
// ▼▼▼ PASTE THIS ENTIRE BLOCK AT THE END OF THE FILE ▼▼▼

let isEditMode = false;
let editingClassId = null;

function openClassModalForEdit(classData) {
  isEditMode = true;
  editingClassId = window.activeClassContext?.id;

  // Populate the modal with existing data
  document.getElementById('classNameInput').value = classData.className || '';
  document.getElementById('classSectionInput').value = classData.section || '';
  document.getElementById('classDescriptionInput').value = classData.description || '';
  document.getElementById('classImagePreview').src = classData.imageUrl || 'Group-100.png';
  updatePhotoButtonText();

  // Update titles and button text
  document.querySelector('.create-class-title').textContent = 'Edit Class';
  document.getElementById('saveClassBtn').textContent = 'Save Changes';

  // Show the modal
  document.getElementById('createClassBackdrop').classList.remove('hidden');
}

async function handleCreateOrUpdateClass() {
  const user = auth.currentUser;
  if (!user) return showCustomAlert('You must be logged in.', 'error');

  const className = document.getElementById('classNameInput').value.trim();
  const section = document.getElementById('classSectionInput').value.trim();
  if (!className || !section) return showCustomAlert('Class Name and Section are required.', 'error');

  const saveBtn = document.getElementById('saveClassBtn');
  saveBtn.textContent = 'Saving...';
  saveBtn.disabled = true;

  const description = document.getElementById('classDescriptionInput').value.trim();
  const photoFile = document.getElementById('classPhotoInput').files[0];
  let imageUrl = document.getElementById('classImagePreview').src;

  try {
    // Upload a new image only if a new one was selected
    if (photoFile) {
      const storageRef = storage.ref(`class_photos/${user.uid}/${Date.now()}_${photoFile.name}`);
      const snapshot = await storageRef.put(photoFile);
      imageUrl = await snapshot.ref.getDownloadURL();
    }

    const classDataObject = { className, section, description, imageUrl, createdBy: user.email };

    if (isEditMode && editingClassId) {
      // --- UPDATE LOGIC ---
      const classRef = db.collection('Class').doc(user.email).collection('userClasses').doc(editingClassId);
      await classRef.update(classDataObject);
      showCustomAlert('Class updated successfully!', 'success');
    } else {
      // --- CREATE LOGIC ---
      classDataObject.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('Class').doc(user.email).collection('userClasses').add(classDataObject);
      showCustomAlert('Class created successfully!', 'success');
    }

    closeAndResetCreateModal();

  } catch (error) {
    console.error("Error saving class:", error);
    showCustomAlert('Failed to save class.', 'error');
  } finally {
    saveBtn.disabled = false;
  }
}

function closeAndResetCreateModal() {
  document.getElementById('createClassBackdrop').classList.add('hidden');

  // Reset form fields and state
  document.getElementById('classNameInput').value = '';
  document.getElementById('classSectionInput').value = '';
  document.getElementById('classDescriptionInput').value = '';
  document.getElementById('classImagePreview').src = 'Group-100.png';
  document.getElementById('classPhotoInput').value = '';
  updatePhotoButtonText();

  document.querySelector('.create-class-title').textContent = 'Create Class';
  document.getElementById('saveClassBtn').textContent = 'Create!';

  isEditMode = false;
  editingClassId = null;
}

// Replace the old save logic with this new dynamic handler
document.getElementById('saveClassBtn').addEventListener('click', handleCreateOrUpdateClass);

// Also update the backdrop click to use the new reset function
const classBackdrop = document.getElementById('createClassBackdrop');
classBackdrop.addEventListener('click', (e) => {
  if (e.target === classBackdrop) {
    closeAndResetCreateModal();
  }
});

// ▲▲▲ END OF NEW BLOCK ▲▲▲
document.getElementById('closeAddToClassBtn').addEventListener('click', closeAddToClassModal);
document.getElementById('addToClassBackdrop').addEventListener('click', (e) => {
    if (e.target.id === 'addToClassBackdrop') {
        closeAddToClassModal();
    }
});
// ======================================
// ▼▼▼ CLASS TUTORIAL ALERT LOGIC ▼▼▼
// ======================================
(function() {
    const tutorialAlert = document.getElementById('classTutorialAlert');
    const gotItBtn = document.getElementById('classTutorialGotItBtn');
    const openNotesBtn = document.querySelector('.music-icon.notes');

    // Function to show the alert if it hasn't been seen
    const showTutorialIfNeeded = () => {
        if (localStorage.getItem('seenClassTutorial') !== 'true') {
            tutorialAlert?.classList.remove('hidden');
        }
    };

    // When the "Got it" button is clicked, hide the alert and save to localStorage
    gotItBtn?.addEventListener('click', () => {
        tutorialAlert?.classList.add('hidden');
        localStorage.setItem('seenClassTutorial', 'true');
    });

    // When the main notes modal is opened, check if the tutorial should be shown
    openNotesBtn?.addEventListener('click', showTutorialIfNeeded);

})();
})();
// in note.js

// ▼▼▼ PASTE THIS ENTIRE BLOCK AT THE END OF THE FILE ▼▼▼


