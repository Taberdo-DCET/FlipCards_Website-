// firebaseStorageInit.js
import {
  initializeApp,
  getApp,
  getApps
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";

import {
  getStorage
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js";

// Same config as your main firebaseInit.js
const firebaseConfig = {
  apiKey: "AIzaSyCndfcWksvEBhzJDiQmJj_zSRI6FSVNUC0",
  authDomain: "flipcards-7adab.firebaseapp.com",
  projectId: "flipcards-7adab",
  storageBucket: "flipcards-7adab.firebasestorage.app",
  messagingSenderId: "836765717736",
  appId: "1:836765717736:web:ff749a40245798307b655d"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const storage = getStorage(app);

export { storage };
