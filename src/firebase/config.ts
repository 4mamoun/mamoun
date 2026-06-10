import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDhnFu4W8HiepiyB5GAEH4I3LPEDqFyrDg",
  authDomain: "maani2026.firebaseapp.com",
  projectId: "maani2026",
  storageBucket: "maani2026.firebasestorage.app",
  messagingSenderId: "751724283569",
  appId: "1:751724283569:web:e5ee0cfbf37eb0bf5a4490",
  measurementId: "G-DY2GB56HVV"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;