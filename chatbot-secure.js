// AI Chatbot with Secure Backend Proxy
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
        this.apiUrl = '/api/chat'; // Backend proxy URL
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
        console.log("%c[Chatbot] Secure Mode Ready", "color: #4e73df; font-weight: bold;");
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
            const response = await this.callSecureAPI(msg);
            this.hideTyping();
            this.addMessage(response, 'bot');
        } catch (error) {
            this.hideTyping();
            console.error('[System Error]:', error);
            this.addMessage(`ขออภัยครับ: ${error.message}`, 'bot');
        }
    }

    async callSecureAPI(message) {
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message })
            });

            if (!response.ok) {
                if (response.status === 429) {
                    throw new Error('ส่งคำขอบ่อยเกินไป กรุณารอสักครู่');
                }
                throw new Error('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
            }

            const data = await response.json();
            return data.response;
        } catch (error) {
            throw error;
        }
    }

    addMessage(text, sender) {
        const container = document.getElementById('chatbotMessages');
        const div = document.createElement('div');
        div.className = `chat-message ${sender}`;
        
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
