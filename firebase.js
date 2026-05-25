// firebase.js - Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCfYgacACiBf4btifX2JKmHqq9gaVnbwrw",
  authDomain: "final-api-3afe9.firebaseapp.com",
  projectId: "final-api-3afe9",
  storageBucket: "final-api-3afe9.firebasestorage.app",
  messagingSenderId: "198613965121",
  appId: "1:198613965121:web:4ae485c3a428ce9c78e9c0",
  measurementId: "G-BJMHN22LHW"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();