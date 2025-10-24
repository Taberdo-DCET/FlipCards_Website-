document.addEventListener("DOMContentLoaded", () => {
    // --- Chat Widget Logic ---
    const chatToggleBtn = document.getElementById('chatToggleBtn');
    const chatContainer = document.getElementById('chatContainer');
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const chatSendBtn = document.getElementById('chatSendBtn');

    chatToggleBtn.addEventListener('click', () => {
        const chatIcon = chatToggleBtn.querySelector('#chatIcon');
        const closeIcon = chatToggleBtn.querySelector('.fa-xmark');
        const isHidden = chatContainer.classList.contains('hidden');

        if (isHidden) {
            chatContainer.classList.remove('hidden');
            chatIcon.classList.add('hidden');
            closeIcon.classList.remove('hidden');
        } else {
            chatContainer.classList.add('closing');
            chatIcon.classList.remove('hidden');
            closeIcon.classList.add('hidden');
            chatContainer.addEventListener('animationend', () => {
                chatContainer.classList.add('hidden');
                chatContainer.classList.remove('closing');
            }, { once: true });
        }
    });

    const handleSendMessage = async () => {
        const question = chatInput.value.trim();
        if (!question) return;

        chatInput.disabled = true;
        chatSendBtn.disabled = true;

        const userMessage = document.createElement('div');
        userMessage.className = 'chat-message user-message';
        userMessage.innerHTML = `<p>${question}</p>`;
        chatMessages.appendChild(userMessage);
        chatInput.value = '';
        chatMessages.scrollTop = chatMessages.scrollHeight;

        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'typing-indicator';
        typingIndicator.innerHTML = `
            <svg class="ai-sparkle-icon-typing" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5Z"></path>
              <path d="M4 4l2 2m0-2l-2 2"></path><path d="M18 4l2 2m0-2l-2 2"></path>
              <path d="M4 18l2 2m0-2l-2 2"></path><path d="M18 18l2 2m0-2l-2 2"></path>
            </svg>
            <p>FlipCards Lobby Assistant is typing...</p>`;
        chatMessages.appendChild(typingIndicator);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        try {
            // ❗ IMPORTANT: Use the URL for your new chatWithLobbyAI function
            const CHAT_URL = 'https://chatwithlobbyai-zpanpdg2va-uc.a.run.app';
            const response = await fetch(CHAT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question })
            });

            typingIndicator.remove();

            if (!response.ok) throw new Error('Network response was not ok.');

            const data = await response.json();
            
            const aiMessage = document.createElement('div');
            aiMessage.className = 'chat-message ai-message';
            aiMessage.innerHTML = marked.parse(data.answer);
            chatMessages.appendChild(aiMessage);
            
        } catch (error) {
            console.error("Chat error:", error);
            typingIndicator.remove();
            const errorMessage = document.createElement('div');
            errorMessage.className = 'chat-message ai-message';
            errorMessage.innerHTML = `<p>Sorry, I'm having trouble connecting right now.</p>`;
            chatMessages.appendChild(errorMessage);
        } finally {
            chatInput.disabled = false;
            chatSendBtn.disabled = false;
            chatInput.focus();
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    };

    chatSendBtn.addEventListener('click', handleSendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSendMessage();
    });
    const initialAiMessageDiv = document.getElementById('initialAiMessage');

