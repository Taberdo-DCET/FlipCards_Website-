export function animateCards() {
  const cards = document.querySelectorAll(".folder-card");

  // Disable all buttons inside cards during animation
  cards.forEach(card => {
    card.style.pointerEvents = "none";
    card.style.opacity = "0";
    card.style.transform = "translateY(20px)";
    card.style.transition = "opacity 0.4s ease, transform 0.4s ease";
  });

  cards.forEach((card, i) => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        card.style.opacity = "1";
        card.style.transform = "translateY(0)";
      }, i * 100);
    });
  });

  // Re-enable buttons after last animation finishes
  const totalDelay = cards.length * 100 + 400; // Last delay + transition time
  setTimeout(() => {
    cards.forEach(card => {
      card.style.pointerEvents = "auto";
    });
  }, totalDelay);
}
