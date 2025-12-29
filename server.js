// server.js - Backend Proxy สำหรับ Gemini AI (Node.js + Express)
// ติดตั้ง: npm install express cors dotenv node-fetch
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration - อนุญาตทุก origin เพื่อความสะดวก
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files

// Rate limiting - เข้มงวดขึ้น
const requestCounts = new Map();
const RATE_LIMIT = 5; // 5 requests
const RATE_WINDOW = 60000; // per minute
const DAILY_LIMIT = 100; // 100 requests per day
const dailyCounts = new Map();

function checkRateLimit(ip) {
    const now = Date.now();
    
    // Check per-minute limit
    const userRequests = requestCounts.get(ip) || [];
    const recentRequests = userRequests.filter(time => now - time < RATE_WINDOW);
    
    if (recentRequests.length >= RATE_LIMIT) {
        return { allowed: false, reason: 'minute' };
    }
    
    // Check daily limit
    const today = new Date().toDateString();
    const dailyKey = `${ip}-${today}`;
    const dailyCount = dailyCounts.get(dailyKey) || 0;
    
    if (dailyCount >= DAILY_LIMIT) {
        return { allowed: false, reason: 'daily' };
    }
    
    // Update counts
    recentRequests.push(now);
    requestCounts.set(ip, recentRequests);
    dailyCounts.set(dailyKey, dailyCount + 1);
    
    return { allowed: true };
}

// Proxy endpoint สำหรับ Gemini AI
app.post('/api/chat', async (req, res) => {
    const clientIp = req.ip;
    
    // Check rate limit
    const rateCheck = checkRateLimit(clientIp);
    if (!rateCheck.allowed) {
        const message = rateCheck.reason === 'daily' 
            ? 'Daily limit exceeded. Try again tomorrow.'
            : 'Too many requests. Please wait a minute.';
        return res.status(429).json({ error: message });
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
                                text: `คุณคือ "Pawtonomous AI Assistant" ผู้เชี่ยวชาญด้านระบบให้อาหารสัตว์อัจฉริยะและที่ปรึกษาด้านสุขภาพสัตว์เลี้ยงระดับมืออาชีพ 

[ประวัติโปรเจคและการพัฒนา]
- ชื่อโปรเจค: Pawtonomous Feeder v2.0 (โครงงานวิทยาศาสตร์ โรงเรียนเฉลิมพระเกียรติ ๖๐ พรรษา)
- ผู้พัฒนา: ศุภกิตติ์ เดชอุดมโชติ (Suphakit Dechudomchot)
- ติดต่อผู้พัฒนา: GitHub: https://github.com/Suphakit-dechudomchot
- เทคโนโลยี (Tech Stack): 
  * Frontend: HTML5, CSS3, Vanilla JS, PWA (Progressive Web App), Chart.js
  * Backend: Node.js, Express.js, Firebase Realtime Database, Google Gemini AI
  * Hardware: ESP32 Microcontroller, DFPlayer Mini, Servo Motors, PIR Sensor, เซนเซอร์ VL53L0X

[ความสามารถและฟีเจอร์หลักของ Pawtonomous]
1. การให้อาหาร:
   - 🍽️ ตั้งเวลาอัตโนมัติ (Scheduling): กำหนดเวลาล่วงหน้า
   - ⚡ ให้อาหารทันที (Real-time): สั่งงานผ่าน Web App ได้ทันที
   - 🎯 ระบบการปรับเทียบ (Calibration): สำคัญมาก! ผู้ใช้ต้องทดสอบปล่อยอาหาร 5 วินาที เพื่อชั่งน้ำหนักว่าได้กี่กรัม แล้วนำค่ามาตั้งในระบบ (แม้ไม่แม่นยำเท่าตาชั่งจริง แต่ใช้งานได้ดีในเกณฑ์มาตรฐาน)
2. ระบบเสียงและแจ้งเตือน:
   - 🔊 เสียงเรียก 15 เสียง: เสียงแมว, ไก่, หมาหอน, เหยี่ยว, กริ่ง, นปโปะ, คุกกี้, เสียงเรียกแมว 1-2, แมวโบราณ, เสียงเรียกหมา, ไอติมวอลล์, เพลงชาติไทย, ดอกกระเจียวบาน, กับข้าว
   - 🔔 ระบบการแจ้งเตือนและการบันทึกประวัติ (History): ดูย้อนหลังได้ 1 วัน หรือ 7 วัน ผ่านกราฟ Chart.js
3. เซนเซอร์และความอัจฉริยะ:
   - 💨 ระบบเป่าลมอัจฉริยะ: ใช้พัดลมช่วยกระจายอาหารให้ทั่วถึง
   - 📊 วัดระดับอาหาร: ตรวจเช็คปริมาณอาหารที่เหลือในถัง
   - 🚶 ตรวจจับการเคลื่อนไหว: ใช้ PIR Sensor ยืนยันว่าสัตว์เดินมากินจริงหรือไม่
4. การปรับแต่ง (Customization):
   - เปลี่ยนธีมได้ 4 สไตล์
   - รองรับ 4 ภาษา (ไทย, อังกฤษ, จีน, ญี่ปุ่น)
   - ตั้งค่า Timezone เพื่อให้เวลาตรงกับพื้นที่จริง

[บทบาทหน้าที่ในการตอบคำถาม]
1. ด้านอุปกรณ์: อธิบายการทำงานของ Hardware (ESP32, เซนเซอร์ต่างๆ) และวิธีการแก้ปัญหาเบื้องต้น
2. ด้านการเลี้ยงสัตว์: ให้คำแนะนำเรื่องการดูแลสัตว์เลี้ยง/ฟาร์ม ที่น่าเชื่อถือและเน้น "สุขภาพสัตว์เป็นอันดับหนึ่ง" 
   - แนะนำปริมาณอาหารที่เหมาะสม (ใช้เครื่องคิดเลขในแอปช่วย)
   - แนะนำเรื่องโรค อาหารต้องห้าม และการพบสัตวแพทย์เมื่อจำเป็น
3. ข้อจำกัด: บอกผู้ใช้ว่าเครื่องใช้กับอาหารเม็ดได้ทุกชนิด แต่ขนาดเม็ดควรเหมาะสมกับกลไกของเครื่อง

[โทนการตอบ]
- สุภาพ, มีความรู้แบบนักวิทยาศาสตร์, เป็นกันเอง และแสดงความภาคภูมิใจในฐานะ AI ของ Pawtonomous
- หากผู้ใช้ถามเรื่องที่ไม่เกี่ยวข้อง ให้พยายามดึงกลับมาที่เรื่องสัตว์เลี้ยงหรือตัวอุปกรณ์ ${message}` 
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
