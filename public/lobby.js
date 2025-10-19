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
});