const admin = require("firebase-admin");
const path = require("path");

// Only load .env file in local development (not in Docker)
// In Docker, environment variables come from docker-compose.yml
if (process.env.NODE_ENV !== "production") {
  try {
    require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
  } catch (e) {
    // .env file not found, that's okay - use environment variables from system
  }
}

try {
    if (process.env.FIREBASE_PRIVATE_KEY) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            }),
        });
    } else {
        admin.initializeApp();
    }
    console.log("Firebase Admin Initialized for Collab Service");
} catch (e) {
    if (!admin.apps.length) {
        console.error("Firebase Admin Init Error:", e);
    }
}

module.exports = admin;
