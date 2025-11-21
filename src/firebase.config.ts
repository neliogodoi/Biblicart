// IMPORTANT: Replace these placeholder values with your own Firebase project configuration.
// You can find this in your Firebase Console:
// Project Settings (gear icon) > General > Your apps > Web app > SDK setup and configuration
export const firebaseConfig = {
  apiKey: "AIzaSyBYgJfWm5q7l42npl-kJ43kIPyCMJk9OSc",
  authDomain: "draw-holy.firebaseapp.com",
  projectId: "draw-holy",
  storageBucket: "draw-holy.appspot.com",
  messagingSenderId: "850533286648",
  appId: "1:850533286648:web:fb07df0d6b759a2707710d",
  measurementId: "G-Z4DQ2N8YV2"
};

/**
 * Checks if the Firebase configuration has been filled out.
 * @returns {boolean} True if the config is valid, false otherwise.
 */
export function isFirebaseConfigValid(): boolean {
  return (
    firebaseConfig.apiKey &&
    firebaseConfig.apiKey !== 'YOUR_API_KEY' &&
    firebaseConfig.projectId &&
    firebaseConfig.projectId !== 'YOUR_PROJECT_ID'
  );
}