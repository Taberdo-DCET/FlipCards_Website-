 const tutorialSlides = [
    "👋 Welcome to FlipCards! Swipe through to explore features.",
    "📝 Create custom flashcards or import from PowerPoint.",
    "🔁 Review using Flashcards, Learn, Match, and Test Modes.",
    "💬 Ask general questions and get community responses.",
    "🎮 Level up by gaining XP through active studying and interaction."
  ];
  let currentSlide = 0;

  function showTutorial() {
    document.getElementById("tutorialModal").classList.remove("hidden");
    renderTutorialSlide();
  }

  function closeTutorial() {
    document.getElementById("tutorialModal").classList.add("hidden");
  }

  function changeTutorialSlide(direction) {
    currentSlide += direction;
    if (currentSlide < 0) currentSlide = tutorialSlides.length - 1;
    if (currentSlide >= tutorialSlides.length) currentSlide = 0;
    renderTutorialSlide();
  }

  function renderTutorialSlide() {
    const slideContainer = document.getElementById("tutorialSlideContainer");
    slideContainer.innerHTML = `<p>${tutorialSlides[currentSlide]}</p>`;

    const dotsContainer = document.getElementById("tutorialDots");
    dotsContainer.innerHTML = tutorialSlides.map((_, idx) => 
      `<span class="${idx === currentSlide ? 'active' : ''}" onclick="goToSlide(${idx})"></span>`
    ).join('');
  }

  function goToSlide(index) {
    currentSlide = index;
    renderTutorialSlide();
  }