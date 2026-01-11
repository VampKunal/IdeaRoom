const amqp = require("amqplib");

let channel;

async function connectRabbit() {
  const connection = await amqp.connect("amqp://localhost");
  channel = await connection.createChannel();
  await channel.assertQueue("room-events", { durable: true });
  console.log("RabbitMQ connected");
}

function publishEvent(event) {
  channel.sendToQueue(
    "room-events",
    Buffer.from(JSON.stringify(event)),
    { persistent: true }
  );
}

module.exports = { connectRabbit, publishEvent };
