window.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("folderSearch");

  if (!searchInput) return;

  searchInput.addEventListener("input", () => {
    const query = searchInput.value.toLowerCase();
    const cards = document.querySelectorAll(".folder-card");

    cards.forEach(card => {
      const title = card.querySelector(".folder-title")?.textContent.toLowerCase() || "";
      const desc = card.querySelector(".folder-subtitle")?.textContent.toLowerCase() || "";
      const match = title.includes(query) || desc.includes(query);
      card.style.display = match ? "block" : "none";
    });
  });
});