if (initialAiMessageDiv) {
    // --- Existing Referral Button ---
    const referralButton = document.createElement('button');
    referralButton.textContent = 'How Referral System work'; // Corrected text
    referralButton.className = 'quick-question-button';

    // (Keep the existing styles and event listener for referralButton here)
    referralButton.style.all = 'unset'; // Reset default button styles
    referralButton.style.display = 'inline-block';
    referralButton.style.marginTop = '10px';
    referralButton.style.marginRight = '8px'; // Add margin between buttons
    referralButton.style.padding = '6px 12px';
    referralButton.style.fontSize = '13px';
    referralButton.style.fontFamily = "'Satoshi', sans-serif";
    referralButton.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    referralButton.style.border = '1px solid rgba(255, 255, 255, 0.2)';
    referralButton.style.borderRadius = '8px';
    referralButton.style.color = '#ffcf00';
    referralButton.style.cursor = 'pointer';
    referralButton.style.transition = 'background-color 0.2s ease';
    referralButton.onmouseover = () => { referralButton.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'; };
    referralButton.onmouseout = () => { referralButton.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'; };
    referralButton.addEventListener('click', () => {
        chatInput.value = 'How Referral System work'; // Corrected text
        handleSendMessage();
        referralButton.remove();
        // Remove other buttons when one is clicked
        addCardButton?.remove();
        reviewModesButton?.remove();
    });
    initialAiMessageDiv.appendChild(referralButton);
    // --- End Existing Referral Button ---

    // === NEW BUTTON 1: Add Card Sets ===
    const addCardButton = document.createElement('button');
    addCardButton.textContent = 'How to Add Card Sets';
    addCardButton.className = 'quick-question-button';

    // Apply styles (same as referral button)
    addCardButton.style.all = 'unset';
    addCardButton.style.display = 'inline-block';
    addCardButton.style.marginTop = '10px';
    addCardButton.style.marginRight = '8px'; // Space between buttons
    addCardButton.style.padding = '6px 12px';
    addCardButton.style.fontSize = '13px';
    addCardButton.style.fontFamily = "'Satoshi', sans-serif";
    addCardButton.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    addCardButton.style.border = '1px solid rgba(255, 255, 255, 0.2)';
    addCardButton.style.borderRadius = '8px';
    addCardButton.style.color = '#ffcf00';
    addCardButton.style.cursor = 'pointer';
    addCardButton.style.transition = 'background-color 0.2s ease';
    addCardButton.onmouseover = () => { addCardButton.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'; };
    addCardButton.onmouseout = () => { addCardButton.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'; };

    addCardButton.addEventListener('click', () => {
        chatInput.value = 'How to Add Card Sets';
        handleSendMessage();
        addCardButton.remove();
        // Remove other buttons
        referralButton?.remove();
        reviewModesButton?.remove();
    });
    initialAiMessageDiv.appendChild(addCardButton);
    // === END NEW BUTTON 1 ===

    // === NEW BUTTON 2: Review Modes ===
    const reviewModesButton = document.createElement('button');
    reviewModesButton.textContent = 'Available Review Modes';
    reviewModesButton.className = 'quick-question-button';

    // Apply styles
    reviewModesButton.style.all = 'unset';
    reviewModesButton.style.display = 'inline-block';
    reviewModesButton.style.marginTop = '10px';
    // No marginRight needed for the last button in the row
    reviewModesButton.style.padding = '6px 12px';
    reviewModesButton.style.fontSize = '13px';
    reviewModesButton.style.fontFamily = "'Satoshi', sans-serif";
    reviewModesButton.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    reviewModesButton.style.border = '1px solid rgba(255, 255, 255, 0.2)';
    reviewModesButton.style.borderRadius = '8px';
    reviewModesButton.style.color = '#ffcf00';
    reviewModesButton.style.cursor = 'pointer';
    reviewModesButton.style.transition = 'background-color 0.2s ease';
    reviewModesButton.onmouseover = () => { reviewModesButton.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'; };
    reviewModesButton.onmouseout = () => { reviewModesButton.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'; };

    reviewModesButton.addEventListener('click', () => {
        chatInput.value = 'Available Review Modes';
        handleSendMessage();
        reviewModesButton.remove();
        // Remove other buttons
        referralButton?.remove();
        addCardButton?.remove();
    });
    initialAiMessageDiv.appendChild(reviewModesButton);
    // === END NEW BUTTON 2 ===

}
});