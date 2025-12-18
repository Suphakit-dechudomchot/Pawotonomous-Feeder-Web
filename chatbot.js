// AI Chatbot with Gemini API - ULTIMATE COMPATIBILITY VERSION
const GEMINI_API_KEY = 'AIzaSyDPF9kwm79EUma8Gy6xGtVwv5rQcajpV78'; 

class AIChatbot {
    constructor() {
        this.chatHistory = [];
        this.quickQuestions = [
            "🍽️ วิธีตั้งเวลาให้อาหาร",
            "📊 เช็คระดับอาหารยังไง",
            "📱 เชื่อมต่อ WiFi ยังไง",
            "💨 ทิศทางลมคืออะไร",
            "🎯 การปรับเทียบปริมาณอาหาร คืออะไร"
        ];
        this.init();
    }

    init() {
        this.createChatbotUI();
        this.attachEventListeners();
        this.addMessage(`สวัสดีครับ! 👋 ผมคือผู้ช่วย AI ของ Pawtonomous Feeder

ผมช่วยคุณได้เรื่อง:
🍽️ ตั้งเวลาให้อาหาร
🎯 การปรับเทียบปริมาณอาหาร
📊 เช็คระดับอาหาร
📱 ตั้งค่า WiFi

ลองคลิกคำถามด้านล่าง หรือพิมพ์ถามได้เลยครับ!`, 'bot');
        this.renderQuickQuestions();
        console.log("%c[Chatbot] Smart Connector Ready", "color: #4e73df; font-weight: bold;");
    }

    createChatbotUI() {
        if (document.getElementById('chatbotBubble')) return;
        const bubble = document.createElement('div');
        bubble.className = 'chatbot-bubble';
        bubble.id = 'chatbotBubble';
        bubble.innerHTML = '<i class="fa-solid fa-robot"></i>';
        document.body.appendChild(bubble);

        const window = document.createElement('div');
        window.className = 'chatbot-window';
        window.id = 'chatbotWindow';
        window.innerHTML = `
            <div class="chatbot-header"><h3><i class="fa-solid fa-robot"></i> ผู้ช่วย AI</h3><button id="chatbotClose">×</button></div>
            <div class="chatbot-messages" id="chatbotMessages"></div>
            <div class="quick-questions" id="quickQuestions"></div>
            <div class="chatbot-input-area">
                <input type="text" id="chatbotInput" placeholder="พิมพ์คำถาม...">
                <button id="chatbotSend"><i class="fa-solid fa-paper-plane"></i></button>
            </div>
        `;
        document.body.appendChild(window);
    }

    renderQuickQuestions() {
        const container = document.getElementById('quickQuestions');
        if (container) {
            container.innerHTML = this.quickQuestions.map(q => 
                `<button class="quick-question-btn" onclick="window.chatbot.sendMessage('${q}')">${q}</button>`
            ).join('');
        }
    }

    attachEventListeners() {
        document.getElementById('chatbotBubble').onclick = () => this.toggleChat();
        document.getElementById('chatbotClose').onclick = () => this.closeChat();
        document.getElementById('chatbotSend').onclick = () => this.sendMessage();
        document.getElementById('chatbotInput').onkeypress = (e) => { if (e.key === 'Enter') this.sendMessage(); };
    }

    toggleChat() {
        const window = document.getElementById('chatbotWindow');
        if (window.classList.contains('active')) {
            this.closeChat();
        } else {
            window.classList.add('active');
        }
    }

    closeChat() {
        const window = document.getElementById('chatbotWindow');
        window.classList.add('closing');
        setTimeout(() => {
            window.classList.remove('active', 'closing');
        }, 400);
    }

    async sendMessage(text = null) {
        const input = document.getElementById('chatbotInput');
        const msg = text || input.value.trim();
        if (!msg) return;

        this.addMessage(msg, 'user');
        input.value = '';
        this.showTyping();

        try {
            const response = await this.callAnyAvailableModel(msg);
            this.hideTyping();
            this.addMessage(response, 'bot');
        } catch (error) {
            this.hideTyping();
            console.error('[System Error]:', error);
            this.addMessage(`ขออภัยครับ: ${error.message}`, 'bot');
        }
    }

