
import { Injectable, signal, inject } from '@angular/core';
import { signInAnonymously, onAuthStateChanged, User, Auth } from 'firebase/auth';
import { FIREBASE_AUTH } from '../firebase.providers';

@Injectable({ providedIn: 'root' })
export class AuthService {
  user = signal<User | null>(null);
  private auth = inject(FIREBASE_AUTH);

  constructor() {
    if (this.auth) {
      onAuthStateChanged(this.auth, (user) => {
        this.user.set(user);
      });
    }
  }

  async signIn(): Promise<User> {
    if (this.user()) {
      return this.user()!;
    }
    
    if (!this.auth) {
      throw new Error("Auth service is not initialized.");
    }

    try {
      const userCredential = await signInAnonymously(this.auth);
      return userCredential.user;
    } catch (error) {
      console.error("Anonymous sign-in failed", error);
      // Re-throw the error to be caught by the calling component
      throw error;
    }
  }
}
