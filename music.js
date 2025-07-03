
  const musicBtn = document.querySelector('.music-icon.music');
  const modal = document.getElementById('musicModal');
  const header = document.getElementById('musicModalHeader');

  musicBtn.addEventListener('click', () => {
    modal.style.display = modal.style.display === 'block' ? 'none' : 'block';
  });

  // Dragging logic
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

  // ✅ Your requested Spotify playlist script
  const select = document.getElementById('playlistSelect');
  const frame = document.getElementById('spotifyFrame');

  select.addEventListener('change', () => {
    frame.src = `https://open.spotify.com/embed/playlist/${select.value}?utm_source=generator`;
  });
  select.dispatchEvent(new Event('change'));

