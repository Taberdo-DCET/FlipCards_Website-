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

const modal = document.getElementById('questionModal');
const openBtn = document.querySelector('.general-btn');
const submitBtn = document.getElementById('submit-question');
const cancelBtn = document.getElementById('cancel-question');
const categoryInput = document.getElementById('question-category');
const questionInput = document.getElementById('question-input');

let currentUser = null;
const adminEmails = [
  "taberdoraphael189@gmail.com",
  "rap@gmail.com",
  "testaccount@gmail.com"
];


document.addEventListener('DOMContentLoaded', () => {
  // Refresh button logic
  const refreshBtn = document.getElementById("refreshQuestions");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      location.reload();
    });
  }

  // Auth and load questions
  onAuthStateChanged(auth, user => {
  currentUser = user;
  loadQuestions();
});

});


openBtn.addEventListener('click', () => modal.classList.remove('hidden'));
cancelBtn.addEventListener('click', () => {
  modal.classList.add('hidden');
  categoryInput.value = '';
  questionInput.value = '';
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

    alert("✅ Question submitted!");
    modal.classList.add('hidden');
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


  container.innerHTML = "";
  Object.assign(container.style, {
    display: "flex",
    flexWrap: "nowrap",
    overflowX: "auto",
    gap: "8px",
    padding: "10px",
    marginTop: "20px",
    scrollBehavior: "smooth"
  });

 

const snapshot = await getDocs(collectionGroup(db, "questions"));


  snapshot.forEach(docSnap => {
    const data = docSnap.data();

    const card = document.createElement("div");
    Object.assign(card.style, {
      minWidth: "260px",
      maxWidth: "280px",
      flex: "0 0 auto",
      padding: "16px",
      borderRadius: "18px",
      background: "#fff",
      boxShadow: `
        6px 6px 16px rgba(0, 0, 0, 0.05),
        -6px -6px 16px rgba(218, 217, 217, 0.8),
        inset 1px 1px 2px rgba(0, 0, 0, 0.03),
        inset -1px -1px 2px rgba(255, 255, 255, 0.6)
      `,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      gap: "10px",
      fontFamily: "Satoshi, sans-serif"
      
    });

    const categoryRow = document.createElement("div");
    categoryRow.style.display = "flex";
    categoryRow.style.justifyContent = "space-between";

    const categoryEl = document.createElement("div");
    categoryEl.textContent = `Category: ${data.category || "General"}`;
    Object.assign(categoryEl.style, {
      fontSize: "12px",
      color: "#666",
      fontWeight: "bold",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      maxWidth: "180px",
      fontFamily: "Satoshi, sans-serif"
    });

    const expandBtn = document.createElement("button");
    expandBtn.textContent = "Expand";
    Object.assign(expandBtn.style, {
      fontSize: "11px",
      padding: "4px 8px",
      borderRadius: "8px",
      border: "none",
      background: "#eee",
      cursor: "pointer",
      fontFamily: "Satoshi, sans-serif"
    });
    expandBtn.addEventListener("click", () => showExpandedCard(data));

    categoryRow.appendChild(categoryEl);
    categoryRow.appendChild(expandBtn);
    if (currentUser.email === data.email || adminEmails.includes(currentUser.email)) {
  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "Delete";
  Object.assign(deleteBtn.style, {
    fontSize: "11px",
    padding: "4px 8px",
    borderRadius: "8px",
    border: "none",
    background: "#f88",
    cursor: "pointer",
    marginLeft: "5px",
    fontFamily: "Satoshi, sans-serif"
  });

  deleteBtn.onclick = async () => {
    const confirmed = confirm("Are you sure you want to delete this question and all its answers?");
    if (!confirmed) return;

    try {
      // 1. Delete all related answers
      const answersQuery = query(
        collection(db, "general_answers"),
        where("question", "==", data.question),
        where("questionBy", "==", data.email)
      );
      const answerSnapshots = await getDocs(answersQuery);
      for (const answerDoc of answerSnapshots.docs) {
        await deleteDoc(doc(db, "general_answers", answerDoc.id));
      }

      // 2. Delete the question
      await deleteDoc(doc(db, "general_questions", data.email, "questions", docSnap.id));

      // 3. Remove 100 XP from the question owner
      const userXPRef = doc(db, "approved_emails", data.email);
      const userXPSnap = await getDoc(userXPRef);
      if (userXPSnap.exists()) {
        const currentXP = userXPSnap.data().xp || 0;
        await setDoc(userXPRef, { xp: Math.max(0, currentXP - 100) }, { merge: true });
      }

      alert("✅ Question deleted.");
      loadQuestions(); // refresh the UI
    } catch (err) {
      console.error("Failed to delete question:", err);
      alert("❌ Could not delete question.");
    }
  };

  categoryRow.appendChild(deleteBtn);
}


    const questionEl = document.createElement("div");
    questionEl.textContent = `📌 ${data.question}`;
    Object.assign(questionEl.style, {
      fontSize: "14px",
      color: "#333",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    });

    const submittedBy = document.createElement("div");
    submittedBy.textContent = `by ${data.email}`;
    Object.assign(submittedBy.style, {
      fontSize: "11px",
      color: "#999"
    });

    const inputRow = document.createElement("div");
    Object.assign(inputRow.style, {
      display: "flex",
      gap: "6px"
    });

    const answerInput = document.createElement("input");
    answerInput.type = "text";
    answerInput.placeholder = "Your answer...";
    Object.assign(answerInput.style, {
      flex: "1",
      padding: "8px 10px",
      borderRadius: "12px",
      border: "none",
      fontFamily: "Satoshi, sans-serif",
      fontSize: "13px",
      boxShadow: "inset 3px 3px 6px #d9d9d9, inset -3px -3px 6px #ffffff"
    });

    const answerBtn = document.createElement("button");
answerBtn.textContent = "Submit";
Object.assign(answerBtn.style, {
  background: "#111",
  color: "#fff",
  border: "none",
  padding: "6px 12px",
  borderRadius: "10px",
  cursor: "pointer",
  fontFamily: "Satoshi, sans-serif",
  fontSize: "13px"
});

if (isGuest) {
  answerBtn.disabled = true;
  answerBtn.style.opacity = "0.5";
  answerBtn.style.cursor = "not-allowed";
  answerBtn.title = "Guests cannot submit answers. Please log in.";
}



if (!isGuest) {
  answerBtn.addEventListener("click", async () => {
    const answer = answerInput.value.trim();
    if (!answer || !currentUser) return;

    try {
      await addDoc(collection(db, "general_answers"), {
        answer,
        question: data.question,
        questionBy: data.email,
        answeredBy: currentUser.email,
        username: currentUser.displayName || "Anonymous",
        timestamp: serverTimestamp()
      });

      answerInput.value = "";
      alert("✅ Answer submitted!");
    } catch (err) {
      console.error("Failed to submit answer:", err);
      alert("❌ Could not save your answer.");
    }
  });
}
 else {
  // Disable button for guests
  answerBtn.disabled = true;
  answerBtn.style.opacity = "0.5";
  answerBtn.style.cursor = "not-allowed";
  answerBtn.title = "Guests cannot submit answers. Please log in.";
}



    const seeAnswersBtn = document.createElement("button");
    seeAnswersBtn.textContent = "See All Answers";
    Object.assign(seeAnswersBtn.style, {
      marginTop: "8px",
      padding: "5px 12px",
      fontSize: "12px",
      borderRadius: "10px",
      border: "none",
      background: "#eee",
      cursor: "pointer"
    });
    seeAnswersBtn.addEventListener("click", () => showAnswersModal(data.question));

    const contentWrapper = document.createElement("div");
    contentWrapper.style.flex = "1";
    contentWrapper.appendChild(categoryRow);
    contentWrapper.appendChild(questionEl);
    contentWrapper.appendChild(submittedBy);

    card.appendChild(contentWrapper);
    card.appendChild(inputRow);
    card.appendChild(answerInput);
    card.appendChild(answerBtn);
    card.appendChild(seeAnswersBtn);
    container.appendChild(card);
  });
}

// Show all answers modal
function showAnswersModal(questionText) {
  const overlay = document.createElement("div");
  Object.assign(overlay.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100vw",
    height: "100vh",
    background: "rgba(0,0,0,0.6)",
    zIndex: "9999",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  });

  const modal = document.createElement("div");
  Object.assign(modal.style, {
    background: "#fff",
    borderRadius: "20px",
    padding: "30px",
    width: "90%",
    maxWidth: "600px",
    maxHeight: "80vh",
    overflowY: "auto",
    boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
    fontFamily: "Satoshi, sans-serif"
  });

  const title = document.createElement("h3");
  title.innerHTML = `<span style="font-weight: bold;">Answers for:</span><br><span style="word-break: break-word;">${questionText}</span>`;

  modal.appendChild(title);

  const answersQuery = query(collection(db, "general_answers"), where("question", "==", questionText));
  onSnapshot(answersQuery, snapshot => {
    modal.querySelectorAll(".answer-card").forEach(e => e.remove());

    snapshot.forEach(docSnap => {
      const answerData = docSnap.data();
      const answerCard = document.createElement("div");
      answerCard.className = "answer-card";
      Object.assign(answerCard.style, {
        background: "#fff",
        borderRadius: "16px",
        padding: "16px",
        marginBottom: "12px",
        boxShadow: `
          6px 6px 14px rgba(0,0,0,0.05),
          -6px -6px 14px rgba(218,218,218,0.8),
          inset 1px 1px 2px rgba(0,0,0,0.03),
          inset -1px -1px 2px rgba(255,255,255,0.6)
        `
      });

      const name = document.createElement("div");
      const usernameRef = doc(db, "usernames", answerData.answeredBy);
getDoc(usernameRef).then((usernameSnap) => {
  name.textContent = usernameSnap.exists() ? usernameSnap.data().username : "Anonymous";
});

      name.style.fontWeight = "bold";
      name.style.fontSize = "14px";

      const email = document.createElement("div");
      email.textContent = answerData.answeredBy;
      email.style.fontSize = "11px";
      email.style.color = "#777";

      const answer = document.createElement("p");
answer.innerHTML = `<strong>Answer:</strong> ${answerData.answer}`;
Object.assign(answer.style, {
  margin: "10px 0",
  wordWrap: "break-word",
  overflowWrap: "break-word",
  whiteSpace: "pre-wrap"
});


      const likeRow = document.createElement("div");
      likeRow.style.display = "flex";
      likeRow.style.justifyContent = "flex-end";
      likeRow.style.alignItems = "center";
      likeRow.style.gap = "6px";

      const likeCount = document.createElement("span");
      likeCount.textContent = "0";

      const likeImg = document.createElement("img");
      likeImg.src = "notlikedd.png";
      likeImg.style.width = "20px";
      likeImg.style.cursor = "pointer";

      const likeRef = doc(db, "general_answers", docSnap.id, "likes", currentUser.email);
      const likesCollection = collection(db, "general_answers", docSnap.id, "likes");

      onSnapshot(likesCollection, snap => {
        likeCount.textContent = snap.size.toString();
      });
      // Check if any admin liked this answer
// Check if any admin liked this answer
onSnapshot(likesCollection, snap => {
  likeCount.textContent = snap.size.toString();

  // Remove previous verified label if any
  const old = likeRow.querySelector('.verified-text');
  if (old) old.remove();

  const likedByAdmin = snap.docs.some(doc => adminEmails.includes(doc.id));
  if (likedByAdmin) {
    const verifiedText = document.createElement("div");
    verifiedText.textContent = "Liked and Verified by an Admin/Co Admin/Moderator";
    verifiedText.className = "verified-text";
    Object.assign(verifiedText.style, {
      fontSize: "11px",
      color: "#4CAF50",
      marginRight: "auto"
    });
    likeRow.insertBefore(verifiedText, likeCount);
  }
});



      getDoc(likeRef).then(docSnap => {
        likeImg.src = docSnap.exists() ? "liked.png" : "notlikedd.png";
      });

      likeImg.onclick = async () => {
  const docSnap = await getDoc(likeRef);
  const answerOwnerRef = doc(db, "approved_emails", answerData.answeredBy);
  const answerOwnerSnap = await getDoc(answerOwnerRef);
  let xp = answerOwnerSnap.exists() ? (answerOwnerSnap.data().xp || 0) : 0;

  if (docSnap.exists()) {
    // 💥 Unlike: remove like and deduct XP
    await deleteDoc(likeRef);
    likeImg.src = "notlikedd.png";

    xp = Math.max(0, xp - 300); // prevent negative XP
    await setDoc(answerOwnerRef, { xp }, { merge: true });
  } else {
    // 💥 Like: add like and award XP
    await setDoc(likeRef, { liked: true });
    likeImg.src = "liked.png";

    xp += 300;
    await setDoc(answerOwnerRef, { xp }, { merge: true });
  }
};



      likeRow.appendChild(likeCount);
      likeRow.appendChild(likeImg);

      answerCard.appendChild(name);
      answerCard.appendChild(email);
      answerCard.appendChild(answer);
      answerCard.appendChild(likeRow);
if (currentUser.email === answerData.answeredBy || adminEmails.includes(currentUser.email)) {
  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "Delete";
  Object.assign(deleteBtn.style, {
    background: "#f44",
    color: "#fff",
    border: "none",
    padding: "6px 10px",
    borderRadius: "8px",
    fontSize: "12px",
    cursor: "pointer",
    marginTop: "6px",
    alignSelf: "flex-start",
    fontFamily: "Satoshi, sans-serif"
  });

  deleteBtn.addEventListener("click", async () => {
    const confirmed = confirm("Are you sure you want to delete this answer?");
    if (!confirmed) return;

    try {
      // 1. Delete the answer
      await deleteDoc(doc(db, "general_answers", docSnap.id));

      // 2. Deduct 100 XP from the answerer (if you reward answers with +100)
      const xpRef = doc(db, "approved_emails", answerData.answeredBy);
      const xpSnap = await getDoc(xpRef);
      if (xpSnap.exists()) {
        const xpData = xpSnap.data();
        const xp = Math.max(0, (xpData.xp || 0) - 0);
        await setDoc(xpRef, { xp }, { merge: true });
      }

      alert("✅ Answer deleted.");
    } catch (err) {
      console.error("Failed to delete answer:", err);
      alert("❌ Could not delete answer.");
    }
  });

  answerCard.appendChild(deleteBtn);
}

      modal.appendChild(answerCard);
    });
  });

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "Close";
  Object.assign(closeBtn.style, {
    marginTop: "20px",
    padding: "8px 14px",
    border: "none",
    borderRadius: "10px",
    background: "#111",
    color: "white",
    cursor: "pointer",
    fontFamily: "Satoshi, sans-serif"
  });
  closeBtn.addEventListener("click", () => document.body.removeChild(overlay));

  modal.appendChild(closeBtn);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}
