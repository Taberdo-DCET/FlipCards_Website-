import { 
    getFirestore, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot 
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { db } from "./firebaseinit.js";

document.addEventListener('DOMContentLoaded', () => {
    const musicBtn = document.querySelector('.music-icon.music');
    const modal = document.getElementById('musicModal');
    const header = document.getElementById('musicModalHeader');

    // Updated element IDs to match HTML
    const addSpotifyCodeBtn = document.getElementById('addSpotifyCodeBtn');
    const spotifyCodeInput = document.getElementById('spotifyCodeInput');
    const spotifyPlayerContainer = document.getElementById('spotifyPlayerContainer');
    const errorText = document.getElementById('spotifyErrorText');
const closeBtn = document.getElementById('closeMusicModalBtn');
  // ▼▼▼ ADD THESE NEW VARIABLES ▼▼▼
    const howToBtn = document.getElementById('howToUseMusicBtn');
    const howToModal = document.getElementById('howToUseMusicModal');
    const howToOkBtn = document.getElementById('howToUseMusicOkBtn');
     const minimizeBtn = document.getElementById('minimizeMusicModalBtn')
    // ▲▲▲ END OF NEW VARIABLES ▲▲▲
    musicBtn.addEventListener('click', () => {
        modal.style.display = (modal.style.display === 'block') ? 'none' : 'block';
    });
    
  closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
      howToBtn.addEventListener('click', () => {
        howToModal.classList.remove('hidden');
    });

    howToOkBtn.addEventListener('click', () => {
        howToModal.classList.add('hidden');
    });
        if (minimizeBtn && modal) {
        minimizeBtn.addEventListener('click', () => {
            // Toggle the 'minimized' class on the modal
            modal.classList.toggle('minimized');

            // Update the button text based on the state
            if (modal.classList.contains('minimized')) {
                minimizeBtn.textContent = 'Maximize';
            } else {
                minimizeBtn.textContent = 'Minimize';
            }
        });
    }
    // ▲▲▲ END OF CHANGE ▲▲▲
    // --- NEW: Validate embed code and save data to Firestore ---
    // --- NEW: Validate embed code and save the full URL to Firestore ---
async function saveSpotifyEmbedToFirestore(embedCode) {
    if (!embedCode) {
        errorText.textContent = "Please paste an embed code.";
        return;
    }

    // 1. Regex to validate the embed code and extract the src URL
    const embedRegex = /<iframe.*?src="([^"]+)".*?<\/iframe>/;
    const match = embedCode.match(embedRegex);

    if (match && match[1]) {
        const embedUrl = match[1]; // The exact URL from the src attribute

        // Optional: A simple check to ensure it's a Spotify URL
        if (!embedUrl.includes('spotify.com/embed')) {
            errorText.textContent = "Invalid or non-Spotify embed code.";
            return;
        }

        errorText.textContent = ""; // Clear any previous errors

        try {
            // 2. Save ONLY the full embed URL to Firestore
            await addDoc(collection(db, "userPlaylists"), {
                embedUrl: embedUrl, // Save the full URL
                createdAt: serverTimestamp()
            });
            spotifyCodeInput.value = ""; // Clear input on success
        } catch (e) {
            console.error("Error adding document: ", e);
            errorText.textContent = "Could not save playlist.";
        }
    } else {
        errorText.textContent = "Could not find a valid iframe embed code.";
    }
}
    
    // Add event listener for the "Add" button
    addSpotifyCodeBtn.addEventListener('click', () => {
        const embedCode = spotifyCodeInput.value.trim();
        saveSpotifyEmbedToFirestore(embedCode);
    });

    // --- Load and display playlists from Firestore (no changes needed here) ---
    // --- Load and display playlists from Firestore using the full URL ---
function loadPlaylistsFromFirestore() {
    const q = query(collection(db, "userPlaylists"), orderBy("createdAt", "desc"));

    onSnapshot(q, (querySnapshot) => {
        spotifyPlayerContainer.innerHTML = '';
        if (querySnapshot.empty) {
            spotifyPlayerContainer.innerHTML = '<p class="no-playlists-message">No playlists added yet. Add one above!</p>';
        } else {
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const embedUrl = data.embedUrl; // Get the full URL from Firestore

                // Check if the URL exists to prevent errors
                if (embedUrl) {
                    const iframeHTML = `
                        <iframe style="border-radius:12px;"
                                src="${embedUrl}"
                                width="100%"
                                height="152"
                                frameBorder="0"
                                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                                loading="lazy">
                        </iframe>`;
                    spotifyPlayerContainer.innerHTML += iframeHTML;
                }
            });
        }
    });
}

    loadPlaylistsFromFirestore();
});