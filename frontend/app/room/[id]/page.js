"use client";

import { useEffect, useState } from "react";
import { getRoom } from "../../lib/api";
import { connectSocket } from "../../lib/socket";

export default function RoomPage({ params }) {
  const [roomId, setRoomId] = useState(null);
  const [room, setRoom] = useState(null);
  const [objects, setObjects] = useState([]);

  // selection
  const [selectedIds, setSelectedIds] = useState([]);

  // edge creation
  const [edgeStart, setEdgeStart] = useState(null);

  // drag state
  const [draggingId, setDraggingId] = useState(null);
  const [dragOrigin, setDragOrigin] = useState(null);
  const [dragStartMouse, setDragStartMouse] = useState(null);
  const [dragDelta, setDragDelta] = useState({ dx: 0, dy: 0 });

  // resize state (RECTANGLES ONLY)
  const [resizingId, setResizingId] = useState(null);
  const [resizeStartMouse, setResizeStartMouse] = useState(null);
  const [resizeOrigin, setResizeOrigin] = useState(null);

  // text edit
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");

  /* ---------------- PARAMS ---------------- */
  useEffect(() => {
    async function unwrap() {
      const resolved = await params;
      setRoomId(resolved.id);
    }
    unwrap();
  }, [params]);

  /* ---------------- LOAD ROOM ---------------- */
  useEffect(() => {
    if (!roomId) return;
    getRoom(roomId).then(setRoom);
  }, [roomId]);

  /* ---------------- SOCKET ---------------- */
  useEffect(() => {
    if (!roomId) return;

    const socket = connectSocket();

    socket.on("connect", () => {
      socket.emit("join-room", roomId);
    });

    socket.on("room-state", (state) => {
      if (state?.objects) setObjects(state.objects);
    });

    socket.on("object-created", (obj) => {
      setObjects((prev) => [...prev, obj]);
    });

    socket.on("object-updated", (obj) => {
      setObjects((prev) =>
        prev.map((o) => (o.id === obj.id ? obj : o))
      );
    });

    socket.on("object-moved", (obj) => {
      setObjects((prev) =>
        prev.map((o) => (o.id === obj.id ? obj : o))
      );
    });

    socket.on("objects-moved", ({ ids, delta }) => {
      setObjects((prev) =>
        prev.map((o) =>
          ids.includes(o.id)
            ? { ...o, x: o.x + delta.dx, y: o.y + delta.dy }
            : o
        )
      );
    });

    return () => {
      socket.off("connect");
      socket.off("room-state");
      socket.off("object-created");
      socket.off("object-updated");
      socket.off("object-moved");
      socket.off("objects-moved");
    };
  }, [roomId]);

  /* ---------------- SELECTION ---------------- */
  function handleSelect(e, id) {
    e.stopPropagation();

    if (e.shiftKey) {
      setSelectedIds((prev) =>
        prev.includes(id)
          ? prev.filter((x) => x !== id)
          : [...prev, id]
      );
    } else {
      setSelectedIds([id]);
    }
  }

  /* ---------------- DRAG ---------------- */
  function onMouseDown(e, obj) {
    if (resizingId) return;

    handleSelect(e, obj.id);

    setDraggingId(obj.id);
    setDragStartMouse({ x: e.clientX, y: e.clientY });

    const ids = selectedIds.includes(obj.id)
      ? selectedIds
      : [obj.id];

    const origin = {};
    ids.forEach((id) => {
      const o = objects.find((x) => x.id === id);
      if (o) origin[id] = { x: o.x, y: o.y };
    });

    setDragOrigin(origin);
  }

  function onMouseMove(e) {
    if (!draggingId || !dragStartMouse || !dragOrigin) return;

    const dx = e.clientX - dragStartMouse.x;
    const dy = e.clientY - dragStartMouse.y;

    setDragDelta({ dx, dy });

    setObjects((prev) =>
      prev.map((o) =>
        dragOrigin[o.id]
          ? {
              ...o,
              x: dragOrigin[o.id].x + dx,
              y: dragOrigin[o.id].y + dy,
            }
          : o
      )
    );
  }

  function onMouseUp() {
    if (!draggingId || !dragOrigin) return;

    connectSocket().emit("objects-move", {
      roomId,
      ids: Object.keys(dragOrigin),
      delta: dragDelta,
    });

    setDraggingId(null);
    setDragOrigin(null);
    setDragStartMouse(null);
    setDragDelta({ dx: 0, dy: 0 });
  }

  /* ---------------- RESIZE (RECT ONLY) ---------------- */
  function onResizeMouseDown(e, obj) {
    e.stopPropagation();
    e.preventDefault();

    setResizingId(obj.id);
    setResizeStartMouse({ x: e.clientX, y: e.clientY });

    setResizeOrigin({
      width: obj.data.width,
      height: obj.data.height,
    });
  }

  function onResizeMouseMove(e) {
    if (!resizingId || !resizeStartMouse || !resizeOrigin) return;

    const dx = e.clientX - resizeStartMouse.x;
    const dy = e.clientY - resizeStartMouse.y;

    setObjects((prev) =>
      prev.map((o) =>
        o.id === resizingId
          ? {
              ...o,
              data: {
                ...o.data,
                width: Math.max(60, resizeOrigin.width + dx),
                height: Math.max(40, resizeOrigin.height + dy),
              },
            }
          : o
      )
    );
  }

  function onResizeMouseUp() {
    if (!resizingId) return;

    const obj = objects.find((o) => o.id === resizingId);
    if (obj) {
      connectSocket().emit("object-update", {
        roomId,
        object: obj,
      });
    }

    setResizingId(null);
    setResizeStartMouse(null);
    setResizeOrigin(null);
  }

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onResizeMouseMove);
    window.addEventListener("mouseup", onResizeMouseUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onResizeMouseMove);
      window.removeEventListener("mouseup", onResizeMouseUp);
    };
  });

  /* ---------------- TOOLS ---------------- */
  function addText() {
    connectSocket().emit("object-create", {
      roomId,
      object: {
        id: crypto.randomUUID(),
        type: "TEXT",
        x: 120,
        y: 120,
        data: { text: "New Idea" },
      },
    });
  }

  function addNode() {
    connectSocket().emit("object-create", {
      roomId,
      object: {
        id: crypto.randomUUID(),
        type: "NODE",
        x: 200,
        y: 200,
        data: { label: "New Node" },
      },
    });
  }

  function addShape(shape) {
    connectSocket().emit("object-create", {
      roomId,
      object: {
        id: crypto.randomUUID(),
        type: "SHAPE",
        x: 150,
        y: 150,
        data:
          shape === "rect"
            ? { shape: "rect", width: 140, height: 90, color: "#D0EBFF" }
            : { shape: "circle", radius: 50, color: "#FFD8A8" },
      },
    });
  }

  function createEdge(from, to) {
    connectSocket().emit("object-create", {
      roomId,
      object: {
        id: crypto.randomUUID(),
        type: "EDGE",
        data: { from, to },
      },
    });
  }

  function saveEdit(obj) {
    const updated = { ...obj, data: { text: editValue } };

    // optimistic update
    setObjects((prev) =>
      prev.map((o) => (o.id === updated.id ? updated : o))
    );

    connectSocket().emit("object-update", {
      roomId,
      object: updated,
    });

    setEditingId(null);
  }

  if (!room) return <p style={{ padding: 40 }}>Loading...</p>;

  const nodeMap = Object.fromEntries(
    objects.filter((o) => o.type === "NODE").map((n) => [n.id, n])
  );

  /* ---------------- UI ---------------- */
  return (
  <main style={{ padding: 20 }}>
    <h1>{room.title}</h1>

    <button onClick={addText}>➕ Text</button>
    <button onClick={() => addShape("rect")}>⬛ Rect</button>
    <button onClick={() => addShape("circle")}>⚪ Circle</button>
    <button onClick={addNode}>➕ Node</button>

    <div
      onMouseDown={() => setSelectedIds([])}
      style={{
        marginTop: 20,
        width: "100%",
        height: "70vh",
        border: "1px solid #ccc",
        position: "relative",
      }}
    >
      {/* EDGES */}
      <svg
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      >
        {objects
          .filter((o) => o.type === "EDGE")
          .map((edge) => {
            const from = nodeMap[edge.data.from];
            const to = nodeMap[edge.data.to];
            if (!from || !to) return null;

            return (
              <line
                key={edge.id}
                x1={from.x + (from.data.width || 120) / 2}
                y1={from.y + (from.data.height || 40) / 2}
                x2={to.x + (to.data.width || 120) / 2}
                y2={to.y + (to.data.height || 40) / 2}
                stroke="#495057"
                strokeWidth="2"
              />
            );
          })}
      </svg>

      {/* OBJECTS */}
      {objects.map((obj) => {
        const selected = selectedIds.includes(obj.id);

        /* ---------- TEXT ---------- */
        if (obj.type === "TEXT") {
          return (
            <div
              key={obj.id}
              onMouseDown={(e) => onMouseDown(e, obj)}
              onDoubleClick={() => {
                setEditingId(obj.id);
                setEditValue(obj.data.text);
              }}
              style={{
                position: "absolute",
                left: obj.x,
                top: obj.y,
                padding: 10,
                background: "#fff3bf",
                border: selected
                  ? "2px solid #1971c2"
                  : "1px solid #f59f00",
                borderRadius: 6,
                cursor: "grab",
              }}
            >
              {editingId === obj.id ? (
                <input
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => saveEdit(obj)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && saveEdit(obj)
                  }
                />
              ) : (
                obj.data.text
              )}
            </div>
          );
        }

        /* ---------- NODE (RESIZABLE) ---------- */
        if (obj.type === "NODE") {
  const width = obj.data.width || 120;
  const height = obj.data.height || 40;

  return (
    <div
      key={obj.id}
      onMouseDown={(e) => onMouseDown(e, obj)}
      onClick={(e) => {
        e.stopPropagation();
        if (!edgeStart) setEdgeStart(obj.id);
        else if (edgeStart !== obj.id) {
          createEdge(edgeStart, obj.id);
          setEdgeStart(null);
        }
      }}
      style={{
        position: "absolute",
        left: obj.x,
        top: obj.y,
        width,
        height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: selected ? "#d0ebff" : "#e7f5ff",
        border: selected
          ? "2px solid #1971c2"
          : "1px solid #228be6",
        borderRadius: 6,
        cursor: "grab",
        userSelect: "none",
      }}
    >
      {obj.data.label}

      {/* resize handle */}
      {selected && (
        <div
          onMouseDownCapture={(e) => onResizeMouseDown(e, obj)}
          style={{
            position: "absolute",
            right: -6,
            bottom: -6,
            width: 12,
            height: 12,
            background: "#1971c2",
            cursor: "nwse-resize",
          }}
        />
      )}
    </div>
  );
}


        /* ---------- SHAPES ---------- */
        if (obj.type === "SHAPE") {
          const isCircle = obj.data.shape === "circle";

          return (
            <div
              key={obj.id}
              onMouseDown={(e) => onMouseDown(e, obj)}
              style={{
                position: "absolute",
                left: obj.x,
                top: obj.y,
                width: isCircle
                  ? obj.data.radius * 2
                  : obj.data.width,
                height: isCircle
                  ? obj.data.radius * 2
                  : obj.data.height,
                background: obj.data.color,
                outline: selected
                  ? "2px solid #1971c2"
                  : "none",
                cursor: "grab",
              }}
            >
              {/* resize handle for rectangles only */}
              {!isCircle && selected && (
                <div
                  onMouseDown={(e) => onResizeMouseDown(e, obj)}
                  style={{
                    position: "absolute",
                    right: -6,
                    bottom: -6,
                    width: 12,
                    height: 12,
                    background: "#1971c2",
                    cursor: "nwse-resize",
                  }}
                />
              )}
            </div>
          );
        }

        return null;
      })}
    </div>
  </main>
);

}
