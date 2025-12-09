// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// 1. IMPORT AUTH AND FIRESTORE FUNCTIONS
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA9uDBKlfQhXZkzINq3UfpiVnTit0Q_VOE",
  authDomain: "foodloop-8bc34.firebaseapp.com",
  projectId: "foodloop-8bc34",
  storageBucket: "foodloop-8bc34.firebasestorage.app",
  messagingSenderId: "722168122482",
  appId: "1:722168122482:web:1d89039386f7452cbc06eb",
  measurementId: "G-Y680HMPL27"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize optional services (like Analytics)
const analytics = getAnalytics(app);

// 2. INITIALIZE REQUIRED SERVICES
export const auth = getAuth(app);    // <--- EXPORTED AUTH
export const db = getFirestore(app); // <--- EXPORTED FIRESTORE

// If you need to export the app instance itself:
// export { app, analytics };
