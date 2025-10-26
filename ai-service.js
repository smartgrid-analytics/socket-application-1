// ai -service.js - AI service module with OpenAI, Gemini, Hugging Face, and local responses
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const axios = require('axios');

class AIService {
    constructor() {
        this.openai = null;
        this.gemini = null;
        this.initializeServices();
    }

    initializeServices() {
        // Initialize OpenAI
        if (process.env.OPENAI_API_KEY) {
            this.openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY,
            });
            console.log('✅ OpenAI service initialized');
        }

        // Initialize Google Gemini
        if (process.env.GEMINI_API_KEY) {
            this.gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            console.log('✅ Gemini AI service initialized');
        }

        if (!this.openai && !this.gemini) {
            console.log('ℹ️  Using local AI responses (no API keys found)');
        }
    }

    // Enhanced local responses with more context awareness
    getLocalResponse(message, username, context = {}) {
        const lowerMessage = message.toLowerCase();
        const responses = {
            greetings: [
                `Hello ${username}! 👋 How can I help you today?`,
                `Hi there ${username}! I'm here to answer your questions! 🤖`,
                `Greetings ${username}! What would you like to know? 😊`,
                `Hey ${username}! I'm your AI assistant, ready to help! 🚀`
            ],
            
            technology: [
                "That's a great tech question! 💻 Based on current trends, I'd suggest...",
                "Interesting technology topic! 🔧 Here's what I think...",
                "Great question about tech! ⚡ Let me share some insights...",
                "Technology is fascinating! 🌟 Here's my perspective..."
            ],
            
            programming: [
                "Nice programming question! 👨‍💻 Here's how I'd approach it...",
                "Coding question detected! 🐍 Let me help you with that...",
                "Programming is fun! 💡 Here's what you might try...",
                "Good coding question! 🎯 Consider this approach..."
            ],
            
            business: [
                "That's a solid business question! 📈 From my perspective...",
                "Business strategy is important! 💼 Here's what I'd recommend...",
                "Great business inquiry! 🎯 Consider these factors...",
                "Business-wise, I think... 📊"
            ],
            
            science: [
                "Fascinating scientific question! 🔬 Based on current research...",
                "Science is amazing! 🧪 Here's what we know...",
                "Great scientific inquiry! 🌌 The current understanding is...",
                "Love the science question! ⚗️ Here's the scoop..."
            ],
            
            general: [
                `That's an interesting question, ${username}! 🤔 Let me think...`,
                `Great point, ${username}! 💭 Here's my perspective...`,
                `Thanks for asking, ${username}! 🙏 I'd say...`,
                `Excellent question, ${username}! 🌟 My thoughts are...`
            ],
            
            help: [
                `I can help with various topics, ${username}! 🆘 Try asking about:
• Technology & Programming 💻
• Science & Research 🔬  
• Business & Strategy 📈
• General knowledge 🧠
• Current events 📰
• Or just chat with me! 💬`
            ],
            
            unknown: [
                `Hmm, that's a tricky one, ${username}! 🤷‍♂️ Could you elaborate?`,
                `I'm not sure about that specific topic, ${username}. Can you provide more context? 🤔`,
                `That's outside my current knowledge, ${username}. Can you ask it differently? 💭`,
                `Interesting question, ${username}! I'd need more details to give a good answer. 🔍`
            ]
        };

        // Determine response category based on message content
        let category = 'general';
        
        if (lowerMessage.match(/\b(hi|hello|hey|greetings|good morning|good afternoon)\b/)) {
            category = 'greetings';
        } else if (lowerMessage.includes('help') || lowerMessage.includes('commands')) {
            category = 'help';
        } else if (lowerMessage.match(/\b(code|coding|program|javascript|python|html|css|web|software|app)\b/)) {
            category = 'programming';
        } else if (lowerMessage.match(/\b(technology|tech|computer|ai|machine learning|data|cloud|server)\b/)) {
            category = 'technology';
        } else if (lowerMessage.match(/\b(business|marketing|sales|strategy|startup|company|money|investment)\b/)) {
            category = 'business';
        } else if (lowerMessage.match(/\b(science|research|biology|chemistry|physics|study|experiment)\b/)) {
            category = 'science';
        } else if (!lowerMessage.includes('?') && !lowerMessage.match(/\b(what|how|why|when|where|who)\b/)) {
            category = 'unknown';
        }

        const categoryResponses = responses[category];
        return categoryResponses[Math.floor(Math.random() * categoryResponses.length)];
    }

    // OpenAI GPT Integration
    async getOpenAIResponse(message, username, context = {}) {
        try {
            const systemPrompt = `You are a helpful AI assistant in a chat room. 
            - Keep responses conversational and friendly
            - Limit responses to 2-3 sentences maximum
            - Use emojis occasionally but not excessively
            - Be knowledgeable but humble
            - If you don't know something, admit it
            - Address the user by name: ${username}
            - Current context: This is a real-time chat application`;

            const completion = await this.openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: message }
                ],
                max_tokens: 150,
                temperature: 0.7,
                presence_penalty: 0.1,
                frequency_penalty: 0.1
            });

            return completion.choices[0].message.content.trim();
        } catch (error) {
            console.error('OpenAI API error:', error.message);
            throw error;
        }
    }

    // Google Gemini Integration
    async getGeminiResponse(message, username, context = {}) {
        try {
            const model = this.gemini.getGenerativeModel({ model: "gemini-pro" });
            
            const prompt = `You are a helpful AI assistant named ChatBot AI in a real-time chat room.
            
            Guidelines:
            - Keep responses brief (2-3 sentences max)
            - Be conversational and friendly
            - Address the user as ${username}
            - Use appropriate emojis sparingly
            - If unsure, admit it honestly
            - Provide helpful and accurate information
            
            User message: "${message}"
            
            Please respond as the AI assistant:`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text().trim();
        } catch (error) {
            console.error('Gemini API error:', error.message);
            throw error;
        }
    }

    // Hugging Face Integration (Free alternative)
    async getHuggingFaceResponse(message, username, context = {}) {
        try {
            const response = await axios.post(
                'https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium',
                {
                    inputs: {
                        past_user_inputs: [message],
                        generated_responses: []
                    }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                    timeout: 10000
                }
            );

            if (response.data && response.data.generated_text) {
                return `${response.data.generated_text} 🤖`;
            }
            throw new Error('No response from Hugging Face');
        } catch (error) {
            console.error('Hugging Face API error:', error.message);
            throw error;
        }
    }

    // Main method to get AI response with fallback chain
    async getAIResponse(message, username, context = {}) {
        const lowerMessage = message.toLowerCase();
        
        // Handle special commands first
        if (lowerMessage.startsWith('/ai ') || lowerMessage.startsWith('@ai ')) {
            message = message.substring(4).trim();
        }

        if (lowerMessage === '/help' || lowerMessage === 'help') {
            return this.getLocalResponse(message, username, context);
        }

        if (lowerMessage === '/time' || lowerMessage.includes('what time')) {
            return `🕐 Current time: ${new Date().toLocaleTimeString()}, ${username}!`;
        }

        if (lowerMessage === '/date' || lowerMessage.includes('what date')) {
            return `📅 Today's date: ${new Date().toLocaleDateString()}, ${username}!`;
        }

        if (lowerMessage.includes('joke') || lowerMessage.includes('funny')) {
            const jokes = [
                "Why don't scientists trust atoms? Because they make up everything! 😄",
                "I told my computer a joke about UDP... I'm not sure if it got it! 💻😂",
                "Why do programmers prefer dark mode? Because light attracts bugs! 🐛💡",
                "What's a computer's favorite snack? Microchips! 🍪💻",
                "Why did the AI break up with the database? There were too many relationship issues! 💔📊"
            ];
            return jokes[Math.floor(Math.random() * jokes.length)];
        }

        // Try external AI services with fallback chain
        const aiServices = [
            { name: 'OpenAI', method: this.getOpenAIResponse.bind(this), available: !!this.openai },
            { name: 'Gemini', method: this.getGeminiResponse.bind(this), available: !!this.gemini },
            { name: 'HuggingFace', method: this.getHuggingFaceResponse.bind(this), available: !!process.env.HUGGINGFACE_API_KEY }
        ];

        // Try each service in order
        for (const service of aiServices) {
            if (service.available) {
                try {
                    console.log(`🤖 Trying ${service.name} for: "${message}"`);
                    const response = await service.method(message, username, context);
                    console.log(`✅ ${service.name} responded successfully`);
                    return response;
                } catch (error) {
                    console.log(`❌ ${service.name} failed: ${error.message}`);
                    continue;
                }
            }
        }

        // Fallback to local responses
        console.log('🔄 Using local AI responses');
        return this.getLocalResponse(message, username, context);
    }

    // Determine if AI should respond to a message
    shouldRespond(message, username) {
        const lowerMessage = message.toLowerCase();
        
        // Always respond to direct commands
        if (lowerMessage.startsWith('/ai ') || lowerMessage.startsWith('@ai ') || 
            lowerMessage.startsWith('/help') || lowerMessage === 'help') {
            return true;
        }

        // Respond to questions
        if (lowerMessage.includes('?') || 
            lowerMessage.match(/\b(what|how|why|when|where|who|can you|could you|would you|will you)\b/)) {
            return true;
        }

        // Respond to greetings
        if (lowerMessage.match(/\b(hi|hello|hey|greetings|good morning|good afternoon)\b/)) {
            return true;
        }

        // Respond to mentions of AI/bot
        if (lowerMessage.match(/\b(bot|ai|chatbot|assistant|help)\b/)) {
            return true;
        }

        // Random chance to keep conversation lively (5% chance)
        if (Math.random() < 0.05) {
            return true;
        }

        return false;
    }
}

module.exports = AIService;