import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-app.js";

import {
  getAuth
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js";


const firebaseConfig = {
  apiKey: "AIzaSyA2X26MLDEMi0yCoaxCKWi0MlpxKSio22Y",
  authDomain: "template-2b3fb.firebaseapp.com",
  projectId: "template-2b3fb",
  storageBucket: "template-2b3fb.firebasestorage.app",
  messagingSenderId: "481556703606",
  appId: "1:481556703606:web:fa927d8cee9d4a6887b257",
  measurementId: "G-1KBG5QN6BM"
};


const app =
  initializeApp(
    firebaseConfig
  );

const auth =
  getAuth(
    app
  );


export {
  app,
  auth
};