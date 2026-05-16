import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD7fPIh_SRVhBbeQFRHOqlVmxc-Hxa7j2k",
  authDomain: "educonect-app.firebaseapp.com",
  projectId: "educonect-app",
  storageBucket: "educonect-app.firebasestorage.app",
  messagingSenderId: "253408605548",
  appId: "1:253408605548:web:75707525790d984df363eb",
  measurementId: "G-55NBHLKBW1"
};

console.debug("[Firebase] Config loaded with key:", firebaseConfig.apiKey.substring(0, 5) + "...");

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
