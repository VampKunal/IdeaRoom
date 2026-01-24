const { MongoClient } = require("mongodb");

const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017";
const DB_NAME = "idea_room";

let db = null;

async function connectDB() {
    if (db) return db;

    try {
        const client = new MongoClient(MONGO_URL);
        await client.connect();
        db = client.db(DB_NAME); // use same DB as snapshot-worker
        console.log("Connected to MongoDB (API Gateway)");
        return db;
    } catch (e) {
        console.error("MongoDB Connection Error:", e);
        throw e;
    }
}

function isDBReady() {
    return db !== null;
}

function getDB() {
    if (!db) {
        throw new Error("Database not initialized. Call connectDB first.");
    }
    return db;
}

module.exports = { connectDB, getDB, isDBReady };
