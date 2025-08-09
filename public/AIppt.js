// AIppt.js
import { initializeApp } from "firebase/app";
import { getAiLogic } from "firebase/ai";

const firebaseConfig = {
  apiKey: "AIzaSyCndfcWksvEBhzJDiQmJj_zSRI6FSVNUC0",
  authDomain: "flipcards-7adab.firebaseapp.com",
  databaseURL: "https://flipcards-7adab-default-rtdb.firebaseio.com",
  projectId: "flipcards-7adab",
  storageBucket: "flipcards-7adab.firebasestorage.app",
  messagingSenderId: "836765717736",
  appId: "1:836765717736:web:ff749a40245798307b655d",
  measurementId: "G-M26MWQZBJ0"
};

const app = initializeApp(firebaseConfig);
const aiLogic = getAiLogic(app);

export default aiLogic;
