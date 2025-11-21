import { InjectionToken, Provider } from '@angular/core';
import { FirebaseApp, initializeApp } from 'firebase/app';
import { Firestore, getFirestore } from 'firebase/firestore';
import { Auth, getAuth } from 'firebase/auth';
import { firebaseConfig, isFirebaseConfigValid } from './firebase.config';

export const FIREBASE_APP = new InjectionToken<FirebaseApp>('Firebase App');
export const FIRESTORE = new InjectionToken<Firestore>('Firestore');
export const FIREBASE_AUTH = new InjectionToken<Auth>('Firebase Auth');

export function provideFirebase(): Provider[] {
  if (!isFirebaseConfigValid()) {
    // If config is not valid, don't provide anything.
    // The app component will render an error message.
    return [];
  }

  return [
    {
      provide: FIREBASE_APP,
      useFactory: () => initializeApp(firebaseConfig),
    },
    {
      provide: FIRESTORE,
      useFactory: (app: FirebaseApp) => getFirestore(app),
      deps: [FIREBASE_APP],
    },
    {
      provide: FIREBASE_AUTH,
      useFactory: (app: FirebaseApp) => getAuth(app),
      deps: [FIREBASE_APP],
    },
  ];
}
