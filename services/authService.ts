
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
   * To prevent race conditions where the Firestore document isn't created yet (e.g., during signup),
   * this listener provides an optimistic profile if the user is authenticated.
   */
  subscribeToAuth: (callback: (user: UserProfile | null) => void) => {
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        // 1. Immediately provide an optimistic profile to let the user into the app.
        // This solves the issue of being stuck on the signup page.
        const optimisticProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          role: UserRole.VIEWER // Default role
        };
        callback(optimisticProfile);

        // 2. Fetch the actual profile from Firestore to get the correct role (Admin/Viewer).
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
          // Note: If no doc exists, the optimistic profile remains active.
          // The specific sign-in/sign-up methods handle the cleanup if an account is invalid.
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      } else {
        // User is logged out
        callback(null);
      }
    });
  },

  signUp: async (email: string, pass: string): Promise<void> => {
    // Creating the user in Auth triggers onAuthStateChanged
    const res = await createUserWithEmailAndPassword(auth, email, pass);
    
    // Immediately create the user document in Firestore.
    // The optimistic listener ensures the user is already "in" the app.
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
      // If no document exists for this authenticated user, they shouldn't be here.
      // Signing out will trigger the listener to clear the optimistic profile.
      await signOut(auth);
      throw new Error("No acct found. You need to create a new acct sir.");
    }
  },

  signInWithGoogle: async (isSignUp: boolean): Promise<void> => {
    const res = await signInWithPopup(auth, googleProvider);
    const user = res.user;
    
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      if (isSignUp) {
        // Create a new account for Google users who don't have one yet.
        await setDoc(userDocRef, {
          email: user.email,
          role: UserRole.VIEWER,
          createdAt: Date.now()
        });
      } else {
        // User tried to login with Google but has no registered account.
        await signOut(auth);
        throw new Error("No acct found. You need to create a new acct sir.");
      }
    }
  },

  logout: async (): Promise<void> => {
    await signOut(auth);
  }
};
