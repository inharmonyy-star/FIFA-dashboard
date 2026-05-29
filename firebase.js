import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDXrqL5DdtFNpPTphcij-PP0fcQccU-_jA",
  authDomain: "fifa-dashboard-b3a3f.firebaseapp.com",
  projectId: "fifa-dashboard-b3a3f",
  storageBucket: "fifa-dashboard-b3a3f.appspot.com",
  messagingSenderId: "1069326385461",
  appId: "1:1069326385461:web:c6abbd0e3500c3fd584c7c"
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

export { db };
