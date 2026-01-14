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
  // tool mode
  const [tool, setTool] = useState("select"); // "select" | "draw"
  // freehand drawing state
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentStroke, setCurrentStroke] = useState(null);


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

  // pan and zoom state
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

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
    socket.on("object-deleted", ({ objectId }) => {
  setObjects(prev => prev.filter(o => o.id !== objectId));
});


    socket.on("object-created", (obj) => {
  setObjects((prev) => {
    // ✅ prevent duplicates (critical)
    if (prev.some((o) => o.id === obj.id)) {
      return prev;
    }
    return [...prev, obj];
  });
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
      socket.off("object-deleted");
      
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
    if (resizingId || tool === "pan") return;

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

    // Account for zoom in drag calculations
    const dx = (e.clientX - dragStartMouse.x) / zoom;
    const dy = (e.clientY - dragStartMouse.y) / zoom;

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
  function getStrokeBBox(stroke) {
  if (!stroke || !stroke.points || stroke.points.length === 0) return { minX: 0, minY: 0, width: 0, height: 0, center: { x: 0, y: 0 } };

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  stroke.points.forEach(p => {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  });

  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);
  const center = { x: minX + width / 2, y: minY + height / 2 };
  return { minX, minY, width, height, center };
}

function onResizeMouseDown(e, obj) {
  e.stopPropagation();
  e.preventDefault();

  setResizingId(obj.id);
  setResizeStartMouse({ x: e.clientX, y: e.clientY });

  // 🔑 store correct origin depending on shape
  if (obj.type === "SHAPE" && obj.data.shape === "circle") {
    setResizeOrigin({ radius: obj.data.radius });
  } else if (obj.type === "STROKE") {
    // store points + bbox + center
    const bbox = getStrokeBBox(obj);
    setResizeOrigin({ bbox, points: obj.points, center: bbox.center });
  } else {
    setResizeOrigin({
      width: obj.data.width || 120,
      height: obj.data.height || 40,
    });
  }
}


  function onResizeMouseMove(e) {
  if (!resizingId || !resizeStartMouse || !resizeOrigin) return;

  // Account for zoom in resize calculations
  const dx = (e.clientX - resizeStartMouse.x) / zoom;
  const dy = (e.clientY - resizeStartMouse.y) / zoom;

  setObjects((prev) =>
    prev.map((o) => {
      if (o.id !== resizingId) return o;

          // 🔵 CIRCLE resize
      if (o.type === "SHAPE" && o.data.shape === "circle") {
        const newRadius = Math.max(
          20,
          resizeOrigin.radius + Math.max(dx, dy)
        );

        return {
          ...o,
          data: {
            ...o.data,
            radius: newRadius,
          },
        };
      }

      // ✏️ STROKE resize (scale about center)
      if (o.type === "STROKE") {
        const { bbox, points, center } = resizeOrigin;
        const maxDim = Math.max(bbox.width, bbox.height, 1);
        const scale = Math.max(0.1, 1 + Math.max(dx, dy) / maxDim);

        const newPoints = (points || []).map((p) => ({
          x: center.x + (p.x - center.x) * scale,
          y: center.y + (p.y - center.y) * scale,
        }));

        return {
          ...o,
          points: newPoints,
        };
      }

      // ⬛ RECT / NODE resize
      return {
        ...o,
        data: {
          ...o.data,
          width: Math.max(60, resizeOrigin.width + dx),
          height: Math.max(40, resizeOrigin.height + dy),
        },
      };
    })
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
      data: {
        text: "New Idea",
        width: 120,
        height: 40,
      },
    },
  });
}
  function selectStrokeAtPoint(x, y) {
  // Apply inverse transform for pan/zoom
  const worldX = (x - pan.x) / zoom;
  const worldY = (y - pan.y) / zoom;
  const hit = objects.find(
    o => o.type === "STROKE" && isPointNearStroke({ x: worldX, y: worldY }, o)
  );

  if (hit) setSelectedIds([hit.id]);
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
  function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

  function onDrawMouseDown(e) {
  if (tool !== "draw") return;

  e.preventDefault();

  const rect = e.currentTarget.getBoundingClientRect();
  // Apply inverse transform for pan/zoom
  const x = (e.clientX - rect.left - pan.x) / zoom;
  const y = (e.clientY - rect.top - pan.y) / zoom;

  setIsDrawing(true);
  setCurrentStroke({
    id: crypto.randomUUID(),
    type: "STROKE",
    points: [{ x, y }],
    color: "#ffffff",
    width: 2,
  });
}

function onDrawMouseMove(e) {
  if (!isDrawing || tool !== "draw") return;

  const rect = e.currentTarget.getBoundingClientRect();
  // Apply inverse transform for pan/zoom
  const x = (e.clientX - rect.left - pan.x) / zoom;
  const y = (e.clientY - rect.top - pan.y) / zoom;

  setCurrentStroke((prev) => {
    if (!prev) return prev;

    const lastPoint = prev.points[prev.points.length - 1];
    const nextPoint = { x, y };

    // ✅ POINT THINNING
    if (distance(lastPoint, nextPoint) < 6) {
      return prev;
    }

    return {
      ...prev,
      points: [...prev.points, nextPoint],
    };
  });
}


function onDrawMouseUp() {
  if (!isDrawing || !currentStroke) return;

  const stroke = {
    ...currentStroke,
    points: [...currentStroke.points], // 🔒 freeze
  };

  setObjects((prev) => {
    if (prev.some((o) => o.id === stroke.id)) return prev;
    return [...prev, stroke];
  });

  connectSocket().emit("object-create", {
    roomId,
    object: stroke,
  });

  setIsDrawing(false);
  setCurrentStroke(null);
}
function isPointNearStroke(point, stroke, threshold = 6) {
  for (let i = 0; i < stroke.points.length - 1; i++) {
    const p1 = stroke.points[i];
    const p2 = stroke.points[i + 1];

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const lenSq = dx * dx + dy * dy;

    if (lenSq === 0) continue;

    let t =
      ((point.x - p1.x) * dx + (point.y - p1.y) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const px = p1.x + t * dx;
    const py = p1.y + t * dy;

    const dist = Math.hypot(point.x - px, point.y - py);
    if (dist <= threshold) return true;
  }
  return false;
}
// Helper function to check if point is inside a rectangle
function isPointInRect(point, obj) {
  const width = obj.data?.width || 120;
  const height = obj.data?.height || 40;
  return (
    point.x >= obj.x &&
    point.x <= obj.x + width &&
    point.y >= obj.y &&
    point.y <= obj.y + height
  );
}

// Helper function to check if point is inside a circle
function isPointInCircle(point, obj) {
  const radius = obj.data?.radius || 50;
  const centerX = obj.x + radius;
  const centerY = obj.y + radius;
  const dx = point.x - centerX;
  const dy = point.y - centerY;
  return dx * dx + dy * dy <= radius * radius;
}

function eraseAtPoint(x, y) {
  // Apply inverse transform for pan/zoom
  const worldX = (x - pan.x) / zoom;
  const worldY = (y - pan.y) / zoom;
  const point = { x: worldX, y: worldY };

  // Check all object types, prioritize strokes first (most common erase target)
  let hit = objects.find(
    o => o.type === "STROKE" && isPointNearStroke(point, o)
  );

  // If no stroke hit, check other object types
  if (!hit) {
    // Check TEXT
    hit = objects.find(
      o => o.type === "TEXT" && isPointInRect(point, o)
    );
  }

  if (!hit) {
    // Check NODE
    hit = objects.find(
      o => o.type === "NODE" && isPointInRect(point, o)
    );
  }

  if (!hit) {
    // Check SHAPE (rect or circle)
    hit = objects.find(o => {
      if (o.type !== "SHAPE") return false;
      if (o.data?.shape === "circle") {
        return isPointInCircle(point, o);
      } else {
        return isPointInRect(point, o);
      }
    });
  }

  if (!hit) {
    // Check EDGE (approximate by checking if point is near the line)
    hit = objects.find(o => {
      if (o.type !== "EDGE") return false;
      const from = objects.find(n => n.type === "NODE" && n.id === o.data?.from);
      const to = objects.find(n => n.type === "NODE" && n.id === o.data?.to);
      if (!from || !to) return false;
      
      const fromX = from.x + (from.data?.width || 120) / 2;
      const fromY = from.y + (from.data?.height || 40) / 2;
      const toX = to.x + (to.data?.width || 120) / 2;
      const toY = to.y + (to.data?.height || 40) / 2;
      
      // Distance from point to line segment
      const A = point.x - fromX;
      const B = point.y - fromY;
      const C = toX - fromX;
      const D = toY - fromY;
      const dot = A * C + B * D;
      const lenSq = C * C + D * D;
      let param = lenSq !== 0 ? dot / lenSq : -1;
      param = Math.max(0, Math.min(1, param));
      
      const xx = fromX + param * C;
      const yy = fromY + param * D;
      const dx = point.x - xx;
      const dy = point.y - yy;
      return Math.sqrt(dx * dx + dy * dy) <= 6; // threshold
    });
  }

  if (!hit) return;

  // optimistic UI
  setObjects(prev => prev.filter(o => o.id !== hit.id));

  // sync erase
  connectSocket().emit("object-delete", {
    roomId,
    objectId: hit.id,
  });
}


// Smoothing helper: convert points → quadratic Bézier path (no thinning)
function pointsToQuadraticPath(points) {
  if (!points || points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) {
    // fallback to a short quadratic to reach the second point
    return `M ${points[0].x} ${points[0].y} Q ${points[1].x} ${points[1].y} ${points[1].x} ${points[1].y}`;
  }

  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length - 1; i++) {
    const pA = points[i];
    const pB = points[i + 1];
    const midX = (pA.x + pB.x) / 2;
    const midY = (pA.y + pB.y) / 2;
    d += ` Q ${pA.x} ${pA.y} ${midX} ${midY}`;
  }

  // final segment to the last point
  const penult = points[points.length - 2];
  const last = points[points.length - 1];
  d += ` Q ${penult.x} ${penult.y} ${last.x} ${last.y}`;

  return d;
}





  function saveEdit(obj) {
  const text = editValue;

  // simple auto-size heuristic
  const lines = text.split("\n");
  const width = Math.max(120, Math.max(...lines.map(l => l.length)) * 8);
  const height = Math.max(40, lines.length * 22);

  const updated = {
    ...obj,
    data: {
      ...obj.data,
      text,
      width,
      height,
    },
  };

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


/* ---------------- GLOBAL DRAW MOUSEUP FIX ---------------- */


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
    <button
      onClick={() => setTool(tool === "draw" ? "select" : "draw")}
      style={{
        background: tool === "draw" ? "#1971c2" : "#f1f3f5",
        color: tool === "draw" ? "#fff" : "#000",
      }}
    >
        ✏️ Draw
      </button>
      <button
  onClick={() =>
    setTool(prev => (prev === "erase" ? "select" : "erase"))
  }
  style={{
    background: tool === "erase" ? "#e03131" : "#f1f3f5",
    color: tool === "erase" ? "#fff" : "#000",
  }}
>
  🧽 Erase
</button>
  <button onClick={() => connectSocket().emit("undo", { roomId })}>
  ⬅️ Undo
</button>
    <button onClick={() => connectSocket().emit("redo", { roomId })}>
  ➡️ Redo
</button>
<button
  onClick={() => setTool(prev => (prev === "pan" ? "select" : "pan"))}
  style={{
    background: tool === "pan" ? "#1971c2" : "#f1f3f5",
    color: tool === "pan" ? "#fff" : "#000",
  }}
>
  ✋ Pan
</button>
<button onClick={() => setZoom(1)}>🔍 Reset Zoom</button>
<span style={{ marginLeft: 10 }}>Zoom: {(zoom * 100).toFixed(0)}%</span>



    <div
  onMouseDown={(e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (tool === "pan") {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    } else if (tool === "draw") {
      onDrawMouseDown(e);
    } else if (tool === "select") {
      selectStrokeAtPoint(x, y);
    } else if (tool === "erase") {
      eraseAtPoint(x, y);
    } else {
      setSelectedIds([]);
    }
  }}

  onMouseMove={(e) => {
    if (tool === "pan" && isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    } else if (tool === "draw") {
      onDrawMouseMove(e);
    }
  }}

  onMouseUp={() => {
    if (tool === "pan") {
      setIsPanning(false);
    } else if (tool === "draw") {
      onDrawMouseUp();
    }
  }}

  onWheel={(e) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(5, zoom * zoomFactor));
    
    // Zoom towards mouse position
    const zoomChange = newZoom / zoom;
    setPan({
      x: mouseX - (mouseX - pan.x) * zoomChange,
      y: mouseY - (mouseY - pan.y) * zoomChange,
    });
    setZoom(newZoom);
  }}

  
  style={{
    marginTop: 20,
    width: "100%",
    height: "70vh",
    border: "1px solid #ccc",
    position: "relative",
    cursor: tool === "draw" ? "crosshair" : tool === "pan" ? (isPanning ? "grabbing" : "grab") : tool === "erase" ? "crosshair" : "default",
    overflow: "hidden",
  }}
