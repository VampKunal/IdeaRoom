const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const axios = require("axios");

const redisClient = require("./redis");
const { connectRabbit, publishEvent } = require("./rabbit");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

const PORT = 4000;

// connect infra once
connectRabbit();

/**
 * Socket.IO connection
 */
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // join room
  socket.on("join-room", async (roomId) => {
    try {
      // validate room via API Gateway
      await axios.get(`http://localhost:3000/room/${roomId}`);

      socket.join(roomId);

      // send redis state if exists
      const key = `room:${roomId}:state`;
      const state = await redisClient.get(key);

      if (state) {
        socket.emit("room-state", JSON.parse(state));
      }

      socket.to(roomId).emit("user-joined", {
        socketId: socket.id,
      });

      console.log(`Socket ${socket.id} joined room ${roomId}`);
    } catch {
      socket.emit("error", "Invalid room ID");
    }
  });

  // tool event
  socket.on("room-message", async ({ roomId, message }) => {
    const key = `room:${roomId}:state`;

    let state = await redisClient.get(key);
    state = state ? JSON.parse(state) : { objects: [] };

    const event = {
      roomId,
      type: "TEXT_ADDED",
      payload: {
        value: message,
        from: socket.id,
      },
      timestamp: Date.now(),
    };

    // update redis
    state.objects.push({
      id: event.timestamp,
      type: "TEXT",
      value: message,
      from: socket.id,
    });

    await redisClient.set(key, JSON.stringify(state));

    // publish durable event
    publishEvent(event);

    // broadcast
    io.to(roomId).emit("room-message", {
      from: socket.id,
      message,
    });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// health
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "collab-service" });
});

server.listen(PORT, () => {
  console.log(`Collaboration Service running on port ${PORT}`);
});
