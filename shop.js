document.addEventListener("DOMContentLoaded", () => {
  const shopBtn = document.getElementById("shopBtn");
  const shopModal = document.getElementById("shopModal");
  const closeShop = document.getElementById("closeShopModal");

  // Open modal
  shopBtn.addEventListener("click", () => {
    shopModal.classList.add("show");
    shopModal.classList.remove("hidden");
  });

  // Close modal
  closeShop.addEventListener("click", () => {
    shopModal.classList.remove("show");
    setTimeout(() => shopModal.classList.add("hidden"), 300);
  });

  // Close when clicking outside content
  shopModal.addEventListener("click", (e) => {
    if (e.target === shopModal) {
      shopModal.classList.remove("show");
      setTimeout(() => shopModal.classList.add("hidden"), 300);
    }
  });
});
