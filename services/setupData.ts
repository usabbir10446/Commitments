import { collection, addDoc, getDocs, query, limit } from 'firebase/firestore';
import { db } from './firebase';
import { getTodayString, getTomorrowString } from '../utils/time';

/**
 * Initializes the Firestore database with sample data.
 * This effectively "creates" the collections by populating them with documents.
 */
export const initializeDatabase = async () => {
  try {
    const tasksRef = collection(db, 'tasks');
    const welcomeRef = collection(db, 'welcome_tasks');
    const emergencyRef = collection(db, 'emergencies');

    // Check if tasks already exist to avoid duplicates
    const taskCheck = await getDocs(query(tasksRef, limit(1)));
    if (!taskCheck.empty) return { success: true, message: "Database already initialized." };

    // 1. Seed Sample Tasks
    const sampleTasks = [
      {
        title: "Morning Strategy Meeting",
        venue: "Main Conference Hall",
        timeBlock: "0900-1000 hrs",
        date: getTodayString(),
        remarks: "Discuss Q4 objectives",
        attended: "Management Team"
      },
      {
        title: "Client Project Review",
        venue: "Virtual - Zoom",
        timeBlock: "1130-1300 hrs",
        date: getTodayString(),
        remarks: "Reviewing final UI mockups",
        attended: "Design Squad"
      },
      {
        title: "Team Lunch",
        venue: "Cafeteria",
        timeBlock: "1300-1400 hrs",
        date: getTodayString(),
        remarks: "Relax and recharge"
      }
    ];

    for (const task of sampleTasks) {
      await addDoc(tasksRef, task);
    }

    // 2. Seed Welcome Template
    await addDoc(welcomeRef, {
      topText: "WELCOME",
      bottomText1: "Distinguished Guests",
      bottomText2: "to the Annual Strategy Summit 2025",
      bottomText3: "PLENARY SESSION",
      imageData: "https://images.unsplash.com/photo-1540575861501-7ad060e39fe5?q=80&w=1000&auto=format&fit=crop", // placeholder
      isActive: false,
      createdAt: Date.now()
    });

    // 3. Seed Initial Emergency History
    await addDoc(emergencyRef, {
      text: "System is now online and syncing with Firebase Realtime Database.",
      createdAt: Date.now()
    });

    return { success: true, message: "Database seeded successfully!" };
  } catch (error) {
    console.error("Initialization error:", error);
    return { success: false, message: "Failed to initialize: " + error };
  }
};