    // ฟังก์ชันค้นหารุ่นที่ใช้งานได้จริง
    async callAnyAvailableModel(userMessage) {
        try {
            // 1. ดึงรายชื่อ models ทั้งหมดที่ Key นี้เข้าถึงได้
            const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`;
            const listRes = await fetch(listUrl);
            const listData = await listRes.json();

            if (!listData.models || listData.models.length === 0) {
                throw new Error("ไม่พบรุ่น AI ที่เปิดให้ใช้งานใน API Key นี้");
            }

            // 2. กรองเฉพาะรุ่นที่รองรับการสร้างเนื้อหา (generateContent)
            const chatModels = listData.models.filter(m => 
                m.supportedGenerationMethods.includes('generateContent')
            );

            // 3. วนลูปสุ่มเรียกจนกว่าจะเจอตัวที่ "โควตายังไม่เต็ม"
            for (const model of chatModels) {
                try {
                    console.log(`[Chatbot] กำลังลองใช้: ${model.name}`);
                    const url = `https://generativelanguage.googleapis.com/v1beta/${model.name}:generateContent?key=${GEMINI_API_KEY}`;
                    
                    const response = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: `คุณคือผู้ช่วย AI ของ Pawtonomous Feeder - เครื่องให้อาหารสัตว์อัตโนมัติอัจฉริยะ

🎯 ความเชี่ยวชาญหลัก:
1. อธิบายฟีเจอร์เครื่อง Pawtonomous Feeder
2. แนะนำการเลี้ยงสัตว์เเละดูเเลสุภาพสำหรับสัตว์ : หมา แมว กระต่าย หนู นก ปลา
3. คำแนะนำฟาร์มและเกษตรกร (การเลี้ยงสัตว์เชิงพาณิชย์)

📱 ฟีเจอร์เครื่อง Pawtonomous:
- ตั้งเวลาให้อาหารอัตโนมัติ (แท็บ "มื้ออาหาร" กด +)
- ให้อาหารทันที (แท็บ "ควบคุม")
- ระบบเป่าลมอัจฉริยะ: ปรับความแรง 0-100%, ทิศทาง 60°-120°, โหมดสวิง
- เซ็นเซอร์วัดระดับอาหาร (VL53L0X)
- ตรวจจับการเคลื่อนไหวสัตว์ (PIR)
- เสียงเรียกสัตว์ 5 เสียง
- เว็บแอป PWA รองรับ 4 ภาษา (ไทย/อังกฤษ/จีน/ญี่ปุ่น)
- กราฟสถิติการให้อาหาร
- โปรแกรมคำนวณปริมาณอาหาร
- Calibrate ปริมาณอาหาร (แท็บ "ตั้งค่า")
- เชื่อมต่อ WiFi/Firebase (แท็บ "ตั้งค่า")

🐾 เหมาะสำหรับ:
- สัตว์เลี้ยงในบ้าน (หมา แมว กระต่าย หนู นก)
- ฟาร์มปลา (บ่อปลา)
- ฟาร์มสัตว์เชิงพาณิชย์
- เกษตรกรผู้เลี้ยงสัตว์

ตอบภาษาไทย กระชับ เป็นมิตร ใช้ emoji ให้คำแนะนำเชิงลึก

คำถาม: ${userMessage}` }] }]
                        })
                    });

                    const data = await response.json();

                    if (response.ok) {
                        console.log(`%c[Chatbot] สำเร็จผ่านรุ่น: ${model.name}`, "color: green; font-weight: bold;");
                        return data.candidates[0].content.parts[0].text;
                    } else if (response.status === 429) {
                        console.warn(`[Chatbot] ${model.name} ติดโควตา (429), กำลังลองรุ่นถัดไป...`);
                        continue; // ลองตัวถัดไป
                    }
                } catch (err) {
                    continue;
                }
            }
            throw new Error("ทุกรุ่นที่รองรับติดโควตาใช้งานเกินขีดจำกัด (429) กรุณารอ 1 นาทีแล้วลองใหม่");

        } catch (err) {
            throw err;
        }
    }

    addMessage(text, sender) {
        const container = document.getElementById('chatbotMessages');
        const div = document.createElement('div');
        div.className = `chat-message ${sender}`;
        
        // แปลงข้อความให้อ่านง่าย: ขึ้นบรรทัดใหม่ = <br>, เครื่องหมาย ** = <strong>
        let formattedText = text
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        div.innerHTML = `<div class="message-content">${formattedText}</div>`;
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }

    showTyping() {
        const div = document.createElement('div');
        div.id = 'typingIndicator';
        div.className = 'chat-message bot';
        div.innerHTML = '<div class="message-content"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>';
        document.getElementById('chatbotMessages').appendChild(div);
        const container = document.getElementById('chatbotMessages');
        container.scrollTop = container.scrollHeight;
    }

    hideTyping() {
        const typing = document.getElementById('typingIndicator');
        if (typing) typing.remove();
    }
}

window.chatbot = new AIChatbot();