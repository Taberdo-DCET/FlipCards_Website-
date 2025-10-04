import { db, auth } from "./firebaseinit.js";
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  increment
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";

const searchInput = document.getElementById("folderSearch");
const filterSelect = document.getElementById("folderFilter");
const sortSelect = document.getElementById("folderSort");
const container = document.querySelector(".folder-grid");

let likedKeys = new Set();

async function fetchUserLikes(user) {
  const userLikesRef = collection(db, "liked_sets", user.email, "sets");
  const snapshot = await getDocs(userLikesRef);
  likedKeys = new Set(snapshot.docs.map(doc => doc.id));
}

function sanitize(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
async function getUsernameOrEmail(email) {
  if (!email) return { name: "Anonymous", verified: false, first: false };

  // Cache check
  if (window._usernameCache && window._usernameCache[email]) {
    return window._usernameCache[email];
  }

  let displayName = email;
  let verified = false;
  let first = false;
let plus = false; // Add this line
  try {
    // Get username
    const usernameDoc = await getDoc(doc(db, "usernames", email));
    if (usernameDoc.exists() && usernameDoc.data().username) {
      displayName = usernameDoc.data().username;
    }

    // Get role
    const roleDoc = await getDoc(doc(db, "approved_emails", email));
    if (roleDoc.exists()) {
      const roleData = (roleDoc.data().role || "").toLowerCase();
      verified = roleData.includes("verified");
      first = roleData.includes("first");
      plus = roleData.includes("plus"); 
    }
  } catch (error) {
    console.warn("Failed to fetch username/role for:", email, error);
  }

  const result = { name: displayName, verified, first, plus };
  window._usernameCache = window._usernameCache || {};
  window._usernameCache[email] = result;
  return result;
}


function formatDate(isoString) {
  const parsed = new Date(isoString);
  return isNaN(parsed)
    ? "Unknown"
    : parsed.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric"
      });
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

async function createCard(set, docId = null, isPublic = false) {

  const card = document.createElement("div");
  card.className = "folder-card";
  const date = formatDate(set.createdOn || set.createdAt);
  const uniqueKey = `${set.title}___${set.createdOn}`;
  const userInfo = isPublic ? await getUsernameOrEmail(set.user) : null;



  const setId = `${set.title}_${set.createdOn}`;
  const isLiked = likedKeys.has(setId);
  const likeCount = set.likeCount || 0;


  card.innerHTML = `
<div class="folder-header">
    <div class="folder-date-wrap">
      <span class="folder-date">${date}</span>
      <span class="folder-category">${sanitize(set.category || "General")}</span>
    </div>
      <div class="folder-icons">
        ${isPublic
          ? `<div style="display: flex; align-items: center; gap: 4px;">
              <span class="like-count" style="color:#fff;font-size:14px;">${likeCount}</span>
              <img src="${isLiked ? 'liked.png' : 'notliked.png'}" class="like-icon" title="Like" style="width: 32px; cursor: pointer;" />
             </div>`
          : `<button class="folder-icon-btn edit-btn" title="Edit" data-key="${uniqueKey}">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
   </button>
   <button class="folder-icon-btn delete-btn" title="Delete" data-id="${docId}">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
   </button>`
        }
      </div>
    </div>
    <div class="folder-title">${sanitize(set.title)}</div>
    <div class="folder-subtitle">${sanitize(set.description || "Flashcards Set")}</div>
    <button class="review-btn" onclick="reviewSet('${uniqueKey}')">REVIEW</button>
    ${isPublic ? `
  <div style="font-size: 13px; font-family:'Satoshi'; color: #bbb; display: flex; justify-content: center; align-items: center; gap: 4px; text-align: center; width: 100%;">
    by ${sanitize(userInfo.name)}
    ${userInfo.verified ? `<img src="verified.svg" alt="Verified" style="width:16px; height:16px;">` : ""}
    ${userInfo.first ? `<img src="first.png" alt="First" style="width:16px; height:16px;">` : ""}
    ${userInfo.plus ? `<img src="plass.png" alt="Plus" class="plus-badgemini">` : ""}
  </div>` : ""}


  `;

  if (isPublic) {
    const likeBtn = card.querySelector(".like-icon");
    const likeCountElem = card.querySelector(".like-count");

    setupLikeRealtimeListener(set, likeCountElem);

    likeBtn?.addEventListener("click", async () => {
      const user = auth.currentUser;
      if (!user) return alert("⚠️ You must be logged in to like sets.");

      const setId = `${set.title}_${set.createdOn}`;
      const likedRef = doc(db, "liked_sets", user.email, "sets", setId);

      const q = query(collection(db, "flashcard_sets"), where("title", "==", set.title), where("createdOn", "==", set.createdOn));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return;
      const docRef = snapshot.docs[0].ref;
      const currentData = snapshot.docs[0].data();
      let updatedCount = currentData.likeCount || 0;

      const likedDoc = await getDoc(likedRef);
      likeBtn.classList.add("liking");

if (likedDoc.exists()) {
  await deleteDoc(likedRef);
  updatedCount = Math.max(0, updatedCount - 1);
  likedKeys.delete(setId);
  likeBtn.src = "notliked.png";

  if (filterSelect?.value === "liked") {
    card.remove();
  }
}
else {
  await setDoc(likedRef, {
    title: set.title,
    createdOn: set.createdOn,
    likedAt: new Date().toISOString()
  });
  updatedCount += 1;
  likedKeys.add(setId);
  likeBtn.src = "liked.png";
}

likeBtn.classList.remove("liking");


      await setDoc(docRef, { ...currentData, likeCount: updatedCount }, { merge: true });
      window.dispatchEvent(new Event("flashcardSetsUpdated"));
    });
  }

  return card;
}

