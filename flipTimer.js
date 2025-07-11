let flipTimerInterval;
let isOnBreak = false;
let breakCount = 0;
let currentTimer = 0;
let flashTextInterval = null;
let showBreakMessage = false;
let isPaused = false;

function formatTime(seconds) {
  const min = String(Math.floor(seconds / 60)).padStart(2, '0');
  const sec = String(seconds % 60).padStart(2, '0');
  return `${min}:${sec}`;
}

function updateMinimizedClock() {
  const clock = document.getElementById("flipTimerMinClock");
  if (isOnBreak) {
    if (!flashTextInterval) {
      flashTextInterval = setInterval(() => {
        showBreakMessage = !showBreakMessage;
        clock.textContent = showBreakMessage ? "Break Time!" : formatTime(currentTimer);
      }, 1000);
    }
  } else {
    if (flashTextInterval) {
      clearInterval(flashTextInterval);
      flashTextInterval = null;
    }
    clock.textContent = formatTime(currentTimer);
  }
}

function updateMinimizedStyle() {
  const mini = document.getElementById("flipTimerMinimized");
  const clock = document.getElementById("flipTimerMinClock");
  const expandBtn = mini.querySelector("button");
  const counter = document.getElementById("minBreakCounter");

  mini.style.background = "rgba(23,23,23,0.85)";
  mini.style.color = "#fff";
  clock.style.color = "#fff";
  expandBtn.style.color = "#fff";
  expandBtn.style.background = "#222";
  counter.style.color = "#fff";

  if (isOnBreak) {
    mini.classList.add("flashing-border");
  } else {
    mini.classList.remove("flashing-border");
  }
}

function showFocusAgainPrompt() {
  const clock = document.getElementById("flipTimerMinClock");
  if (flashTextInterval) {
    clearInterval(flashTextInterval);
    flashTextInterval = null;
  }
  clock.textContent = "Focus Again?";
}

window.closeFlipTimer = function () {
  document.getElementById("flipTimerModal").classList.add("hidden");
  document.getElementById("flipTimerMinimized").classList.add("hidden");
  clearInterval(flipTimerInterval);
  localStorage.setItem("flipTimer_closed", "true");
};

window.resetFlipTimer = function () {
  clearInterval(flipTimerInterval);
  if (flashTextInterval) {
    clearInterval(flashTextInterval);
    flashTextInterval = null;
  }
  currentTimer = 0;
  isOnBreak = false;
  isPaused = false;
  breakCount = 0;
  document.getElementById("flipTimerClock").textContent = "00:00";
  document.getElementById("flipTimerMinClock").textContent = "00:00";
  document.getElementById("flipTimerLabel").textContent = "Ready to Focus?";
  document.getElementById("breakCounter").textContent = breakCount;
  document.getElementById("minBreakCounter").textContent = `${breakCount}`;
  document.getElementById("pauseButton").innerHTML = "⏸️ Pause";
 // Only remove timer-related keys
localStorage.removeItem("pomodoroState");
localStorage.removeItem("breakStart");
localStorage.removeItem("timerStatus");

  sessionStorage.removeItem("flipTimer_isResuming");
  updateMinimizedStyle();
};

window.startFlipTimer = function (skipInputCheck = false) {
  clearInterval(flipTimerInterval);

  const resumed = sessionStorage.getItem("flipTimer_isResuming") === "true";
  if (!isOnBreak && breakCount >= 3 && currentTimer === 0 && !isPaused && !resumed) {
    document.getElementById("flipTimerConfirm").classList.remove("hidden");
    return;
  }

  sessionStorage.removeItem("flipTimer_isResuming");
  proceedWithTimerStart(skipInputCheck);
};

window.confirmFlipTimerContinue = function (proceed) {
  document.getElementById("flipTimerConfirm").classList.add("hidden");
  if (proceed) {
    window.resetFlipTimer();
    proceedWithTimerStart(true);
  } else {
    window.resetFlipTimer();
    window.closeFlipTimer();
  }
};

function proceedWithTimerStart(skipInputCheck = false) {
  if (isPaused) return;

  if (isOnBreak) {
    if (currentTimer === 0) {
      currentTimer = breakCount === 1 ? 5 * 60 : breakCount === 2 ? 10 * 60 : 15 * 60;
    }
    document.getElementById("flipTimerLabel").textContent = `Break #${breakCount}`;
  } else {
    if (!skipInputCheck) {
      const inputEl = document.getElementById("studyMinutes");
      let minutes = inputEl ? parseInt(inputEl.value) : NaN;
      if (isNaN(minutes) || minutes <= 0) {
        alert("Please enter a valid study duration.");
        return;
      }
      currentTimer = minutes * 60;
    }
    document.getElementById("flipTimerLabel").textContent = "Study Time!";
  }

  updateMinimizedStyle();
  updateMinimizedClock();

  flipTimerInterval = setInterval(() => {
    if (isPaused) return;

    if (currentTimer <= 0) {
      clearInterval(flipTimerInterval);

      if (!isOnBreak) {
        breakCount++;
        document.getElementById("breakCounter").textContent = breakCount;
        document.getElementById("minBreakCounter").textContent = `${breakCount}`;
        if (breakCount <= 3) {
          isOnBreak = true;
          currentTimer = breakCount === 1 ? 5 * 60 : breakCount === 2 ? 10 * 60 : 15 * 60;
          document.getElementById("flipTimerLabel").textContent = `Break #${breakCount}`;
          updateMinimizedStyle();
          updateMinimizedClock();
          proceedWithTimerStart(true);
        }
      } else {
        isOnBreak = false;
        document.getElementById("flipTimerLabel").textContent = "Focus Again!";
        showFocusAgainPrompt();
        updateMinimizedStyle();
      }
    } else {
      currentTimer--;
      saveTimerState();
      const formatted = formatTime(currentTimer);
      document.getElementById("flipTimerClock").textContent = formatted;
      if (!flashTextInterval) {
        document.getElementById("flipTimerMinClock").textContent = formatted;
      }
      updateMinimizedClock();
    }
  }, 1000);
}

