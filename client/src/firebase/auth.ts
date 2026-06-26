import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut,
    GoogleAuthProvider,
    updateProfile,
    type UserCredential,
} from 'firebase/auth';
import { auth } from './config';

const googleProvider = new GoogleAuthProvider();

export type AuthError = {
    code: string;
    message: string;
};

export async function signUpWithEmail(
    email: string,
    password: string,
    displayName: string
): Promise<UserCredential> {
    if (auth === undefined) {
        throw new Error('Firebase Auth is not initialised. Check your .env file.');
    }
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName });
    return credential;
}

export async function signInWithEmail(
    email: string,
    password: string
): Promise<UserCredential> {
    if (auth === undefined) {
        throw new Error('Firebase Auth is not initialised. Check your .env file.');
    }
    return signInWithEmailAndPassword(auth, email, password);
}

export async function signInWithGoogle(): Promise<UserCredential> {
    if (auth === undefined) {
        throw new Error('Firebase Auth is not initialised. Check your .env file.');
    }
    return signInWithPopup(auth, googleProvider);
}

export async function signOutUser(): Promise<void> {
    if (auth === undefined) {
        throw new Error('Firebase Auth is not initialised. Check your .env file.');
    }
    return signOut(auth);
}

export function getFirebaseErrorMessage(code: string): string {
    if (code === 'auth/email-already-in-use') {
        return 'An account with this email already exists.';
    }
    if (code === 'auth/invalid-email') {
        return 'Please enter a valid email address.';
    }
    if (code === 'auth/weak-password') {
        return 'Password must be at least 6 characters.';
    }
    if (code === 'auth/user-not-found') {
        return 'No account found with this email.';
    }
    if (code === 'auth/wrong-password') {
        return 'Incorrect password.';
    }
    if (code === 'auth/invalid-credential') {
        return 'Incorrect email or password.';
    }
    if (code === 'auth/too-many-requests') {
        return 'Too many failed attempts. Please try again later.';
    }
    if (code === 'auth/popup-closed-by-user') {
        return 'Google sign-in was cancelled.';
    }
    return 'Something went wrong. Please try again.';
}