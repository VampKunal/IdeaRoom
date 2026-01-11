const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // later we will restrict this
  },
});

const PORT = 4000;

/**
 * Socket.IO connection
 */
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Join a room
  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room ${roomId}`);

    socket.to(roomId).emit("user-joined", {
      socketId: socket.id,
    });
  });

  // Simple test message
  socket.on("room-message", ({ roomId, message }) => {
    io.to(roomId).emit("room-message", {
      from: socket.id,
      message,
    });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "collab-service",
  });
}); 

server.listen(PORT, () => {
  console.log(`Collaboration Service running on port ${PORT}`);
});
