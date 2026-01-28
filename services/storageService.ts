import { 
  collection, 
  getDocs, 
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

export const storageService = {
  getTasks: async (): Promise<Task[]> => {
    const q = query(collection(db, TASKS_COLLECTION), orderBy('timeBlock', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Task));
  },

  saveTask: async (task: Partial<Task>): Promise<Task | null> => {
    try {
      if (task.id) {
        const taskRef = doc(db, TASKS_COLLECTION, task.id);
        const { id, ...data } = task;
        await updateDoc(taskRef, data);
        return task as Task;
      } else {
        const docRef = await addDoc(collection(db, TASKS_COLLECTION), task);
        return { id: docRef.id, ...task } as Task;
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
      await addDoc(collection(db, WELCOME_COLLECTION), {
        ...wt,
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
      const batch = writeBatch(db);
      const snapshot = await getDocs(collection(db, WELCOME_COLLECTION));
      
      // Deactivate all
      snapshot.docs.forEach(d => {
        batch.update(d.ref, { isActive: false });
      });

      // Activate specific one if needed
      if (active && id) {
        const taskRef = doc(db, WELCOME_COLLECTION, id);
        batch.update(taskRef, { isActive: true });
      }

      await batch.commit();
      return true;
    } catch (error) {
      console.error("Error toggling welcome broadcast:", error);
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
