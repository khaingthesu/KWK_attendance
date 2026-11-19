import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAE03fhx_mpx6nEGQXV4VJsY3HutZ6CkEQ",
  authDomain: "kwkattendance.firebaseapp.com",
  projectId: "kwkattendance",
  storageBucket: "kwkattendance.firebasestorage.app",
  messagingSenderId: "471087221014",
  appId: "1:471087221014:web:c45602085f7ae2fb1b2837"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
