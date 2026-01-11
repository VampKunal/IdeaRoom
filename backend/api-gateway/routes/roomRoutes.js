const express = require("express");
const { createRoom, getRoom } = require("../store/roomStore");

const router = express.Router();

router.post("/", (req, res) => {
  const room = createRoom(req.body.title);
  res.status(201).json(room);
});

router.get("/:id", (req, res) => {
  const room = getRoom(req.params.id);

  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }

  res.json(room);
});

module.exports = router;
