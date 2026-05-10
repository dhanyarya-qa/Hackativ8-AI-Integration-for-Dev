/**
 * Gemini Flash Chatbot - Frontend v3.0
 * Features: Streaming, Syntax Highlight, Regenerate, Drag-Drop, Auto-scroll,
 *           Image Preview, Shortcuts, Sound, Export, Templates, STT, TTS,
 *           Auto-Title, Edit, Search, Mermaid, KaTeX, Collapsible, Theme,
 *           Pins, Emoji Reactions, Multi-file Batch
 */

class ChatApp {
    constructor() {
        this.API_BASE = window.location.origin;
        this.messages = [];
        this.currentFiles = [];
        this.isGenerating = false;
        this.abortCtrl = null;
        this.autoScroll = true;
        this.soundEnabled = localStorage.getItem('sound_enabled') !== 'false';
        this.ttsEnabled = localStorage.getItem('tts_enabled') === 'true';
        this.currentChatId = null;
        this.templates = [];
        this.audioCtx = null;
        this.recognition = null;
        this.isListening = false;
        this.theme = localStorage.getItem('theme') || 'dark';
        this.pins = [];
        this.init();
    }

    init() {
        this.applyTheme();
        this.cacheElements();
        this.bindEvents();
        this.setupAutoResize();
        this.setupMarked();
        this.loadModelConfig();
        this.loadTemplates();
        this.initSound();
        this.initSpeechRecognition();
        this.initTTS();
        this.loadChatHistory();
        this.init3DTilt();
    }

