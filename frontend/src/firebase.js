import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBPAWgNVKBLI2tIaQ5q6KxpK5Eb1YJiMoc",
  authDomain: "saathi-ai-4b9db.firebaseapp.com",
  projectId: "saathi-ai-4b9db",
  storageBucket: "saathi-ai-4b9db.firebasestorage.app",
  messagingSenderId: "1008035082780",
  appId: "1:1008035082780:web:e659b2f8428920e2dc65d9",
  measurementId: "G-YTT2RZ6T0B",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
