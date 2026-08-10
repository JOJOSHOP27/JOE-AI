// script.js - Logika Chat Lengkap dengan Fitur Modern
class AIChat {
    constructor() {
        this.messages = [];
        this.isLoading = false;
        this.messageCount = 0;
        this.chatMessages = document.getElementById('chatMessages');
        this.userInput = document.getElementById('userInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.clearBtn = document.getElementById('clearBtn');
        this.exportBtn = document.getElementById('exportBtn');
        this.themeBtn = document.getElementById('themeBtn');
        this.statsBtn = document.getElementById('statsBtn');
        this.fab = document.getElementById('fab');
        this.charCounter = document.getElementById('charCounter');
        this.messageCountDisplay = document.getElementById('messageCount');
        this.isDarkTheme = true;
        
        this.init();
    }
    
    init() {
        // Event Listeners
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        this.userInput.addEventListener('input', () => {
            this.autoResize();
            this.updateCharCounter();
            this.saveDraft();
        });
        this.clearBtn.addEventListener('click', () => this.clearChat());
        this.exportBtn.addEventListener('click', () => this.exportChat());
        this.themeBtn.addEventListener('click', () => this.toggleTheme());
        this.statsBtn.addEventListener('click', () => this.showStats());
        this.fab.addEventListener('click', () => this.scrollToBottom());
        
        // Quick action buttons
        document.querySelectorAll('.quick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.userInput.value = btn.dataset.prompt;
                this.autoResize();
                this.updateCharCounter();
                this.sendMessage();
            });
        });
        
        // Scroll listener for FAB
        this.chatMessages.addEventListener('scroll', () => this.toggleFAB());
        
        // Load saved data
        this.loadTheme();
        this.loadDraft();
        this.loadMessages();
        
        // Focus input
        setTimeout(() => this.userInput.focus(), 100);
        
        // Welcome message
        if (this.messages.length === 0) {
            this.addMessage('Halo! Saya AI Assistant siap membantu Anda. Ada yang bisa saya bantu?', 'ai');
        }
        
        // Create particles
        this.createParticles();
        
        // Update message count
        this.updateMessageCount();
    }
    
    createParticles() {
        const container = document.getElementById('particles');
        if (!container) return;
        
        const count = 30;
        
        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.top = Math.random() * 100 + '%';
            particle.style.width = (Math.random() * 4 + 2) + 'px';
            particle.style.height = particle.style.width;
            particle.style.animationDelay = (Math.random() * 20) + 's';
            particle.style.animationDuration = (Math.random() * 20 + 15) + 's';
            container.appendChild(particle);
        }
    }
    
    async sendMessage() {
        const text = this.userInput.value.trim();
        if (!text || this.isLoading) return;
        
        // Check message limit
        if (this.messages.length >= CONFIG.MAX_MESSAGES) {
            this.addMessage('⚠️ Chat已达到 maksimal pesan. Silakan hapus beberapa pesan untuk melanjutkan.', 'ai');
            return;
        }
        
        // Add user message
        this.addMessage(text, 'user');
        this.userInput.value = '';
        this.autoResize();
        this.updateCharCounter();
        this.saveDraft();
        
        // Show typing indicator
        this.typingIndicator.classList.add('active');
        this.isLoading = true;
        this.sendBtn.disabled = true;
        
        try {
            const response = await this.callGeminiAPI(text);
            this.addMessage(response, 'ai');
        } catch (error) {
            let errorMessage = 'Maaf, terjadi kesalahan. Silakan coba lagi.';
            if (error.message.includes('API key')) {
                errorMessage = '⚠️ API Key tidak valid. Periksa konfigurasi API key.';
            } else if (error.message.includes('429')) {
                errorMessage = '⚠️ Terlalu banyak permintaan. Silakan tunggu beberapa saat.';
            } else if (error.message.includes('500')) {
                errorMessage = '⚠️ Server Gemini mengalami masalah. Coba lagi nanti.';
            }
            this.addMessage(errorMessage, 'ai');
            console.error('Error:', error);
        } finally {
            this.typingIndicator.classList.remove('active');
            this.isLoading = false;
            this.sendBtn.disabled = false;
            this.userInput.focus();
        }
    }
    
    addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = sender === 'user' ? '👤' : '🤖';
        
        const content = document.createElement('div');
        content.className = 'message-content';
        content.innerHTML = this.formatMessage(text);
        
        const time = document.createElement('span');
        time.className = 'message-time';
        time.textContent = new Date().toLocaleTimeString('id-ID', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false
        });
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);
        messageDiv.appendChild(time);
        
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
        
        // Save to history
        this.messages.push({ text, sender, time: new Date().toISOString() });
        this.saveMessages();
        this.updateMessageCount();
        
        // Add copy functionality to code blocks
        this.addCopyToCodeBlocks();
    }
    
    formatMessage(text) {
        // Convert markdown-like syntax
        let formatted = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/```(.*?)```/gs, (match, code) => {
                return `<pre><code>${this.escapeHtml(code)}</code></pre>`;
            })
            .replace(/\n/g, '<br>');
        
        // Convert links
        formatted = formatted.replace(
            /(https?:\/\/[^\s]+)/g,
            '<a href="$1" target="_blank">$1</a>'
        );
        
        // Convert lists
        formatted = formatted.replace(/^[•\-] (.*?)(<br>|$)/gm, '<li>$1</li>');
        formatted = formatted.replace(/^(\d+)\. (.*?)(<br>|$)/gm, '<li>$2</li>');
        
        if (formatted.includes('<li>')) {
            formatted = formatted.replace(/(<li>.*?<\/li>)/gs, (match) => {
                return `<ul>${match}</ul>`;
            });
        }
        
        // Convert blockquotes
        formatted = formatted.replace(/^&gt; (.*?)(<br>|$)/gm, '<blockquote>$1</blockquote>');
        
        return formatted;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    addCopyToCodeBlocks() {
        document.querySelectorAll('pre').forEach(pre => {
            const code = pre.querySelector('code');
            if (code && !pre.dataset.copyAdded) {
                pre.dataset.copyAdded = true;
                pre.style.cursor = 'pointer';
                pre.title = 'Klik untuk copy';
                pre.addEventListener('click', () => {
                    const text = code.textContent;
                    navigator.clipboard.writeText(text).then(() => {
                        const originalText = pre.textContent;
                        pre.innerHTML = '<span style="color: #00ff88;">✅ Tercopy!</span>';
                        setTimeout(() => {
                            pre.innerHTML = `<code>${this.escapeHtml(text)}</code>`;
                        }, 2000);
                    }).catch(() => {
                        // Fallback
                        const textarea = document.createElement('textarea');
                        textarea.value = text;
                        document.body.appendChild(textarea);
                        textarea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textarea);
                        alert('Kode berhasil dicopy!');
                    });
                });
            }
        });
    }
    
    async callGeminiAPI(prompt) {
        const response = await fetch(CONFIG.API_URL + '?key=' + CONFIG.API_KEY, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: CONFIG.TEMPERATURE,
                    maxOutputTokens: CONFIG.MAX_TOKENS,
                    topP: CONFIG.TOP_P,
                    topK: CONFIG.TOP_K,
                },
                safetySettings: [
                    {
                        category: "HARM_CATEGORY_HARASSMENT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_HATE_SPEECH",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    }
                ]
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `API Error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.candidates || data.candidates.length === 0) {
            throw new Error('Tidak ada respons dari AI');
        }
        
        return data.candidates[0].content.parts[0].text;
    }
    
    autoResize() {
        this.userInput.style.height = 'auto';
        this.userInput.style.height = Math.min(this.userInput.scrollHeight, 120) + 'px';
    }
    
    updateCharCounter() {
        const count = this.userInput.value.length;
        if (this.charCounter) {
            this.charCounter.textContent = count;
        }
    }
    
    scrollToBottom() {
        setTimeout(() => {
            this.chatMessages.scrollTo({
                top: this.chatMessages.scrollHeight,
                behavior: 'smooth'
            });
        }, 100);
    }
    
    toggleFAB() {
        if (!this.fab) return;
        const isNearBottom = this.chatMessages.scrollHeight - 
            this.chatMessages.scrollTop - 
            this.chatMessages.clientHeight < 100;
        
        this.fab.classList.toggle('show', !isNearBottom);
    }
    
    updateMessageCount() {
        if (this.messageCountDisplay) {
            this.messageCountDisplay.textContent = `${this.messages.length} pesan`;
        }
    }
    
    clearChat() {
        if (this.messages.length === 0) {
            this.addMessage('Chat sudah kosong. Mulai percakapan baru!', 'ai');
            return;
        }
        
        if (confirm('Hapus semua pesan?')) {
            this.chatMessages.innerHTML = '';
            this.messages = [];
            localStorage.removeItem('chatMessages');
            this.addMessage('Chat dibersihkan. Ada yang bisa saya bantu?', 'ai');
            this.updateMessageCount();
        }
    }
    
    exportChat() {
        if (this.messages.length === 0) {
            alert('Tidak ada pesan untuk diekspor.');
            return;
        }
        
        const text = this.messages.map(msg => {
            const sender = msg.sender === 'user' ? '👤 User' : '🤖 AI';
            const time = new Date(msg.time).toLocaleString('id-ID', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            return `[${time}] ${sender}:\n${msg.text}\n`;
        }).join('\n---\n\n');
        
        const header = `=== AI Chat Export ===\nTanggal: ${new Date().toLocaleString('id-ID')}\nTotal Pesan: ${this.messages.length}\n\n`;
        const fullText = header + text;
        
        const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-export-${new Date().toISOString().slice(0,10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Feedback
        this.addMessage('✅ Chat berhasil diekspor!', 'ai');
    }
    
    toggleTheme() {
        this.isDarkTheme = !this.isDarkTheme;
        document.documentElement.setAttribute('data-theme', this.isDarkTheme ? 'dark' : 'light');
        if (this.themeBtn) {
            this.themeBtn.innerHTML = this.isDarkTheme ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
        }
        localStorage.setItem('theme', this.isDarkTheme ? 'dark' : 'light');
    }
    
    loadTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            this.isDarkTheme = savedTheme === 'dark';
            document.documentElement.setAttribute('data-theme', savedTheme);
            if (this.themeBtn) {
                this.themeBtn.innerHTML = this.isDarkTheme ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
            }
        }
    }
    
    saveDraft() {
        const text = this.userInput.value;
        if (text.trim()) {
            localStorage.setItem('chatDraft', text);
        } else {
            localStorage.removeItem('chatDraft');
        }
    }
    
    loadDraft() {
        const draft = localStorage.getItem('chatDraft');
        if (draft) {
            this.userInput.value = draft;
            this.autoResize();
            this.updateCharCounter();
        }
    }
    
    saveMessages() {
        try {
            localStorage.setItem('chatMessages', JSON.stringify(this.messages));
        } catch (e) {
            console.warn('Gagal menyimpan pesan:', e);
        }
    }
    
    loadMessages() {
        try {
            const saved = localStorage.getItem('chatMessages');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    this.messages = parsed;
                    // Render saved messages
                    this.messages.forEach(msg => {
                        const messageDiv = document.createElement('div');
                        messageDiv.className = `message ${msg.sender}`;
                        
                        const avatar = document.createElement('div');
                        avatar.className = 'message-avatar';
                        avatar.textContent = msg.sender === 'user' ? '👤' : '🤖';
                        
                        const content = document.createElement('div');
                        content.className = 'message-content';
                        content.innerHTML = this.formatMessage(msg.text);
                        
                        const time = document.createElement('span');
                        time.className = 'message-time';
                        time.textContent = new Date(msg.time).toLocaleTimeString('id-ID', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            hour12: false
                        });
                        
                        messageDiv.appendChild(avatar);
                        messageDiv.appendChild(content);
                        messageDiv.appendChild(time);
                        
                        this.chatMessages.appendChild(messageDiv);
                    });
                    this.scrollToBottom();
                    this.updateMessageCount();
                }
            }
        } catch (e) {
            console.warn('Gagal memuat pesan:', e);
        }
    }
    
    showStats() {
        const totalMessages = this.messages.length;
        const userMessages = this.messages.filter(m => m.sender === 'user').length;
        const aiMessages = this.messages.filter(m => m.sender === 'ai').length;
        
        alert(
            `📊 Statistik Chat\n\n` +
            `Total Pesan: ${totalMessages}\n` +
            `👤 User: ${userMessages}\n` +
            `🤖 AI: ${aiMessages}\n` +
            `💾 Pesan Tersimpan: ${localStorage.getItem('chatMessages') ? 'Ya' : 'Tidak'}\n` +
            `🌓 Tema: ${this.isDarkTheme ? 'Gelap' : 'Terang'}`
        );
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const chat = new AIChat();
});
