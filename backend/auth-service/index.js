require("dotenv").config({ path: "../.env" }); // Load from parent .env
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

const PORT = 8003;
app.listen(PORT, () => console.log(`Auth Service running on port ${PORT}`));
