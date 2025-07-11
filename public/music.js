const musicBtn = document.querySelector('.music-icon.music');
const modal = document.getElementById('musicModal');
const header = document.getElementById('musicModalHeader');
let spotifyTab = null;

const playlistLinks = {
  "3QhTLSPC91N9jQOqhDIODO": "https://open.spotify.com/playlist/3QhTLSPC91N9jQOqhDIODO",
  "7ml2ua0UD8YWS9HULceCx1": "https://open.spotify.com/playlist/7ml2ua0UD8YWS9HULceCx1",
  "6avG1f9f9Xahh5ljq98G2s": "https://open.spotify.com/playlist/6avG1f9f9Xahh5ljq98G2s"
};

// Toggle modal visibility
musicBtn.addEventListener('click', () => {
  const isVisible = modal.style.display === 'block';
  modal.style.display = isVisible ? 'none' : 'block';
  if (!isVisible) {
    modal.style.left = '';
    modal.style.top = '';
  }
});

// Drag modal
let isDragging = false, offsetX, offsetY;

header.addEventListener('mousedown', (e) => {
  isDragging = true;
  offsetX = e.clientX - modal.offsetLeft;
  offsetY = e.clientY - modal.offsetTop;
});

document.addEventListener('mouseup', () => isDragging = false);
document.addEventListener('mousemove', (e) => {
  if (isDragging) {
    modal.style.left = `${e.clientX - offsetX}px`;
    modal.style.top = `${e.clientY - offsetY}px`;
  }
});

// Open Spotify links
document.querySelectorAll('.playlist-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const id = btn.dataset.id;
    const url = playlistLinks[id];
    if (!spotifyTab || spotifyTab.closed) {
      spotifyTab = window.open(url, '_blank');
    } else {
      spotifyTab.location.href = url;
      spotifyTab.focus();
    }
  });
});
