import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { db } from './firebaseinit.js'; // Imports the database connection

const auth = getAuth();
const storage = getStorage();

// Get the HTML elements
const articleWrapper = document.querySelector('.article-wrapper');
const imageContainer = document.getElementById('user-card-image-container');
const usernameContainer = document.getElementById('user-card-username-container');
const emailDisplay = document.getElementById('user-card-email');
const rolesContainer = document.getElementById('user-card-roles-container');
const cardImage = document.getElementById('user-card-image');
const addPhotoButton = document.getElementById('user-card-add-photo-btn');
const photoInput = document.getElementById('user-card-photo-input');
const paletteButton = document.getElementById('user-card-palette-btn');
const colorPicker = document.getElementById('user-card-color-picker');
const colorSwatches = document.querySelectorAll('.color-swatch');

const allowedRoles = new Set(['admin', 'coadmin', 'beta tester', 'pioneer', 'moderator', 'prepper', 'test', 'verified', 'first']);

// --- Create a dedicated style tag for dynamic hover effects ---
let dynamicCardStyle = document.createElement('style');
dynamicCardStyle.id = 'dynamic-card-hover-style';
document.head.appendChild(dynamicCardStyle);

// --- Event Listeners for Color Picker ---
paletteButton.addEventListener('click', (event) => {
  event.stopPropagation();
  colorPicker.style.display = colorPicker.style.display === 'flex' ? 'none' : 'flex';
});

colorSwatches.forEach(swatch => {
  swatch.addEventListener('click', () => {
    const color = swatch.dataset.color;
    const user = auth.currentUser;
    if (user) {
      applyAndSaveColor(color, user);
    }
    colorPicker.style.display = 'none';
  });
});

document.addEventListener('click', (event) => {
  if (!colorPicker.contains(event.target) && event.target !== paletteButton) {
    colorPicker.style.display = 'none';
  }
});

// --- Event Listeners for Photo Upload ---
addPhotoButton.addEventListener('click', () => photoInput.click());
cardImage.addEventListener('click', () => photoInput.click());

photoInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  const user = auth.currentUser;
  if (file && user) {
    uploadCardPhoto(file, user);
  }
});

/**
 * NEW: Determines if black or white text should be used based on background color brightness.
 * @param {string} hex - The background hex color.
 * @returns {string} - Returns "#000000" (black) for light backgrounds or "#FFFFFF" (white) for dark backgrounds.
 */
function getContrastColor(hex) {
  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}


function darkenColor(hex, percent) {
  hex = hex.replace('#', '');
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);

  r = Math.floor(r * (100 + percent) / 100);
  g = Math.floor(g * (100 + percent) / 100);
  b = Math.floor(b * (100 + percent) / 100);

  r = (r < 255) ? r : 255;
  g = (g < 255) ? g : 255;
  b = (b < 255) ? b : 255;

  const toHex = (c) => ('00' + c.toString(16)).slice(-2);
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function applyCardColor(color) {
    articleWrapper.style.backgroundColor = color;

    // NEW: Calculate and set the appropriate text color
    const textColor = getContrastColor(color);
    articleWrapper.style.setProperty('--card-text-color', textColor);

    const shadow1Color = darkenColor(color, -55);
    const shadow2Color = darkenColor(color, -30);
    const borderColor = darkenColor(color, -50);

    const newHoverStyle = `
        .article-wrapper:hover {
            box-shadow: 10px 10px 0 ${shadow1Color}, 20px 20px 0 ${shadow2Color} !important;
            border-color: ${borderColor} !important;
        }
    `;
    dynamicCardStyle.innerHTML = newHoverStyle;
}

async function applyAndSaveColor(color, user) {
  applyCardColor(color);
  try {
    const userDocRef = doc(db, 'approved_emails', user.email);
    await updateDoc(userDocRef, { cardBackgroundColor: color });
  } catch (error) {
    console.error("Error saving card color:", error);
  }
}

async function uploadCardPhoto(file, user) {
  if (imageContainer.classList.contains('has-photo')) {
    cardImage.style.opacity = '0.5';
  } else {
    addPhotoButton.textContent = 'Uploading...';
    addPhotoButton.disabled = true;
  }

  try {
    const storageRef = ref(storage, `userCardPhotos/${user.uid}/card_photo`);
    await uploadBytes(storageRef, file, { contentType: file.type });
    const downloadURL = await getDownloadURL(storageRef);
    
    const userDocRef = doc(db, 'approved_emails', user.email);
    await updateDoc(userDocRef, { cardImageUrl: downloadURL });

    cardImage.src = downloadURL;
    imageContainer.classList.add('has-photo');
    addPhotoButton.textContent = '📷';
    addPhotoButton.disabled = false;
    cardImage.style.display = 'block';
    cardImage.style.opacity = '1';

  } catch (error) {
    console.error("Error uploading photo:", error);
    alert("Sorry, there was an error uploading your photo.");
    cardImage.style.opacity = '1';
    addPhotoButton.textContent = 'Add Photo';
    addPhotoButton.disabled = false;
  }
}

