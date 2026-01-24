// Only load .env file in local development (not in Docker)
// In Docker, environment variables come from docker-compose.yml
if (process.env.NODE_ENV !== "production") {
  const dotenv = require("dotenv");
  try {
    dotenv.config({ path: "../.env" });
  } catch (e) {
    // .env file not found, that's okay - use environment variables from system
  }
}

const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin
try {
    // If GOOGLE_APPLICATION_CREDENTIALS is set, it works automatically.
    // OR we can manually parse it if the user provided raw env vars.
    if (process.env.FIREBASE_PRIVATE_KEY) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                // Replace escaped newlines if present
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            }),
        });
    } else {
        admin.initializeApp();
    }
    console.log("Firebase Admin Initialized");
} catch (error) {
    console.error("Firebase Admin Init Error:", error);
}

// Health Check
app.get("/", (req, res) => res.send("Auth Service is running."));

// Verify Token Endpoint (Internal use or debugging)
app.post("/verify", async (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "No token provided" });

    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        return res.json({ uid: decodedToken.uid, email: decodedToken.email, user: decodedToken });
    } catch (error) {
        return res.status(401).json({ error: "Invalid token" });
    }
});

const PORT = process.env.PORT || 8003;
app.listen(PORT, "0.0.0.0", () => console.log(`Auth Service running on port ${PORT}`));
