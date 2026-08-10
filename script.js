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
                pre.addEventListener('click', () => {
                    const text = code.textContent;
                    navigator.clipboard.writeText(text).then(() => {
                        const original = pre.getAttribute('data-copy-text') || '📋 Copy';
                        pre.setAttribute('data-copy-text', '✅ Copied!');
                        setTimeout(() => {
                            pre.removeAttribute('data-copy-text');
                        }, 2000);
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
                        category: "HARM_CATEGORY_SEXUALLY_EXPL
