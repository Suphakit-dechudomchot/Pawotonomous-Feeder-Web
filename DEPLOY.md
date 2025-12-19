# 🚀 Deploy Guide - Pawtonomous Feeder

## ขั้นตอนการ Deploy บน Render

### 1. เตรียม GitHub Repository

```bash
# Initialize git (ถ้ายังไม่ได้ทำ)
git init
git add .
git commit -m "Initial commit"

# Push to GitHub
git remote add origin https://github.com/YOUR_USERNAME/pawtonomous-feeder.git
git branch -M main
git push -u origin main
```

### 2. สร้าง Web Service บน Render

1. ไปที่ https://render.com และ Sign Up/Login
2. คลิก **New +** → **Web Service**
3. เชื่อมต่อ GitHub repository ของคุณ
4. ตั้งค่าดังนี้:

```
Name: pawtonomous-feeder
Environment: Node
Region: Singapore (ใกล้ที่สุด)
Branch: main
Build Command: npm install
Start Command: node server.js
```

### 3. ตั้งค่า Environment Variables

ใน Render Dashboard → Environment:

```
GEMINI_API_KEY = YOUR_ACTUAL_GEMINI_API_KEY
PORT = 3000
```

### 4. อัปเดต CORS ใน server.js

แก้ไข `allowedOrigins` ใน `server.js`:

```javascript
const allowedOrigins = [
    'https://pawtonomous-feeder.onrender.com', // URL จริงของคุณ
    'http://localhost:3000'
];
```

### 5. Deploy!

- คลิก **Create Web Service**
- รอ 2-3 นาที
- เสร็จแล้ว! 🎉

## 🔒 ความปลอดภัย

✅ API Key ซ่อนใน Environment Variables
✅ Rate Limiting: 5 requests/minute, 100 requests/day
✅ CORS Protection
✅ Input Validation
✅ Error Handling

## 📱 การใช้งาน

เปิดเว็บที่: `https://your-app-name.onrender.com`

## 🔄 Auto-Deploy

Render จะ auto-deploy ทุกครั้งที่ push ไป GitHub!

```bash
git add .
git commit -m "Update features"
git push
```

## ⚠️ หมายเหตุ

- Free tier จะ sleep หลัง 15 นาทีไม่ใช้งาน
- ครั้งแรกที่เปิดจะช้า 30-60 วินาที
- ถ้าต้องการ 24/7 → อัปเกรด Paid Plan ($7/month)
