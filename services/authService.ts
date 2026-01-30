
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
  /**
   * Listens to authentication state changes.
   */
  subscribeToAuth: (callback: (user: UserProfile | null) => void) => {
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        // 1. Immediately provide an optimistic profile
        const optimisticProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          role: UserRole.VIEWER // Default role until fetched
        };
        callback(optimisticProfile);

        // 2. Fetch the actual profile from Firestore
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const data = userDoc.data();
            callback({
              uid: user.uid,
              email: user.email || data.email || '',
              role: data.role as UserRole,
              ...data
            } as UserProfile);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      } else {
        callback(null);
      }
    });
  },

  signUp: async (email: string, pass: string, role: UserRole = UserRole.VIEWER): Promise<void> => {
    const res = await createUserWithEmailAndPassword(auth, email, pass);
    await setDoc(doc(db, 'users', res.user.uid), {
      email,
      role: role,
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

  signInWithGoogle: async (isSignUp: boolean, requestedRole: UserRole = UserRole.VIEWER): Promise<void> => {
    const res = await signInWithPopup(auth, googleProvider);
    const user = res.user;
    
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      if (isSignUp) {
        await setDoc(userDocRef, {
          email: user.email,
          role: requestedRole,
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
