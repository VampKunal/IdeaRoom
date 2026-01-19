const admin = require("firebase-admin");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Initialize Firebase Admin SDK
// 1. Try Service Account File
// 2. Try Environment Variables

try {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
        });
    } else {
        // Fallback to manual env vars
        const serviceAccount = {
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
        };

        if (serviceAccount.projectId) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
        } else {
            console.warn("No Firebase Credentials found. Auth verification may fail.");
        }
    }
} catch (e) {
    console.error("Firebase Admin Init Error:", e);
}

module.exports = admin;
