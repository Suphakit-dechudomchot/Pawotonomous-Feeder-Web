# 🔐 คู่มือความปลอดภัย Pawtonomous Feeder

## 📋 สารบัญ
1. [การตั้งค่า Environment Variables](#1-การตั้งค่า-environment-variables)
2. [การใช้งาน Backend Proxy](#2-การใช้งาน-backend-proxy)
3. [Firebase Security Rules](#3-firebase-security-rules)
4. [Best Practices](#4-best-practices)

---

## 1. การตั้งค่า Environment Variables

### สร้างไฟล์ `.env`
```bash
# คัดลอกจาก .env.example
cp .env.example .env
```

### แก้ไขไฟล์ `.env` และใส่ API Keys ของคุณ
```env
GEMINI_API_KEY=AIzaSy...your_actual_key
FIREBASE_API_KEY=AIzaSy...your_actual_key
# ... ใส่ค่าอื่นๆ
```

### ⚠️ สำคัญ!
- **ห้าม** commit ไฟล์ `.env` ลง Git
- ตรวจสอบว่ามี `.env` ใน `.gitignore` แล้ว
- ใช้ `.env.example` เป็นตัวอย่างเท่านั้น

---

## 2. การใช้งาน Backend Proxy

### ติดตั้ง Dependencies
```bash
npm install
```

### รัน Server
```bash
# Development mode (auto-reload)
npm run dev

# Production mode
npm start
```

Server จะรันที่ `http://localhost:3000`

### เปลี่ยนจาก chatbot.js เป็น chatbot-secure.js

ใน `index.html` เปลี่ยนจาก:
```html
<script src="chatbot.js"></script>
```

เป็น:
```html
<script src="chatbot-secure.js"></script>
```

### ข้อดีของ Backend Proxy
✅ API Key ไม่ถูกเปิดเผยใน Frontend  
✅ มี Rate Limiting (10 requests/minute)  
✅ Input Validation  
✅ Error Handling ที่ดีขึ้น  
✅ ควบคุมการใช้งานได้ง่าย  

---

## 3. Firebase Security Rules

### อัปโหลด Security Rules ไปยัง Firebase

1. ติดตั้ง Firebase CLI
```bash
npm install -g firebase-tools
```

2. Login เข้า Firebase
```bash
firebase login
```

3. Initialize Firebase
```bash
firebase init database
```

4. Deploy Rules
```bash
firebase deploy --only database
```

### หรือคัดลอกจาก `firebase.rules.json` ไปวางใน Firebase Console

1. เปิด [Firebase Console](https://console.firebase.google.com)
2. เลือก Project ของคุณ
3. ไปที่ **Realtime Database** → **Rules**
4. คัดลอกเนื้อหาจาก `firebase.rules.json` ไปวาง
5. กด **Publish**

### สิ่งที่ Rules ป้องกัน
✅ ต้อง Login ก่อนถึงจะอ่าน/เขียนข้อมูลได้  
✅ User อ่านได้เฉพาะข้อมูลของตัวเอง  
✅ Validate ข้อมูลก่อนบันทึก (เช่น foodLevel 0-100)  
✅ ป้องกัน SQL Injection และ Data Tampering  

---

## 4. Best Practices

### ✅ ควรทำ

1. **ใช้ HTTPS เสมอ**
   - Deploy บน Vercel, Netlify, Firebase Hosting
   - ใช้ SSL Certificate

2. **ซ่อน API Keys**
   - ใช้ Environment Variables
   - ใช้ Backend Proxy สำหรับ Gemini AI
   - ไม่ hardcode API keys ใน code

3. **ใช้ Firebase Authentication**
   ```javascript
   import { signInAnonymously } from './js/firebaseConfig.js';
   await signInAnonymously(auth);
   ```

4. **Validate Input**
   - ตรวจสอบข้อมูลก่อนส่งไป Backend
   - จำกัดความยาวของข้อความ
   - Sanitize HTML

5. **Rate Limiting**
   - จำกัดจำนวน requests ต่อนาที
   - ป้องกัน DDoS และ Abuse

6. **Monitor Usage**
   - ตรวจสอบ Firebase Usage
   - ตรวจสอบ Gemini API Quota
   - ตั้ง Budget Alerts

### ❌ ไม่ควรทำ

1. ❌ เปิดเผย API Keys ใน Frontend Code
2. ❌ ปิด Firebase Security Rules (`".read": true`)
3. ❌ Commit `.env` หรือ `config.js` ลง Git
4. ❌ ใช้ API Keys แบบเดียวกันทุก Environment
5. ❌ ไม่มี Error Handling
6. ❌ ไม่ Validate User Input

---

## 🚀 Deployment

### Vercel (แนะนำ)
```bash
npm install -g vercel
vercel
```

ตั้งค่า Environment Variables ใน Vercel Dashboard:
- Settings → Environment Variables
- เพิ่ม `GEMINI_API_KEY`, `FIREBASE_API_KEY`, etc.

### Firebase Hosting
```bash
firebase deploy
```

### Netlify
```bash
npm install -g netlify-cli
netlify deploy
```

---

## 📞 ติดต่อ & Support

หากมีปัญหาหรือคำถาม:
- 📧 Email: support@pawtonomous.com
- 📱 Line: @pawtonomous
- 🐛 Issues: GitHub Issues

---

## 📝 Checklist ก่อน Deploy

- [ ] ตรวจสอบว่า `.env` อยู่ใน `.gitignore`
- [ ] ลบ API Keys ออกจาก Frontend Code
- [ ] Deploy Firebase Security Rules
- [ ] ทดสอบ Backend Proxy
- [ ] ตั้งค่า Environment Variables บน Hosting
- [ ] ทดสอบ Rate Limiting
- [ ] ตั้ง Budget Alerts
- [ ] Backup Database

---

**สร้างโดย Pawtonomous Team 🐾**  
*เวอร์ชัน 1.0 - มกราคม 2025*
