// ============================================
// SCRIPT UTAMA - Fixed Version
// ============================================

(function () {
    'use strict';

    const CONFIG = window.GEMINI_CONFIG;

    if (!CONFIG || !CONFIG.apiKey) {
        alert('⚠️ API Key tidak ditemukan!\nSilakan cek file js/config.js');
        return;
    }

    // DOM Elements
    const chatMessages = document.getElementById('chatMessages');
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const clearChatBtn = document.getElementById('clearChatBtn');
    const typingIndicator = document.getElementById('typingIndicator');
    const statusBadge = document.getElementById('statusBadge');
    const statusDot = statusBadge?.querySelector('.status-dot');
    const charCount = document.getElementById('charCount');
    const toast = document.getElementById('toast');

    // State
    let conversationHistory = [];
    let isLoading = false;
    const MAX_CHAR = 4000;

    // Set model badge
    const modelBadge = document.getElementById('modelBadge');
    if (modelBadge) {
        modelBadge.textContent = CONFIG.model || 'gemini-2.0-flash';
    }

    function getTimeString() {
        const now = new Date();
        return now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }

    function setWelcomeTime() {
        const welcomeTime = document.getElementById('welcomeTime');
        if (welcomeTime) welcomeTime.textContent = getTimeString();
    }

    function updateCharCount() {
        const len = messageInput.value.length;
        charCount.textContent = `${len} / ${MAX_CHAR}`;
    }

    function updateSendButton() {
        if (messageInput.value.trim() && !isLoading) {
            sendBtn.classList.add('active');
        } else {
            sendBtn.classList.remove('active');
        }
    }

    function autoResize() {
        messageInput.style.height = 'auto';
        messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
    }

    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function showToast(message, type = 'info') {
        toast.textContent = message;
        toast.className = 'toast ' + type + ' show';
        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    function setBotStatus(status) {
        if (status === 'typing') {
            statusDot?.classList.add('typing');
        } else {
            statusDot?.classList.remove('typing');
        }
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function addMessageToUI(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${role}`;
        const timeStr = getTimeString();

        if (role === 'bot') {
            messageDiv.innerHTML = `
                <div class="message-avatar">
                    <svg viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" fill="url(#geminiGradSmall)"/>
                        <path d="M8 12l3 3 5-5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <div class="message-content">
                    <div class="message-bubble">${content}</div>
                    <span class="message-time">${timeStr}</span>
                </div>
            `;
        } else {
            messageDiv.innerHTML = `
                <div class="message-avatar"></div>
                <div class="message-content">
                    <div class="message-bubble"><p>${escapeHtml(content)}</p></div>
                    <span class="message-time">${timeStr}</span>
                </div>
            `;
        }

        chatMessages.appendChild(messageDiv);
        scrollToBottom();
    }

    function formatText(text) {
        if (!text) return '';
        
        // Escape HTML
        let html = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        
        // Bold
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        
        // Italic
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
        
        // Code blocks
        html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
        
        // Inline code
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // Line breaks
        html = html.replace(/\n/g, '<br>');
        
        return html;
    }

    function showTypingIndicator() {
        typingIndicator.style.display = 'flex';
        setBotStatus('typing');
        scrollToBottom();
    }

    function hideTypingIndicator() {
        typingIndicator.style.display = 'none';
        setBotStatus('online');
    }

    async function callGeminiAPI(userMessage) {
        const url = `${CONFIG.apiUrl}/${CONFIG.model}:generateContent?key=${CONFIG.apiKey}`;

        const contents = conversationHistory.map(entry => ({
            role: entry.role,
            parts: [{ text: entry.text }]
        }));

        contents.push({
            role: 'user',
            parts: [{ text: userMessage }]
        });

        const requestBody = {
            contents: contents,
            generationConfig: CONFIG.generationConfig || {},
            safetySettings: CONFIG.safetySettings || []
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData?.error?.message || `Error ${response.status}`);
        }

        const data = await response.json();
        const candidate = data?.candidates?.[0];
        
        if (!candidate) {
            throw new Error('Tidak ada respons dari Gemini');
        }

        return candidate?.content?.parts?.[0]?.text || '(Tidak ada respons)';
    }

    async function sendMessage() {
        if (isLoading) return;

        const userMessage = messageInput.value.trim();
        if (!userMessage) return;

        if (userMessage.length > MAX_CHAR) {
            showToast('Pesan terlalu panjang!', 'error');
            return;
        }

        // Disable input
        isLoading = true;
        messageInput.disabled = true;

        // Add user message
        addMessageToUI('user', userMessage);
        conversationHistory.push({ role: 'user', text: userMessage });

        // Clear input
        messageInput.value = '';
        messageInput.style.height = 'auto';
        updateCharCount();
        updateSendButton();

        // Show typing
        showTypingIndicator();

        try {
            const responseText = await callGeminiAPI(userMessage);
            hideTypingIndicator();
            
            const formattedText = formatText(responseText);
            addMessageToUI('bot', formattedText);
            conversationHistory.push({ role: 'model', text: responseText });
        } catch (error) {
            hideTypingIndicator();
            
            const errorDiv = document.createElement('div');
            errorDiv.className = 'message message-bot';
            errorDiv.innerHTML = `
                <div class="message-avatar">
                    <svg viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" fill="#f87171"/>
                        <path d="M12 8v4M12 16h.01" stroke="white" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </div>
                <div class="message-content">
                    <div class="message-bubble">
                        <p>❌ <strong>Error:</strong> ${escapeHtml(error.message)}</p>
                    </div>
                    <span class="message-time">${getTimeString()}</span>
                </div>
            `;
            chatMessages.appendChild(errorDiv);
            scrollToBottom();
            
            console.error('Error:', error);
        } finally {
            isLoading = false;
            messageInput.disabled = false;
            messageInput.focus();
            updateSendButton();
        }
    }

    function clearChat() {
        if (isLoading) return;
        
        if (conversationHistory.length > 0) {
            if (!confirm('Hapus semua percakapan?')) return;
        }

        // Remove all messages except first (welcome)
        const messages = chatMessages.querySelectorAll('.message');
        for (let i = 1; i < messages.length; i++) {
            messages[i].remove();
        }

        conversationHistory = [];
        setWelcomeTime();
        scrollToBottom();
        showToast('Percakapan dihapus!', 'success');
    }

    // Event Listeners
    sendBtn.addEventListener('click', sendMessage);

    messageInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    messageInput.addEventListener('input', function () {
        autoResize();
        updateCharCount();
        updateSendButton();
    });

    clearChatBtn.addEventListener('click', clearChat);

    // Init
    setWelcomeTime();
    updateCharCount();
    updateSendButton();
    autoResize();
    
    console.log('✅ Gemini AI Chat siap digunakan!');
})();