    // ═══════════════════════════════════════════════════════════
    // Theme
    // ═══════════════════════════════════════════════════════════
    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.theme);
    }

    toggleTheme() {
        this.theme = this.theme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('theme', this.theme);
        this.applyTheme();
        this.showToast(this.theme === 'dark' ? 'Dark Mode' : 'Light Mode', 'success');
    }

    // ═══════════════════════════════════════════════════════════
    // Audio / Sound Effects
    // ═══════════════════════════════════════════════════════════
    initSound() {
        try { this.audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
        this.updateSoundIcon();
    }

    playTone(freq = 440, duration = 0.1, type = 'sine') {
        if (!this.soundEnabled || !this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
        gain.gain.setValueAtTime(0.05, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        osc.stop(this.audioCtx.currentTime + duration);
    }

    playSendSound() { this.playTone(600, 0.08, 'sine'); }
    playReceiveSound() { this.playTone(800, 0.12, 'sine'); }
    playErrorSound() { this.playTone(200, 0.3, 'sawtooth'); }

    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        localStorage.setItem('sound_enabled', this.soundEnabled);
        this.updateSoundIcon();
        this.showToast(this.soundEnabled ? 'Sound ON' : 'Sound OFF', 'info');
    }

    updateSoundIcon() {
        if (!this.soundIcon) return;
        const on = `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>`;
        const off = `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line>`;
        this.soundIcon.innerHTML = this.soundEnabled ? on : off;
    }

    // ═══════════════════════════════════════════════════════════
    // Speech-to-Text (Voice Input)
    // ═══════════════════════════════════════════════════════════
    initSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            if (this.voiceBtn) this.voiceBtn.style.display = 'none';
            return;
        }
        this.recognition = new SpeechRecognition();
        this.recognition.lang = 'id-ID';
        this.recognition.continuous = false;
        this.recognition.interimResults = true;

        this.recognition.onstart = () => {
            this.isListening = true;
            this.voiceStatus.classList.remove('hidden');
        };
        this.recognition.onend = () => {
            this.isListening = false;
            this.voiceStatus.classList.add('hidden');
        };
        this.recognition.onresult = (e) => {
            let final = '';
            let interim = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
                if (e.results[i].isFinal) final += e.results[i][0].transcript;
                else interim += e.results[i][0].transcript;
            }
            this.chatInput.value = (this.chatInput.value.replace(/\[\.\.\.\]$/, '') + final + interim).trim();
            if (!e.results[e.results.length - 1].isFinal) this.chatInput.value += ' [...]';
            this.toggleSendButton();
            this.chatInput.dispatchEvent(new Event('input'));
        };
        this.recognition.onerror = () => {
            this.isListening = false;
            this.voiceStatus.classList.add('hidden');
            this.showToast('Voice error. Coba lagi.', 'error');
        };
    }

    toggleVoiceInput() {
        if (!this.recognition) return;
        if (this.isListening) {
            this.recognition.stop();
        } else {
            this.chatInput.value = '';
            this.recognition.start();
            if (this.audioCtx && this.audioCtx.state === 'suspended') this.audioCtx.resume();
        }
    }

    // ═══════════════════════════════════════════════════════════
    // Text-to-Speech
    // ═══════════════════════════════════════════════════════════
    initTTS() {
        this.updateTTSIcon();
    }

    toggleTTS() {
        this.ttsEnabled = !this.ttsEnabled;
        localStorage.setItem('tts_enabled', this.ttsEnabled);
        this.updateTTSIcon();
        this.showToast(this.ttsEnabled ? 'TTS ON — AI akan berbicara' : 'TTS OFF', 'info');
    }

    updateTTSIcon() {
        if (!this.ttsToggleBtn) return;
        this.ttsToggleBtn.style.color = this.ttsEnabled ? 'var(--emerald-signal)' : 'var(--steel-slate)';
        this.ttsToggleBtn.style.borderColor = this.ttsEnabled ? 'var(--emerald-signal)' : 'var(--warm-charcoal)';
    }

    speak(text) {
        if (!this.ttsEnabled || !window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const cleanText = text.replace(/[#*`_\[\]\(\)]/g, '').substring(0, 500);
        const utter = new SpeechSynthesisUtterance(cleanText);
        utter.lang = 'id-ID';
        utter.rate = 1.1;
        window.speechSynthesis.speak(utter);
    }

    // ═══════════════════════════════════════════════════════════
    // Marked.js Setup
    // ═══════════════════════════════════════════════════════════
    setupMarked() {
        if (typeof marked === 'undefined') return;
        marked.setOptions({ breaks: true, gfm: true, headerIds: false, mangle: false });
    }

    renderMarkdown(text) {
        if (!text) return '';
        if (typeof marked !== 'undefined') {
            return marked.parse(text);
        }
        return this.fallbackMarkdown(text);
    }

    fallbackMarkdown(text) {
        text = text.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');
        text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
        text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
        text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
        text = text.replace(/\n/g, '<br>');
        return text;
    }

    // Post-process: Mermaid, KaTeX, Collapsible
    postProcessHTML(container) {
        // Mermaid diagrams
        if (typeof mermaid !== 'undefined') {
            container.querySelectorAll('.language-mermaid').forEach(el => {
                const pre = el.closest('pre');
                if (!pre || pre.dataset.processed) return;
                pre.dataset.processed = 'true';
                const id = 'mermaid-' + Math.random().toString(36).slice(2);
                try {
                    mermaid.render(id, el.textContent).then(({ svg }) => {
                        pre.innerHTML = `<div class="mermaid-diagram">${svg}</div>`;
                    }).catch(() => {});
                } catch (e) {}
            });
        }

        // KaTeX math
        if (typeof renderMathInElement !== 'undefined') {
            renderMathInElement(container, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false },
                ],
                throwOnError: false,
            });
        }

        // Collapsible thinking blocks
        container.querySelectorAll('details').forEach(details => {
            details.classList.add('collapsible-block');
            const summary = details.querySelector('summary');
            if (summary) summary.classList.add('collapsible-summary');
        });
    }

    // ═══════════════════════════════════════════════════════════
    // Model Management
    // ═══════════════════════════════════════════════════════════
    async loadModelConfig() {
        try {
            const savedModel = localStorage.getItem('gemini_model');
            const res = await fetch(`${this.API_BASE}/api/model`);
            const data = await res.json();
            if (data.success) {
                const backendModel = data.data.current;
                if (savedModel && savedModel !== backendModel) {
                    this.modelSelector.value = savedModel;
                    this.updateModelDesc(savedModel);
                    await fetch(`${this.API_BASE}/api/model`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ model: savedModel })
                    });
                } else {
                    this.modelSelector.value = backendModel;
                    this.updateModelDesc(backendModel);
                    if (savedModel !== backendModel) localStorage.setItem('gemini_model', backendModel);
                }
            }
        } catch (e) {
            const savedModel = localStorage.getItem('gemini_model');
            if (savedModel) {
                this.modelSelector.value = savedModel;
                this.updateModelDesc(savedModel);
            }
        }
    }

    async switchModel() {
        const model = this.modelSelector.value;
        this.updateModelDesc(model);
        try {
            const res = await fetch(`${this.API_BASE}/api/model`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model })
            });
            const data = await res.json();
            if (data.success) {
                localStorage.setItem('gemini_model', model);
                this.showToast(`Model: ${data.data.current}`, 'success');
            }
        } catch (error) {
            this.showToast('Gagal mengganti model', 'error');
        }
    }

    updateModelDesc(modelId) {
        const map = {
            'gemini-2.5-flash': 'Cepat & efisien untuk chat harian',
            'gemini-2.5-pro': 'Kuat untuk reasoning kompleks',
            'gemini-2.0-flash': 'Versi stabil sebelumnya',
            'gemini-2.0-flash-lite': 'Ringan & hemat biaya',
        };
        if (this.modelDesc) this.modelDesc.textContent = map[modelId] || '';
    }

    // ═══════════════════════════════════════════════════════════
    // DOM Cache
    // ═══════════════════════════════════════════════════════════
    cacheElements() {
        this.welcomeScreen = document.getElementById('welcomeScreen');
        this.messagesContainer = document.getElementById('messagesContainer');
        this.chatHistory = document.getElementById('chatHistory');
        this.chatInput = document.getElementById('chatInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.newChatBtn = document.getElementById('newChatBtn');
        this.exportChatBtn = document.getElementById('exportChatBtn');
        this.uploadImageBtn = document.getElementById('uploadImageBtn');
        this.uploadDocBtn = document.getElementById('uploadDocBtn');
        this.uploadAudioBtn = document.getElementById('uploadAudioBtn');
        this.genImageBtn = document.getElementById('genImageBtn');
        this.templateBtn = document.getElementById('templateBtn');
        this.templatePanel = document.getElementById('templatePanel');
        this.templateClose = document.getElementById('templateClose');
        this.templateList = document.getElementById('templateList');
        this.soundToggleBtn = document.getElementById('soundToggleBtn');
        this.soundIcon = document.getElementById('soundIcon');
        this.voiceBtn = document.getElementById('voiceBtn');
        this.voiceStatus = document.getElementById('voiceStatus');
        this.ttsToggleBtn = document.getElementById('ttsToggleBtn');
        this.themeToggle = document.getElementById('themeToggle');
        this.searchInput = document.getElementById('searchInput');
        this.imageInput = document.getElementById('imageInput');
        this.docInput = document.getElementById('docInput');
        this.audioInput = document.getElementById('audioInput');
        this.modelSelector = document.getElementById('modelSelector');
        this.modelDesc = document.getElementById('modelDesc');
        this.dropZone = document.getElementById('dropZone');
        this.dragOverlay = document.getElementById('dragOverlay');
        this.scrollToggle = document.getElementById('scrollToggle');
        this.shortcutsModal = document.getElementById('shortcutsModal');
        this.modalClose = document.getElementById('modalClose');
        this.toastContainer = document.getElementById('toastContainer');
    }

    // ═══════════════════════════════════════════════════════════
    // Events
    // ═══════════════════════════════════════════════════════════
    bindEvents() {
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.chatInput.addEventListener('keydown', (e) => this.handleInputKeydown(e));
        this.chatInput.addEventListener('input', () => this.toggleSendButton());
        this.newChatBtn.addEventListener('click', () => this.startNewChat());
        this.exportChatBtn.addEventListener('click', () => this.exportChat());
        this.uploadImageBtn.addEventListener('click', () => this.imageInput.click());
        this.uploadDocBtn.addEventListener('click', () => this.docInput.click());
        this.uploadAudioBtn.addEventListener('click', () => this.audioInput.click());
        this.imageInput.addEventListener('change', (e) => this.handleFileUpload(e, 'image'));
        this.docInput.addEventListener('change', (e) => this.handleFileUpload(e, 'document'));
        this.audioInput.addEventListener('change', (e) => this.handleFileUpload(e, 'audio'));
        this.genImageBtn.addEventListener('click', () => this.handleGenerateImage());
        this.modelSelector.addEventListener('change', () => this.switchModel());
        this.templateBtn.addEventListener('click', () => this.toggleTemplatePanel());
        this.templateClose.addEventListener('click', () => this.toggleTemplatePanel());
        this.soundToggleBtn.addEventListener('click', () => this.toggleSound());
        this.voiceBtn.addEventListener('click', () => this.toggleVoiceInput());
        this.ttsToggleBtn.addEventListener('click', () => this.toggleTTS());
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        this.scrollToggle.addEventListener('click', () => this.toggleAutoScroll());
        this.modalClose.addEventListener('click', () => this.hideShortcutsModal());
        this.shortcutsModal.addEventListener('click', (e) => { if (e.target === this.shortcutsModal) this.hideShortcutsModal(); });
        this.searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
            this.dropZone.addEventListener(evt, (e) => this.handleDrag(e), false);
        });

        this.messagesContainer.addEventListener('scroll', () => {
            const nearBottom = this.messagesContainer.scrollHeight - this.messagesContainer.scrollTop - this.messagesContainer.clientHeight < 50;
            if (!nearBottom && this.autoScroll) { this.autoScroll = false; this.updateScrollToggle(); }
        });

        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'k') { e.preventDefault(); this.startNewChat(); }
            if (e.ctrlKey && e.key === '/') { e.preventDefault(); this.showShortcutsModal(); }
            if (e.key === 'Escape') {
                if (!this.shortcutsModal.classList.contains('hidden')) this.hideShortcutsModal();
                else if (this.isGenerating && this.abortCtrl) this.abortCtrl.abort();
            }
        });
    }

    // ═══════════════════════════════════════════════════════════
    // 3D Tilt Effect for Feature Cards & Logo
    // ═══════════════════════════════════════════════════════════
    init3DTilt() {
        // Feature cards
        const cards = document.querySelectorAll('.feature-card');
        cards.forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const rotateX = ((y - centerY) / centerY) * -12;
                const rotateY = ((x - centerX) / centerX) * 12;
                card.classList.add('tilt-3d');
                card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px) scale(1.02)`;
            });

            card.addEventListener('mouseleave', () => {
                card.classList.remove('tilt-3d');
                card.style.transform = '';
            });
        });

        // Navbar logo 3D tilt
        const logo3d = document.querySelector('.logo-3d');
        if (logo3d) {
            logo3d.addEventListener('mousemove', (e) => {
                const rect = logo3d.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const rotateX = ((y - centerY) / centerY) * -20;
                const rotateY = ((x - centerX) / centerX) * 20;
                logo3d.style.transform = `perspective(400px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.15)`;
            });

            logo3d.addEventListener('mouseleave', () => {
                logo3d.style.transform = '';
            });
        }
    }

    handleInputKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendMessage(); }
    }

    setupAutoResize() {
        this.chatInput.addEventListener('input', () => {
            this.chatInput.style.height = 'auto';
            this.chatInput.style.height = Math.min(this.chatInput.scrollHeight, 200) + 'px';
        });
    }

    toggleSendButton() {
        this.sendBtn.disabled = !this.chatInput.value.trim() || this.isGenerating;
    }

    // ═══════════════════════════════════════════════════════════
    // Search
    // ═══════════════════════════════════════════════════════════
    handleSearch(query) {
        if (!query.trim()) {
            this.chatHistory.querySelectorAll('.history-item').forEach(i => i.style.display = '');
            return;
        }
        const items = this.chatHistory.querySelectorAll('.history-item');
        items.forEach(item => {
            const text = item.querySelector('.history-text')?.textContent || '';
            item.style.display = text.toLowerCase().includes(query.toLowerCase()) ? '' : 'none';
        });
    }

    // ═══════════════════════════════════════════════════════════
    // Drag & Drop (Multi-file batch)
    // ═══════════════════════════════════════════════════════════
    handleDrag(e) {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            this.dragOverlay.classList.add('active');
        } else {
            this.dragOverlay.classList.remove('active');
        }
        if (e.type === 'drop') {
            const files = Array.from(e.dataTransfer.files);
            files.forEach(f => this.currentFiles.push(f));
            this.renderFilePreview();
            this.showToast(`${files.length} file siap diunggah`, 'success');
        }
    }

    // ═══════════════════════════════════════════════════════════
    // Templates
    // ═══════════════════════════════════════════════════════════
    async loadTemplates() {
        try {
            const res = await fetch(`${this.API_BASE}/api/templates`);
            const data = await res.json();
            if (data.success) { this.templates = data.data; this.renderTemplates(); }
        } catch (e) { console.warn('Gagal load templates:', e); }
    }

    renderTemplates() {
        this.templateList.innerHTML = this.templates.map(t => `
            <div class="template-item" data-content="${this.escapeHtml(t.content)}">
                <span class="template-name">${this.escapeHtml(t.name)}</span>
                <span class="template-preview">${this.escapeHtml(t.content.substring(0, 40))}...</span>
            </div>
        `).join('');
        this.templateList.querySelectorAll('.template-item').forEach(item => {
            item.addEventListener('click', () => {
                this.chatInput.value = item.getAttribute('data-content');
                this.chatInput.focus();
                this.toggleTemplatePanel();
                this.toggleSendButton();
            });
        });
    }

    toggleTemplatePanel() {
        this.templatePanel.classList.toggle('hidden');
    }

    // ═══════════════════════════════════════════════════════════
    // Auto-scroll
    // ═══════════════════════════════════════════════════════════
    toggleAutoScroll() {
        this.autoScroll = !this.autoScroll;
        this.updateScrollToggle();
    }

    updateScrollToggle() {
        this.scrollToggle.classList.toggle('paused', !this.autoScroll);
    }

    // ═══════════════════════════════════════════════════════════
    // Shortcuts Modal
    // ═══════════════════════════════════════════════════════════
    showShortcutsModal() { this.shortcutsModal.classList.remove('hidden'); }
    hideShortcutsModal() { this.shortcutsModal.classList.add('hidden'); }

    // ═══════════════════════════════════════════════════════════
    // Export Chat
    // ═══════════════════════════════════════════════════════════
    exportChat() {
        if (this.messages.length === 0) { this.showToast('Tidak ada chat untuk di-export', 'info'); return; }
        const date = new Date().toISOString().slice(0, 10);
        let md = `# Gemini Chat Export - ${date}\n\n`;
        this.messages.forEach(m => {
            const role = m.role === 'user' ? '**User**' : '**AI**';
            md += `## ${role} (${m.timestamp.toLocaleTimeString()})\n\n${m.content}\n\n---\n\n`;
        });
        const blob = new Blob([md], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `chat-${date}.md`; a.click();
        URL.revokeObjectURL(url);
        this.showToast('Chat di-export!', 'success');
    }

    // ═══════════════════════════════════════════════════════════
    // UI Helpers
    // ═══════════════════════════════════════════════════════════
    showWelcome() {
        this.welcomeScreen.style.display = 'flex';
        this.messagesContainer.style.display = 'none';
    }

    showChat() {
        this.welcomeScreen.style.display = 'none';
        this.messagesContainer.style.display = 'block';
    }

    startNewChat() {
        this.messages = [];
        this.currentFiles = [];
        this.currentChatId = null;
        this.pins = [];
        this.renderMessages();
        this.showWelcome();
        this.clearFilePreview();
        this.playSendSound();
        this.loadChatHistory();
    }

    addHistoryItem(text) {
        const existing = Array.from(this.chatHistory.querySelectorAll('.history-text')).find(
            el => el.textContent === 'Percakapan Baru'
        );
        if (existing) {
            this.chatHistory.querySelectorAll('.history-item').forEach(i => i.classList.remove('active'));
            existing.closest('.history-item').classList.add('active');
            return;
        }
        const items = this.chatHistory.querySelectorAll('.history-item');
        items.forEach(i => i.classList.remove('active'));
        const div = document.createElement('div');
        div.className = 'history-item active';
        div.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <span class="history-text">${this.escapeHtml(text.substring(0, 30))}${text.length > 30 ? '...' : ''}</span>
        `;
        this.chatHistory.appendChild(div);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ═══════════════════════════════════════════════════════════
    // Message Rendering
    // ═══════════════════════════════════════════════════════════
    addMessage(role, content, options = {}) {
        const message = {
            id: Date.now() + Math.random(),
            role,
            content,
            timestamp: new Date(),
            ...options
        };
        this.messages.push(message);
        this.renderMessages();
        return message;
    }

    updateLastMessage(content) {
        if (this.messages.length === 0) return;
        const last = this.messages[this.messages.length - 1];
        if (last.role === 'ai') { last.content = content; this.renderMessages(); }
    }

    renderMessages() {
        if (this.messages.length === 0) { this.showWelcome(); return; }
        this.showChat();
        this.messagesContainer.innerHTML = '';

        this.messages.forEach((msg, idx) => {
            const div = document.createElement('div');
            div.className = `message message-${msg.role}`;
            div.dataset.index = idx;

            const avatar = msg.role === 'user'
                ? `<div class="message-avatar user-avatar">U</div>`
                : `<div class="message-avatar ai-avatar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg></div>`;

            let contentHtml = this.renderMarkdown(msg.content);

            // Copy code buttons
            if (msg.role === 'ai') {
                const temp = document.createElement('div');
                temp.innerHTML = contentHtml;
                temp.querySelectorAll('pre code').forEach((code) => {
                    const pre = code.closest('pre');
                    if (pre.querySelector('.copy-code-btn')) return;
                    const copyBtn = document.createElement('button');
                    copyBtn.className = 'copy-code-btn';
                    copyBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
                    copyBtn.title = 'Salin kode';
                    copyBtn.addEventListener('click', () => {
                        navigator.clipboard.writeText(code.textContent).then(() => this.showToast('Kode tersalin!', 'success'));
                    });
                    pre.style.position = 'relative';
                    pre.appendChild(copyBtn);
                });
                contentHtml = temp.innerHTML;
            }

            // File attachments
            if (msg.files && msg.files.length > 0) {
                contentHtml += '<div class="message-files">' + msg.files.map(f => `
                    <div class="file-attachment">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                        </svg>
                        <span>${this.escapeHtml(f.name)}</span>
                    </div>
                `).join('') + '</div>';
            }

            // Generated image
            if (msg.imageData) {
                contentHtml += `<img src="data:${msg.imageMime};base64,${msg.imageData}" class="generated-image" alt="Generated">`;
            }

            // Actions per message type
            let actions = '';
            if (msg.role === 'ai') {
                actions = `
                    <div class="message-actions">
                        <button class="action-btn tts-btn" data-index="${idx}" title="Bacakan">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon></svg>
                        </button>
                        <button class="action-btn regenerate-btn" data-index="${idx}" title="Generate ulang">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                        </button>
                        <button class="action-btn copy-btn" data-text="${this.escapeHtml(msg.content)}" title="Salin">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        </button>
                        <button class="action-btn pin-btn" data-index="${idx}" title="Pin pesan">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                        </button>
                    </div>
                    <div class="emoji-reactions">
                        <button class="emoji-btn" data-emoji="👍" data-index="${idx}">👍</button>
                        <button class="emoji-btn" data-emoji="👎" data-index="${idx}">👎</button>
                        <button class="emoji-btn" data-emoji="🔥" data-index="${idx}">🔥</button>
                        <button class="emoji-btn" data-emoji="⭐" data-index="${idx}">⭐</button>
                    </div>
                `;
            } else {
                actions = `
                    <div class="message-actions">
                        <button class="action-btn edit-btn" data-index="${idx}" title="Edit pesan">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                    </div>
                `;
            }

            div.innerHTML = `
                ${avatar}
                <div class="message-content">
                    <div class="message-bubble">${contentHtml}</div>
                    <div class="message-meta">
                        <span class="message-time">${msg.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                        ${actions}
                    </div>
                </div>
            `;
            this.messagesContainer.appendChild(div);
        });

        if (this.autoScroll) this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;

        // Post-process Mermaid, KaTeX, collapsible
        this.postProcessHTML(this.messagesContainer);

        // Highlight code blocks
        if (typeof hljs !== 'undefined') {
            this.messagesContainer.querySelectorAll('pre code').forEach(block => {
                hljs.highlightElement(block);
            });
        }

        // Bind all action buttons
        this.bindMessageActions();
    }

    bindMessageActions() {
        // TTS
        this.messagesContainer.querySelectorAll('.tts-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.getAttribute('data-index'));
                this.speak(this.messages[idx].content);
            });
        });

        // Regenerate
        this.messagesContainer.querySelectorAll('.regenerate-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.getAttribute('data-index'));
                this.regenerateMessage(idx);
            });
        });

        // Copy
        this.messagesContainer.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const text = btn.getAttribute('data-text');
                const textarea = document.createElement('textarea');
                textarea.innerHTML = text;
                navigator.clipboard.writeText(textarea.value).then(() => this.showToast('Tersalin ke clipboard!', 'success'));
            });
        });

        // Pin
        this.messagesContainer.querySelectorAll('.pin-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.getAttribute('data-index'));
                this.pinMessage(idx);
            });
        });

        // Edit
        this.messagesContainer.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.getAttribute('data-index'));
                this.editMessage(idx);
            });
        });

        // Emoji reactions
        this.messagesContainer.querySelectorAll('.emoji-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const emoji = btn.getAttribute('data-emoji');
                btn.classList.toggle('active');
                this.showToast(`${emoji} Reaksi ditambahkan`, 'success');
            });
        });
    }

    // Pin message
    pinMessage(idx) {
        const msg = this.messages[idx];
        if (!msg) return;
        this.showToast('Pesan dipin!', 'success');
        // Visual feedback
        const bubble = this.messagesContainer.children[idx]?.querySelector('.message-bubble');
        if (bubble) {
            bubble.style.borderColor = 'var(--emerald-signal)';
            bubble.style.borderWidth = '2px';
        }
    }

    // Edit message & branch
    editMessage(idx) {
        const msg = this.messages[idx];
        if (!msg || msg.role !== 'user') return;
        const newText = prompt('Edit pesan:', msg.content);
        if (newText === null || newText.trim() === msg.content) return;
        msg.content = newText.trim();
        // Remove all messages after this one (branching)
        this.messages = this.messages.slice(0, idx + 1);
        this.renderMessages();
        // Auto-resend
        this.chatInput.value = msg.content;
        this.sendMessage();
    }

    showTypingIndicator() {
        const div = document.createElement('div');
        div.className = 'message message-ai typing-indicator';
        div.id = 'typingIndicator';
        div.innerHTML = `
            <div class="message-avatar ai-avatar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg></div>
            <div class="message-content">
                <div class="message-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>
            </div>
        `;
        this.messagesContainer.appendChild(div);
        if (this.autoScroll) this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    removeTypingIndicator() {
        const el = document.getElementById('typingIndicator');
        if (el) el.remove();
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        const icons = {
            success: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>',
            error: '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>',
            info: '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>'
        };
        toast.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${icons[type] || icons.info}</svg><span>${message}</span>`;
        this.toastContainer.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3000);
    }

    // ═══════════════════════════════════════════════════════════
    // Regenerate
    // ═══════════════════════════════════════════════════════════
    async regenerateMessage(idx) {
        let userIdx = -1;
        for (let i = idx - 1; i >= 0; i--) {
            if (this.messages[i].role === 'user') { userIdx = i; break; }
        }
        if (userIdx === -1) return;
        const userMsg = this.messages[userIdx];
        this.messages = this.messages.slice(0, idx);
        this.renderMessages();
        this.chatInput.value = userMsg.content;
        await this.sendMessage();
    }

    // ═══════════════════════════════════════════════════════════
    // File Handling (Multi-file batch)
    // ═══════════════════════════════════════════════════════════
    async handleFileUpload(event, type) {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;
        files.forEach(f => this.currentFiles.push(f));
        this.renderFilePreview();
        this.showToast(`${files.length} file siap. Ketik pesan dan kirim.`, 'success');
        event.target.value = '';
    }

    renderFilePreview() {
        let preview = document.getElementById('filePreview');
        if (!preview) {
            preview = document.createElement('div');
            preview.id = 'filePreview';
            preview.className = 'file-preview';
            const inputWrapper = document.querySelector('.input-wrapper');
            inputWrapper.parentNode.insertBefore(preview, inputWrapper);
        }
        preview.innerHTML = this.currentFiles.map((f, i) => {
            const isImage = f.type.startsWith('image/');
            return `
            <div class="file-preview-item">
                ${isImage ? `<img src="${URL.createObjectURL(f)}" class="file-preview-thumb" alt="">` : `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>`}
                <span class="file-preview-name">${this.escapeHtml(f.name)}</span>
                <button class="file-preview-remove" data-index="${i}" title="Hapus">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        `;}).join('');

        preview.querySelectorAll('.file-preview-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.getAttribute('data-index'));
                this.currentFiles.splice(idx, 1);
                this.renderFilePreview();
                if (this.currentFiles.length === 0) this.clearFilePreview();
            });
        });
    }

    clearFilePreview() {
        const preview = document.getElementById('filePreview');
        if (preview) preview.remove();
    }

    // ═══════════════════════════════════════════════════════════
    // API Integration
    // ═══════════════════════════════════════════════════════════
    async sendMessage() {
        const text = this.chatInput.value.trim();
        if (!text || this.isGenerating) return;

        if (this.audioCtx && this.audioCtx.state === 'suspended') this.audioCtx.resume();

        // Create new chat if not exists
        if (!this.currentChatId) {
            await this.createNewChat();
        }

        this.addMessage('user', text, { files: this.currentFiles });
        this.chatInput.value = '';
        this.chatInput.style.height = 'auto';
        this.toggleSendButton();
        this.playSendSound();

        // Save user message to database
        if (this.currentChatId) {
            await this.saveMessageToDb('user', text);
        }

        this.showTypingIndicator();
        this.isGenerating = true;
        this.toggleSendButton();
        this.abortCtrl = new AbortController();

        try {
            let accumulated = '';

            if (this.currentFiles.length > 0) {
                const uploadedFiles = await this.uploadFilesToGemini();
                this.clearFilePreview();
                this.currentFiles = [];
                const response = await fetch(`${this.API_BASE}/api/v1/journal/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    signal: this.abortCtrl.signal,
                    body: JSON.stringify({ prompt: text, files: uploadedFiles, chatId: this.currentChatId })
                });
                const data = await response.json();
                this.removeTypingIndicator();
                if (data.success) {
                    this.addMessage('ai', data.data.answer);
                    this.playReceiveSound();
                    if (this.ttsEnabled) this.speak(data.data.answer);
                    
                    // Save AI response to database
                    if (this.currentChatId) {
                        await this.saveMessageToDb('ai', data.data.answer);
                        await this.autoGenerateTitle();
                    }
                } else {
                    this.addMessage('ai', `⚠️ Error: ${data.error}`);
                    this.playErrorSound();
                }
            } else {
                // SSE streaming
                try {
                    const streamRes = await fetch(`${this.API_BASE}/api/stream`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        signal: this.abortCtrl.signal,
                        body: JSON.stringify({ prompt: text, chatId: this.currentChatId })
                    });

                    const reader = streamRes.body.getReader();
                    const decoder = new TextDecoder();
                    this.removeTypingIndicator();
                    this.addMessage('ai', '');

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        const chunk = decoder.decode(value, { stream: true });
                        const lines = chunk.split('\n');
                        for (const line of lines) {
                            if (!line.startsWith('data: ')) continue;
                            const json = line.slice(6).trim();
                            if (!json) continue;
                            try {
                                const parsed = JSON.parse(json);
                                if (parsed.type === 'chunk') {
                                    accumulated += parsed.text;
                                    this.updateLastMessage(accumulated);
                                    if (this.autoScroll) this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
                                } else if (parsed.type === 'done') {
                                    this.playReceiveSound();
                                    if (this.ttsEnabled && accumulated) this.speak(accumulated);
                                    
                                    // Save AI response to database
                                    if (this.currentChatId) {
                                        await this.saveMessageToDb('ai', accumulated);
                                        await this.autoGenerateTitle();
                                    }
                                } else if (parsed.type === 'error') {
                                    this.updateLastMessage(`⚠️ Error: ${parsed.error}`);
                                    this.playErrorSound();
                                }
                            } catch (e) {}
                        }
                    }
                } catch (streamErr) {
                    console.warn('Streaming failed, fallback:', streamErr.message);
                    this.removeTypingIndicator();
                    this.showTypingIndicator();
                    const response = await fetch(`${this.API_BASE}/generate-text`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        signal: this.abortCtrl.signal,
                        body: JSON.stringify({ prompt: text, chatId: this.currentChatId })
                    });
                    const data = await response.json();
                    this.removeTypingIndicator();
                    if (data.success) {
                        this.addMessage('ai', data.data.answer);
                        this.playReceiveSound();
                        if (this.ttsEnabled) this.speak(data.data.answer);
                        
                        // Save AI response to database
                        if (this.currentChatId) {
                            await this.saveMessageToDb('ai', data.data.answer);
                            await this.autoGenerateTitle();
                        }
                    } else {
                        this.addMessage('ai', `⚠️ Error: ${data.error}`);
                        this.playErrorSound();
                    }
                }
            }
        } catch (error) {
            this.removeTypingIndicator();
            if (error.name === 'AbortError') {
                this.addMessage('ai', '⚠️ Generate dibatalkan.');
            } else {
                this.addMessage('ai', `⚠️ Error: ${error.message}. Pastikan backend berjalan.`);
                this.playErrorSound();
            }
        } finally {
            this.isGenerating = false;
            this.toggleSendButton();
            this.abortCtrl = null;
        }
    }

    // ═══════════════════════════════════════════════════════════
    // Chat Management
    // ═══════════════════════════════════════════════════════════
    async createNewChat() {
        try {
            const response = await fetch(`${this.API_BASE}/api/chats`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: 'Percakapan Baru' })
            });
            const data = await response.json();
            if (data.success) {
                this.currentChatId = data.data.id;
                console.log('✅ Chat baru dibuat:', this.currentChatId);
            }
        } catch (error) {
            console.error('❌ Gagal membuat chat:', error);
        }
    }

    async saveMessageToDb(role, content) {
        try {
            await fetch(`${this.API_BASE}/api/chats/${this.currentChatId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role, content })
            });
        } catch (error) {
            console.error('❌ Gagal menyimpan pesan:', error);
        }
    }

    // Extract topic locally from first user message as fallback
    extractLocalTitle(text) {
        const cleaned = text
            .replace(/```[\s\S]*?```/g, ' ')
            .replace(/`[^`]+`/g, ' ')
            .replace(/https?:\/\/\S+/g, ' ')
            .replace(/\b(jelaskan|terangkan|buatkan|tolong|bantu|bagaimana|apa|mengapa|kapan|siapa|di\s+mana|dimana|apakah|bisakah|dapatkah|mohon|please|help|explain|create|make|how|what|why|when|who|where|can|could)\b/gi, ' ')
            .replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        const words = cleaned.split(/\s+/).filter(w => w.length > 2);
        const freq = {};
        words.forEach(w => { freq[w.toLowerCase()] = (freq[w.toLowerCase()] || 0) + 1; });
        const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([w]) =>
            w.charAt(0).toUpperCase() + w.slice(1)
        );
        return top.join(' ') || 'Percakapan Baru';
    }

    async autoGenerateTitle() {
        // Only generate title after first exchange (2 messages minimum)
        if (this.messages.length < 2) return;

        // Check if title is still default
        const currentChat = await this.getCurrentChat();
        if (!currentChat || (currentChat.title !== 'Percakapan Baru' && currentChat.title !== 'Chat Baru')) return;

        try {
            const response = await fetch(`${this.API_BASE}/api/chats/${this.currentChatId}/title`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            if (data.success && data.data.title && data.data.title.length > 1) {
                console.log('✅ Title auto-generated:', data.data.title);
                await this.loadChatHistory();
                return;
            }
        } catch (error) {
            console.warn('⚠️ API title failed, using local fallback:', error);
        }

        // Client-side fallback
        const fallbackTitle = this.extractLocalTitle(this.messages[0]?.content || '');
        if (fallbackTitle && fallbackTitle !== 'Percakapan Baru') {
            try {
                await fetch(`${this.API_BASE}/api/chats/${this.currentChatId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: fallbackTitle })
                });
                await this.loadChatHistory();
            } catch (e) {
                console.error('❌ Gagal update title:', e);
            }
        }
    }

    async getCurrentChat() {
        if (!this.currentChatId) return null;
        try {
            const response = await fetch(`${this.API_BASE}/api/chats/${this.currentChatId}`);
            const data = await response.json();
            return data.success ? data.data : null;
        } catch (error) {
            return null;
        }
    }

    async loadChatHistory() {
        try {
            const response = await fetch(`${this.API_BASE}/api/chats`);
            const data = await response.json();
            if (data.success) {
                this.renderChatHistory(data.data);
            }
        } catch (error) {
            console.error('❌ Gagal load chat history:', error);
        }
    }

    renderChatHistory(chats) {
        if (!chats || chats.length === 0) return;
        
        this.chatHistory.innerHTML = chats.map(chat => `
            <div class="history-item ${chat.id === this.currentChatId ? 'active' : ''}" data-chat-id="${chat.id}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <span class="history-text">${this.escapeHtml(chat.title)}</span>
                <button class="delete-chat-btn" data-chat-id="${chat.id}" title="Hapus chat">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        `).join('');

        // Bind click events
        this.chatHistory.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.delete-chat-btn')) return;
                const chatId = parseInt(item.dataset.chatId);
                this.loadChat(chatId);
            });
        });

        // Bind delete events
        this.chatHistory.querySelectorAll('.delete-chat-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const chatId = parseInt(btn.dataset.chatId);
                if (confirm('Hapus chat ini?')) {
                    await this.deleteChat(chatId);
                }
            });
        });
    }

    async loadChat(chatId) {
        try {
            const response = await fetch(`${this.API_BASE}/api/chats/${chatId}/messages`);
            const data = await response.json();
            if (data.success) {
                this.currentChatId = chatId;
                this.messages = data.data.map(msg => ({
                    id: msg.id,
                    role: msg.role,
                    content: msg.content,
                    timestamp: new Date(msg.created_at)
                }));
                this.renderMessages();
                await this.loadChatHistory();
            }
        } catch (error) {
            console.error('❌ Gagal load chat:', error);
        }
    }

    async deleteChat(chatId) {
        try {
            await fetch(`${this.API_BASE}/api/chats/${chatId}`, { method: 'DELETE' });
            if (chatId === this.currentChatId) {
                this.startNewChat();
            }
            await this.loadChatHistory();
        } catch (error) {
            console.error('❌ Gagal hapus chat:', error);
        }
    }

    async uploadFilesToGemini() {
        const uploaded = [];
        for (const file of this.currentFiles) {
            const formData = new FormData();
            formData.append('file', file);
            try {
                const response = await fetch(`${this.API_BASE}/api/v1/journal/upload`, { method: 'POST', body: formData });
                const data = await response.json();
                if (data.success) {
                    uploaded.push({ fileUri: data.data.uri, mimeType: data.data.mimeType });
                } else {
                    this.showToast(`Gagal upload ${file.name}: ${data.error}`, 'error');
                }
            } catch (err) {
                this.showToast(`Gagal upload ${file.name}: ${err.message}`, 'error');
            }
        }
        return uploaded;
    }

    async handleGenerateImage() {
        const text = this.chatInput.value.trim();
        if (!text) { this.showToast('Ketik deskripsi gambar', 'info'); return; }
        this.addMessage('user', `\ud83c\udfa8 Generate gambar: ${text}`);
        this.chatInput.value = '';
        this.chatInput.style.height = 'auto';
        this.toggleSendButton();
        this.showTypingIndicator();
        this.isGenerating = true;
        this.toggleSendButton();

        try {
            const response = await fetch(`${this.API_BASE}/generate-image`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: text })
            });
            const data = await response.json();
            this.removeTypingIndicator();
            if (data.success && data.data.image) {
                this.addMessage('ai', data.data.text || 'Gambar berhasil di-generate!', {
                    imageData: data.data.image.data,
                    imageMime: data.data.image.mimeType
                });
                this.playReceiveSound();
            } else {
                this.addMessage('ai', `\u26a0\ufe0f ${data.error || 'Gagal generate gambar'}`);
                this.playErrorSound();
            }
        } catch (error) {
            this.removeTypingIndicator();
            this.addMessage('ai', `\u26a0\ufe0f Error: ${error.message}`);
            this.playErrorSound();
        } finally {
            this.isGenerating = false;
            this.toggleSendButton();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.chatApp = new ChatApp();
});