function adjustUsernameFontSize(textElement) {
  requestAnimationFrame(() => {
    const maxFontSize = 30;
    const minFontSize = 14;
    const container = textElement.parentElement.parentElement;
    const badge = textElement.parentElement.querySelector('.project-badge');
    let availableWidth = container.clientWidth;

    if (badge) {
      availableWidth -= (badge.offsetWidth + 8);
    }
    
    textElement.style.fontSize = '';
    let currentFontSize = parseFloat(window.getComputedStyle(textElement).fontSize);

    while (textElement.scrollWidth > availableWidth && currentFontSize > minFontSize) {
      currentFontSize--;
      textElement.style.fontSize = `${currentFontSize}px`;
    }
  });
}

async function updateUserCard(user) {
  if (user) {
    addPhotoButton.style.display = 'block';
    paletteButton.style.display = 'flex';
    emailDisplay.textContent = user.email;
    let username = user.email.split('@')[0];
    let badgeHtml = '';

    try {
      const userDocRef = doc(db, 'usernames', user.email);
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists() && docSnap.data().username) {
        username = docSnap.data().username;
      }
    } catch (error) { console.error("Error fetching username:", error); }

    try {
      const roleDocRef = doc(db, 'approved_emails', user.email);
      const roleDocSnap = await getDoc(roleDocRef);
      if (roleDocSnap.exists()) {
        const userData = roleDocSnap.data();

        const savedColor = (userData && userData.cardBackgroundColor) ? userData.cardBackgroundColor : '#FFFFFF';
        applyCardColor(savedColor);

        if (userData && userData.cardImageUrl) {
          cardImage.src = userData.cardImageUrl;
          cardImage.style.display = 'block';
          imageContainer.classList.add('has-photo');
          addPhotoButton.textContent = '📷';
        } else {
          cardImage.style.display = 'none';
          imageContainer.classList.remove('has-photo');
          addPhotoButton.textContent = 'Add Photo';
        }
        
        if (userData && userData.role) {
          const allRoles = userData.role.split(',').map(r => r.trim());
          
          if (allRoles.includes('verified')) {
            badgeHtml = '<img class="project-badge" src="verified.svg" alt="Verified Badge">';
          } else if (allRoles.includes('first')) {
            badgeHtml = '<img class="project-badge" src="first.png" alt="First User Badge">';
          }

          const rolesToDisplay = allRoles.filter(role => allowedRoles.has(role.toLowerCase()));

          if (rolesToDisplay.length > 0) {
            rolesContainer.innerHTML = rolesToDisplay.map(role => {
              const formattedRole = role.charAt(0).toUpperCase() + role.slice(1);
              const className = role.toLowerCase().replace(' ', '-');
              return `<span class="project-type role-${className}">• ${formattedRole}</span>`;
            }).join('');
          } else {
            rolesContainer.innerHTML = '<span class="project-type">• Member</span>';
          }
        }
      } else {
        rolesContainer.innerHTML = '<span class="project-type">• Member</span>';
        cardImage.style.display = 'none';
        imageContainer.classList.remove('has-photo');
        addPhotoButton.textContent = 'Add Photo';
        applyCardColor('#FFFFFF');
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
      rolesContainer.innerHTML = '<span class="project-type">• Member</span>';
      applyCardColor('#FFFFFF');
    }

    usernameContainer.innerHTML = `
      <span id="user-card-username-text">${username}</span>
      ${badgeHtml}
    `;

    document.fonts.ready.then(() => {
      const textElement = document.getElementById('user-card-username-text');
      if (textElement) {
        adjustUsernameFontSize(textElement);
      }
    });

  } else {
    // Handle logged-out state
    usernameContainer.innerHTML = '<span>Guest</span>';
    emailDisplay.textContent = '';
    rolesContainer.innerHTML = '';
    cardImage.style.display = 'none';
    addPhotoButton.style.display = 'none';
    paletteButton.style.display = 'none';
    imageContainer.classList.remove('has-photo');
    applyCardColor('#FFFFFF');
  }
}

onAuthStateChanged(auth, (user) => {
  updateUserCard(user);
});

window.addEventListener('resize', () => {
  const textElement = document.getElementById('user-card-username-text');
  if (textElement) {
    adjustUsernameFontSize(textElement);
  }
});