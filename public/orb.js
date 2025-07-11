const orb = document.querySelector('.orb');
const eye = document.querySelector('.orb-eye');
const trailContainer = document.querySelector('.orb');

let targetX = 0;
let targetY = 0;
let currentX = 40;
let currentY = 40;
let animationId;

function createTrail(x, y) {
  const trail = document.createElement('div');
  trail.className = 'orb-trail';
  trail.style.left = `calc(${x}% - 15px)`;
  trail.style.top = `calc(${y}% - 15px)`;
  trailContainer.appendChild(trail);

  // Fade out and remove
  setTimeout(() => {
    trail.style.opacity = '0';
  }, 10);

  setTimeout(() => {
    trail.remove();
  }, 500);
}

function animateEye() {
  currentX += (targetX - currentX) * 0.1;
  currentY += (targetY - currentY) * 0.1;

  eye.style.left = `calc(${currentX}% - 15px)`;
  eye.style.top = `calc(${currentY}% - 15px)`;

  createTrail(currentX, currentY);

  animationId = requestAnimationFrame(animateEye);
}

orb.addEventListener('mouseenter', () => {
  eye.style.animation = 'none';
  cancelAnimationFrame(animationId);
  animateEye();
});

orb.addEventListener('mousemove', (e) => {
  const rect = orb.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  targetX = (x / rect.width) * 100;
  targetY = (y / rect.height) * 100;
});

orb.addEventListener('mouseleave', () => {
  cancelAnimationFrame(animationId);
  eye.style.animation = 'bounceEye 5s ease-in-out infinite';
  eye.style.left = '40%';
  eye.style.top = '40%';
});
