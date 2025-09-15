// 🔗 Importes correctos
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  update,
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";

// 🔐 Config del proyecto (agregamos databaseURL)
const firebaseConfig = {
  apiKey: "AIzaSyCPmTez7dmfv2p8EdVP6e8Ij7_GtSbvsBs",
  authDomain: "tiempofire.firebaseapp.com",
  projectId: "tiempofire",
  storageBucket: "tiempofire.firebasestorage.app",
  messagingSenderId: "783490592129",
  appId: "1:783490592129:web:6ec29a2b6b0691caffcc80",
  databaseURL: "https://tiempofire-default-rtdb.firebaseio.com", // ✅ IMPORTANTE
};

// 🚀 Inicializa Firebase + RTDB
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 📤 Exports que usa panel.js
export { db, ref, onValue, update };
