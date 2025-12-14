// firebaseConfig.js
// Centralize Firebase & Supabase initialization and exports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import { getDatabase, ref, onValue, set, update, remove, push, query, orderByChild, limitToLast, limitToFirst, startAt, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-database.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAg-2VtD5q6Rw8JDKTiihp-ribH0HHvU-o",
  authDomain: "pawtonomous.firebaseapp.com",
  databaseURL: "https://pawtonomous-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "pawtonomous",
  storageBucket: "pawtonomous.appspot.com",
  messagingSenderId: "984959145190",
  appId: "1:984959145190:web:b050c1ed26962cdef4d727",
  measurementId: "G-1QQ3FLHD0M"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);
const auth = getAuth(firebaseApp);

// Supabase client - keep using global `supabase` provided by CDN
const supabaseClient = supabase.createClient(
    'https://gnkgamizqlosvhkuwzhc.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdua2dhbWl6cWxvc3Zoa3VwaDAiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc1MDQzNjcxNSwiZXhwIjoyMDY2MDEyNzE1fQ.Dq5oPJ2zV8UUyoNakh4JKzDary8MIGZLDN5BppF_pgc'
);

export { db, auth, ref, onValue, set, update, remove, push, query, orderByChild, limitToLast, limitToFirst, startAt, serverTimestamp, supabaseClient, signInAnonymously, onAuthStateChanged, signOut };
