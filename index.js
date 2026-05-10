import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import compression from 'compression';
import * as db from './db.js';

// Configuration
import config from './config/config.js';

// Middleware
import { apiLimiter, aiLimiter, uploadLimiter } from './middleware/rateLimiter.js';
import { cacheMiddleware } from './middleware/cache.js';
import logger, { requestLogger } from './middleware/logger.js';
import { securityHeaders, sanitizeInput, contentModeration } from './middleware/security.js';

// Services
import { trackTokenUsage, trackResponseTime, trackUserActivity, trackQuery } from './services/analytics.js';
import { buildContext, suggestOptimalModel, analyzeQueryComplexity } from './services/contextManager.js';
import { scheduleBackups } from './services/backup.js';
import { initializeWebSocket } from './services/websocket.js';

// Routes
import analyticsRoutes from './routes/analytics.routes.js';
import backupRoutes from './routes/backup.routes.js';
import authRoutes from './routes/auth.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const upload = multer({ 
    dest: path.join(__dirname, 'uploads'),
    limits: { fileSize: config.UPLOAD.MAX_FILE_SIZE }
});
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ═══════════════════════════════════════════════════════════
// Retry Helper
// ═══════════════════════════════════════════════════════════
async function retryAsync(fn, retries = 3, delay = 1000) {
    let lastError;
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            console.warn(`⚠️ Retry ${i + 1}/${retries} gagal: ${err.message}`);
            if (i < retries - 1) await new Promise(r => setTimeout(r, delay * (i + 1)));
        }
    }
    throw lastError;
}

let GEMINI_MODEL = "gemini-2.5-flash";

const AVAILABLE_MODELS = [
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", desc: "Cepat & efisien untuk chat harian" },
    { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", desc: "Kuat untuk reasoning kompleks" },
    { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", desc: "Versi stabil sebelumnya" },
    { id: "gemini-2.0-flash-lite", name: "Gemini 2.0 Flash Lite", desc: "Ringan & hemat biaya" },
];

// ═══════════════════════════════════════════════════════════
// Initialize Services
// ═══════════════════════════════════════════════════════════
// Initialize WebSocket
initializeWebSocket(httpServer);

// Schedule automatic backups
scheduleBackups();

logger.info('🚀 Services initialized');

// ═══════════════════════════════════════════════════════════
// Middleware Setup
// ═══════════════════════════════════════════════════════════
// Security headers
app.use(securityHeaders);

// Compression
app.use(compression());

// Request logging
app.use(requestLogger);

// CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization
app.use(sanitizeInput);

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// API rate limiting
app.use('/api/', apiLimiter);

// ── System Instruction ─────────────────────────────────────
const SYSTEM_INSTRUCTION =
    "Anda adalah asisten AI yang cerdas dan membantu. " +
    "Jawab pertanyaan pengguna secara akurat, informatif, dan ramah. " +
    "Jika pengguna memberikan file (dokumen, gambar, atau audio), analisis file tersebut dan jawab sesuai permintaan. " +
    "Berikan jawaban yang lengkap dan terstruktur.";

// ═══════════════════════════════════════════════════════════
// Helper: generate content dari file + prompt (with analytics)
// ═══════════════════════════════════════════════════════════
async function generateFromFile(req, res, category) {
    const startTime = Date.now();
    
    try {
        const file = req.files && req.files[0];
        if (!file) {
            return res.status(400).json({ success: false, error: `Tidak ada file ${category} yang diunggah.` });
        }

        const prompt = req.body.prompt || "Jelaskan isi file ini.";
        const localPath = file.path;
        const mimeType = file.mimetype;

        console.log(`📂 [${category}] File diterima: ${file.originalname} (${mimeType})`);
        logger.info(`File upload: ${file.originalname} (${category})`);

        // Upload file ke Gemini
        const uploadResult = await ai.files.upload({
            file: localPath,
            config: { mimeType },
        });

        console.log(`☁️  Berhasil diunggah ke Gemini: ${uploadResult.name}`);

        // Hapus file lokal
        fs.unlink(localPath, (err) => {
            if (err) console.warn("⚠️  Gagal menghapus file lokal:", err.message);
        });

        // Generate content dengan Gemini
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: [{
                role: "user",
                parts: [
                    { fileData: { fileUri: uploadResult.uri, mimeType: uploadResult.mimeType } },
                    { text: prompt },
                ],
            }],
            config: { systemInstruction: SYSTEM_INSTRUCTION },
        });

        const responseTime = Date.now() - startTime;
        
        // Track analytics
        trackResponseTime(`/generate-from-${category}`, responseTime, 200);
        trackQuery(prompt, prompt.length, response.text.length, GEMINI_MODEL, true);
        
        // Estimate tokens (rough)
        const estimatedPromptTokens = Math.ceil(prompt.length / 3);
        const estimatedCompletionTokens = Math.ceil(response.text.length / 3);
        trackTokenUsage(null, GEMINI_MODEL, estimatedPromptTokens, estimatedCompletionTokens);

        return res.status(200).json({
            success: true,
            data: {
                answer: response.text,
                file: { name: uploadResult.name, uri: uploadResult.uri, mimeType: uploadResult.mimeType },
            },
            meta: {
                responseTime: `${responseTime}ms`,
                model: GEMINI_MODEL
            }
        });
    } catch (error) {
        const responseTime = Date.now() - startTime;
        console.error(`❌ [${category}] Error:`, error);
        logger.error(`Generate from ${category} error: ${error.message}`);
        
        trackResponseTime(`/generate-from-${category}`, responseTime, 500, error.message);
        
        res.status(500).json({ success: false, error: error.message });
    }
}

