import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyC9xF4UX5i-VTtjjDEGG0HBXyIYqMp4Dl4",
  authDomain: "radiolinea-app.firebaseapp.com",
  databaseURL: "https://radiolinea-app-default-rtdb.firebaseio.com",
  projectId: "radiolinea-app",
  storageBucket: "radiolinea-app.firebasestorage.app",
  messagingSenderId: "34355687130",
  appId: "1:34355687130:web:9e02f6e8bbdd9f20867fe3",
  measurementId: "G-TQ3XSTDYZ9",
};

const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
