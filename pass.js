document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENT SELECTORS ---
    const adminLink = document.getElementById('admin-link');
    const passwordModal = document.getElementById('password-modal');
    const passwordOverlay = document.getElementById('password-overlay');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const passwordForm = document.getElementById('password-form');
    const passwordInput = document.getElementById('password-input');
    const passwordError = document.getElementById('password-error');

    // The correct 6-digit password
    // IMPORTANT: Change this to your actual password
    const CORRECT_PASSWORD = "280412"; 

    // --- MODAL VISIBILITY ---
    const showPasswordModal = () => {
        passwordModal.classList.remove('hidden');
        passwordOverlay.classList.remove('hidden');
        passwordInput.focus();
    };

    const hidePasswordModal = () => {
        passwordModal.classList.add('hidden');
        passwordOverlay.classList.add('hidden');
        passwordError.textContent = '';
        passwordForm.reset();
    };

    // --- EVENT LISTENERS ---
    if (adminLink) {
        adminLink.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent the link from navigating anywhere
            showPasswordModal();
        });
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', hidePasswordModal);
    }

    if (passwordOverlay) {
        passwordOverlay.addEventListener('click', hidePasswordModal);
    }

    if (passwordForm) {
        passwordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const enteredPassword = passwordInput.value;

            if (enteredPassword === CORRECT_PASSWORD) {
                // If the password is correct, go to the admin panel
                window.location.href = 'admin.html';
            } else {
                // If incorrect, show an error message
                passwordError.textContent = 'Incorrect password. Please try again.';
                passwordInput.value = ''; // Clear the input
                passwordInput.focus();
            }
        });
    }
});