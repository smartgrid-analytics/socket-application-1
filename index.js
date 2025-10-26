// index.js -socket application with AI chat bot integration
require('dotenv').config();
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const AIService = require('./ai-service');

// Store connected users
const connectedUsers = new Map();
let onlineUserCount = 0;

// Initialize AI Service
const aiService = new AIService();
const AI_BOT_NAME = 'ChatBot AI';

// AI conversation context storage
const conversationContext = new Map();

// Clean up old conversation contexts every hour
setInterval(() => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    for (const [socketId, context] of conversationContext.entries()) {
        if (context.lastActivity < oneHourAgo) {
            conversationContext.delete(socketId);
        }
    }
    console.log(`🧹 Cleaned up conversation contexts. Active contexts: ${conversationContext.size}`);
}, 60 * 60 * 1000); // Run every hour




async function sendAIResponse(message, username, socketId) {
    if (!aiService.shouldRespond(message, username)) return;
    
    // Get or create conversation context
    let context = conversationContext.get(socketId) || { history: [], lastActivity: new Date() };
    
    // Add user message to context
    context.history.push({ role: 'user', message, username, timestamp: new Date() });
    
    // Keep only last 10 messages for context
    if (context.history.length > 10) {
        context.history = context.history.slice(-10);
    }
    
    // Update context
    context.lastActivity = new Date();
    conversationContext.set(socketId, context);
    
    // Simulate typing delay
    setTimeout(async () => {
        io.emit('typing', AI_BOT_NAME);
        
        try {
            // Generate response with context
            const aiResponse = await aiService.getAIResponse(message, username, context);
            
            // Add AI response to context
            context.history.push({ role: 'ai', message: aiResponse, timestamp: new Date() });
            conversationContext.set(socketId, context);
            
            // Send response after typing delay
            setTimeout(() => {
                io.emit('stop typing');
                
                const messageData = {
                    username: AI_BOT_NAME,
                    message: aiResponse,
                    timestamp: new Date(),
                    isAI: true
                };
                
                console.log(`${AI_BOT_NAME} → ${username}: ${aiResponse}`);
                io.emit('chat message', messageData);
            }, 1500 + Math.random() * 1500); // 1.5-3 second delay
        } catch (error) {
            console.error('AI Response error:', error);
            io.emit('stop typing');
            
            // Send error message
            const errorMessage = {
                username: AI_BOT_NAME,
                message: `Sorry ${username}, I'm having trouble processing that right now. Please try again! 🤖⚠️`,
                timestamp: new Date(),
                isAI: true
            };
            io.emit('chat message', errorMessage);
        }
    }, 500); // Initial delay before showing typing
}

// Serve static files
app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Handle user joining
    socket.on('join', (username) => {
        // Store user info
        connectedUsers.set(socket.id, {
            username: username,
            joinedAt: new Date()
        });
        
        onlineUserCount++;
        
        console.log(`${username} joined the chat`);
        
        // Broadcast to all clients that a user joined
        socket.broadcast.emit('user joined', {
            username: username,
            onlineUsers: onlineUserCount
        });
        
        // Send current online count to the joining user
        socket.emit('online users', onlineUserCount);
        
        // Welcome message to the user
        socket.emit('chat message', {
            username: 'System',
            message: `Welcome to the chat, ${username}! 👋`,
            timestamp: new Date(),
            isSystem: true
        });
        
        // AI Bot welcome message (delayed)
        setTimeout(() => {
            socket.emit('chat message', {
                username: AI_BOT_NAME,
                message: `Hi ${username}! I'm your friendly AI assistant. Feel free to ask me questions or just chat! 🤖✨`,
                timestamp: new Date(),
                isAI: true
            });
        }, 2000);
    });

    // Handle chat messages
    socket.on('chat message', (data) => {
        const user = connectedUsers.get(socket.id);
        if (user && data.message && data.message.trim()) {
            const messageData = {
                username: data.username || user.username,
                message: data.message.trim(),
                timestamp: new Date()
            };
            
            console.log(`${messageData.username}: ${messageData.message}`);
            
            // Broadcast message to all other clients
            socket.broadcast.emit('chat message', messageData);
            
            // Trigger AI response if conditions are met
            sendAIResponse(messageData.message, messageData.username);
        }
    });

    // Handle typing indicators
    socket.on('typing', (username) => {
        socket.broadcast.emit('typing', username);
    });

    socket.on('stop typing', () => {
        socket.broadcast.emit('stop typing');
    });

    // Handle user disconnection
    socket.on('disconnect', () => {
        const user = connectedUsers.get(socket.id);
        
        if (user) {
            onlineUserCount = Math.max(0, onlineUserCount - 1);
            console.log(`${user.username} disconnected`);
            
            // Broadcast to all clients that a user left
            socket.broadcast.emit('user left', {
                username: user.username,
                onlineUsers: onlineUserCount
            });
            
            // Remove user from connected users and clean up context
            connectedUsers.delete(socket.id);
            conversationContext.delete(socket.id);
        }
    });

    // Handle connection errors
    socket.on('error', (error) => {
        console.error('Socket error:', error);
    });
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Chat server running on port ${PORT}`);
    console.log(`🌐 Open http://localhost:${PORT} in your browser`);
});