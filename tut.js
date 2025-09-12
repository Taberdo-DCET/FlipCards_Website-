// The tutorial slide data has been updated to use SVG icons instead of emojis.
const tutorialSlides = [
  {
    icon_svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12C2 7.6 7.6 3 12 3s10 4.6 10 9-4.6 10-10 10-9-4.6-9-10Z"></path><path d="M10 9a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z"></path><path d="M18 9a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z"></path><path d="M12 14.5c-2.3 0-4.4-1.3-5.5-3.5"></path></svg>`,
    text: "Welcome to FlipCards!",
    image: "page1.png",
    desc: "We believe that everyone deserves access to quality education. That’s why this platform was created—to offer students a high-quality learning experience without the costly fees charged by other websites. Our mission is to assist those facing financial challenges by providing effective study tools, consistent updates, and a strong, supportive community—all at no cost or at a very low price. Education should empower, not become a burden—and we’re committed to making that possible."
  },
  {
    icon_svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>`,
    text: "Create Flashcard Sets",
    image: "page2.png",
    desc: "Easily create flashcards by clicking “Add More Card Sets” in the Folder section. Prefer visuals? Use the “Use Image as Definition” button to make flashcards with images instead of text. Choose the method that works best for you!"
  },
  {
    icon_svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>`,
    text: "Adding Flashcard Sets",
    image: "page3.png",
    desc: "By default, non-verified users can make up to 2 public flashcard sets. You can free up a slot anytime by editing a public set and unchecking the “Public” checkbox. Need more slots? Visit the Shop to unlock additional public set slots."
  },
  {
    icon_svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`,
    text: "Displayed FlashCard Sets",
    image: "page4.png",
    desc: "Once you create card sets, they’ll automatically appear in your Folder section—ready for you to review, edit, or study anytime."
  },
  {
    icon_svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg>`,
    text: "Dropdown Pages",
    image: "page5.png",
    desc: "Use the dropdown in the Folder section to switch between views: your own card sets, public sets shared by you or others, and flashcards you’ve liked from other users. Just click to explore each category.."
  },
  {
    icon_svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path><path d="M3 21v-5h5"></path></svg>`,
    text: "Review Modes",
    image: "page6.png",
    desc: "FlipCards includes multiple review modes: Flashcard for simple flipping, Learn for guided practice, Test for self-quizzing, Match for pairing terms, DefiDrop for speed challenges, and the new Quibbl mode for real-time multiplayer quizzes."
  },
  {
    icon_svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>`,
    text: "Flashcard Mode",
    image: "page7.png",
    desc: "Flashcard mode is the most basic and flexible way to study. Users can flip each card to view the definition and easily reverse the card to switch between term and definition as needed."
  },
  {
    icon_svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="m10.4 12.6-2.8 2.8"></path><path d="m10.4 15.4-2.8-2.8"></path><path d="M12 18h6"></path></svg>`,
    text: "Test Mode",
    image: "page8.png",
    desc: "Test mode displays a definition on screen and prompts the user to type the correct term. It tracks incorrect answers, allowing users to review and retry their mistakes—helping them focus on mastering the concepts they missed."
  },
  {
    icon_svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15.232 5.232a3 3 0 0 1 0 4.242L12 12.728l-3.232-3.232a3 3 0 0 1 0-4.242a3 3 0 0 1 4.242 0z"></path><path d="M12 12.728 8.768 9.496a3 3 0 0 1 0 4.242L12 17.228l3.232-3.232a3 3 0 0 1 0-4.242z"></path></svg>`,
    text: "Learn Mode",
    image: "page9.png",
    desc: "Learn mode presents a definition and offers four multiple-choice options, simulating a classic exam format. It helps users practice recognition and understanding through guided repetition and immediate feedback."
  },
  {
  icon_svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 7h-4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"></path><path d="M10 7V5.5a1.5 1.5 0 0 1 3 0V7"></path><path d="M14 17v1.5a1.5 1.5 0 0 1-3 0V17"></path><path d="M7 10H5.5a1.5 1.5 0 0 0 0 3H7"></path><path d="M17 14h1.5a1.5 1.5 0 0 0 0-3H17"></path></svg>`,
  text: "Match Mode",
  image: "page10.png",
  desc: "Match mode challenges users to pair 6 random term-definition sets within a time limit. It’s a fast-paced exercise that boosts recall and speed by encouraging quick, accurate matching."
},
  {
    icon_svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"></path><path d="m19 12-7-7"></path></svg>`,
    text: "DefiDrop Mode",
    image: "page11.png",
    desc: "DefiDrop mode displays 12 definitions all at once, and users must quickly select and answer as many as they can. Scores are recorded on the leaderboard, making it a competitive challenge. This mode also supports multiplayer, allowing users to compete with friends or other players as they race to climb the top ranks."
  },
  {
    icon_svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1 0-2l.15-.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>`,
    text: "Quibbl Mode",
    image: "page12.png",
    desc: "Quibbl Mode is a multiplayer-based challenge where users compete in real time with friends or other players. Participants earn stars for correct answers and use them to climb the Quibbl leaderboard. The mode also features a live chat, allowing players to interact and monitor correct answers as the game unfolds."
  },
  {
    icon_svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`,
    text: "General Questions",
    image: "page13.png",
    desc: "The General Question section allows users to ask anything—academic or topic-related—for others in the community to answer. It’s a collaborative space where learners help each other by sharing knowledge and insights."
  },
  {
    icon_svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
    text: "Profile",
    image: "page14.png",
    desc: "In the Profile section, users can personalize their experience by customizing their avatar, cover photo, and username—making their account uniquely their own."
  },
  {
    icon_svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>`,
    text: "Level Up",
    image: "page15.png",
    desc: "Users can level up by actively using the platform—playing review modes, creating card sets, and winning in multiplayer challenges like DefiDrop and Quibbl. The more you engage, the faster you progress and unlock badges."
  }
];

let currentSlide = 0;

function showTutorial() {
  currentSlide = 0;
  document.getElementById("tutorialModal").classList.remove("hidden");
  renderTutorialSlide(true); // Initial render
}

function closeTutorial() {
  document.getElementById("tutorialModal").classList.add("hidden");
}

function changeTutorialSlide(direction) {
  const slideContent = document.getElementById("tutorialSlideContent");
  const nextSlideIndex = currentSlide + direction;

  if (nextSlideIndex < 0 || nextSlideIndex >= tutorialSlides.length) {
    return;
  }

  // Add slide-out animation class
  slideContent.classList.add(direction > 0 ? 'slide-out-left' : 'slide-out-right');

  // Wait for the slide-out animation to finish, then render the new slide
  setTimeout(() => {
    currentSlide = nextSlideIndex;
    renderTutorialSlide(false, direction); // Render new slide without full re-animation
  }, 300); // This duration should match the CSS animation time
}

function renderTutorialSlide(isInitial = false, direction = 1) {
  const slide = tutorialSlides[currentSlide];
  const slideContent = document.getElementById("tutorialSlideContent");
  const progressBar = document.getElementById("tutorialProgressBar");
  const prevBtn = document.getElementById("tutorialPrevBtn");
  const nextBtn = document.getElementById("tutorialNextBtn");

  // Update the progress bar
  const progressPercentage = ((currentSlide + 1) / tutorialSlides.length) * 100;
  progressBar.style.width = `${progressPercentage}%`;

  // Set the new content using your original image, text, and NEW icon properties
  slideContent.innerHTML = `
    <img src="${slide.image}" alt="Tutorial Step" class="tutorial-img">
    <div class="tutorial-title-wrapper">
      ${slide.icon_svg}
      <h3>${slide.text}</h3>
    </div>
    <p>${slide.desc}</p>
  `;

  // Handle animations
  if (!isInitial) {
    slideContent.classList.remove('slide-out-left', 'slide-out-right');
    slideContent.classList.add(direction > 0 ? 'slide-in-right' : 'slide-in-left');

    // Clean up animation classes after they run
    setTimeout(() => {
      slideContent.classList.remove('slide-in-right', 'slide-in-left');
    }, 300);
  }

  // Update button states
  prevBtn.disabled = (currentSlide === 0);
  if (currentSlide === tutorialSlides.length - 1) {
    nextBtn.querySelector('span').textContent = 'Finish';
    nextBtn.onclick = closeTutorial; // Change function on the last slide
  } else {
    nextBtn.querySelector('span').textContent = 'Next';
    nextBtn.onclick = () => changeTutorialSlide(1);
  }
}