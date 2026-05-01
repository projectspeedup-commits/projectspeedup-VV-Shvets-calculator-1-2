import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, doc, getDocFromServer } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

const databaseId = (firebaseConfig as any).firestoreDatabaseId;
let db: any;

try {
  // Try to initialize with long polling for better connectivity in restricted environments
  db = initializeFirestore(app, { 
    experimentalForceLongPolling: true,
    ignoreUndefinedProperties: true
  }, databaseId);
} catch (e: any) {
  // If initialization fails (e.g., already initialized), use getFirestore
  db = getFirestore(app, databaseId);
}

// CRITICAL: Validate Connection to Firestore on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'settings', 'prices'));
    console.log("Firebase connection established successfully.");
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client is offline.");
    } else {
      console.warn("Initial connection test found issues, checking settings document:", error);
    }
  }
}
testConnection();

const appId = firebaseConfig.projectId;

export { app, auth, db, appId };
