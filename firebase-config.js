/* ==========================================================================
   FIREBASE CONFIGURATION FOR SARWESV ADMIN DASHBOARD
   ========================================================================== */

const firebaseConfig = {
  apiKey: "AIzaSyA8R7r5ntgpCDTEs2ir59C91KrNOCOh_YE",
  authDomain: "sarwesv-portfolio-app.firebaseapp.com",
  projectId: "sarwesv-portfolio-app",
  storageBucket: "sarwesv-portfolio-app.firebasestorage.app",
  messagingSenderId: "442158153809",
  appId: "1:442158153809:web:ea0a9f40fd8a917fce3870"
};

let auth = null;
let googleProvider = null;
let db = null;

if (typeof firebase !== 'undefined') {
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    auth = firebase.auth();
    googleProvider = new firebase.auth.GoogleAuthProvider();
    googleProvider.addScope('email');
    googleProvider.addScope('profile');
    db = firebase.firestore();
    console.log("🔥 Admin Firebase initialized for sarwesv-portfolio-app");
  } catch (e) {
    console.error("Firebase Init Error:", e.message);
  }
}
