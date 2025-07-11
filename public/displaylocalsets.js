import { db, auth } from "./firebaseinit.js";
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  setDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";

const searchInput = document.getElementById("folderSearch");
const filterSelect = document.getElementById("folderFilter");
const container = document.querySelector(".folder-grid");

function sanitize(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatDate(isoString) {
  const parsed = new Date(isoString);
  return isNaN(parsed)
    ? "Unknown"
    : parsed.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function setupLikeRealtimeListener(set, likeCountElem) {
  const q = query(
    collection(db, "flashcard_sets"),
    where("title", "==", set.title),
    where("createdOn", "==", set.createdOn)
  );

  getDocs(q).then(snapshot => {
    if (!snapshot.empty) {
      const docRef = snapshot.docs[0].ref;
      onSnapshot(docRef, (docSnap) => {
        const data = docSnap.data();
        likeCountElem.textContent = data.likeCount || 0;
      });
    }
  });
}

function createCard(set, docId = null, isPublic = false) {
  const card = document.createElement("div");
  card.className = "folder-card";
  const date = formatDate(set.createdOn || set.createdAt);
  const uniqueKey = `${set.title}___${set.createdOn}`;
  const userLine = isPublic ? `<div style="font-size: 13px; color: #bbb;">by ${set.user || "Anonymous"}</div>` : "";

  const likedSets = JSON.parse(localStorage.getItem("likedFlashcardSets") || "[]");
  const isLiked = likedSets.some(s => s.title === set.title && s.createdOn === set.createdOn);
  const likeCount = set.likeCount || 0;

  card.innerHTML = `
    <div class="folder-header">
      <span class="folder-date">${date}</span>
      <div class="folder-icons">
        ${isPublic
          ? `<div style="display: flex; align-items: center; gap: 4px;">
              <span class="like-count" style="color:#fff;font-size:14px;">${likeCount}</span>
              <img src="${isLiked ? 'liked.png' : 'notliked.png'}" class="like-icon" title="Like" style="width: 32px; cursor: pointer;" />
             </div>`
          : `<img src="editttnc.png" data-hover="editttc.png" data-default="editttnc.png" class="edit-icon hover-switch edit-btn" title="Edit" data-key="${uniqueKey}" />
             <img src="delnc.png" data-hover="delc.png" data-default="delnc.png" class="delete-icon hover-switch delete-btn" title="Delete" data-id="${docId}" />`
        }
      </div>
    </div>
    <div class="folder-title">${sanitize(set.title)}</div>
    <div class="folder-subtitle">${sanitize(set.description || "Flashcards Set")}</div>
    <button class="review-btn" onclick="reviewSet('${uniqueKey}')">REVIEW</button>
    ${userLine}
  `;

  if (isPublic) {
    const likeBtn = card.querySelector(".like-icon");
    const likeCountElem = card.querySelector(".like-count");

    setupLikeRealtimeListener(set, likeCountElem);

    likeBtn?.addEventListener("click", async () => {
      const user = auth.currentUser;
      if (!user) return alert("⚠️ You must be logged in to like sets.");

      const liked = JSON.parse(localStorage.getItem("likedFlashcardSets") || "[]");
      const exists = liked.find(s => s.title === set.title && s.createdOn === set.createdOn);

      const q = query(collection(db, "flashcard_sets"), where("title", "==", set.title), where("createdOn", "==", set.createdOn));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return;
      const docRef = snapshot.docs[0].ref;
      const currentData = snapshot.docs[0].data();
      let updatedCount = currentData.likeCount || 0;

      if (exists) {
        const updated = liked.filter(s => !(s.title === set.title && s.createdOn === set.createdOn));
        localStorage.setItem("likedFlashcardSets", JSON.stringify(updated));
        likeBtn.src = "notliked.png";
        updatedCount = Math.max(0, updatedCount - 1);
      } else {
        liked.push(set);
        localStorage.setItem("likedFlashcardSets", JSON.stringify(liked));
        likeBtn.src = "liked.png";
        updatedCount += 1;
      }

      await setDoc(docRef, { ...currentData, likeCount: updatedCount });
      window.dispatchEvent(new Event("flashcardSetsUpdated"));
    });
  }

  return card;
}

async function renderFilteredFolders(user) {
  if (!container) return;
  container.innerHTML = "";

  const keyword = searchInput?.value.toLowerCase() || "";
  const type = filterSelect?.value || "your";
  const existingKeys = new Set();

  if (type === "your") {
    const q = query(collection(db, "local_sets"), where("user", "==", user.email));
    const snapshot = await getDocs(q);
    const sets = snapshot.docs.map(doc => ({ ...doc.data(), _id: doc.id }));

    sets.sort((a, b) => Date.parse(b.createdOn) - Date.parse(a.createdOn));

    sets.forEach(set => {
      const match = set.title.toLowerCase().includes(keyword) || (set.description || "").toLowerCase().includes(keyword);
      const uniqueKey = `${set.title}___${set.createdOn}`;
      if (!match || existingKeys.has(uniqueKey)) return;
      existingKeys.add(uniqueKey);
      container.appendChild(createCard(set, set._id, false));
    });
  } else if (type === "public") {
    const q = query(collection(db, "flashcard_sets"), where("public", "==", true));
    const snapshot = await getDocs(q);
    snapshot.forEach(doc => {
      const set = doc.data();
      const title = set.title?.toLowerCase() || "";
      const desc = set.description?.toLowerCase() || "";
      const email = set.user?.toLowerCase() || "";

      const match = title.includes(keyword) || desc.includes(keyword) || email.includes(keyword);
      const uniqueKey = `${set.title}___${set.createdOn}`;
      if (!match || existingKeys.has(uniqueKey)) return;
      existingKeys.add(uniqueKey);
      container.appendChild(createCard(set, null, true));
    });
  } else if (type === "liked") {
    const sets = JSON.parse(localStorage.getItem("likedFlashcardSets") || "[]");
    sets.forEach(set => {
      const match = set.title?.toLowerCase().includes(keyword) || (set.description || "").toLowerCase().includes(keyword);
      const uniqueKey = `${set.title}___${set.createdOn}`;
      if (!match || existingKeys.has(uniqueKey)) return;
      existingKeys.add(uniqueKey);
      container.appendChild(createCard(set, null, true));
    });
  }

  document.querySelectorAll(".hover-switch").forEach(img => {
    const def = img.getAttribute("data-default");
    const hov = img.getAttribute("data-hover");
    img.addEventListener("mouseover", () => img.src = hov);
    img.addEventListener("mouseout", () => img.src = def);
  });
}

document.addEventListener("click", async (e) => {
  const editBtn = e.target.closest(".edit-btn");
  const deleteBtn = e.target.closest(".delete-btn");

  if (editBtn) {
    const key = editBtn.dataset.key;
    const [titleKey, createdOnKey] = key.split("___");
    const q = query(collection(db, "local_sets"), where("title", "==", titleKey), where("createdOn", "==", createdOnKey));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const data = snapshot.docs[0].data();
      localStorage.setItem("editingFlashcardSet", JSON.stringify(data));
      window.location.href = "addcard.html?edit=true";
    } else {
      alert("Set not found for editing.");
    }
  }

  if (deleteBtn) {
    const docId = deleteBtn.dataset.id;
    const modal = document.getElementById("deleteModal");
    const message = document.getElementById("deleteMessage");
    const cancelBtn = document.getElementById("cancelDelete");
    const confirmBtn = document.getElementById("confirmDelete");

    message.textContent = "Are you sure you want to delete this set?";
    modal.classList.remove("hidden");

    const confirmHandler = async () => {
      modal.classList.add("hidden");

      const user = auth.currentUser;
      if (!user) return;

      try {
        if (docId) {
          await deleteDoc(doc(db, "local_sets", docId));
        }

        const targetCard = deleteBtn.closest(".folder-card");
        const title = targetCard.querySelector(".folder-title")?.textContent.trim();
        const dateText = targetCard.querySelector(".folder-date")?.textContent.trim();
        const createdOn = new Date(dateText).toISOString().split("T")[0];

        const publicQuery = query(
          collection(db, "flashcard_sets"),
          where("user", "==", user.email),
          where("title", "==", title)
        );
        const publicSnapshot = await getDocs(publicQuery);
        for (const docSnap of publicSnapshot.docs) {
          const data = docSnap.data();
          if (data.createdOn?.startsWith(createdOn)) {
            await deleteDoc(doc(db, "flashcard_sets", docSnap.id));
          }
        }
      } catch (err) {
        console.error("Error deleting documents:", err);
      }

      await renderFilteredFolders(auth.currentUser);

      confirmBtn.removeEventListener("click", confirmHandler);
      cancelBtn.removeEventListener("click", cancelHandler);
    };

    const cancelHandler = () => {
      modal.classList.add("hidden");
      confirmBtn.removeEventListener("click", confirmHandler);
      cancelBtn.removeEventListener("click", cancelHandler);
    };

    confirmBtn.addEventListener("click", confirmHandler);
    cancelBtn.addEventListener("click", cancelHandler);
  }
});

window.reviewSet = async function (key) {
  const [titleKey, createdOnKey] = key.split("___");

  const localQ = query(collection(db, "local_sets"), where("title", "==", titleKey), where("createdOn", "==", createdOnKey));
  const localSnap = await getDocs(localQ);
  if (!localSnap.empty) {
    const localData = localSnap.docs[0].data();
    localStorage.setItem("reviewingSet", JSON.stringify(localData));
    return window.location.href = "flashcard.html";
  }

  const publicQ = query(collection(db, "flashcard_sets"), where("title", "==", titleKey), where("createdOn", "==", createdOnKey));
  const publicSnap = await getDocs(publicQ);
  if (!publicSnap.empty) {
    const publicData = publicSnap.docs[0].data();
    localStorage.setItem("reviewingSet", JSON.stringify(publicData));
    return window.location.href = "flashcard.html";
  }

  alert("Flashcard set not found.");
};

onAuthStateChanged(auth, user => {
  if (user) {
    renderFilteredFolders(user);
  }
});

searchInput?.addEventListener("input", () => renderFilteredFolders(auth.currentUser));
filterSelect?.addEventListener("change", () => renderFilteredFolders(auth.currentUser));
