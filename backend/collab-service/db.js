const { MongoClient } = require("mongodb");

const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017";
const DB_NAME = "idea_room";

let db = null;

async function connectDB() {
    if (db) return db;

    try {
        const client = new MongoClient(MONGO_URL);
        await client.connect();
        db = client.db(DB_NAME);
        console.log("Connected to MongoDB (Collab Service)");
        return db;
    } catch (e) {
        console.error("MongoDB Connection Error:", e);
        process.exit(1);
    }
}

function getDB() {
    if (!db) {
        throw new Error("Database not initialized. Call connectDB first.");
    }
    return db;
}

module.exports = { connectDB, getDB };
