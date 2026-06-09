import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAYWIMII_-jbJD79M4-F9ysFk0sG6du4nA",
  authDomain: "mamoun-05-2026.firebaseapp.com",
  projectId: "mamoun-05-2026",
  storageBucket: "mamoun-05-2026.firebasestorage.app",
  messagingSenderId: "700470612240",
  appId: "1:700470612240:web:0b6197d4b002f94f6c5595",
  measurementId: "G-9PP66FFJJZ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;