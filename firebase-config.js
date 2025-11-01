// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyD9myt189w1KWFrmNkNJPWBTSnTcQYD26A",
    authDomain: "personalexpenses-8763d.firebaseapp.com",
    projectId: "personalexpenses-8763d",
    storageBucket: "personalexpenses-8763d.firebasestorage.app",
    messagingSenderId: "394451487547",
    appId: "1:394451487547:web:6750a0d5dcd5f559f8051e"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();