// ============================================
// KONFIGURASI API - Simpan terpisah dari HTML
// ============================================
// PENTING: File ini berisi API key sensitif.
// JANGAN commit file ini ke repository publik.
// Untuk production, gunakan backend proxy server.
// ============================================

const GEMINI_CONFIG = {
    // API Key Gemini kamu
    apiKey: 'AQ.Ab8RN6LdZDoSURyZhl94WeinGbPYSYSouJRakIHg__TPOHwifA',

    // Model yang digunakan
    model: 'gemini-2.0-flash',

    // Base URL Gemini API
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models',

    // Parameter tambahan (opsional)
    generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 4096,
    },

    // Safety settings (opsional - bisa dikosongkan untuk default)
    safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
};

// Jangan hapus baris di bawah ini - digunakan oleh script.js
if (typeof window !== 'undefined') {
    window.GEMINI_CONFIG = GEMINI_CONFIG;
}