>

      {/* EDGES */}
      <svg
        
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
        }}
        
      >
        {currentStroke && (
  <path
    d={pointsToQuadraticPath(currentStroke.points)}
    stroke={currentStroke.color}
    strokeWidth={
      selectedIds.includes(currentStroke.id)
        ? (currentStroke.width || 2) + 2
        : currentStroke.width || 2
    }
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ pointerEvents: "none" }}
  />
)}
      {/* PERSISTED STROKES */}
{objects
  .filter((o) => o.type === "STROKE")
  .map((stroke) => (
    <path
      key={stroke.id}
      d={pointsToQuadraticPath(stroke.points)}
      stroke={stroke.color || "#ffffff"}
      strokeWidth={
        selectedIds.includes(stroke.id)
          ? (stroke.width || 2) + 2
          : stroke.width || 2
      }
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ pointerEvents: "stroke" }}
      onMouseDown={(e) => {
        // only start selection/drag on select tool — let draw/erase pass through
        if (tool === "select") onMouseDown(e, stroke);
      }}
    />
  ))}

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
                strokeWidth={selectedIds.includes(edge.id) ? 3 : 1}

              />
            );
          })}
      </svg>

      {/* OBJECTS */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
          pointerEvents: tool === "pan" ? "none" : "auto",
        }}
      >
      {objects.map((obj) => {
        const selected = selectedIds.includes(obj.id);

        /* ---------- TEXT ---------- */
        /* ---------- TEXT ---------- */
        /* ---------- STROKE ---------- */


if (obj.type === "TEXT") {
  return (
    <div
      key={obj.id}
      onMouseDown={(e) => {
        if (editingId === obj.id) return;
        onMouseDown(e, obj);
      }}
      onDoubleClick={() => {
        setEditingId(obj.id);
        setEditValue(obj.data.text);
      }}
      style={{
        position: "absolute",
        left: obj.x,
        top: obj.y,
        width: obj.data.width,
        height: obj.data.height,
        padding: 6,
        background: "#fff3bf",
        border: selected
          ? "2px solid #1971c2"
          : "1px solid #f59f00",
        borderRadius: 6,
        cursor: editingId === obj.id ? "text" : "grab",
        overflow: "hidden",
        whiteSpace: "pre-wrap",
        userSelect: editingId === obj.id ? "text" : "none",
      }}
    >
      {editingId === obj.id ? (
        <input
          autoFocus
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => saveEdit(obj)}
          onKeyDown={(e) => e.key === "Enter" && saveEdit(obj)}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            outline: "none",
            background: "transparent",
          }}
        />
      ) : (
        obj.data.text
      )}

      {/* ✅ TEXT RESIZE HANDLE (CORRECT PLACE) */}
      {selected && editingId !== obj.id && (
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

  // 🔑 force correct sizing
  width: isCircle
    ? obj.data.radius * 2
    : obj.data.width,
  height: isCircle
    ? obj.data.radius * 2
    : obj.data.height,

  background: obj.data.color,

  // 🔑 THIS IS THE KEY LINE
  borderRadius: isCircle ? "50%" : 0,

  outline: selected
    ? "2px solid #1971c2"
    : "none",

  cursor: "grab",
}}

            >
              {/* resize handle for rectangles only */}
              {/* resize handle for rect + circle */}
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

        /* ---------- STROKE (handles only, path rendered in SVG) ---------- */
        if (obj.type === "STROKE") {
          // compute bbox for handle placement
          const bbox = getStrokeBBox(obj);

          return (
            <div key={obj.id}>
              {selected && (
                <div
                  onMouseDownCapture={(e) => onResizeMouseDown(e, obj)}
                  style={{
                    position: "absolute",
                    left: bbox.minX + bbox.width - 6,
                    top: bbox.minY + bbox.height - 6,
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
    </div>
  </main>
);

}
