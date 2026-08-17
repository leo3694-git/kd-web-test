const firebaseConfig = { apiKey: "AIzaSyCgMFHB5cxKeH179s1Z_VFiewT3CR-AgCk", authDomain: "kd-test-182fe.firebaseapp.com", projectId: "kd-test-182fe", storageBucket: "kd-test-182fe.firebasestorage.app", messagingSenderId: "222481721550", appId: "1:222481721550:web:1ce47cf446ffc275c6889f" };
firebase.initializeApp(firebaseConfig);
window.kdFirebase = { auth: firebase.auth(), db: firebase.firestore(), storage: firebase.storage() };
