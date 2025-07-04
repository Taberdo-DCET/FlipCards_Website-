function renderFlashcardSets() {
  const container = document.querySelector(".folder-grid");
  if (!container) return;

  container.innerHTML = "";

  let sets = JSON.parse(localStorage.getItem("flashcardSets") || "[]");

  let updated = false;
  sets = sets.map(set => {
    const nowISO = new Date().toISOString();
    if (!set.createdOn || isNaN(Date.parse(set.createdOn))) {
      set.createdOn = set.createdAt && !isNaN(Date.parse(set.createdAt)) ? set.createdAt : nowISO;
      updated = true;
    }
    if (!set.createdAt || isNaN(Date.parse(set.createdAt))) {
      set.createdAt = set.createdOn;
      updated = true;
    }
    return set;
  });

  if (updated) {
    localStorage.setItem("flashcardSets", JSON.stringify(sets));
  }

  sets.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  sets.forEach(set => {
    const card = document.createElement("div");
    card.className = "folder-card";

    const formattedDate = formatDate(set.createdOn);
    const uniqueKey = `${set.title}___${set.createdOn}`;

    card.innerHTML = `
      <div class="folder-header">
        <span class="folder-date">${formattedDate}</span>
        <div class="folder-icons">
          <img src="editttnc.png" data-hover="editttc.png" data-default="editttnc.png" class="edit-icon hover-switch edit-btn" title="Edit" data-key="${uniqueKey}" />
          <img src="delnc.png" data-hover="delc.png" data-default="delnc.png" class="delete-icon hover-switch delete-btn" title="Delete" data-key="${uniqueKey}" />
        </div>
      </div>
      <div class="folder-title">${sanitize(set.title)}</div>
      <div class="folder-subtitle">${sanitize(set.description || "Flashcards Set")}</div>
      <button class="review-btn" onclick="reviewSet('${uniqueKey}')">REVIEW</button>
    `;

    container.appendChild(card);
  });

  // Hover effect for images (still local)
  document.querySelectorAll(".hover-switch").forEach(img => {
    const def = img.getAttribute("data-default");
    const hov = img.getAttribute("data-hover");
    img.addEventListener("mouseover", () => img.src = hov);
    img.addEventListener("mouseout", () => img.src = def);
  });
}

// ✅ Event Delegation for Edit & Delete
document.addEventListener("click", e => {
  const editBtn = e.target.closest(".edit-btn");
  const deleteBtn = e.target.closest(".delete-btn");

  if (editBtn) {
    const key = editBtn.dataset.key;
    const [titleKey, createdOnKey] = key.split("___");
    const sets = JSON.parse(localStorage.getItem("flashcardSets") || "[]");
    const target = sets.find(s => s.title === titleKey && s.createdOn === createdOnKey);

    if (target) {
      localStorage.setItem("editingFlashcardSet", JSON.stringify(target));
      window.location.href = "addcard.html?edit=true";
    } else {
      alert("Set not found for editing.");
    }
  }

  if (deleteBtn) {
    const key = deleteBtn.dataset.key;
    const [titleKey, createdOnKey] = key.split("___");

    const confirmDelete = confirm(`Are you sure you want to delete "${titleKey}"?`);
    if (!confirmDelete) return;

    let sets = JSON.parse(localStorage.getItem("flashcardSets") || "[]");
    sets = sets.filter(set => !(set.title === titleKey && set.createdOn === createdOnKey));
    localStorage.setItem("flashcardSets", JSON.stringify(sets));
    window.dispatchEvent(new Event("flashcardSetsUpdated"));
  }
});

// REVIEW redirection
window.reviewSet = function (key) {
  const [titleKey, createdOnKey] = key.split("___");
  const sets = JSON.parse(localStorage.getItem("flashcardSets") || "[]");
  const set = sets.find(s => s.title === titleKey && s.createdOn === createdOnKey);
  if (!set) return alert("Flashcard set not found.");

  localStorage.setItem("reviewingSet", JSON.stringify(set));
  window.location.href = "flashcard.html";
};

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

function sanitize(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

window.addEventListener("DOMContentLoaded", renderFlashcardSets);
window.addEventListener("flashcardSetsUpdated", renderFlashcardSets);
window.addEventListener("storage", e => {
  if (e.key === "flashcardSets") renderFlashcardSets();
});
