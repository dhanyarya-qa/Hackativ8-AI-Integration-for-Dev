/**
 * Context Management Service
 * Manages conversation context and token optimization
 */

import config from '../config/config.js';

/**
 * Estimate token count (rough approximation)
 * 1 token ≈ 4 characters for English, ≈ 2-3 for Indonesian
 */
function estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.length / 3);
}

/**
 * Build context from message history
 */
export function buildContext(messages, maxHistory = config.CONTEXT.MAX_HISTORY) {
    if (!messages || messages.length === 0) {
        return [];
    }

    // Get recent messages
    const recentMessages = messages.slice(-maxHistory);
    
    // Convert to Gemini format
    const context = [];
    let totalTokens = 0;

    for (const msg of recentMessages) {
        const tokens = estimateTokens(msg.content);
        
        // Stop if we exceed token limit
        if (totalTokens + tokens > config.CONTEXT.MAX_TOKENS) {
            break;
        }

        context.push({
            role: msg.role === 'ai' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        });

        totalTokens += tokens;
    }

    return context;
}

/**
 * Optimize context by summarizing old messages
 */
export async function optimizeContext(messages, aiClient, model) {
    if (messages.length <= config.CONTEXT.MAX_HISTORY) {
        return messages;
    }

    // Keep recent messages
    const recentMessages = messages.slice(-config.CONTEXT.MAX_HISTORY);
    const oldMessages = messages.slice(0, -config.CONTEXT.MAX_HISTORY);

    // Summarize old messages
    const summaryPrompt = `Ringkas percakapan berikut dalam 2-3 kalimat:\n\n${
        oldMessages.map(m => `${m.role}: ${m.content}`).join('\n')
    }`;

    try {
        const response = await aiClient.models.generateContent({
            model,
            contents: [{ role: 'user', parts: [{ text: summaryPrompt }] }]
        });

        const summary = response.text;

        // Return summary + recent messages
        return [
            { role: 'ai', content: `[Ringkasan percakapan sebelumnya: ${summary}]` },
            ...recentMessages
        ];
    } catch (error) {
        console.error('Failed to optimize context:', error);
        return recentMessages; // Fallback to recent messages only
    }
}

/**
 * Analyze query complexity
 */
export function analyzeQueryComplexity(prompt) {
    const length = prompt.length;
    const hasCode = /```|`/.test(prompt);
    const hasMultipleQuestions = (prompt.match(/\?/g) || []).length > 1;
    const hasComplexWords = /analisis|jelaskan|bandingkan|evaluasi|implementasi/i.test(prompt);
    
    let complexity = 'simple';
    let score = 0;

    if (length > 500) score += 2;
    else if (length > 200) score += 1;

    if (hasCode) score += 2;
    if (hasMultipleQuestions) score += 1;
    if (hasComplexWords) score += 1;

    if (score >= 4) complexity = 'complex';
    else if (score >= 2) complexity = 'medium';

    return { complexity, score };
}

/**
 * Suggest optimal model based on query
 */
export function suggestOptimalModel(prompt, currentModel) {
    if (!config.MODELS.AUTO_SWITCH) {
        return currentModel;
    }

    const { complexity } = analyzeQueryComplexity(prompt);

    // Model selection based on complexity
    const modelMap = {
        'simple': 'gemini-2.0-flash-lite',
        'medium': 'gemini-2.5-flash',
        'complex': 'gemini-2.5-pro'
    };

    const suggestedModel = modelMap[complexity];

    return {
        suggested: suggestedModel,
        current: currentModel,
        shouldSwitch: config.MODELS.COST_OPTIMIZATION && suggestedModel !== currentModel,
        reason: `Query complexity: ${complexity}`
    };
}

/**
 * Prepare context for multi-turn conversation
 */
export function prepareConversationContext(chatHistory, newPrompt, systemInstruction) {
    const context = buildContext(chatHistory);
    
    // Add new user message
    context.push({
        role: 'user',
        parts: [{ text: newPrompt }]
    });

    return {
        contents: context,
        config: {
            systemInstruction: systemInstruction
        }
    };
}

/**
 * Extract key information from conversation
 */
export function extractKeyInfo(messages) {
    const topics = new Set();
    const keywords = new Set();
    
    messages.forEach(msg => {
        // Simple keyword extraction (can be improved with NLP)
        const words = msg.content.toLowerCase().split(/\s+/);
        words.forEach(word => {
            if (word.length > 5 && !['adalah', 'dengan', 'untuk', 'dalam', 'dapat'].includes(word)) {
                keywords.add(word);
            }
        });
    });

    return {
        messageCount: messages.length,
        keywords: Array.from(keywords).slice(0, 10),
        estimatedTokens: estimateTokens(messages.map(m => m.content).join(' '))
    };
}
