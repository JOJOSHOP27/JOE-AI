// ============================================
// SCRIPT UTAMA - Logika Chat & API Integration
// ============================================

(function () {
    'use strict';

    // Ambil konfigurasi dari config.js
    const CONFIG = window.GEMINI_CONFIG;

    if (!CONFIG || !CONFIG.apiKey || CONFIG.apiKey === 'YOUR_API_KEY_HERE') {
        alert(
            '⚠️ API Key belum dikonfigurasi!\n\n' +
                'Silakan buka file js/config.js dan masukkan API Key Gemini kamu.\n\n' +
                'Dapatkan API key gratis di: https://aistudio.google.com/apikey'
        );
        throw new Error('API Key tidak ditemukan. Periksa js/config.js');
    }

    // ==================== DOM ELEMENTS ====================
    const chatMessages = document.getElementById('chatMessages');
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const clearChatBtn = document.getElementById('clearChatBtn');
    const typingIndicator = document.getElementById('typingIndicator');
    const statusBadge = document.getElementById('statusBadge');
    const statusDot = statusBadge?.querySelector('.status-dot');
    const charCount = document.getElementById('charCount');
    const toast = document.getElementById('toast');
    const modelBadge = document.getElementById('modelBadge');

    // Set model badge
    if (modelBadge) {
        modelBadge.textContent = CONFIG.model || 'gemini-2.0-flash';
    }

    // ==================== STATE ====================
    let conversationHistory = []; // Menyimpan history untuk konteks
    let isLoading = false;
    const MAX_CHAR = 4000;

    // ==================== FUNCTIONS ====================

    /** Format timestamp untuk pesan */
    function getTimeString() {
        const now = new Date();
        return now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }

    /** Set welcome message time */
    function setWelcomeTime() {
        const welcomeTime = document.getElementById('welcomeTime');
        if (welcomeTime) {
            welcomeTime.textContent = getTimeString();
        }
    }

    /** Update karakter count */
    function updateCharCount() {
        const len = messageInput.value.length;
        charCount.textContent = `${len} / ${MAX_CHAR}`;
        if (len > MAX_CHAR * 0.9) {
            charCount.style.color = '#fbbf24';
        } else if (len > MAX_CHAR) {
            charCount.style.color = '#f87171';
        } else {
            charCount.style.color = '';
        }
    }

    /** Update tombol kirim */
    function updateSendButton() {
        const hasText = messageInput.value.trim().length > 0;
        if (hasText && !isLoading) {
            sendBtn.classList.add('active');
        } else {
            sendBtn.classList.remove('active');
        }
    }

    /** Auto-resize textarea */
    function autoResize() {
        messageInput.style.height = 'auto';
        messageInput.style.height = Math.min(messageInput.scrollHeight, 150) + 'px';
    }

    /** Scroll ke bawah */
    function scrollToBottom(smooth = true) {
        if (smooth) {
            chatMessages.scrollTo({
                top: chatMessages.scrollHeight,
                behavior: 'smooth',
            });
        } else {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    /** Tampilkan toast notification */
    function showToast(message, type = 'info') {
        toast.textContent = message;
        toast.className = 'toast ' + type + ' show';
        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 3500);
    }

    /** Update status bot */
    function setBotStatus(status) {
        if (status === 'typing') {
            statusDot?.classList.add('typing');
            const statusText = statusBadge?.querySelector('span:last-child');
            if (statusText) statusText.textContent = ' Mengetik...';
        } else {
            statusDot?.classList.remove('typing');
            const statusText = statusBadge?.querySelector('span:last-child');
            if (statusText) statusText.textContent = ' Online';
        }
    }

    /** Parse markdown sederhana ke HTML */
    function parseMarkdown(text) {
        if (!text) return '';

        // Escape HTML entities dulu
        let html = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // Code blocks dengan ```
        html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, function (match, lang, code) {
            const escapedCode = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return `<pre><code class="language-${lang || 'plaintext'}">${escapedCode}</code></pre>`;
        });

        // Inline code dengan `
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Bold dengan **
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

        // Italic dengan *
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

        // Blockquote dengan >
        html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

        // Link [text](url)
        html = html.replace(
            /\[([^\]]+)\]\(([^)]+)\)/g,
            '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
        );

        // Unordered list
        html = html.replace(/^[\-*] (.+)$/gm, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
        // Gabungkan <li> yang berdekatan dalam <ul>
        html = html.replace(/<li>(.+?)<\/li>\s*(?=<li>)/g, '<li>$1</li>');
        // Wrap consecutive <li> in <ul>
        html = html.replace(/((?:<li>.*?<\/li>\s*)+)/g, '<ul>$1</ul>');

        // Ordered list
        html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
        html = html.replace(/((?:<li>.*?<\/li>\s*)+)/g, function (match) {
            if (match.includes('<ul>')) return match;
            return '<ol>' + match + '</ol>';
        });

        // Baris baru (yang belum dalam tag block)
        html = html.replace(/\n\n/g, '</p><p>');
        html = html.replace(/\n/g, '<br>');

        // Wrap dalam <p> jika belum
        if (!html.startsWith('<')) {
            html = '<p>' + html + '</p>';
        }

        // Bersihkan <p> kosong
        html = html.replace(/<p>\s*<\/p>/g, '');
        html = html.replace(/<p><\/p>/g, '');

        return html;
    }

    /** Render pesan bot (dengan markdown) */
    function renderBotMessage(text) {
        return parseMarkdown(text);
    }

    /** Tambah pesan ke UI */
    function addMessageToUI(role, content, isHtml = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${role}`;

        const timeStr = getTimeString();

        if (role === 'bot') {
            messageDiv.innerHTML = `
                        <div class="message-avatar">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="10" fill="url(#geminiGradSmall)"/>
                                <path d="M8 12l3 3 5-5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                        <div class="message-content">
                            <div class="message-bubble">${isHtml ? content : renderBotMessage(content)}</div>
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
        return messageDiv;
    }

    /** Escape HTML untuk user message */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /** Tampilkan typing indicator */
    function showTypingIndicator() {
        typingIndicator.style.display = 'flex';
        setBotStatus('typing');
        scrollToBottom();
    }

    /** Sembunyikan typing indicator */
    function hideTypingIndicator() {
        typingIndicator.style.display = 'none';
        setBotStatus('online');
    }

    /** Panggil Gemini API */
    async function callGeminiAPI(userMessage) {
        const url = `${CONFIG.apiUrl}/${CONFIG.model}:generateContent?key=${CONFIG.apiKey}`;

        // Bangun contents array dengan history + pesan baru
        const contents = [];

        // Tambahkan history
        conversationHistory.forEach((entry) => {
            contents.push({
                role: entry.role,
                parts: [{ text: entry.text }],
            });
        });

        // Tambahkan pesan user baru
        contents.push({
            role: 'user',
            parts: [{ text: userMessage }],
        });

        const requestBody = {
            contents: contents,
            generationConfig: CONFIG.generationConfig || {},
            safetySettings: CONFIG.safetySettings || [],
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMsg =
                    errorData?.error?.message ||
                    `HTTP Error ${response.status}: ${response.statusText}`;

                // Tangani error spesifik
                if (response.status === 400) {
                    throw new Error('Permintaan tidak valid. Mungkin prompt terlalu panjang atau format salah.');
                } else if (response.status === 401 || response.status === 403) {
                    throw new Error(
                        'API Key tidak valid atau tidak memiliki akses. Periksa kembali API Key di js/config.js'
                    );
                } else if (response.status === 429) {
                    throw new Error('Terlalu banyak permintaan (rate limit). Silakan tunggu beberapa saat.');
                } else if (response.status >= 500) {
                    throw new Error('Server Gemini sedang mengalami gangguan. Silakan coba lagi nanti.');
                } else {
                    throw new Error(errorMsg);
                }
            }

            const data = await response.json();

            // Ekstrak teks respons
            const candidate = data?.candidates?.[0];
            if (!candidate) {
                // Cek apakah ada safety block
                const blockReason = data?.promptFeedback?.blockReason;
                if (blockReason) {
                    throw new Error(`Konten diblokir karena alasan keamanan: ${blockReason}`);
                }
                throw new Error('Tidak ada respons dari Gemini. Silakan coba lagi.');
            }

            const responseText =
                candidate?.content?.parts?.[0]?.text || '(Gemini tidak memberikan respons teks)';

            // Cek finish reason
            const finishReason = candidate?.finishReason;
            if (finishReason && finishReason !== 'STOP') {
                console.warn('⚠️ Finish reason:', finishReason);
                if (finishReason === 'SAFETY') {
                    return responseText + '\n\n_[⚠️ Respons dipotong karena filter keamanan.]_';
                }
                if (finishReason === 'MAX_TOKENS') {
                    return responseText + '\n\n_[⚠️ Respons dipotong karena batas token tercapai.]_';
                }
            }

            return responseText;
        } catch (error) {
            // Network error
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error(
                    'Gagal terhubung ke server Gemini. Periksa koneksi internet kamu dan pastikan API endpoint dapat diakses.'
                );
            }
            throw error;
        }
    }

    /** Kirim pesan */
    async function sendMessage() {
        if (isLoading) return;

        const userMessage = messageInput.value.trim();
        if (!userMessage) return;

        if (userMessage.length > MAX_CHAR) {
            showToast(`Pesan terlalu panjang! Maksimal ${MAX_CHAR} karakter.`, 'error');
            return;
        }

        // Disable input
        isLoading = true;
        messageInput.disabled = true;
        sendBtn.classList.remove('active');
        messageInput.style.opacity = '0.6';

        // Tambah pesan user ke UI
        addMessageToUI('user', userMessage);

        // Simpan ke history
        conversationHistory.push({ role: 'user', text: userMessage });

        // Reset input
        messageInput.value = '';
        messageInput.style.height = 'auto';
        updateCharCount();
        updateSendButton();

        // Tampilkan typing
        showTypingIndicator();

        try {
            // Panggil API
            const responseText = await callGeminiAPI(userMessage);

            // Sembunyikan typing
            hideTypingIndicator();

            // Tambah respons bot ke UI (dengan markdown)
            addMessageToUI('bot', responseText, true);

            // Simpan ke history
            conversationHistory.push({ role: 'model', text: responseText });
        } catch (error) {
            hideTypingIndicator();

            // Tampilkan pesan error di chat
            const errorDiv = document.createElement('div');
            errorDiv.className = 'message message-bot';
            errorDiv.innerHTML = `
                        <div class="message-avatar">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="10" fill="#f87171"/>
                                <path d="M12 8v4M12 16h.01" stroke="white" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                        </div>
                        <div class="message-content">
                            <div class="message-bubble" style="border: 1px solid rgba(248,113,113,0.4);">
                                <p>❌ <strong>Error:</strong> ${escapeHtml(error.message)}</p>
                                <p class="message-subtle" style="color:#f87171;">Silakan coba lagi atau periksa konfigurasi.</p>
                            </div>
                            <span class="message-time">${getTimeString()}</span>
                        </div>
                    `;
            chatMessages.appendChild(errorDiv);
            scrollToBottom();

            showToast('Gagal mengirim pesan: ' + error.message, 'error');
            console.error('Gemini API Error:', error);
        } finally {
            // Enable input kembali
            isLoading = false;
            messageInput.disabled = false;
            messageInput.style.opacity = '1';
            messageInput.focus();
            updateSendButton();
        }
    }

    /** Clear chat */
    function clearChat() {
        if (isLoading) return;

        // Konfirmasi
        if (conversationHistory.length > 0) {
            const confirmed = confirm(
                'Yakin ingin menghapus seluruh percakapan?\n\nRiwayat chat akan hilang dan tidak bisa dikembalikan.'
            );
            if (!confirmed) return;
        }

        // Hapus semua pesan kecuali welcome message
        const messages = chatMessages.querySelectorAll('.message');
        messages.forEach((msg, index) => {
            if (index > 0) {
                // Skip welcome message (index 0)
                msg.style.opacity = '0';
                msg.style.transform = 'translateY(-10px)';
                msg.style.transition = '0.2s ease-out';
                setTimeout(() => msg.remove(), 200);
            }
        });

        // Reset history
        conversationHistory = [];
        setWelcomeTime();
        scrollToBottom(false);
        showToast('Percakapan berhasil dihapus! 🗑️', 'success');
    }

    // ==================== EVENT LISTENERS ====================

    // Kirim pesan dengan tombol
    sendBtn.addEventListener('click', sendMessage);

    // Kirim dengan Enter, Shift+Enter untuk baris baru
    messageInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (messageInput.value.trim() && !isLoading) {
                sendMessage();
            }
        }
    });

    // Auto-resize & update UI saat mengetik
    messageInput.addEventListener('input', function () {
        autoResize();
        updateCharCount();
        updateSendButton();
    });

    // Clear chat
    clearChatBtn.addEventListener('click', clearChat);

    // Fokus input saat klik area chat (kecuali saat select text)
    chatMessages.addEventListener('click', function (e) {
        if (e.target === chatMessages) {
            messageInput.focus();
        }
    });

    // Handle paste untuk auto-resize
    messageInput.addEventListener('paste', function () {
        setTimeout(autoResize, 10);
    });

    // ==================== INITIALIZATION ====================
    function init() {
        setWelcomeTime();
        updateCharCount();
        updateSendButton();
        autoResize();
        scrollToBottom(false);

        // Tampilkan info model di console
        console.log(
            `%c🚀 Gemini AI Chat %cSiap!`,
            'font-size: 1.2em; font-weight: bold; color: #9b72cb;',
            'color: #a0a0b8;'
        );
        console.log(`%cModel: %c${CONFIG.model}`, 'color: #6a6a82;', 'color: #5b8def;');
        console.log(
            '%c💡 Tips: Tekan Enter untuk kirim, Shift+Enter untuk baris baru.',
            'color: #6a6a82; font-style: italic;'
        );
    }

    init();
})();
