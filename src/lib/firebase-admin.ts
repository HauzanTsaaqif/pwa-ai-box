import admin from "firebase-admin";

const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const projectId = process.env.FIREBASE_PROJECT_ID;

if (!admin.apps.length) {
  if (privateKey && clientEmail && projectId) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  } else {
    admin.initializeApp();
  }
}

export const adminDb = admin.apps.length ? admin.firestore() : (null as any);
export const adminAuth = admin.apps.length ? admin.auth() : (null as any);
export default admin;
