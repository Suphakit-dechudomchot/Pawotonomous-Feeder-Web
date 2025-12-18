// server.js - Backend Proxy สำหรับ Gemini AI (Node.js + Express)
// ติดตั้ง: npm install express cors dotenv node-fetch
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files

// Rate limiting
const requestCounts = new Map();
const RATE_LIMIT = 10; // 10 requests
const RATE_WINDOW = 60000; // per minute

function checkRateLimit(ip) {
    const now = Date.now();
    const userRequests = requestCounts.get(ip) || [];
    const recentRequests = userRequests.filter(time => now - time < RATE_WINDOW);
    
    if (recentRequests.length >= RATE_LIMIT) {
        return false;
    }
    
    recentRequests.push(now);
    requestCounts.set(ip, recentRequests);
    return true;
}

// Proxy endpoint สำหรับ Gemini AI
app.post('/api/chat', async (req, res) => {
    const clientIp = req.ip;
    
    // Check rate limit
    if (!checkRateLimit(clientIp)) {
        return res.status(429).json({ 
            error: 'Too many requests. Please try again later.' 
        });
    }
    
    try {
        const { message } = req.body;
        
        if (!message || message.trim().length === 0) {
            return res.status(400).json({ error: 'Message is required' });
        }
        
        // Input validation
        if (message.length > 2000) {
            return res.status(400).json({ error: 'Message too long' });
        }
        
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        
        if (!GEMINI_API_KEY) {
            throw new Error('Gemini API key not configured');
        }
        
        // Get available models
        const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`;
        const listRes = await fetch(listUrl);
        const listData = await listRes.json();
        
        if (!listData.models || listData.models.length === 0) {
            throw new Error('No AI models available');
        }
        
        const chatModels = listData.models.filter(m => 
            m.supportedGenerationMethods.includes('generateContent')
        );
        
        // Try models until one works
        for (const model of chatModels) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/${model.name}:generateContent?key=${GEMINI_API_KEY}`;
                
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ 
                            parts: [{ 
                                text: `คุณคือผู้ช่วย AI ของ Pawtonomous Feeder - เครื่องให้อาหารสัตว์อัตโนมัติอัจฉริยะ

🎯 ความเชี่ยวชาญหลัก:
1. อธิบายฟีเจอร์เครื่อง Pawtonomous Feeder
2. แนะนำการเลี้ยงสัตว์และดูแลสุขภาพสำหรับสัตว์: หมา แมว กระต่าย หนู นก ปลา
3. คำแนะนำฟาร์มและเกษตรกร (การเลี้ยงสัตว์เชิงพาณิชย์)

📱 ฟีเจอร์เครื่อง Pawtonomous:
- ตั้งเวลาให้อาหารอัตโนมัติ
- ให้อาหารทันที
- ระบบเป่าลมอัจฉริยะ
- เซ็นเซอร์วัดระดับอาหาร
- ตรวจจับการเคลื่อนไหวสัตว์
- เสียงเรียกสัตว์ 5 เสียง

ตอบภาษาไทย กระชับ เป็นมิตร ใช้ emoji

คำถาม: ${message}` 
                            }] 
                        }]
                    })
                });
                
                const data = await response.json();
                
                if (response.ok && data.candidates && data.candidates[0]) {
                    return res.json({ 
                        response: data.candidates[0].content.parts[0].text 
                    });
                } else if (response.status === 429) {
                    continue;
                }
            } catch (err) {
                continue;
            }
        }
        
        throw new Error('All AI models are currently unavailable');
        
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ 
            error: 'Failed to process request',
            message: error.message 
        });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🔒 Secure proxy enabled for Gemini AI`);
});