// ═══════════════════════════════════════════════════════════
// Helper: panggil Gemini untuk teks saja (with context & analytics)
// ═══════════════════════════════════════════════════════════
async function callGemini(parts, chatId = null) {
    const startTime = Date.now();
    
    try {
        // Build context if chatId provided
        let contents = [{ role: "user", parts }];
        
        if (chatId) {
            const messages = db.getMessages(chatId);
            const context = buildContext(messages);
            contents = [...context, { role: "user", parts }];
        }
        
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents,
            config: { systemInstruction: SYSTEM_INSTRUCTION },
        });
        
        const responseTime = Date.now() - startTime;
        
        // Track analytics
        const promptText = parts.map(p => p.text || '').join(' ');
        trackResponseTime('/generate', responseTime, 200);
        trackQuery(promptText, promptText.length, response.text.length, GEMINI_MODEL, true);
        
        // Estimate tokens
        const estimatedPromptTokens = Math.ceil(promptText.length / 3);
        const estimatedCompletionTokens = Math.ceil(response.text.length / 3);
        trackTokenUsage(chatId, GEMINI_MODEL, estimatedPromptTokens, estimatedCompletionTokens);
        
        return response;
    } catch (error) {
        const responseTime = Date.now() - startTime;
        trackResponseTime('/generate', responseTime, 500, error.message);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════
// POST /api/v1/journal/upload — Upload file ke Gemini
// ═══════════════════════════════════════════════════════════
app.post("/api/v1/journal/upload", uploadLimiter, upload.any(), async (req, res) => {
    try {
        const file = req.files && req.files[0];
        if (!file) {
            return res.status(400).json({ success: false, error: "Tidak ada file yang diunggah." });
        }

        const localPath = file.path;
        const mimeType = file.mimetype;

        console.log(`📂 File diterima: ${file.originalname} (${mimeType})`);

        const uploadResult = await ai.files.upload({
            file: localPath,
            config: { mimeType },
        });

        console.log(`☁️  Berhasil diunggah ke Gemini: ${uploadResult.name}`);

        fs.unlink(localPath, (err) => {
            if (err) console.warn("⚠️  Gagal menghapus file lokal:", err.message);
        });

        return res.status(200).json({
            success: true,
            message: "File berhasil diunggah ke Gemini.",
            data: {
                name: uploadResult.name,
                uri: uploadResult.uri,
                mimeType: uploadResult.mimeType,
            },
        });
    } catch (error) {
        console.error("❌ Upload error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════
// POST /api/v1/journal/chat — Chat multi-file (with context)
// ═══════════════════════════════════════════════════════════
app.post("/api/v1/journal/chat", aiLimiter, cacheMiddleware, contentModeration, async (req, res) => {
    try {
        const { prompt, files } = req.body;

        if (!prompt || typeof prompt !== "string") {
            return res.status(400).json({ success: false, error: "Field 'prompt' (string) wajib diisi." });
        }

        const parts = [];

        if (Array.isArray(files) && files.length > 0) {
            for (const f of files) {
                if (!f.fileUri || !f.mimeType) {
                    return res.status(400).json({
                        success: false,
                        error: "Setiap item di array 'files' harus memiliki 'fileUri' dan 'mimeType'.",
                    });
                }
                parts.push({ fileData: { fileUri: f.fileUri, mimeType: f.mimeType } });
            }
        }

        parts.push({ text: prompt });

        console.log(`💬 Chat request — prompt: "${prompt.substring(0, 80)}…" | files: ${files?.length || 0}`);

        const response = await callGemini(parts);

        return res.status(200).json({
            success: true,
            data: { answer: response.text },
        });
    } catch (error) {
        console.error("❌ Chat error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════
// Endpoint 1: POST /generate-text (teks saja) - Enhanced
// ═══════════════════════════════════════════════════════════
app.post("/generate-text", aiLimiter, cacheMiddleware, contentModeration, async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { prompt, chatId } = req.body;

        if (!prompt || typeof prompt !== "string") {
            return res.status(400).json({ success: false, error: "Field 'prompt' (string) wajib diisi." });
        }

        console.log(`💬 [text] Prompt: "${prompt.substring(0, 80)}…"`);
        logger.info(`Text generation request: ${prompt.substring(0, 50)}...`);

        // Analyze query complexity and suggest model
        const complexity = analyzeQueryComplexity(prompt);
        const modelSuggestion = suggestOptimalModel(prompt, GEMINI_MODEL);
        
        if (modelSuggestion.shouldSwitch) {
            logger.info(`Model suggestion: ${modelSuggestion.suggested} (${modelSuggestion.reason})`);
        }

        const response = await callGemini([{ text: prompt }], chatId);
        
        const responseTime = Date.now() - startTime;

        return res.status(200).json({
            success: true,
            data: { 
                answer: response.text,
                complexity: complexity.complexity,
                modelUsed: GEMINI_MODEL,
                modelSuggestion: modelSuggestion.shouldSwitch ? modelSuggestion.suggested : null
            },
            meta: {
                responseTime: `${responseTime}ms`
            }
        });
    } catch (error) {
        const responseTime = Date.now() - startTime;
        console.error("❌ [text] Error:", error);
        logger.error(`Text generation error: ${error.message}`);
        
        trackResponseTime('/generate-text', responseTime, 500, error.message);
        
        res.status(500).json({ success: false, error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════
// Endpoint 2: POST /generate-from-image (upload gambar + prompt)
// ═══════════════════════════════════════════════════════════
app.post("/generate-from-image", uploadLimiter, upload.any(), (req, res) => {
    return generateFromFile(req, res, "image");
});

// ═══════════════════════════════════════════════════════════
// Endpoint 3: POST /generate-from-document (upload PDF + prompt)
// ═══════════════════════════════════════════════════════════
app.post("/generate-from-document", uploadLimiter, upload.any(), (req, res) => {
    return generateFromFile(req, res, "document");
});

// ═══════════════════════════════════════════════════════════
// Endpoint 4: POST /generate-from-audio (upload audio + prompt)
// ═══════════════════════════════════════════════════════════
app.post("/generate-from-audio", uploadLimiter, upload.any(), (req, res) => {
    return generateFromFile(req, res, "audio");
});

// ═══════════════════════════════════════════════════════════
// Endpoint 5: POST /generate-image (Image generation) - Enhanced
// ═══════════════════════════════════════════════════════════
const IMAGE_MODEL = "gemini-2.5-flash-image";

app.post("/generate-image", aiLimiter, async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { prompt } = req.body;

        if (!prompt || typeof prompt !== "string") {
            return res.status(400).json({ success: false, error: "Field 'prompt' (string) wajib diisi." });
        }

        console.log(`🎨 [image-gen] Prompt: "${prompt.substring(0, 80)}…"`);
        logger.info(`Image generation request: ${prompt.substring(0, 50)}...`);

        const response = await ai.models.generateContent({
            model: IMAGE_MODEL,
            contents: prompt,
        });

        const parts = response.candidates?.[0]?.content?.parts || [];
        let textResult = null;
        let imageResult = null;

        for (const part of parts) {
            if (part.text) {
                textResult = part.text;
            } else if (part.inlineData) {
                imageResult = {
                    mimeType: part.inlineData.mimeType || "image/png",
                    data: part.inlineData.data, // base64
                };
            }
        }

        if (!imageResult) {
            return res.status(500).json({
                success: false,
                error: "Model tidak mengembalikan gambar. Coba ubah prompt Anda.",
                text: textResult,
            });
        }

        const responseTime = Date.now() - startTime;
        
        // Track analytics
        trackResponseTime('/generate-image', responseTime, 200);
        trackQuery(prompt, prompt.length, 0, IMAGE_MODEL, true);

        console.log(`✅ [image-gen] Gambar berhasil di-generate`);
        logger.info(`Image generated successfully in ${responseTime}ms`);

        return res.status(200).json({
            success: true,
            data: {
                text: textResult,
                image: imageResult,
            },
            meta: {
                responseTime: `${responseTime}ms`,
                model: IMAGE_MODEL
            }
        });
    } catch (error) {
        const responseTime = Date.now() - startTime;
        console.error("❌ [image-gen] Error:", error);
        logger.error(`Image generation error: ${error.message}`);
        
        trackResponseTime('/generate-image', responseTime, 500, error.message);
        
        res.status(500).json({ success: false, error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════
// Chat History Endpoints
// ═══════════════════════════════════════════════════════════

// GET /api/chats — List all chats
app.get("/api/chats", (req, res) => {
    try {
        const chats = db.getChats();
        res.json({ success: true, data: chats });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/chats — Create new chat
app.post("/api/chats", (req, res) => {
    try {
        const { title } = req.body;
        const chat = db.createChat(title);
        res.status(201).json({ success: true, data: chat });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// GET /api/chats/:id — Get chat details
app.get("/api/chats/:id", (req, res) => {
    try {
        const chat = db.getChat(req.params.id);
        if (!chat) return res.status(404).json({ success: false, error: "Chat tidak ditemukan." });
        res.json({ success: true, data: chat });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// PUT /api/chats/:id — Update chat title
app.put("/api/chats/:id", (req, res) => {
    try {
        const { title } = req.body;
        if (!title || typeof title !== 'string') {
            return res.status(400).json({ success: false, error: "Field 'title' (string) wajib diisi." });
        }
        db.updateChatTitle(req.params.id, title.trim());
        res.json({ success: true, message: "Chat title updated." });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// DELETE /api/chats/:id — Delete chat
app.delete("/api/chats/:id", (req, res) => {
    try {
        db.deleteChat(req.params.id);
        res.json({ success: true, message: "Chat dihapus." });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// GET /api/chats/:id/messages — Get messages
app.get("/api/chats/:id/messages", (req, res) => {
    try {
        const messages = db.getMessages(req.params.id);
        res.json({ success: true, data: messages });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/chats/:id/messages — Add message
app.post("/api/chats/:id/messages", (req, res) => {
    try {
        const { role, content, model } = req.body;
        if (!role || !content) {
            return res.status(400).json({ success: false, error: "role dan content wajib diisi." });
        }
        const result = db.addMessage(req.params.id, role, content, model || GEMINI_MODEL);
        res.status(201).json({ success: true, data: result });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ═══════════════════════════════════════════════════════════
// Prompt Templates Endpoints
// ═══════════════════════════════════════════════════════════

app.get("/api/templates", (req, res) => {
    try {
        const templates = db.getTemplates();
        res.json({ success: true, data: templates });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post("/api/templates", (req, res) => {
    try {
        const { name, content } = req.body;
        if (!name || !content) return res.status(400).json({ success: false, error: "name dan content wajib diisi." });
        const result = db.createTemplate(name, content);
        res.status(201).json({ success: true, data: result });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.delete("/api/templates/:id", (req, res) => {
    try {
        db.deleteTemplate(req.params.id);
        res.json({ success: true, message: "Template dihapus." });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ═══════════════════════════════════════════════════════════
// Function Calling (Tool Use) — USD/IDR Converter
// ═══════════════════════════════════════════════════════════
const exchangeRates = { USD: 16200, EUR: 17500, JPY: 110, SGD: 12000 };

app.post("/api/convert-currency", (req, res) => {
    const { amount, from, to } = req.body;
    const rate = exchangeRates[from] || 1;
    const result = amount * rate;
    res.json({ success: true, data: { amount, from, to, result, rate } });
});

// ═══════════════════════════════════════════════════════════
// SSE Streaming Endpoint — Real-time response
// ═══════════════════════════════════════════════════════════
app.post("/api/stream", async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt || typeof prompt !== "string") {
            return res.status(400).json({ success: false, error: "Field 'prompt' (string) wajib diisi." });
        }

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const response = await ai.models.generateContentStream({
            model: GEMINI_MODEL,
            contents: prompt,
            config: { systemInstruction: SYSTEM_INSTRUCTION },
        });

        for await (const chunk of response) {
            const text = chunk.text || '';
            res.write(`data: ${JSON.stringify({ type: 'chunk', text })}
\n`);
        }

        res.write(`data: ${JSON.stringify({ type: 'done' })}
\n`);
        res.end();
    } catch (error) {
        res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}
\n`);
        res.end();
    }
});

// ═══════════════════════════════════════════════════════════
// Model Management Endpoints
// ═══════════════════════════════════════════════════════════

// GET /api/models — List available models
app.get("/api/models", (req, res) => {
    res.status(200).json({
        success: true,
        data: {
            current: GEMINI_MODEL,
            models: AVAILABLE_MODELS,
        },
    });
});

// POST /api/model — Switch active model
app.post("/api/model", (req, res) => {
    const { model } = req.body;
    if (!model || typeof model !== "string") {
        return res.status(400).json({ success: false, error: "Field 'model' (string) wajib diisi." });
    }
    const found = AVAILABLE_MODELS.find(m => m.id === model);
    if (!found) {
        return res.status(400).json({ success: false, error: `Model '${model}' tidak tersedia.` });
    }
    GEMINI_MODEL = model;
    console.log(`🔄 Model aktif diganti ke: ${model}`);
    res.status(200).json({
        success: true,
        message: `Model aktif berhasil diganti ke ${found.name}.`,
        data: { current: GEMINI_MODEL },
    });
});

// GET /api/model — Get current model
app.get("/api/model", (req, res) => {
    const found = AVAILABLE_MODELS.find(m => m.id === GEMINI_MODEL);
    res.status(200).json({
        success: true,
        data: {
            current: GEMINI_MODEL,
            name: found?.name || GEMINI_MODEL,
        },
    });
});

// ═══════════════════════════════════════════════════════════
// Message Edit
// ═══════════════════════════════════════════════════════════
app.put("/api/chats/:id/messages/:msgId", (req, res) => {
    try {
        const { content } = req.body;
        if (!content) return res.status(400).json({ success: false, error: "content wajib diisi." });
        db.updateMessage(req.params.msgId, content);
        res.json({ success: true, message: "Pesan diperbarui." });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ═══════════════════════════════════════════════════════════
// Auto Title Generation — Enhanced
// ═══════════════════════════════════════════════════════════

// Local topic extraction fallback
function extractTopicFallback(text) {
    // Remove code blocks, URLs, common filler words
    const cleaned = text
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/`[^`]+`/g, ' ')
        .replace(/https?:\/\/\S+/g, ' ')
        .replace(/\b(jelaskan|terangkan|buatkan|tolong|bantu|bagaimana|apa|mengapa|kapan|siapa|di mana|dimana|apakah|bisakah|dapatkah|mohon|please|help|explain|create|make|how|what|why|when|who|where|can|could)\b/gi, ' ')
        .replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const words = cleaned.split(/\s+/).filter(w => w.length > 2);
    const freq = {};
    words.forEach(w => {
        const lower = w.toLowerCase();
        freq[lower] = (freq[lower] || 0) + 1;
    });

    // Pick top meaningful words
    const topWords = Object.entries(freq)
        .filter(([w]) => w.length > 2)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([w]) => w.charAt(0).toUpperCase() + w.slice(1));

    return topWords.length > 0 ? topWords.join(' ') : 'Percakapan Baru';
}

app.post("/api/chats/:id/title", async (req, res) => {
    try {
        const messages = db.getMessages(req.params.id);
        if (!messages || messages.length === 0) {
            return res.json({ success: true, data: { title: 'Percakapan Baru' } });
        }

        // Build conversation context from first exchange (user + ai) for best topic detection
        const firstExchange = messages.slice(0, 4); // first 4 messages = ~2 exchanges
        let conversation = '';
        for (const m of firstExchange) {
            const role = m.role === 'user' ? 'User' : 'AI';
            const content = m.content
                .replace(/```[\s\S]*?```/g, ' [code] ')
                .replace(/`[^`]+`/g, ' $& ')
                .substring(0, 300);
            conversation += `${role}: ${content}\n`;
        }

        const titlePrompt = `Tugas: Buat judul chat yang sangat singkat dan deskriptif berdasarkan percakapan berikut.

Aturan penting:
- Maksimal 5 kata
- Gunakan bahasa Indonesia
- Fokus pada TOPIK UTAMA, bukan sapaan atau permintaan
- Hindari kata: "Chat", "Percakapan", "Tentang", "Mengenai"
- Contoh baik: "Analisis Data Penjualan", "Deploy Node.js", "Resume Marketing"
- Contoh buruk: "Chat Tentang Coding", "Percakapan Mengenai Project"

Percakapan:
${conversation}

Judul:`;

        let title;
        try {
            const response = await callGemini([{ text: titlePrompt }]);
            title = response.text
                .trim()
                .replace(/^["']|["']$/g, '')
                .replace(/^(judul|title)[:\s]*/i, '')
                .replace(/\s+/g, ' ')
                .substring(0, 50);
        } catch (aiError) {
            console.warn('⚠️ AI title gen failed, using fallback:', aiError.message);
            title = extractTopicFallback(messages[0]?.content || '');
        }

        if (!title || title.length < 2) {
            title = extractTopicFallback(messages[0]?.content || '');
        }

        db.updateChatTitle(req.params.id, title);
        res.json({ success: true, data: { title } });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ═══════════════════════════════════════════════════════════
// Pin Endpoints
// ═══════════════════════════════════════════════════════════
app.get("/api/chats/:id/pins", (req, res) => {
    try {
        const pins = db.getPins(req.params.id);
        res.json({ success: true, data: pins });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post("/api/chats/:id/pins", (req, res) => {
    try {
        const { messageId, note } = req.body;
        if (!messageId) return res.status(400).json({ success: false, error: "messageId wajib diisi." });
        const result = db.addPin(req.params.id, messageId, note);
        res.status(201).json({ success: true, data: result });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.delete("/api/pins/:id", (req, res) => {
    try {
        db.removePin(req.params.id);
        res.json({ success: true, message: "Pin dihapus." });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ═══════════════════════════════════════════════════════════
// Search Messages
// ═══════════════════════════════════════════════════════════
app.get("/api/search", (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.status(400).json({ success: false, error: "Parameter 'q' wajib diisi." });
        const results = db.searchMessages(q);
        res.json({ success: true, data: results });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

const PORT = 3000;

// ═══════════════════════════════════════════════════════════
// Health Check & System Info
// ═══════════════════════════════════════════════════════════
app.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        features: {
            rateLimiting: true,
            caching: true,
            analytics: true,
            backup: true,
            auth: true,
            websocket: true,
            contextManagement: true
        }
    });
});

app.get('/api/system/info', (req, res) => {
    const { getCacheStats } = require('./middleware/cache.js');
    const cacheStats = getCacheStats();
    
    res.json({
        success: true,
        data: {
            version: '2.0.0',
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cache: cacheStats,
            models: AVAILABLE_MODELS,
            currentModel: GEMINI_MODEL
        }
    });
});

// ═══════════════════════════════════════════════════════════
// 404 Handler
// ═══════════════════════════════════════════════════════════
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.path
    });
});

// ═══════════════════════════════════════════════════════════
// Error Handler
// ═══════════════════════════════════════════════════════════
app.use((err, req, res, next) => {
    logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });
    
    res.status(err.status || 500).json({
        success: false,
        error: config.NODE_ENV === 'production' ? 'Internal server error' : err.message,
        ...(config.NODE_ENV !== 'production' && { stack: err.stack })
    });
});

// ═══════════════════════════════════════════════════════════
// Start Server
// ═══════════════════════════════════════════════════════════
httpServer.listen(PORT, () => {
    console.log(`🚀 AI CHATBOT NYA LANGSUNG MELUNCUR BROKU`);
    console.log(`Server: http://localhost:${PORT}`);
});
