const amqp = require("amqplib");
const { MongoClient } = require("mongodb");

// Railway: use AMQP_URL or RABBITMQ_URL (amqp:// or amqps://)
const RABBITMQ_URL = process.env.RABBITMQ_URL || process.env.AMQP_URL || "amqp://localhost";
const QUEUE = "room-events";
const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017";
const DB_NAME = "idea_room";

let eventBuffer = {};
const SNAPSHOT_INTERVAL = 5; // events per room

setInterval(() => {
  console.log("Snapshot worker alive");
}, 30000);

async function start() {
  // MongoDB
  const mongoClient = new MongoClient(MONGO_URL);
  await mongoClient.connect();
  const db = mongoClient.db(DB_NAME);
  const snapshots = db.collection("room_snapshots");

  console.log("Connected to MongoDB");

  // RabbitMQ
  const connection = await amqp.connect(RABBITMQ_URL);
  const channel = await connection.createChannel();
  await channel.assertQueue(QUEUE, { durable: true });

  console.log("Connected to RabbitMQ, waiting for events...");

  channel.consume(QUEUE, async (msg) => {
    const event = JSON.parse(msg.content.toString());
    const roomId = event.roomId;

    if (!eventBuffer[roomId]) {
      eventBuffer[roomId] = [];
    }

    eventBuffer[roomId].push(event);

    // create snapshot every N events
    if (eventBuffer[roomId].length >= SNAPSHOT_INTERVAL) {
      await snapshots.insertOne({
        roomId,
        events: eventBuffer[roomId],
        createdAt: new Date(),
      });

      console.log(`Snapshot saved for room ${roomId}`);

      eventBuffer[roomId] = [];
    }

    channel.ack(msg);
  });
}

start().catch(console.error);