let currentPage = 1;
const setsPerPage = 8;

async function renderFilteredFolders(user) {
  if (!container) return;
  showLoader(500);
  container.innerHTML = "";

  const keyword = searchInput?.value.toLowerCase() || "";
  const type = filterSelect?.value || "your";
  const sortBy = sortSelect?.value || "newest"; // Get the sort value
  const existingKeys = new Set();
  let allSets = [];

  if (type === "your") {
    const q = query(collection(db, "local_sets"), where("user", "==", user.email));
    const snapshot = await getDocs(q);
    allSets = snapshot.docs.map(doc => ({ ...doc.data(), _id: doc.id }));
  } else if (type === "public") {
    const q = query(collection(db, "flashcard_sets"), where("public", "==", true));
    const snapshot = await getDocs(q);
    allSets = snapshot.docs.map(doc => doc.data());
  } else if (type === "liked") {
    const likedRef = collection(db, "liked_sets", user.email, "sets");
    const snapshot = await getDocs(likedRef);
    for (const docSnap of snapshot.docs) {
      const { title, createdOn } = docSnap.data();
      const q = query(collection(db, "flashcard_sets"), where("title", "==", title), where("createdOn", "==", createdOn));
      const matchSnap = await getDocs(q);
      if (!matchSnap.empty) {
        allSets.push(matchSnap.docs[0].data());
      }
    }
  }

  // ▼▼▼ NEW SORTING LOGIC ▼▼▼
  allSets.sort((a, b) => {
    const dateA = Date.parse(a.createdOn || a.createdAt || 0);
    const dateB = Date.parse(b.createdOn || b.createdAt || 0);
    return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
  });
  // ▲▲▲ END OF NEW LOGIC ▲▲▲

  // Filter by search keyword
  allSets = allSets.filter(set => {
    const title = set.title?.toLowerCase() || "";
    const desc = set.description?.toLowerCase() || "";
    const email = set.user?.toLowerCase() || "";
    const category = set.category?.toLowerCase() || "general";

    return title.includes(keyword) ||
           desc.includes(keyword) ||
           email.includes(keyword) ||
           category.includes(keyword);
  });


  const startIdx = (currentPage - 1) * setsPerPage;
  const endIdx = startIdx + setsPerPage;
  const paginated = allSets.slice(startIdx, endIdx);

  for (const set of paginated) {
    const uniqueKey = `${set.title}___${set.createdOn}`;
    if (existingKeys.has(uniqueKey)) continue;
    existingKeys.add(uniqueKey);
    const docId = set._id || null;
    const isPublic = type !== "your";
    container.appendChild(await createCard(set, docId, isPublic));
  }

  renderPaginationControls(allSets.length);
  document.querySelectorAll(".hover-switch").forEach(img => {
    const def = img.getAttribute("data-default");
    const hov = img.getAttribute("data-hover");
    img.addEventListener("mouseover", () => img.src = hov);
    img.addEventListener("mouseout", () => img.src = def);
  });
  
}
function renderPaginationControls(totalSets) {
  const totalPages = Math.ceil(totalSets / setsPerPage);
  let pagination = document.getElementById("paginationControls");

  if (!pagination) {
    pagination = document.createElement("div");
    pagination.id = "paginationControls";
    pagination.style.textAlign = "center";
    pagination.style.marginTop = "30px";
    pagination.style.display = "flex";
    pagination.style.justifyContent = "center";
    pagination.style.gap = "12px";

    container.parentNode.appendChild(pagination);
  }

  pagination.innerHTML = "";

  const prevBtn = document.createElement("button");
  prevBtn.className = "neumorphic-button2";
  prevBtn.textContent = "⟵ Prev";
  prevBtn.disabled = currentPage === 1;
  prevBtn.onclick = () => {
    if (currentPage > 1) {
      currentPage--;
      renderFilteredFolders(auth.currentUser);
    }
  };

  const nextBtn = document.createElement("button");
  nextBtn.className = "neumorphic-button2";
  nextBtn.textContent = "Next ⟶";
  nextBtn.disabled = currentPage >= totalPages;
  nextBtn.onclick = () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderFilteredFolders(auth.currentUser);
    }
  };

  const pageIndicator = document.createElement("span");
  pageIndicator.textContent = `${currentPage} / ${totalPages}`;
  pageIndicator.style.color = "#fff";
  pageIndicator.style.fontFamily = "'Satoshi', sans-serif";
  pageIndicator.style.alignSelf = "center";
  pageIndicator.style.backgroundColor = "transparent";

  pagination.appendChild(prevBtn);
  pagination.appendChild(pageIndicator);
  pagination.appendChild(nextBtn);
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
  const docSnap = snapshot.docs[0];
  const data = { ...docSnap.data(), _id: docSnap.id }; // include _id
  localStorage.setItem("editingFlashcardSet", JSON.stringify(data));


    // Check if any definition is an image (URL)
    const hasImageDefinition = data.flashcards?.some(card => /^https?:\/\//.test(card.definition));
    if (hasImageDefinition) {
      window.location.href = "addcard_image.html?edit=true";
    } else {
      window.location.href = "addcard.html?edit=true";
    }
  } else {
    alert("Set not found for editing.");
  }
}


  if (deleteBtn) {
    const docId = deleteBtn.dataset.id;
    const modal = document.getElementById("confirmDeleteModal");
    const message = document.getElementById("confirmDeleteMessage");
    const confirmBtn = document.getElementById("confirmDeleteBtn");
    const cancelBtn = document.getElementById("cancelDeleteBtn");

    message.textContent = "Are you sure you want to delete this set? This action cannot be undone.";
    modal.classList.remove("hidden");

    const confirmHandler = async () => {
        modal.classList.add("hidden");
        const user = auth.currentUser;
        if (!user) return;

        try {
            if (docId) {
                if (typeof addXP === "function") {
                    addXP(-20);
                }
                await deleteDoc(doc(db, "local_sets", docId));
            }

            // Additional logic to delete corresponding public set if it exists
            const targetCard = deleteBtn.closest(".folder-card");
            const title = targetCard.querySelector(".folder-title")?.textContent.trim();
            const dateText = targetCard.querySelector(".folder-date")?.textContent.trim();
            const createdOn = new Date(dateText).toISOString().split("T")[0];

            const publicQuery = query(collection(db, "flashcard_sets"), where("user", "==", user.email), where("title", "==", title));
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
        cleanupListeners();
    };

    const cancelHandler = () => {
        modal.classList.add("hidden");
        cleanupListeners();
    };

    function cleanupListeners() {
        confirmBtn.removeEventListener("click", confirmHandler);
        cancelBtn.removeEventListener("click", cancelHandler);
    }

    confirmBtn.addEventListener("click", confirmHandler, { once: true });
    cancelBtn.addEventListener("click", cancelHandler, { once: true });
}
});

