const express = require("express");
const { createRoom, getRoom, getUserRooms, deleteRoom } = require("../store/roomStore");
const checkAuth = require("../middleware/auth");

const router = express.Router();

// Get User's Rooms
router.get("/my", checkAuth, async (req, res) => {
  try {
    const rooms = await getUserRooms(req.user.uid);
    res.json(rooms);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server Error" });
  }
});

// Create Room
router.post("/", checkAuth, async (req, res) => {
  try {
    const room = await createRoom(req.body.title, req.user.uid);
    res.status(201).json(room);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server Error" });
  }
});

// Delete Room
router.delete("/:id", checkAuth, async (req, res) => {
  try {
    const room = await getRoom(req.params.id);
    if (!room) return res.status(404).json({ error: "Room not found" });

    // Verify Ownership
    if (room.ownerId !== req.user.uid) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await deleteRoom(req.params.id);
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server Error" });
  }
});

// Get Room (Public for now, to allow sharing)
router.get("/:id", async (req, res) => {
  try {
    const room = await getRoom(req.params.id);
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }
    res.json(room);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server Error" });
  }
});

module.exports = router;
