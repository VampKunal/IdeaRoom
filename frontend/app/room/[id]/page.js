"use client";

import { useEffect, useState } from "react";
import { getRoom } from "../../lib/api";
import { connectSocket } from "../../lib/socket";

export default function RoomPage({ params }) {
  const [roomId, setRoomId] = useState(null);
  const [room, setRoom] = useState(null);
  const [objects, setObjects] = useState([]);

  const [draggingId, setDraggingId] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // unwrap params (Next.js App Router requirement)
  useEffect(() => {
    async function unwrap() {
      const resolved = await params;
      setRoomId(resolved.id);
    }
    unwrap();
  }, [params]);

  // load room info
  useEffect(() => {
    if (!roomId) return;

    async function load() {
      const data = await getRoom(roomId);
      setRoom(data);
    }

    load();
  }, [roomId]);

  // socket connection
  useEffect(() => {
    if (!roomId) return;

    const socket = connectSocket();

    socket.on("connect", () => {
      console.log("CONNECTED:", socket.id);
      socket.emit("join-room", roomId);
    });

    socket.on("room-state", (state) => {
      if (state?.objects) {
        setObjects(state.objects);
      }
    });

    socket.on("object-created", (obj) => {
      setObjects((prev) => [...prev, obj]);
    });

    socket.on("object-moved", (obj) => {
      setObjects((prev) =>
        prev.map((o) => (o.id === obj.id ? obj : o))
      );
    });

    return () => {
      socket.off("connect");
      socket.off("room-state");
      socket.off("object-created");
      socket.off("object-moved");
    };
  }, [roomId]);

  // drag logic
  function onMouseDown(e, obj) {
    setDraggingId(obj.id);
    setOffset({
      x: e.clientX - obj.x,
      y: e.clientY - obj.y,
    });
  }

  function onMouseMove(e) {
    if (!draggingId) return;

    setObjects((prev) =>
      prev.map((obj) =>
        obj.id === draggingId
          ? { ...obj, x: e.clientX - offset.x, y: e.clientY - offset.y }
          : obj
      )
    );
  }

  function onMouseUp() {
    if (!draggingId) return;

    const moved = objects.find((o) => o.id === draggingId);
    const socket = connectSocket();

    socket.emit("object-move", {
      roomId,
      object: moved,
    });

    setDraggingId(null);
  }

  // attach global mouse listeners
  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  });

  // add text block
  function addTextBlock() {
    const socket = connectSocket();

    const obj = {
      id: crypto.randomUUID(),
      type: "TEXT",
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 200,
      data: { text: "New Idea" },
      createdAt: Date.now(),
    };

    socket.emit("object-create", {
      roomId,
      object: obj,
    });
  }

  if (!room) return <p style={{ padding: 40 }}>Loading...</p>;

  return (
    <main style={{ padding: 20 }}>
      <h1>{room.title}</h1>

      <button onClick={addTextBlock}>➕ Add Text</button>

      <div
        style={{
          marginTop: 20,
          width: "100%",
          height: "70vh",
          border: "1px solid #ccc",
          position: "relative",
        }}
      >
        {objects.map((obj) => (
          <div
            key={obj.id}
            onMouseDown={(e) => onMouseDown(e, obj)}
            style={{
              position: "absolute",
              left: obj.x,
              top: obj.y,
              padding: 10,
              background: "#fff3bf",
              border: "1px solid #f59f00",
              borderRadius: 6,
              cursor: "grab",
              userSelect: "none",
            }}
          >
            {obj.data?.text || "Empty"}
          </div>
        ))}
      </div>
    </main>
  );
}
