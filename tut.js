const tutorialSlides = [
  {
    text: "👋 Welcome to FlipCards!",
    image: "page1.png",
    desc: "We believe that everyone deserves access to quality education. That’s why this platform was created—to offer students a high-quality learning experience without the costly fees charged by other websites. Our mission is to assist those facing financial challenges by providing effective study tools, consistent updates, and a strong, supportive community—all at no cost or at a very low price. Education should empower, not become a burden—and we’re committed to making that possible."
  },
  {
    text: "📝 Create Flashcard Sets",
    image: "page2.png",
    desc: "Easily create flashcards by clicking “Add More Card Sets” in the Folder section. Prefer visuals? Use the “Use Image as Definition” button to make flashcards with images instead of text. Choose the method that works best for you!"
  },
    {
    text: "✏️ Adding Flashcard Sets",
    image: "page3.png",
    desc: "By default, non-verified users can make up to 2 public flashcard sets. You can free up a slot anytime by editing a public set and unchecking the “Public” checkbox. Need more slots? Visit the Shop to unlock additional public set slots."
  },
     {
    text: "📺 Displayed FlashCard Sets",
    image: "page4.png",
    desc: "Once you create card sets, they’ll automatically appear in your Folder section—ready for you to review, edit, or study anytime."
  },
       {
    text: "⬇️ Dropdown Pages",
    image: "page5.png",
    desc: "Use the dropdown in the Folder section to switch between views: your own card sets, public sets shared by you or others, and flashcards you’ve liked from other users. Just click to explore each category.."
  },
  {
    text: "🔁 Review Modes",
    image: "page6.png",
    desc: "FlipCards includes multiple review modes: Flashcard for simple flipping, Learn for guided practice, Test for self-quizzing, Match for pairing terms, DefiDrop for speed challenges, and the new Quibbl mode for real-time multiplayer quizzes."
  },
    {
    text: "🎴 Flashcard Mode",
    image: "page7.png",
    desc: "Flashcard mode is the most basic and flexible way to study. Users can flip each card to view the definition and easily reverse the card to switch between term and definition as needed."
  },
      {
    text: "🧪 Test Mode",
    image: "page8.png",
    desc: "Test mode displays a definition on screen and prompts the user to type the correct term. It tracks incorrect answers, allowing users to review and retry their mistakes—helping them focus on mastering the concepts they missed."
  },
        {
    text: "🧠 Learn Mode",
    image: "page9.png",
    desc: "Learn mode presents a definition and offers four multiple-choice options, simulating a classic exam format. It helps users practice recognition and understanding through guided repetition and immediate feedback."
  },
          {
    text: "🃏 Match Mode",
    image: "page10.png",
    desc: "Match mode challenges users to pair 6 random term-definition sets within a time limit. It’s a fast-paced exercise that boosts recall and speed by encouraging quick, accurate matching."
  },
            {
    text: "🔻DefiDrop Mode",
    image: "page11.png",
    desc: "DefiDrop mode displays 12 definitions all at once, and users must quickly select and answer as many as they can. Scores are recorded on the leaderboard, making it a competitive challenge. This mode also supports multiplayer, allowing users to compete with friends or other players as they race to climb the top ranks."
  },
  {
    text: "⚔️ Quibbl Mode",
    image: "page12.png",
    desc: "Quibbl Mode is a multiplayer-based challenge where users compete in real time with friends or other players. Participants earn stars for correct answers and use them to climb the Quibbl leaderboard. The mode also features a live chat, allowing players to interact and monitor correct answers as the game unfolds."
  },
    {
    text: "💬 General Questions",
    image: "page13.png",
    desc: "The General Question section allows users to ask anything—academic or topic-related—for others in the community to answer. It’s a collaborative space where learners help each other by sharing knowledge and insights."
  },
      {
    text: "🙍 Profile",
    image: "page14.png",
    desc: "In the Profile section, users can personalize their experience by customizing their avatar, cover photo, and username—making their account uniquely their own."
  },
  {
    text: "🎮 Level Up",
    image: "page15.png",
    desc: "Users can level up by actively using the platform—playing review modes, creating card sets, and winning in multiplayer challenges like DefiDrop and Quibbl. The more you engage, the faster you progress and unlock badges."
  }
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
  const slide = tutorialSlides[currentSlide];
  const slideContainer = document.getElementById("tutorialSlideContainer");

  slideContainer.innerHTML = `
    <div class="tutorial-img-box">
      <img src="${slide.image}" alt="Tutorial Step" class="tutorial-img">
    </div>
    <div class="tutorial-text-content">
      <h3>${slide.text}</h3>
      <p>${slide.desc}</p>
    </div>
  `;

  const dotsContainer = document.getElementById("tutorialDots");
  dotsContainer.innerHTML = tutorialSlides.map((_, idx) => 
    `<span class="${idx === currentSlide ? 'active' : ''}" onclick="goToSlide(${idx})"></span>`
  ).join('');
}


  function goToSlide(index) {
    currentSlide = index;
    renderTutorialSlide();
  }