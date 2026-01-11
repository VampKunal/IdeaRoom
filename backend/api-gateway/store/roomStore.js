const rooms = {};

function createRoom(title) {
  const roomId = Math.random().toString(36).substring(2, 9);

  const room = {
    roomId,
    title: title || "Untitled Room",
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
  };

  rooms[roomId] = room;
  return room;
}

function getRoom(roomId) {
  return rooms[roomId];
}

module.exports = {
  createRoom,
  getRoom,
};
