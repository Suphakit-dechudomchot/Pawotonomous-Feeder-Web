# 🐾 Pawtonomous Feeder Web Application

ระบบควบคุมเครื่องให้อาหารสัตว์เลี้ยงอัตโนมัติผ่านเว็บแอปพลิเคชัน

---

## 🚀 วิธีเปิดใช้งาน (2 แบบ)

### ⚡ แบบที่ 1: Live Server (แนะนำสำหรับ Development)

**ข้อดี:**
- ✅ เปิดได้ทันที ไม่ต้องติดตั้งอะไร
- ✅ Auto-reload เมื่อแก้ไขโค้ด
- ✅ ใช้งานง่าย

**ข้อเสีย:**
- ⚠️ API Key เปิดเผยใน Frontend (ไม่ปลอดภัยสำหรับ Production)

**วิธีใช้:**
1. เปิด VS Code
2. คลิกขวาที่ `index.html`
3. เลือก "Open with Live Server"
4. เว็บจะเปิดที่ `http://127.0.0.1:5500`

**ไฟล์ที่ใช้:** `chatbot.js` (ตั้งค่าอยู่แล้วใน index.html)

---

### 🔐 แบบที่ 2: Node.js Server (แนะนำสำหรับ Production)

**ข้อดี:**
- ✅ API Key ปลอดภัย ซ่อนใน Backend
- ✅ มี Rate Limiting (10 requests/นาที)
- ✅ Input Validation
- ✅ พร้อม Deploy

**ข้อเสีย:**
- ⚠️ ต้องติดตั้ง Node.js และ Dependencies
- ⚠️ ต้องรัน Server ก่อนใช้งาน

**วิธีใช้:**

1. **ติดตั้ง Dependencies**
```bash
npm install
```

2. **รัน Server**
```bash
npm start
```

3. **เปิดเว็บที่**
```
http://localhost:3000
```

4. **เปลี่ยนไฟล์ใน index.html**

เปิดไฟล์ `index.html` และเปลี่ยนบรรทัดสุดท้ายจาก:
```html
<script src="chatbot.js"></script>
```

เป็น:
```html
<script src="chatbot-secure.js"></script>
```

---

## 📊 เปรียบเทียบ

| ฟีเจอร์ | Live Server | Node.js Server |
|---------|-------------|----------------|
| ความเร็วในการเริ่มต้น | ⚡ ทันที | 🐢 ต้องรัน npm start |
| ความปลอดภัย | ⚠️ ต่ำ | ✅ สูง |
| Rate Limiting | ❌ ไม่มี | ✅ มี |
| Auto-reload | ✅ มี | ⚠️ ต้องใช้ nodemon |
| เหมาะสำหรับ | Development | Production |

---

## 🔧 การตั้งค่า

### Environment Variables

สร้างไฟล์ `.env` (สำหรับ Node.js Server):
```bash
cp .env.example .env
```

แก้ไขไฟล์ `.env` และใส่ API Keys ของคุณ

### Firebase Security Rules

อัปโหลด Security Rules จาก `firebase.rules.json`:
```bash
firebase deploy --only database
```

---

## 📁 โครงสร้างไฟล์

```
Pawotonomous-Feeder-Web/
├── index.html              # หน้าเว็บหลัก
├── style.css               # CSS หลัก
├── chatbot.css             # CSS สำหรับ chatbot
├── chatbot.js              # Chatbot แบบ Live Server (ใช้อยู่)
├── chatbot-secure.js       # Chatbot แบบ Node.js Server
├── server.js               # Backend Proxy Server
├── package.json            # Node.js dependencies
├── .env                    # Environment variables (ห้าม commit)
├── .env.example            # ตัวอย่าง env variables
├── firebase.rules.json     # Firebase Security Rules
├── js/                     # JavaScript modules
│   ├── firebaseConfig.js
│   ├── dashboard.js
│   ├── meals.js
│   └── ...
└── audio/                  # ไฟล์เสียงเรียกสัตว์
```

---

## 🛡️ ความปลอดภัย

### สำหรับ Development (Live Server)
- ใช้ได้ แต่ไม่ควร deploy ขึ้น internet
- API Key จะเห็นได้ใน browser console

### สำหรับ Production (Node.js Server)
- ✅ ใช้ Backend Proxy
- ✅ ซ่อน API Keys
- ✅ มี Rate Limiting
- ✅ Input Validation
- ✅ Firebase Security Rules

อ่านเพิ่มเติม: [SECURITY_GUIDE.md](SECURITY_GUIDE.md)

---

## 🚀 Deployment

### Vercel (แนะนำ)
```bash
vercel
```

### Firebase Hosting
```bash
firebase deploy
```

### Netlify
```bash
netlify deploy
```

**สำคัญ:** อย่าลืมตั้งค่า Environment Variables บน Hosting Platform

---

## 📱 ฟีเจอร์

- 🍽️ ตั้งเวลาให้อาหารอัตโนมัติ
- 🎯 Calibrate ปริมาณอาหาร
- 📊 เช็คระดับอาหาร
- 💨 ระบบเป่าลมอัจฉริยะ
- 🔊 เสียงเรียกสัตว์ 5 เสียง
- 📈 กราฟสถิติการให้อาหาร
- 🧮 โปรแกรมคำนวณปริมาณอาหาร
- 🤖 AI Chatbot ผู้ช่วย
- 🌍 รองรับ 4 ภาษา (ไทย/อังกฤษ/จีน/ญี่ปุ่น)
- 🎨 4 ธีมสี

---

## 💡 คำแนะนำ

### สำหรับการพัฒนา (Development)
👉 **ใช้ Live Server** - เปิดได้ทันที แก้โค้ดสะดวก

### สำหรับการใช้งานจริง (Production)
👉 **ใช้ Node.js Server** - ปลอดภัย มี Rate Limiting

### สำหรับ Demo/Presentation
👉 **ใช้ Live Server** - เปิดง่าย ไม่ต้องติดตั้งอะไร

---

## 🐛 Troubleshooting

### Live Server ไม่ทำงาน
- ติดตั้ง Extension "Live Server" ใน VS Code
- คลิกขวาที่ index.html → Open with Live Server

### Node.js Server ไม่ทำงาน
```bash
# ตรวจสอบว่าติดตั้ง Node.js แล้ว
node --version

# ติดตั้ง dependencies ใหม่
npm install

# รัน server
npm start
```

### Chatbot ไม่ตอบ
- ตรวจสอบ API Key ใน `.env` (Node.js) หรือ `chatbot.js` (Live Server)
- ตรวจสอบ Console ใน Browser (F12)
- ตรวจสอบ Gemini API Quota

---

## 📞 ติดต่อ

- 📧 Email: support@pawtonomous.com
- 🐛 Issues: [GitHub Issues](https://github.com/your-repo/issues)
- 👨‍💻 Developer: [ศุภกิตติ์ เดชอุดมโชติ](https://github.com/Suphakit-dechudomchot)

---

## 📝 License

โครงงานวิทยาศาสตร์ - โรงเรียนเฉลิมพระเกียรติ ๖๐ พรรษา

---

**สร้างด้วย ❤️ โดย Pawtonomous Team 🐾**