window.skipBreak = function () {
  clearInterval(flipTimerInterval);

  if (!isOnBreak) {
    breakCount++;
    isOnBreak = true;
    document.getElementById("breakCounter").textContent = breakCount;
    document.getElementById("minBreakCounter").textContent = `${breakCount}`;
    currentTimer = breakCount === 1 ? 5 * 60 : breakCount === 2 ? 10 * 60 : 15 * 60;
    document.getElementById("flipTimerLabel").textContent = `Break #${breakCount}`;
    updateMinimizedStyle();
    updateMinimizedClock();
    proceedWithTimerStart(true);
  } else {
    isOnBreak = false;
    document.getElementById("flipTimerLabel").textContent = "Skipped! Back to Focus";
    document.getElementById("flipTimerClock").textContent = "00:00";
    document.getElementById("flipTimerMinClock").textContent = "00:00";
    updateMinimizedStyle();
    saveTimerState();
  }
};

window.pauseFlipTimer = function () {
  isPaused = !isPaused;
  localStorage.setItem("flipTimer_paused", isPaused);
  const btn = document.getElementById("pauseButton");
  if (isPaused) {
    clearInterval(flipTimerInterval);
    btn.innerHTML = "▶️ Resume";
  } else {
    btn.innerHTML = "⏸️ Pause";
    proceedWithTimerStart(true);
  }
};

window.collapseFlipTimer = function () {
  document.getElementById("flipTimerModal").classList.add("hidden");
  document.getElementById("flipTimerMinimized").classList.remove("hidden");
  localStorage.setItem("flipTimer_view", "minimized");
  updateMinimizedStyle();
};

window.expandFlipTimer = function () {
  document.getElementById("flipTimerModal").classList.remove("hidden");
  document.getElementById("flipTimerMinimized").classList.add("hidden");
  localStorage.setItem("flipTimer_view", "modal");
  updateMinimizedStyle();
};

function saveTimerState() {
  localStorage.setItem("flipTimer_current", currentTimer);
  localStorage.setItem("flipTimer_break", breakCount);
  localStorage.setItem("flipTimer_onBreak", isOnBreak);
  localStorage.setItem("flipTimer_paused", isPaused);
}

function loadTimerState() {
  const saved = localStorage.getItem("flipTimer_current");
  const savedBreak = localStorage.getItem("flipTimer_break");
  const savedOnBreak = localStorage.getItem("flipTimer_onBreak");
  const savedPaused = localStorage.getItem("flipTimer_paused");

  if (saved && !isNaN(saved)) currentTimer = parseInt(saved);
  if (savedBreak && !isNaN(savedBreak)) breakCount = parseInt(savedBreak);
  if (savedOnBreak) isOnBreak = savedOnBreak === "true";
  if (savedPaused) isPaused = savedPaused === "true";

  document.getElementById("breakCounter").textContent = breakCount;
  document.getElementById("minBreakCounter").textContent = `${breakCount}`;
  document.getElementById("flipTimerClock").textContent = formatTime(currentTimer);
  document.getElementById("flipTimerMinClock").textContent = formatTime(currentTimer);
  document.getElementById("pauseButton").innerHTML = isPaused ? "▶️ Resume" : "⏸️ Pause";
  updateMinimizedStyle();
}

function makeDraggable(el) {
  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  el.addEventListener("mousedown", (e) => {
    isDragging = true;
    offsetX = e.clientX - el.getBoundingClientRect().left;
    offsetY = e.clientY - el.getBoundingClientRect().top;
    el.style.position = "fixed";
    el.style.zIndex = "9999";
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const maxX = window.innerWidth - el.offsetWidth;
    const maxY = window.innerHeight - el.offsetHeight;
    const newX = Math.min(Math.max(0, e.clientX - offsetX), maxX);
    const newY = Math.min(Math.max(0, e.clientY - offsetY), maxY);
    el.style.left = `${newX}px`;
    el.style.top = `${newY}px`;
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.getElementById("pomodoroToggleBtn");
  const flipTimerModal = document.getElementById("flipTimerModal");

  if (toggleBtn && flipTimerModal) {
    toggleBtn.addEventListener("click", () => {
      flipTimerModal.classList.remove("hidden");
      document.getElementById("flipTimerMinimized").classList.add("hidden");
      localStorage.setItem("flipTimer_view", "modal");
      localStorage.removeItem("flipTimer_closed");
    });
  }

  makeDraggable(flipTimerModal);
  loadTimerState();

  const viewState = localStorage.getItem("flipTimer_view");
  const isClosed = localStorage.getItem("flipTimer_closed") === "true";

  if (!isClosed) {
    if (viewState === "modal") {
      document.getElementById("flipTimerModal").classList.remove("hidden");
      document.getElementById("flipTimerMinimized").classList.add("hidden");
    } else if (viewState === "minimized") {
      document.getElementById("flipTimerModal").classList.add("hidden");
      document.getElementById("flipTimerMinimized").classList.remove("hidden");
    }
  }

  if (currentTimer > 0 && !isPaused) {
    sessionStorage.setItem("flipTimer_isResuming", "true");
    startFlipTimer(true);
  }
});
