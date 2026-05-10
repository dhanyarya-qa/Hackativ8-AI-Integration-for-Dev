/**
 * WebSocket Service for Real-time Features
 * - Real-time chat updates
 * - Typing indicators
 * - User presence
 * - Live notifications
 */

import { Server } from 'socket.io';
import logger from '../middleware/logger.js';

let io = null;
const activeUsers = new Map();
const typingUsers = new Map();

/**
 * Initialize WebSocket server
 */
export function initializeWebSocket(server) {
    io = new Server(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    });

    io.on('connection', (socket) => {
        logger.info(`🔌 WebSocket connected: ${socket.id}`);

        // User joins
        socket.on('user:join', (data) => {
            const { userId, username, chatId } = data;
            
            activeUsers.set(socket.id, { userId, username, chatId });
            socket.join(`chat:${chatId}`);
            
            // Broadcast user joined
            io.to(`chat:${chatId}`).emit('user:joined', {
                userId,
                username,
                timestamp: new Date()
            });

            // Send current active users
            const chatUsers = Array.from(activeUsers.values())
                .filter(u => u.chatId === chatId);
            
            socket.emit('users:list', chatUsers);
            
            logger.info(`👤 User joined: ${username} (${userId}) in chat ${chatId}`);
        });

        // User leaves
        socket.on('user:leave', (data) => {
            const { chatId } = data;
            const user = activeUsers.get(socket.id);
            
            if (user) {
                io.to(`chat:${chatId}`).emit('user:left', {
                    userId: user.userId,
                    username: user.username,
                    timestamp: new Date()
                });
                
                activeUsers.delete(socket.id);
                typingUsers.delete(socket.id);
            }
        });

        // Typing indicator
        socket.on('typing:start', (data) => {
            const { chatId, username } = data;
            typingUsers.set(socket.id, { chatId, username });
            
            socket.to(`chat:${chatId}`).emit('user:typing', {
                username,
                isTyping: true
            });
        });

        socket.on('typing:stop', (data) => {
            const { chatId, username } = data;
            typingUsers.delete(socket.id);
            
            socket.to(`chat:${chatId}`).emit('user:typing', {
                username,
                isTyping: false
            });
        });

        // New message broadcast
        socket.on('message:send', (data) => {
            const { chatId, message } = data;
            
            io.to(`chat:${chatId}`).emit('message:new', {
                ...message,
                timestamp: new Date()
            });
            
            logger.info(`💬 Message sent in chat ${chatId}`);
        });

        // AI response streaming
        socket.on('ai:generating', (data) => {
            const { chatId } = data;
            socket.to(`chat:${chatId}`).emit('ai:status', {
                status: 'generating',
                timestamp: new Date()
            });
        });

        socket.on('ai:complete', (data) => {
            const { chatId } = data;
            socket.to(`chat:${chatId}`).emit('ai:status', {
                status: 'complete',
                timestamp: new Date()
            });
        });

        // Disconnect
        socket.on('disconnect', () => {
            const user = activeUsers.get(socket.id);
            
            if (user) {
                io.to(`chat:${user.chatId}`).emit('user:left', {
                    userId: user.userId,
                    username: user.username,
                    timestamp: new Date()
                });
                
                activeUsers.delete(socket.id);
                typingUsers.delete(socket.id);
            }
            
            logger.info(`🔌 WebSocket disconnected: ${socket.id}`);
        });
    });

    logger.info('✅ WebSocket server initialized');
    return io;
}

/**
 * Broadcast message to specific chat
 */
export function broadcastToChat(chatId, event, data) {
    if (io) {
        io.to(`chat:${chatId}`).emit(event, data);
    }
}

/**
 * Broadcast to all connected clients
 */
export function broadcastToAll(event, data) {
    if (io) {
        io.emit(event, data);
    }
}

/**
 * Get active users in a chat
 */
export function getActiveUsers(chatId) {
    return Array.from(activeUsers.values())
        .filter(u => u.chatId === chatId);
}

/**
 * Get typing users in a chat
 */
export function getTypingUsers(chatId) {
    return Array.from(typingUsers.values())
        .filter(u => u.chatId === chatId)
        .map(u => u.username);
}

/**
 * Send notification to specific user
 */
export function notifyUser(userId, event, data) {
    if (io) {
        const userSocket = Array.from(activeUsers.entries())
            .find(([_, user]) => user.userId === userId);
        
        if (userSocket) {
            io.to(userSocket[0]).emit(event, data);
        }
    }
}

export default { initializeWebSocket, broadcastToChat, broadcastToAll, getActiveUsers, notifyUser };
