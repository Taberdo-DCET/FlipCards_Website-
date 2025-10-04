import { db, auth } from './firebaseinit.js';
import {
  collection,
  collectionGroup,
  addDoc,
  getDocs,
  serverTimestamp,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
// in generalquestion.js

// ▼▼▼ ADD THIS NEW FUNCTION ▼▼▼
function showAlert(message, isSuccess = true) {
  const modal = document.getElementById('gqAlertModal');
  const content = document.getElementById('gqAlertContent');
  const msg = document.getElementById('gqAlertMessage');
  const okBtn = document.getElementById('gqAlertOkBtn');

  msg.textContent = message;
  content.className = 'custom-alert-content'; // Reset classes
  content.classList.add(isSuccess ? 'success' : 'error');

  modal.classList.remove('hidden');
  okBtn.onclick = () => modal.classList.add('hidden');
}
// in generalquestion.js

// ▼▼▼ ADD THIS NEW FUNCTION ▼▼▼
function showAnswerConfirm(message) {
   console.log('%c showAnswerConfirm function was executed!', 'color: cyan; font-weight: bold;');
  return new Promise((resolve) => {
    const modal = document.getElementById('customConfirmModal');
    const msg = document.getElementById('confirmMessage');
    const confirmBtn = document.getElementById('confirmBtn');
    const cancelBtn = document.getElementById('cancelBtn');

    msg.textContent = message;
    modal.classList.remove('hidden');

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
// ▲▲▲ END OF NEW FUNCTION ▲▲▲
const modalBackdrop = document.getElementById('gqModalBackdrop');
const openBtn = document.getElementById('addQuestionBtn');
const submitBtn = document.getElementById('submitGqBtn');
const closeBtn = document.getElementById('closeGqModalBtn');
const categoryInput = document.getElementById('gqCategoryInput');
const questionInput = document.getElementById('gqQuestionInput');
let unsubscribeAnswers = null;
let currentUser = null;
const adminEmails = [
  "taberdoraphael189@gmail.com",
  "rap@gmail.com",
  "testaccount@gmail.com"
];


document.addEventListener('DOMContentLoaded', () => {
  // NEW: Logic to handle scrolling after refresh
  if (sessionStorage.getItem('scrollToGQ') === 'true') {
    const gqSection = document.getElementById('generalQuestions');
    if (gqSection) {
      // Scrolls the section into view smoothly
      gqSection.scrollIntoView({ behavior: 'smooth' });
    }
    // Clean up the flag so it doesn't scroll again on a manual refresh
    sessionStorage.removeItem('scrollToGQ');
  }

  // UPDATED: Refresh button logic
  const refreshBtn = document.getElementById("refreshQuestions");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      // Set the flag before reloading the page
      sessionStorage.setItem('scrollToGQ', 'true');
      location.reload();
    });
  }
// --- GQ Search Bar Logic ---
  const gqSearchContainer = document.getElementById('gqSearchContainer');
  const gqSearchBtn = document.getElementById('gqSearchBtn');
  const gqSearchInput = document.getElementById('gqSearchInput');

  if (gqSearchBtn) {
    gqSearchBtn.addEventListener('click', () => {
      gqSearchContainer.classList.toggle('active');
      if (gqSearchContainer.classList.contains('active')) {
        gqSearchInput.focus();
      } else {
        gqSearchInput.value = ''; // Clear search on close
        filterQuestions(''); // Show all questions again
      }
    });
  }
  
  if (gqSearchInput) {
    gqSearchInput.addEventListener('input', () => {
      filterQuestions(gqSearchInput.value);
    });
  }

  function filterQuestions(searchTerm) {
    const term = searchTerm.toLowerCase();
    const allQuestions = document.querySelectorAll('.gq-card');

    allQuestions.forEach(card => {
      const questionText = card.querySelector('.gq-card-question')?.textContent.toLowerCase() || '';
      const categoryText = card.querySelector('.gq-card-category')?.textContent.toLowerCase() || '';
      
      const isMatch = questionText.includes(term) || categoryText.includes(term);
      
      if (isMatch) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  }
  // Auth and load questions (existing code)
  onAuthStateChanged(auth, user => {
    currentUser = user;
    loadQuestions();
  });
});


function closeGqModal() {
  modalBackdrop.classList.add('hidden');
  categoryInput.value = '';
  questionInput.value = '';
}

openBtn.addEventListener('click', () => modalBackdrop.classList.remove('hidden'));
closeBtn.addEventListener('click', closeGqModal);
modalBackdrop.addEventListener('click', (event) => {
    if (event.target === modalBackdrop) {
        closeGqModal();
    }
});

submitBtn.addEventListener('click', async () => {
  const category = categoryInput.value.trim();
  const question = questionInput.value.trim();
  if (!currentUser || !category || !question) return alert("Fill all fields while logged in.");

  try {
    const userQuestionRef = collection(db, 'general_questions', currentUser.email, 'questions');
await addDoc(userQuestionRef, {
  category,
  question,
  email: currentUser.email,
  timestamp: serverTimestamp()
});
// 💥 Give +100 XP for submitting a question
const userXPRef = doc(db, "approved_emails", currentUser.email);
const userXPSnap = await getDoc(userXPRef);
const currentXP = userXPSnap.exists() ? (userXPSnap.data().xp || 0) : 0;
await setDoc(userXPRef, { xp: currentXP + 100 }, { merge: true });

    showAlert("✅ Question submitted successfully!");
    modalBackdrop.classList.add('hidden');
    categoryInput.value = '';
    questionInput.value = '';
    loadQuestions();
  } catch (err) {
    console.error("Error saving question:", err);
    alert("❌ Failed to submit your question.");
  }
});

async function loadQuestions() {
  const container = document.querySelector(".questions-list");
  if (!container) return;
  const isGuest = currentUser?.isAnonymous === true;

  container.innerHTML = ""; // Clear existing content

  // These container styles are fine to keep here as they setup the flex container
  Object.assign(container.style, {
    display: "flex",
    flexWrap: "nowrap",
    overflowX: "auto",
    gap: "16px",
    padding: "10px",
    marginTop: "20px",
    scrollBehavior: "smooth"
  });

  const snapshot = await getDocs(collectionGroup(db, "questions"));

  snapshot.forEach((docSnap, index) => { // <-- Add the index here
    const data = docSnap.data();

    // --- Card Structure ---
    const card = document.createElement("div");
    card.className = 'gq-card'; // Main card class

    // Header
    const header = document.createElement("div");
    header.className = 'gq-card-header';
    const categoryEl = document.createElement("div");
    categoryEl.className = 'gq-card-category';
    categoryEl.textContent = data.category || "General";
    
    const headerActions = document.createElement("div");
    headerActions.className = 'gq-card-header-actions';
    const expandBtn = document.createElement("button");
    expandBtn.className = 'gq-card-btn gq-expand-btn';
    expandBtn.textContent = "Expand";
    expandBtn.addEventListener("click", () => showExpandedCard(data));
    headerActions.appendChild(expandBtn);

    if (currentUser && (currentUser.email === data.email || adminEmails.includes(currentUser.email))) {
      const deleteBtn = document.createElement("button");
      deleteBtn.className = 'gq-card-btn gq-delete-btn';
      deleteBtn.textContent = "Delete";
      deleteBtn.onclick = async () => { /* Delete logic remains the same */
        const confirmed = showAnswerConfirm("Are you sure you want to delete this question and all its answers?");
        if (!confirmed) return;
        try {
          const answersQuery = query(collection(db, "general_answers"), where("question", "==", data.question), where("questionBy", "==", data.email));
          const answerSnapshots = await getDocs(answersQuery);
          for (const answerDoc of answerSnapshots.docs) {
            await deleteDoc(doc(db, "general_answers", answerDoc.id));
          }
          await deleteDoc(doc(db, "general_questions", data.email, "questions", docSnap.id));
          const userXPRef = doc(db, "approved_emails", data.email);
          const userXPSnap = await getDoc(userXPRef);
          if (userXPSnap.exists()) {
            const currentXP = userXPSnap.data().xp || 0;
            await setDoc(userXPRef, { xp: Math.max(0, currentXP - 100) }, { merge: true });
          }
          showAlert("✅ The question has been deleted.");
          loadQuestions();
        } catch (err) {
          console.error("Failed to delete question:", err);
          alert("❌ Could not delete question.");
        }
      };
      headerActions.appendChild(deleteBtn);
    }
    header.appendChild(categoryEl);
    header.appendChild(headerActions);

    // Body
    const body = document.createElement("div");
    body.className = 'gq-card-body';
    const questionEl = document.createElement("p");
    questionEl.className = 'gq-card-question';
    questionEl.textContent = data.question;
    const submittedBy = document.createElement("div");
    submittedBy.className = 'gq-card-author';
    submittedBy.textContent = `by ${data.email}`;
    body.appendChild(questionEl);
    body.appendChild(submittedBy);

    // Footer
    const footer = document.createElement("div");
    footer.className = 'gq-card-footer';
    const answerInput = document.createElement("input");
    answerInput.className = 'gq-card-input';
    answerInput.type = "text";
    answerInput.placeholder = "Your answer...";
    
    const answerBtn = document.createElement("button");
    answerBtn.className = 'gq-card-btn gq-submit-btn';
    answerBtn.textContent = "Submit";

    if (isGuest) {
      answerInput.disabled = true;
      answerBtn.disabled = true;
      answerInput.placeholder = "Log in to answer";
    } else {
      answerBtn.addEventListener("click", async () => { /* Submit logic remains the same */
        const answer = answerInput.value.trim();
        if (!answer || !currentUser) return;
        try {
          await addDoc(collection(db, "general_answers"), { answer, question: data.question, questionBy: data.email, answeredBy: currentUser.email, username: currentUser.displayName || "Anonymous", timestamp: serverTimestamp() });
          answerInput.value = "";
          showAlert("✅ Your answer has been submitted!");
        } catch (err) {
          console.error("Failed to submit answer:", err);
          alert("❌ Could not save your answer.");
        }
      });
    }

    const seeAnswersBtn = document.createElement("button");
    seeAnswersBtn.className = 'gq-card-btn gq-see-answers-btn';
    seeAnswersBtn.textContent = "See All Answers";
    seeAnswersBtn.addEventListener("click", () => showAnswersModal(data.question, data.email));

    footer.appendChild(answerInput);
    footer.appendChild(answerBtn);
    footer.appendChild(seeAnswersBtn);

    // Assemble Card
    card.appendChild(header);
    card.appendChild(body);
    card.appendChild(footer);
    // This is the updated code with the animation trigger
container.appendChild(card);

// Stagger the animation for each card
setTimeout(() => {
  card.classList.add('is-visible');
}, index * 100); // 100ms delay between each card's animation
  });
}

// Show all answers modal
// in generalquestion.js

// in generalquestion.js

async function showAnswersModal(questionText, questionBy) {
  const overlay = document.createElement("div");
  overlay.className = "gq-answers-backdrop";

  const modal = document.createElement("div");
  modal.className = "gq-answers-modal";

  // --- Header ---
  const header = document.createElement("div");
  header.className = "gq-answers-header";
  
  const title = document.createElement("div");
  title.className = "gq-answers-title";
  title.innerHTML = `Answers for: <strong>${questionText}</strong>`;
  
  const closeBtn = document.createElement("button");
  closeBtn.className = "gq-answers-close-btn";
  closeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
  closeBtn.onclick = () => document.body.removeChild(overlay);
  
  header.appendChild(title);
  header.appendChild(closeBtn);
  
  // --- Body ---
  const body = document.createElement("div");
  body.className = "gq-answers-body";
  
  modal.appendChild(header);
  modal.appendChild(body);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // --- Firebase Logic ---
  const answersQuery = query(collection(db, "general_answers"), where("question", "==", questionText), where("questionBy", "==", questionBy));
  onSnapshot(answersQuery, async (snapshot) => {
    body.innerHTML = ''; // Clear previous answers on update
    
    // ▼▼▼ KEY CHANGE IS HERE ▼▼▼
    // Fetch all user data in one go to avoid multiple reads in a loop
    const userEmails = snapshot.docs.map(doc => doc.data().answeredBy);

    // Fetch from BOTH collections simultaneously
    const [userApprovedDocs, usernameDocs] = await Promise.all([
        Promise.all(userEmails.map(email => getDoc(doc(db, "approved_emails", email)))),
        Promise.all(userEmails.map(email => getDoc(doc(db, "usernames", email))))
    ]);

    // Merge the data from both collections into a single map
    const userDataMap = new Map();
    userEmails.forEach((email, index) => {
        const approvedData = userApprovedDocs[index]?.exists() ? userApprovedDocs[index].data() : {};
        const usernameData = usernameDocs[index]?.exists() ? usernameDocs[index].data() : {};
        
        // Combine data, with 'usernames' collection taking priority for the username field
        userDataMap.set(email, {
            ...approvedData,
            ...usernameData
        });
    });
    // ▲▲▲ END OF KEY CHANGE ▲▲▲

    snapshot.docs.forEach(docSnap => {
      const answerData = docSnap.data();
      const userData = userDataMap.get(answerData.answeredBy) || {};

      const answerCard = document.createElement("div");
      answerCard.className = "answer-card-modern";

      // User Info
      const userInfo = document.createElement("div");
      userInfo.className = "answer-user-info";
      
      const avatar = document.createElement("img");
      avatar.className = "answer-user-avatar";
      avatar.src = userData.avatarUrl || 'Group-10.png'; // Default avatar

      const userDetails = document.createElement("div");
      userDetails.className = "answer-user-details";
      const userName = document.createElement("span");
      userName.className = "answer-user-name";
      // This line now works correctly because userDataMap contains the username
      userName.textContent = userData.username || "Anonymous";
      const userEmail = document.createElement("div");
      userEmail.textContent = answerData.answeredBy;

      userDetails.appendChild(userName);
      userDetails.appendChild(userEmail);
      userInfo.appendChild(avatar);
      userInfo.appendChild(userDetails);
      
      // Answer Text
      const answerTextEl = document.createElement("p");
      answerTextEl.className = "answer-text";
      answerTextEl.textContent = answerData.answer;
      
      // Footer
      const footer = document.createElement("div");
      footer.className = "answer-footer";
      
      const verifiedByAdmin = document.createElement("div");
      verifiedByAdmin.className = "verified-by-admin";
      verifiedByAdmin.style.display = 'none'; // Hide by default

      const answerActions = document.createElement("div");
      answerActions.className = "answer-actions";

      const likeContainer = document.createElement("div");
      likeContainer.className = "like-container";
      
      const likeBtn = document.createElement("button");
      likeBtn.className = "answer-icon-btn like-btn";
      const likeIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`;
      likeBtn.innerHTML = likeIconSVG;

      const likeCount = document.createElement("span");
      likeCount.id = "likeCount";
      likeCount.textContent = "0";
      
      likeContainer.appendChild(likeBtn);
      likeContainer.appendChild(likeCount);
      answerActions.appendChild(likeContainer);
      
      // Assemble card
      footer.appendChild(verifiedByAdmin);
      footer.appendChild(answerActions);
      answerCard.appendChild(userInfo);
      answerCard.appendChild(answerTextEl);
      answerCard.appendChild(footer);
      body.appendChild(answerCard);

      // Like logic
      const likesCollection = collection(db, "general_answers", docSnap.id, "likes");
      onSnapshot(likesCollection, (snap) => {
        likeCount.textContent = snap.size.toString();
        const isAdminLiked = snap.docs.some(doc => adminEmails.includes(doc.id));
        if (isAdminLiked) {
          verifiedByAdmin.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> Verified by Admin`;
          verifiedByAdmin.style.display = 'flex';
        } else {
          verifiedByAdmin.style.display = 'none';
        }
      });
      
      const likeRef = doc(db, "general_answers", docSnap.id, "likes", currentUser.email);
      getDoc(likeRef).then(docSnap => {
        if(docSnap.exists()){
            likeBtn.classList.add("liked");
        }
      });

      likeBtn.onclick = async () => {
        const docSnap = await getDoc(likeRef);
        const answerOwnerRef = doc(db, "approved_emails", answerData.answeredBy);
        const answerOwnerSnap = await getDoc(answerOwnerRef);
        let xp = answerOwnerSnap.exists() ? (answerOwnerSnap.data().xp || 0) : 0;

        if (docSnap.exists()) {
          await deleteDoc(likeRef);
          likeBtn.classList.remove("liked");
          xp = Math.max(0, xp - 300);
          await setDoc(answerOwnerRef, { xp }, { merge: true });
        } else {
          await setDoc(likeRef, { liked: true });
          likeBtn.classList.add("liked");
          xp += 300;
          await setDoc(answerOwnerRef, { xp }, { merge: true });
        }
      };

      // Delete logic
      // Delete logic
if (currentUser.email === answerData.answeredBy || adminEmails.includes(currentUser.email)) {
  const deleteBtn = document.createElement("button");
  deleteBtn.className = "answer-icon-btn gq-answer-delete-btn";
  deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
  deleteBtn.onclick = async () => {
     console.log('%c Answer delete button clicked! Firing from generalquestion.js', 'color: lightgreen; font-weight: bold;');
    // Replaced confirm() with your custom showConfirm() modal
    const confirmed = await showAnswerConfirm("Are you sure you want to delete this answer?");
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, "general_answers", docSnap.id));
      const xpRef = doc(db, "approved_emails", answerData.answeredBy);
      const xpSnap = await getDoc(xpRef);
      if (xpSnap.exists()) {
        const xpData = xpSnap.data();
        const xp = Math.max(0, (xpData.xp || 0) - 100);
        await setDoc(xpRef, { xp }, { merge: true });
      }
      // Replaced alert() with your custom showAlert() modal
      showAlert("✅ Answer deleted successfully.");
    } catch (err) {
      console.error("Failed to delete answer:", err);
      // Replaced alert() with your custom showAlert() modal (for errors)
      showAlert("❌ Could not delete the answer.", false);
    }
  };
  answerActions.appendChild(deleteBtn);
  console.log(`Attaching correct delete handler for answer ID: ${docSnap.id}`);
}
    });
  });
}
// This is the new function to use instead
function showExpandedCard(data) {
  // 1. Create the backdrop and modal elements
  const overlay = document.createElement("div");
  overlay.className = "gq-expanded-backdrop";

  const modalCard = document.createElement("div");
  modalCard.className = "gq-expanded-modal";

  // 2. Create the header
  const header = document.createElement("div");
  header.className = "gq-expanded-header";

  const category = document.createElement("div");
  category.className = "gq-expanded-category";
  category.textContent = data.category || "General";

  const closeBtn = document.createElement("button");
  closeBtn.className = "gq-expanded-close-btn";
  closeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
  
  header.appendChild(category);
  header.appendChild(closeBtn);

  // 3. Create the body
  const body = document.createElement("div");
  body.className = "gq-expanded-body";

  const question = document.createElement("p");
  question.className = "gq-expanded-question";
  question.textContent = data.question;
  
  body.appendChild(question);

  // 4. Create the footer
  const footer = document.createElement("div");
  footer.className = "gq-expanded-footer";
  footer.textContent = `Submitted by: ${data.email}`;

  // 5. Assemble the modal
  modalCard.appendChild(header);
  modalCard.appendChild(body);
  modalCard.appendChild(footer);
  overlay.appendChild(modalCard);

  // 6. Add close functionality
  const closeModal = () => document.body.removeChild(overlay);
  closeBtn.onclick = closeModal;
  overlay.onclick = (event) => {
    if (event.target === overlay) {
      closeModal();
    }
  };

  // 7. Add to the page
  document.body.appendChild(overlay);
}
