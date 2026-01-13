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

  /* ---------------- JOIN ROOM ---------------- */
  socket.on("join-room", async (roomId) => {
    try {
      // validate room via API Gateway
      await axios.get(`http://localhost:3000/room/${roomId}`);

      socket.join(roomId);

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
  /* ---------------- REQUEST-ROOM-STATE---------------- */
  socket.on("request-room-state", async (roomId) => {
  const key = `room:${roomId}:state`;
  const state = await redisClient.get(key);

  if (state) {
    socket.emit("room-state", JSON.parse(state));
  }
  });

  /* ---------------- OBJECT CREATE ---------------- */
  socket.on("object-create", async ({ roomId, object }) => {
    const key = `room:${roomId}:state`;

    let state = await redisClient.get(key);
    state = state ? JSON.parse(state) : { objects: [] };

    // ✅ backend is the authority for timestamps
    const enrichedObject = {
      ...object,
      createdAt: Date.now(),
    };

    state.objects.push(enrichedObject);
    await redisClient.set(key, JSON.stringify(state));

    publishEvent({
      roomId,
      type: "OBJECT_CREATED",
      payload: enrichedObject,
      timestamp: Date.now(),
    });

    io.to(roomId).emit("object-created", enrichedObject);
  });

  /* ---------------- OBJECT UPDATE (TEXT EDIT) ---------------- */
  socket.on("object-update", async ({ roomId, object }) => {
    const key = `room:${roomId}:state`;

    let state = await redisClient.get(key);
    state = state ? JSON.parse(state) : { objects: [] };

    const updatedObject = {
      ...object,
      updatedAt: Date.now(),
    };

    state.objects = state.objects.map((o) =>
      o.id === updatedObject.id ? updatedObject : o
    );

    await redisClient.set(key, JSON.stringify(state));

    publishEvent({
      roomId,
      type: "OBJECT_UPDATED",
      payload: updatedObject,
      timestamp: Date.now(),
    });

    socket.to(roomId).emit("object-updated", updatedObject);
  });

  /* ---------------- OBJECT MOVE ---------------- */
  socket.on("object-move", async ({ roomId, object }) => {
    const key = `room:${roomId}:state`;

    let state = await redisClient.get(key);
    state = state ? JSON.parse(state) : { objects: [] };

    const movedObject = {
      ...object,
      updatedAt: Date.now(),
    };

    state.objects = state.objects.map((o) =>
      o.id === movedObject.id ? movedObject : o
    );

    await redisClient.set(key, JSON.stringify(state));

    publishEvent({
      roomId,
      type: "OBJECT_MOVED",
      payload: movedObject,
      timestamp: Date.now(),
    });

    socket.to(roomId).emit("object-moved", movedObject);
  });
  /* ---------------- OBJECT-MOVE ---------------- */
socket.on("objects-move", async ({ roomId, ids, delta }) => {
  const key = `room:${roomId}:state`;

  let state = await redisClient.get(key);
  state = state ? JSON.parse(state) : { objects: [] };

  state.objects = state.objects.map((o) => {
    if (ids.includes(o.id)) {
      return {
        ...o,
        x: o.x + delta.dx,
        y: o.y + delta.dy,
        updatedAt: Date.now(),
      };
    }
    return o;
  });

  await redisClient.set(key, JSON.stringify(state));

  publishEvent({
    roomId,
    type: "OBJECTS_MOVED",
    payload: { ids, delta },
    timestamp: Date.now(),
  });

  socket.to(roomId).emit("objects-moved", {
  ids,
  delta,
  source: socket.id,
});

});



  /* ---------------- DISCONNECT ---------------- */
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

/* ---------------- HEALTH ---------------- */
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "collab-service" });
});

server.listen(PORT, () => {
  console.log(`Collaboration Service running on port ${PORT}`);
});