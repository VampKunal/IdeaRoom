"use client";

import React, { useEffect, useState } from "react";
import { getRoom } from "../../lib/api";
import { connectSocket } from "../../lib/socket";

export default function RoomPage({ params }) {
  const [roomId, setRoomId] = useState(null);
  const [room, setRoom] = useState(null);
  const [objects, setObjects] = useState([]);

  // selection
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectionBox, setSelectionBox] = useState(null);

  // eraser state
  const [isErasing, setIsErasing] = useState(false);
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

  // remote cursors
  const [otherCursors, setOtherCursors] = useState({}); // { socketId: { x, y, color, userId } }

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

    function join() {
      socket.emit("join-room", roomId);
    }

    if (socket.connected) {
      join();
    }

    socket.on("connect", join);

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
      setObjects(prev => prev.map(o => {
        if (!ids.includes(o.id)) return o;
        if (o.type === "STROKE") {
          return {
            ...o,
            points: (o.points || []).map(p => ({ x: p.x + delta.dx, y: p.y + delta.dy }))
          };
        }
        return { ...o, x: o.x + delta.dx, y: o.y + delta.dy };
      }));
    });

    socket.on("cursor-moved", ({ socketId, position, color, userId }) => {
      setOtherCursors(prev => ({
        ...prev,
        [socketId]: { x: position.x, y: position.y, color, userId }
      }));
    });

    return () => {
      socket.off("connect");
      socket.off("room-state");
      socket.off("object-created");
      socket.off("object-updated");
      socket.off("object-moved");
      socket.off("objects-moved");
      socket.off("object-deleted");
      socket.off("cursor-moved");
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

  function getObjectBounds(obj) {
    if (obj.type === "STROKE") {
      const { minX, minY, width, height } = getStrokeBBox(obj);
      return { x: minX, y: minY, width, height };
    } else if (obj.type === "SHAPE" && obj.data.shape === "circle") {
      const d = obj.data.radius * 2;
      return { x: obj.x, y: obj.y, width: d, height: d };
    } else {
      return {
        x: obj.x,
        y: obj.y,
        width: obj.data.width || 120,
        height: obj.data.height || 40
      };
    }
  }

  function getSelectionBounds(ids) {
    if (!ids || ids.length === 0) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    let found = false;
    ids.forEach(id => {
      const o = objects.find(obj => obj.id === id);
      if (!o) return;
      found = true;
      const b = getObjectBounds(o);
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.width);
      maxY = Math.max(maxY, b.y + b.height);
    });

    if (!found) return null;

    return {
      minX, minY, maxX, maxY,
      width: maxX - minX,
      height: maxY - minY,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2
    };
  }

  function onResizeMouseDown(e) {
    e.stopPropagation();
    e.preventDefault();

    if (selectedIds.length === 0) return;

    // Snapshot group state
    const groupBounds = getSelectionBounds(selectedIds);
    if (!groupBounds) return;

    setResizingId("GROUP"); // Special marker
    setResizeStartMouse({ x: e.clientX, y: e.clientY });

    // Store initial state for all selected objects
    const items = {};
    selectedIds.forEach(id => {
      const o = objects.find(obj => obj.id === id);
      if (o) {
        items[id] = JSON.parse(JSON.stringify(o)); // deep clone
      }
    });

    setResizeOrigin({
      groupBounds,
      items
    });
  }


  function onResizeMouseMove(e) {
    if (!resizingId || !resizeStartMouse || !resizeOrigin) return;

    // Account for zoom in resize calculations
    const dx = (e.clientX - resizeStartMouse.x) / zoom;
    const dy = (e.clientY - resizeStartMouse.y) / zoom;

    const { groupBounds, items } = resizeOrigin;

    // Calculate new group dimensions
    // We only support bottom-right resizing for now so it's simple
    // New dimension = Old dimension + delta
    const newGroupWidth = Math.max(10, groupBounds.width + dx);
    const newGroupHeight = Math.max(10, groupBounds.height + dy);

    // Calculate scale factors
    const scaleX = newGroupWidth / groupBounds.width;
    const scaleY = newGroupHeight / groupBounds.height;

    setObjects((prev) =>
      prev.map((o) => {
        if (!items[o.id]) return o; // not in selection

        const initial = items[o.id];
        const b = getObjectBounds(initial);

        // 1. Scale Position relative to Group Origin (top-left)
        // clean relative pos:
        const relX = initial.x - groupBounds.minX; // for stroke this might be diff, let's use bounds
        // For strokes, initial.x is not minX. 
        // We need to act on the specific properties directly.

        // General logic:
        // NewX = GroupMinX + (OldX - GroupMinX) * scaleX
        // But for Stroke, "x/y" property doesn't exist on root, it's points.
        // Let's handle types.

        let updated = { ...o };

        // TYPE: STROKE
        if (initial.type === "STROKE") {
          // Scale points
          // PointNewX = GroupMinX + (PointOldX - GroupMinX) * scaleX
          updated.points = initial.points.map(p => ({
            x: groupBounds.minX + (p.x - groupBounds.minX) * scaleX,
            y: groupBounds.minY + (p.y - groupBounds.minY) * scaleY
          }));
          // Width handling? stroke width usually doesn't scale with box resize in whiteboard apps 
          // unless holding shift, but let's leave it const for now or it gets weird.
        }

        // TYPE: SHAPE (Circle/Rect)
        else if (initial.type === "SHAPE") {
          const newX = groupBounds.minX + (initial.x - groupBounds.minX) * scaleX;
          const newY = groupBounds.minY + (initial.y - groupBounds.minY) * scaleY;

          updated.x = newX;
          updated.y = newY;

          if (initial.data.shape === "circle") {
            // Circle scaling requires uniform or becomes ellipse (if implemented). 
            // Current app uses radius. We forced uniform before.
            // Let's take the max scale for radius to keep it circular?
            // Or, if we want to allow it to move significantly, we just use one scale.
            // Let's use average scale for radius? Or max.
            // The problem with group resize is circle distortion.
            // Let's stick to using scaleX for radius scaling for now or max(scaleX, scaleY).
            const s = Math.max(scaleX, scaleY); // uniform scale for circle in group
            updated.data = {
              ...initial.data,
              radius: initial.data.radius * s
            };
            // Re-adjust position to maintain relative center? 
            // actually (x,y) for circle is top-left in this app? 
            // Let's check render: left: obj.x, top: obj.y. width: radius*2.
            // So x,y is bounding box top-left.
            // If we scale radius uniformly but box non-uniformly, position drift happens.
            // For now let's just use regular box logic.
          } else {
            updated.data = {
              ...initial.data,
              width: initial.data.width * scaleX,
              height: initial.data.height * scaleY
            };
          }
        }

        // TYPE: NODE / TEXT
        else {
          const newX = groupBounds.minX + (initial.x - groupBounds.minX) * scaleX;
          const newY = groupBounds.minY + (initial.y - groupBounds.minY) * scaleY;

          updated.x = newX;
          updated.y = newY;

          updated.data = {
            ...initial.data,
            width: initial.data.width * scaleX,
            height: initial.data.height * scaleY
          };
        }

        return updated;
      })
    );
  }

  function onResizeMouseUp() {
    if (!resizingId) return;

    if (resizingId === "GROUP") {
      // save all
      Object.keys(resizeOrigin.items).forEach(id => {
        const obj = objects.find(o => o.id === id);
        if (obj) {
          connectSocket().emit("object-update", { roomId, object: obj });
        }
      });
    } else {
      const obj = objects.find((o) => o.id === resizingId);
      if (obj) {
        connectSocket().emit("object-update", {
          roomId,
          object: obj,
        });
      }
    }

    setResizingId(null);
    setResizeStartMouse(null);
    setResizeOrigin(null);
  }

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Backspace" || e.key === "Delete") {
        if (selectedIds.length > 0) {
          // Optimistic update
          setObjects((prev) => prev.filter((o) => !selectedIds.includes(o.id)));

          // emit delete for each item
          selectedIds.forEach((id) => {
            connectSocket().emit("object-delete", { roomId, objectId: id });
          });

          setSelectedIds([]);
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onResizeMouseMove);
    window.addEventListener("mouseup", onResizeMouseUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
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
            // If we clicked directly on the background (not stopped by object), OR on the SVG wrapper which is effectively background
            // The container itself captures the event if children didn't stopPropagation
            if (e.target === e.currentTarget || e.target.nodeName === "svg") {
              setSelectionBox({
                start: { x, y },
                current: { x, y }
              });
              setSelectedIds([]); // clear previous selection
            }
          } else if (tool === "erase") {
            setIsErasing(true);
            eraseAtPoint(x, y);
          } else {
            setSelectedIds([]);
          }
        }}

        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;

          if (tool === "pan" && isPanning) {
            setPan({
              x: e.clientX - panStart.x,
              y: e.clientY - panStart.y,
            });
          } else if (tool === "draw") {
            onDrawMouseMove(e);
          } else if (tool === "select" && selectionBox) {
            setSelectionBox(prev => ({
              ...prev,
              current: { x, y }
            }));
          } else if (tool === "erase" && isErasing) {
            eraseAtPoint(x, y);
          }

          // Emit cursor position (throttled conceptually, but for simplicity every move here)
          // In prod, use lodash.throttle
          if (Math.random() > 0.6) { // naive throttle ~40% of events
            const worldX = (x - pan.x) / zoom;
            const worldY = (y - pan.y) / zoom;
            connectSocket().emit("cursor-move", {
              roomId,
              position: { x: worldX, y: worldY },
              userId: "user-" + Math.floor(Math.random() * 1000) // Mock ID
            });
          }
        }}

        onMouseUp={() => {
          if (tool === "pan") {
            setIsPanning(false);
          } else if (tool === "draw") {
            onDrawMouseUp();
          } else if (tool === "select" && selectionBox) {
            // Finalize selection
            const sb = selectionBox;
            // calculate min/max in screen coordinates
            const x1 = Math.min(sb.start.x, sb.current.x);
            const x2 = Math.max(sb.start.x, sb.current.x);
            const y1 = Math.min(sb.start.y, sb.current.y);
            const y2 = Math.max(sb.start.y, sb.current.y);

            // Convert screen rect to world rect for safe comparison
            const worldX1 = (x1 - pan.x) / zoom;
            const worldX2 = (x2 - pan.x) / zoom;
            const worldY1 = (y1 - pan.y) / zoom;
            const worldY2 = (y2 - pan.y) / zoom;

            // Find objects inside
            const ids = [];
            objects.forEach(o => {
              // Very basic intersection check
              // For rect/shapes:
              let ox = o.x;
              let oy = o.y;
              let ow = 0;
              let oh = 0;

              if (o.type === "SHAPE") {
                if (o.data.shape === "circle") {
                  ow = o.data.radius * 2;
                  oh = o.data.radius * 2;
                } else {
                  ow = o.data.width;
                  oh = o.data.height;
                }
              } else if (o.type === "NODE" || o.type === "TEXT") {
                ow = o.data.width || 120;
                oh = o.data.height || 40;
              } else if (o.type === "STROKE") {
                const bbox = getStrokeBBox(o);
                ox = bbox.minX;
                oy = bbox.minY;
                ow = bbox.width;
                oh = bbox.height;
              }

              // Check overlap
              if (
                ox < worldX2 && ox + ow > worldX1 &&
                oy < worldY2 && oy + oh > worldY1
              ) {
                ids.push(o.id);
              }
            });

            setSelectedIds(ids);
            setSelectionBox(null);
          } else if (tool === "erase") {
            setIsErasing(false);
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
              <React.Fragment key={stroke.id}>
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
                {/* PHANTOM PATH FOR EASIER SELECTION */}
                < path
                  d={pointsToQuadraticPath(stroke.points)}
                  stroke="transparent"
                  strokeWidth={20}
                  fill="none"
                  style={{ pointerEvents: "stroke", cursor: "pointer" }}
                  onMouseDown={(e) => {
                    if (tool === "select") onMouseDown(e, stroke);
                  }}
                />
              </React.Fragment>
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
            pointerEvents: "none", // 🔑 allow clicks to pass through to SVG/Background
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
                    pointerEvents: "auto", // 🔑 re-enable for child
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
                    pointerEvents: "auto", // 🔑 re-enable for child
                  }}
                >
                  {obj.data.label}


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
                    pointerEvents: "auto", // 🔑 re-enable for child
                  }}


                >


                </div>
              );
            }

            /* ---------- STROKE (handles only, path rendered in SVG) ---------- */
            if (obj.type === "STROKE") {
              // compute bbox for handle placement
              const bbox = getStrokeBBox(obj);

              return (
                <div key={obj.id}>

                </div>
              );
            }

            return null;
          })}

          {/* GROUP / SELECTION OVERLAY */}
          {selectedIds.length > 0 && (() => {
            const bounds = getSelectionBounds(selectedIds);
            if (!bounds) return null;
            return (
              <>
                {/* Bounding Box Border */}
                <div style={{
                  position: "absolute",
                  left: bounds.minX,
                  top: bounds.minY,
                  width: bounds.width,
                  height: bounds.height,
                  border: "1px solid #1971c2",
                  pointerEvents: "none"
                }} />

                {/* Resize Handle (Bottom Right) */}
                <div
                  onMouseDownCapture={(e) => onResizeMouseDown(e)}
                  style={{
                    position: "absolute",
                    left: bounds.maxX - 6,
                    top: bounds.maxY - 6,
                    width: 12,
                    height: 12,
                    background: "#1971c2",
                    border: "1px solid white",
                    cursor: "nwse-resize",
                    pointerEvents: "auto"
                  }}
                />
              </>
            );
          })()}
          {/* CURSORS LAYER */}
          {Object.entries(otherCursors).map(([id, cursor]) => (
            <div key={id} style={{
              position: "absolute",
              left: cursor.x,
              top: cursor.y,
              pointerEvents: "none",
              zIndex: 99999,
              transition: "left 0.1s linear, top 0.1s linear"
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19177L15.6841 8.78368L7.69614 10.999L5.65376 12.3673Z" fill={cursor.color || "#09f"} stroke="white" />
              </svg>
              <span style={{
                position: "absolute",
                left: 12,
                top: 12,
                background: cursor.color || "#09f",
                color: "white",
                padding: "2px 4px",
                borderRadius: 4,
                fontSize: 10,
                whiteSpace: "nowrap"
              }}>
                User
              </span>
            </div>
          ))}

          {/* SELECTION BOX (RENDER) */}
          {selectionBox && (
            <div style={{
              position: "absolute",
              left: Math.min(selectionBox.start.x, selectionBox.current.x),
              top: Math.min(selectionBox.start.y, selectionBox.current.y),
              width: Math.abs(selectionBox.current.x - selectionBox.start.x),
              height: Math.abs(selectionBox.current.y - selectionBox.start.y),
              border: "1px solid #1971c2",
              backgroundColor: "rgba(25, 113, 194, 0.2)",
              pointerEvents: "none",
              zIndex: 9999
            }} />
          )}
        </div>
      </div >
    </main >
  );

}
