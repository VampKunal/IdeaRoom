const amqp = require("amqplib");

let channel;

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";

async function connectRabbit() {
  const connection = await amqp.connect(RABBITMQ_URL);
  channel = await connection.createChannel();
  await channel.assertQueue("room-events", { durable: true });
  console.log("RabbitMQ connected");
}

function publishEvent(event) {
  if (!channel) {
    console.error("RabbitMQ channel not initialized");
    return;
  }
  channel.sendToQueue(
    "room-events",
    Buffer.from(JSON.stringify(event)),
    { persistent: true }
  );
}

module.exports = { connectRabbit, publishEvent };