function showExpandedCard(data) {
  const overlay = document.createElement("div");
  Object.assign(overlay.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100vw",
    height: "100vh",
    background: "rgba(0, 0, 0, 0.6)",
    zIndex: "1000",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "Satoshi, sans-serif"
  });

  const modalCard = document.createElement("div");
  Object.assign(modalCard.style, {
    background: "#fff",
    borderRadius: "20px",
    padding: "30px",
    maxWidth: "90%",
    width: "500px",
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
    fontFamily: "Satoshi, sans-serif",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    wordWrap: "break-word",
    overflowWrap: "break-word",
    fontFamily: "Satoshi, sans-serif"
  });

  const category = document.createElement("h3");
  category.textContent = `Category: ${data.category || "General"}`;
  Object.assign(category.style, {
    fontSize: "16px",
    color: "#666",
    margin: "0",
    fontFamily: "Satoshi, sans-serif"
  });

  const question = document.createElement("p");
  question.textContent = data.question;
  Object.assign(question.style, {
    fontSize: "18px",
    color: "#111",
    whiteSpace: "pre-wrap"
  });

  const byline = document.createElement("p");
  byline.textContent = `Submitted by: ${data.email}`;
  Object.assign(byline.style, {
    fontSize: "12px",
    color: "#aaa"
  });

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "Close";
  Object.assign(closeBtn.style, {
    alignSelf: "flex-end",
    marginTop: "10px",
    padding: "8px 14px",
    border: "none",
    borderRadius: "10px",
    background: "#111",
    color: "white",
    cursor: "pointer",
    fontFamily: "Satoshi, sans-serif"
  });
  closeBtn.addEventListener("click", () => {
    document.body.removeChild(overlay);
  });

  modalCard.appendChild(category);
  modalCard.appendChild(question);
  modalCard.appendChild(byline);
  modalCard.appendChild(closeBtn);

  overlay.appendChild(modalCard);
  document.body.appendChild(overlay);
}
