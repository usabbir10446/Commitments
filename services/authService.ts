
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  User
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { UserRole, UserProfile } from '../types';

const auth = getAuth();
const googleProvider = new GoogleAuthProvider();

export const authService = {
  subscribeToAuth: (callback: (user: UserProfile | null) => void) => {
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          callback({ uid: user.uid, email: user.email!, ...userDoc.data() } as UserProfile);
        } else {
          callback(null);
        }
      } else {
        callback(null);
      }
    });
  },

  signUp: async (email: string, pass: string): Promise<void> => {
    const res = await createUserWithEmailAndPassword(auth, email, pass);
    // All new signups via frontend default to VIEWER
    // Admin must manually update the role in Firestore console
    await setDoc(doc(db, 'users', res.user.uid), {
      email,
      role: UserRole.VIEWER,
      createdAt: Date.now()
    });
  },

  signIn: async (email: string, pass: string): Promise<void> => {
    const res = await signInWithEmailAndPassword(auth, email, pass);
    const userDoc = await getDoc(doc(db, 'users', res.user.uid));
    if (!userDoc.exists()) {
      await signOut(auth);
      throw new Error("No acct found. You need to create a new acct sir.");
    }
  },

  signInWithGoogle: async (isSignUp: boolean): Promise<void> => {
    const res = await signInWithPopup(auth, googleProvider);
    const user = res.user;
    
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (!userDoc.exists()) {
      if (isSignUp) {
        await setDoc(doc(db, 'users', user.uid), {
          email: user.email,
          role: UserRole.VIEWER,
          createdAt: Date.now()
        });
      } else {
        await signOut(auth);
        throw new Error("No acct found. You need to create a new acct sir.");
      }
    }
  },

  logout: async (): Promise<void> => {
    await signOut(auth);
  }
};
