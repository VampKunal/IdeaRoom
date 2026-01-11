const { io } = require("socket.io-client");

const ROOM_ID = "test-room-123";

const socket = io("http://localhost:4000");

socket.on("connect", () => {
  console.log("Connected with id:", socket.id);

  socket.emit("join-room", ROOM_ID);

  setTimeout(() => {
    socket.emit("room-message", {
      roomId: ROOM_ID,
      message: "Hello from client!",
    });
  }, 1000);
});

socket.on("room-message", (data) => {
  console.log("Received room message:", data);
});

socket.on("user-joined", (data) => {
  console.log("Another user joined:", data);
});
