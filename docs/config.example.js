// config.example.js - คัดลอกไฟล์นี้เป็น config.js และใส่ API Keys ของคุณ
export const CONFIG = {
    firebase: {
        apiKey: "YOUR_FIREBASE_API_KEY",
        authDomain: "your-project.firebaseapp.com",
        databaseURL: "https://your-project.firebasedatabase.app",
        projectId: "your-project-id",
        storageBucket: "your-project.appspot.com",
        messagingSenderId: "YOUR_SENDER_ID",
        appId: "YOUR_APP_ID",
        measurementId: "YOUR_MEASUREMENT_ID"
    },
    supabase: {
        url: "YOUR_SUPABASE_URL",
        anonKey: "YOUR_SUPABASE_ANON_KEY"
    },
    gemini: {
        // ไม่แนะนำให้ใส่ API Key ตรงนี้ ควรใช้ Backend Proxy แทน
        useProxy: true,
        proxyUrl: "/api/chat" // URL ของ Backend Proxy
    }
};