window.reviewSet = async function (key) {
  const [titleKey, createdOnKey] = key.split("___");

  // Check your personal sets first
  const localQuery = query(collection(db, "local_sets"), where("title", "==", titleKey), where("createdOn", "==", createdOnKey));
  const localSnap = await getDocs(localQuery);

  if (!localSnap.empty) {
    const docId = localSnap.docs[0].id;
    localStorage.setItem("reviewingSetId", docId);
    localStorage.setItem("reviewingSetCollection", "local_sets"); // Save collection name
    window.location.href = "flashcard.html";
    return;
  }

  // If not found, check public sets
  const publicQuery = query(collection(db, "flashcard_sets"), where("title", "==", titleKey), where("createdOn", "==", createdOnKey));
  const publicSnap = await getDocs(publicQuery);
  
  if (!publicSnap.empty) {
    const docId = publicSnap.docs[0].id;
    localStorage.setItem("reviewingSetId", docId);
    localStorage.setItem("reviewingSetCollection", "flashcard_sets"); // Save collection name
    window.location.href = "flashcard.html";
    return;
  }

  alert("Flashcard set not found.");
};

onAuthStateChanged(auth, async (user) => {
  if (user) {
    await fetchUserLikes(user);
    renderFilteredFolders(user);
  }
});

searchInput?.addEventListener("input", () => {
  currentPage = 1; // Reset to the first page on search
  renderFilteredFolders(auth.currentUser);
});
filterSelect?.addEventListener("change", () => {
  currentPage = 1; // Reset to the first page
  renderFilteredFolders(auth.currentUser);
});
sortSelect?.addEventListener("change", () => {
  currentPage = 1; // Reset to the first page on sort
  renderFilteredFolders(auth.currentUser);
});