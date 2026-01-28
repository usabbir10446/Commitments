import { 
  collection, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  where,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { Task, EmergencyMessage, WelcomeTask } from '../types';

const TASKS_COLLECTION = 'tasks';
const EMERGENCIES_COLLECTION = 'emergencies';
const WELCOME_COLLECTION = 'welcome_tasks';

// Helper to remove undefined properties from an object for Firestore compatibility
const cleanData = (data: any) => {
  const clean = { ...data };
  Object.keys(clean).forEach(key => {
    if (clean[key] === undefined) {
      delete clean[key];
    }
  });
  return clean;
};

export const storageService = {
  getTasks: async (): Promise<Task[]> => {
    const q = query(collection(db, TASKS_COLLECTION), orderBy('timeBlock', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Task));
  },

  saveTask: async (task: Partial<Task>): Promise<Task | null> => {
    try {
      const { id, ...data } = task;
      const filteredData = cleanData(data);

      if (id) {
        const taskRef = doc(db, TASKS_COLLECTION, id);
        await updateDoc(taskRef, filteredData);
        return { id, ...filteredData } as Task;
      } else {
        const docRef = await addDoc(collection(db, TASKS_COLLECTION), filteredData);
        return { id: docRef.id, ...filteredData } as Task;
      }
    } catch (error) {
      console.error("Error saving task:", error);
      return null;
    }
  },

  deleteTask: async (id: string): Promise<boolean> => {
    try {
      await deleteDoc(doc(db, TASKS_COLLECTION, id));
      return true;
    } catch (error) {
      console.error("Error deleting task:", error);
      return false;
    }
  },

  getWelcomeTasks: async (): Promise<WelcomeTask[]> => {
    const q = query(collection(db, WELCOME_COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as WelcomeTask));
  },

  saveWelcomeTask: async (wt: Partial<WelcomeTask>): Promise<boolean> => {
    try {
      const { id, ...data } = wt;
      const filteredData = cleanData(data);
      
      await addDoc(collection(db, WELCOME_COLLECTION), {
        ...filteredData,
        createdAt: Date.now(),
        isActive: false
      });
      return true;
    } catch (error) {
      console.error("Error saving welcome template:", error);
      return false;
    }
  },

  setWelcomeActive: async (id: string, active: boolean): Promise<boolean> => {
    try {
      // First, check if the specific document actually exists if we're trying to activate it
      if (active && id) {
        const docRef = doc(db, WELCOME_COLLECTION, id);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
          console.error(`Document with ID ${id} does not exist in ${WELCOME_COLLECTION}`);
          return false;
        }
      }

      const batch = writeBatch(db);
      const snapshot = await getDocs(collection(db, WELCOME_COLLECTION));
      
      // Deactivate all existing templates
      snapshot.docs.forEach(d => {
        batch.update(d.ref, { isActive: false });
      });

      // Activate specific one if valid ID was provided
      if (active && id) {
        const taskRef = doc(db, WELCOME_COLLECTION, id);
        batch.update(taskRef, { isActive: true });
      }

      await batch.commit();
      return true;
    } catch (error: any) {
      console.error("Error toggling welcome broadcast:", error.message);
      return false;
    }
  },

  deleteWelcomeTask: async (id: string): Promise<boolean> => {
    try {
      await deleteDoc(doc(db, WELCOME_COLLECTION, id));
      return true;
    } catch (error) {
      console.error("Error deleting welcome template:", error);
      return false;
    }
  },

  getEmergencies: async (): Promise<EmergencyMessage[]> => {
    const q = query(collection(db, EMERGENCIES_COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as EmergencyMessage));
  },

  broadcastEmergency: async (text: string): Promise<EmergencyMessage | null> => {
    try {
      const newMsg = {
        text,
        createdAt: Date.now()
      };
      const docRef = await addDoc(collection(db, EMERGENCIES_COLLECTION), newMsg);
      return { id: docRef.id, ...newMsg };
    } catch (error) {
      console.error("Error broadcasting emergency:", error);
      return null;
    }
  }
};
