import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from "firebase/analytics";

/**
 * Firebase project configuration for 'cmtbipsot'
 * These credentials allow the app to communicate with your Firebase project.
 */
const firebaseConfig = {
  apiKey: "AIzaSyB1Mw2_u_mM70b3WGvSNf4snrXbr0mdmn4",
  authDomain: "cmtbipsot.firebaseapp.com",
  projectId: "cmtbipsot",
  storageBucket: "cmtbipsot.firebasestorage.app",
  messagingSenderId: "820447383306",
  appId: "1:820447383306:web:96fc9fca5975c6695cf4f3",
  measurementId: "G-6W7TMY3N3D"
};

// Initialize the Firebase app instance
const app = initializeApp(firebaseConfig);

// Initialize Analytics for usage tracking (optional)
if (typeof window !== 'undefined') {
  getAnalytics(app);
}

/**
 * Export the Firestore database instance.
 * This is used by storageService.ts to perform CRUD operations on tasks, 
 * emergencies, and welcome templates.
 */
export const db = getFirestore(app);
