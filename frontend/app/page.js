"use client";

import { useState } from "react";
import { createRoom, getRoom } from "./lib/api";


export default function Home() {
  const [title, setTitle] = useState("");
  const [roomId, setRoomId] = useState("");
  const [error, setError] = useState("");

  async function handleCreate() {
    try {
      const room = await createRoom(title);
      window.location.href = `/room/${room.roomId}`;
    } catch {
      setError("Failed to create room");
    }
  }

  async function handleJoin() {
    try {
      await getRoom(roomId);
      window.location.href = `/room/${roomId}`;
    } catch {
      setError("Room does not exist");
    }
  }

  return (
    <main style={{ padding: 40 }}>
      <h1>IdeaRoom</h1>

      <div style={{ marginTop: 20 }}>
        <h3>Create Room</h3>
        <input
          placeholder="Room title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button onClick={handleCreate}>Create</button>
      </div>

      <div style={{ marginTop: 20 }}>
        <h3>Join Room</h3>
        <input
          placeholder="Room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
        />
        <button onClick={handleJoin}>Join</button>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </main>
  );
}
