const { getDB } = require("../db");

/* 
  Room Schema (MongoDB 'rooms' collection)
  {
    _id: "7-char-id",
    title: "My Room",
    ownerId: "firebase-uid",
    createdAt: ISODate,
    lastActiveAt: ISODate
  }
*/

async function createRoom(title, ownerId) {
  const db = getDB();
  const rooms = db.collection("rooms");

  const roomId = Math.random().toString(36).substring(2, 9);

  const room = {
    _id: roomId,
    title: title || "Untitled Room",
    ownerId: ownerId,
    createdAt: new Date(),
    lastActiveAt: new Date()
  };

  await rooms.insertOne(room);

  // Return format expected by frontend
  return { ...room, roomId: room._id };
}

async function getRoom(roomId) {
  const db = getDB();
  const room = await db.collection("rooms").findOne({ _id: roomId });
  if (!room) return null;
  return { ...room, roomId: room._id };
}

async function getUserRooms(userId) {
  const db = getDB();
  const cursor = db.collection("rooms").find({ ownerId: userId }).sort({ lastActiveAt: -1 });
  const results = await cursor.toArray();
  return results.map(r => ({ ...r, roomId: r._id }));
}

async function deleteRoom(roomId) {
  const db = getDB();
  await db.collection("rooms").deleteOne({ _id: roomId });
  // Optionally delete snapshots too?
  // await db.collection("room_snapshots").deleteMany({ roomId });
  return true;
}

module.exports = {
  createRoom,
  getRoom,
  getUserRooms,
  deleteRoom
};
