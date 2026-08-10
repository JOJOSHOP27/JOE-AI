// config.js - Konfigurasi API
const CONFIG = {
    API_KEY: 'AQ.Ab8RN6LdZDoSURyZhl94WeinGbPYSYSouJRakIHg__TPOHwifA',
    API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
    MODEL: 'gemini-pro',
    MAX_TOKENS: 2048,
    TEMPERATURE: 0.7,
    TOP_P: 0.95,
    TOP_K: 40,
    MAX_MESSAGES: 100 // Batas maksimal pesan dalam chat
};

// Export untuk penggunaan di file lain
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
