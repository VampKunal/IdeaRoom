const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const axios = require("axios");

const redisClient = require("./redis");
const { connectRabbit, publishEvent } = require("./rabbit");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
  maxHttpBufferSize: 1e7, // 10 MB
});

const PORT = 4000;

// connect infra once
connectRabbit();

/**
 * Socket.IO connection
 */
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Helper function for safe JSON parsing
  function safeParseJSON(str, defaultValue = { objects: [] }) {
    if (!str) return defaultValue;
    try {
      const parsed = JSON.parse(str);
      // Ensure objects array exists
      if (!parsed.objects || !Array.isArray(parsed.objects)) {
        parsed.objects = [];
      }
      return parsed;
    } catch (error) {
      console.error("JSON parse error:", error);
      return defaultValue;
    }
  }

  /* ---------------- JOIN ROOM ---------------- */
  socket.on("join-room", async (roomId) => {
    try {
      // validate room via API Gateway
      await axios.get(`http://localhost:3000/room/${roomId}`);

      socket.join(roomId);

      const key = `room:${roomId}:state`;
      const state = await redisClient.get(key);

      if (state) {
        socket.emit("room-state", safeParseJSON(state));
      }

      socket.to(roomId).emit("user-joined", {
        socketId: socket.id,
      });

      // Track active users
      const userKey = `room:${roomId}:users`;
      await redisClient.sAdd(userKey, socket.id);
      const activeUsers = await redisClient.sMembers(userKey);
      console.log(`[JOIN] ${socket.id} joined ${roomId}. Users: ${activeUsers.length}`);
      io.to(roomId).emit("room-users", activeUsers);

      // Handle disconnect to clean up
      socket.on("disconnect", async () => {
        try {
          await redisClient.sRem(userKey, socket.id);
          const remaining = await redisClient.sMembers(userKey);
          console.log(`[LEAVE] ${socket.id} left ${roomId}. Remaining: ${remaining.length}`);
          io.to(roomId).emit("room-users", remaining);
          io.to(roomId).emit("user-left", { socketId: socket.id });
        } catch (e) {
          console.error("Disconnect processing error:", e);
        }
      });


      console.log(`Socket ${socket.id} joined room ${roomId}`);
    } catch (err) {
      console.error("Join room error:", err);
      socket.emit("error", "Invalid room ID or Server Error");
    }
  });

  /* ---------------- CURSOR MOVE ---------------- */
  socket.on("cursor-move", ({ roomId, position, userId, userName }) => {
    // Broadcast cursor
    socket.to(roomId).emit("cursor-moved", {
      socketId: socket.id,
      position,
      userId,
      userName, // optional if we want names
      color: "#" + Math.floor(Math.random() * 16777215).toString(16) // simple random color logic or pass from front
    });
  });

  /* ---------------- BACKGROUND UPDATE ---------------- */
  socket.on("room-bg-update", async ({ roomId, background, backgroundImage }) => {
    try {
      const key = `room:${roomId}:state`;
      const stateStr = await redisClient.get(key);
      let state = safeParseJSON(stateStr);

      let changed = false;
      if (background !== undefined) { state.background = background; changed = true; }
      if (backgroundImage !== undefined) { state.backgroundImage = backgroundImage; changed = true; }

      if (changed) {
        await redisClient.set(key, JSON.stringify(state));
        // Broadcast to everyone (including sender, or just others? efficiently sender knows, but consistency is good)
        // Usually sender updates optimistically.
        socket.to(roomId).emit("room-state", state);
      }
    } catch (e) {
      console.error("BG Update Error:", e);
    }
  });
  /* ---------------- REQUEST-ROOM-STATE---------------- */
  socket.on("request-room-state", async (roomId) => {
    const key = `room:${roomId}:state`;
    const state = await redisClient.get(key);

    if (state) {
      socket.emit("room-state", safeParseJSON(state));
    }
  });
  function pushHistory(state, entry) {
    state.history = state.history || { undo: [], redo: [] };
    state.history.undo.push(entry);
    state.history.redo = []; // clear redo on new action
  }


  /* ---------------- OBJECT CREATE ---------------- */
  socket.on("object-create", async ({ roomId, object }) => {
    console.log(`[CREATE] Obj ${object.id} (${object.type}) in ${roomId}. Size: ${JSON.stringify(object).length}`);
    const key = `room:${roomId}:state`;

    let state = await redisClient.get(key);
    state = safeParseJSON(state);

    // ✅ backend is the authority for timestamps
    const enrichedObject = {
      ...object,
      createdAt: Date.now(),
    };

    state.objects.push(enrichedObject);

    pushHistory(state, {
      type: "CREATE",
      before: null,
      after: enrichedObject,
    });

    // persist state including history
    await redisClient.set(key, JSON.stringify(state));

    publishEvent({
      roomId,
      type: "OBJECT_CREATED",
      payload: enrichedObject,
      timestamp: Date.now(),
    });

    io.to(roomId).emit("object-created", enrichedObject);
  });

  /* ---------------- OBJECT UPDATE (TEXT EDIT) ---------------- */
  socket.on("object-update", async ({ roomId, object }) => {
    const key = `room:${roomId}:state`;

    let state = await redisClient.get(key);
    state = safeParseJSON(state);

    const updatedObject = {
      ...object,
      updatedAt: Date.now(),
    };
    const before = state.objects.find(o => o.id === updatedObject.id);

    pushHistory(state, {
      type: "UPDATE",
      before,
      after: updatedObject,
    });


    state.objects = state.objects.map((o) =>
      o.id === updatedObject.id ? updatedObject : o
    );

    await redisClient.set(key, JSON.stringify(state));

    publishEvent({
      roomId,
      type: "OBJECT_UPDATED",
      payload: updatedObject,
      timestamp: Date.now(),
    });

    socket.to(roomId).emit("object-updated", updatedObject);
  });

  /* ---------------- OBJECT REORDER ---------------- */
  socket.on("object-reorder", async ({ roomId, objectId, action }) => {
    const key = `room:${roomId}:state`;
    let state = await redisClient.get(key);
    state = safeParseJSON(state);

    const index = state.objects.findIndex(o => o.id === objectId);
    if (index === -1) return;

    const object = state.objects[index];

    // Remove from current pos
    state.objects.splice(index, 1);

    if (action === "bring-to-front") {
      state.objects.push(object);
    } else if (action === "send-to-back") {
      state.objects.unshift(object);
    }

    pushHistory(state, {
      type: "REORDER",
      before: { index, id: objectId },
      after: { action, id: objectId } // Simplified history for now implies revert = inverse
    });

    await redisClient.set(key, JSON.stringify(state));
    io.to(roomId).emit("room-state", state); // Full refresh is easiest for reorder
  });

  /* ---------------- OBJECT MOVE ---------------- */
  // single-object move (kept for backward-compatibility)
  socket.on("object-move", async ({ roomId, object }) => {
    const key = `room:${roomId}:state`;

    let state = await redisClient.get(key);
    state = safeParseJSON(state);

    const before = state.objects.find(o => o.id === object.id);
    const movedObject = {
      ...object,
      updatedAt: Date.now(),
    };

    if (before) {
      pushHistory(state, {
        type: "MOVE",
        before: [before],
        after: { ids: [object.id], delta: { dx: movedObject.x - before.x, dy: movedObject.y - before.y } },
      });
    }

    state.objects = state.objects.map((o) =>
      o.id === movedObject.id ? movedObject : o
    );

    await redisClient.set(key, JSON.stringify(state));

    publishEvent({
      roomId,
      type: "OBJECT_MOVED",
      payload: movedObject,
      timestamp: Date.now(),
    });

    socket.to(roomId).emit("object-moved", movedObject);
  });
  socket.on("object-delete", async ({ roomId, objectId }) => {
    const key = `room:${roomId}:state`;

    let state = await redisClient.get(key);
    state = safeParseJSON(state);

    // find deleted object first
    const deleted = state.objects.find((o) => o.id === objectId);

    if (deleted) {
      // remove object
      state.objects = state.objects.filter((o) => o.id !== objectId);

      pushHistory(state, {
        type: "DELETE",
        before: deleted,
        after: null,
      });
    }




    await redisClient.set(key, JSON.stringify(state));

    // notify everyone
    io.to(roomId).emit("object-deleted", { objectId });
  });

  /* ---------------- OBJECT-MOVE ---------------- */
  socket.on("objects-move", async ({ roomId, ids, delta }) => {
    const key = `room:${roomId}:state`;

    let state = await redisClient.get(key);
    state = safeParseJSON(state);

    // capture before snapshots for undo
    const beforeSnapshots = state.objects
      .filter((o) => ids.includes(o.id))
      .map((o) => {
        if (o.type === "STROKE") return { id: o.id, points: o.points };
        return { id: o.id, x: o.x, y: o.y };
      });

    // apply move
    state.objects = state.objects.map((o) => {
      if (!ids.includes(o.id)) return o;

      if (o.type === "STROKE") {
        return {
          ...o,
          points: (o.points || []).map((p) => ({ x: p.x + delta.dx, y: p.y + delta.dy })),
          updatedAt: Date.now(),
        };
      }

      return {
        ...o,
        x: o.x + delta.dx,
        y: o.y + delta.dy,
        updatedAt: Date.now(),
      };
    });

    // push history
    pushHistory(state, {
      type: "MOVE",
      before: beforeSnapshots,
      after: { ids, delta },
    });

    await redisClient.set(key, JSON.stringify(state));

    publishEvent({
      roomId,
      type: "OBJECTS_MOVED",
      payload: { ids, delta },
      timestamp: Date.now(),
    });

    socket.to(roomId).emit("objects-moved", {
      ids,
      delta,
      source: socket.id,
    });

  });

  /* ---------------- OBJECT REORDER (Z-INDEX) ---------------- */
  socket.on("object-reorder", async ({ roomId, objectIds, action }) => {
    // action: 'front' | 'back' | 'forward' | 'backward'
    const key = `room:${roomId}:state`;
    let state = await redisClient.get(key);
    state = safeParseJSON(state);

    if (!state.objects || state.objects.length === 0) return;

    const targets = new Set(objectIds);
    const moving = state.objects.filter(o => targets.has(o.id));
    const others = state.objects.filter(o => !targets.has(o.id));

    let newOrder = [];

    if (action === "front") {
      newOrder = [...others, ...moving];
    } else if (action === "back") {
      newOrder = [...moving, ...others];
    } else if (action === "forward") {
      let list = [...state.objects];
      for (let i = list.length - 2; i >= 0; i--) {
        if (targets.has(list[i].id) && !targets.has(list[i + 1].id)) {
          const temp = list[i];
          list[i] = list[i + 1];
          list[i + 1] = temp;
        }
      }
      newOrder = list;
    } else if (action === "backward") {
      let list = [...state.objects];
      for (let i = 1; i < list.length; i++) {
        if (targets.has(list[i].id) && !targets.has(list[i - 1].id)) {
          const temp = list[i];
          list[i] = list[i - 1];
          list[i - 1] = temp;
        }
      }
      newOrder = list;
    } else {
      newOrder = state.objects;
    }

    state.objects = newOrder;
    await redisClient.set(key, JSON.stringify(state));
    io.to(roomId).emit("room-state", state);
  });




  /* ---------------- UNDO / REDO ---------------- */
  socket.on("undo", async ({ roomId }) => {
    const key = `room:${roomId}:state`;
    const raw = await redisClient.get(key);
    let state = safeParseJSON(raw, { objects: [], history: { undo: [], redo: [] } });

    if (!state.history || !state.history.undo || state.history.undo.length === 0) return;

    const action = state.history.undo.pop();
    state.history.redo = state.history.redo || [];
    state.history.redo.push(action);

    if (action.type === "CREATE") {
      // remove created object
      state.objects = state.objects.filter((o) => o.id !== action.after.id);
    }

    if (action.type === "DELETE") {
      // re-insert deleted object
      state.objects.push(action.before);
    }

    if (action.type === "UPDATE") {
      state.objects = state.objects.map((o) =>
        o.id === action.before.id ? action.before : o
      );
    }

    if (action.type === "MOVE") {
      // restore previous positions from snapshots
      state.objects = state.objects.map((o) => {
        const b = action.before.find((b) => b.id === o.id);
        if (!b) return o;
        if (b.points) return { ...o, points: b.points };
        return { ...o, x: b.x, y: b.y };
      });
    }

    if (action.type === "REORDER") {
      const idxToRemove = state.objects.findIndex(o => o.id === action.before.id);
      if (idxToRemove !== -1) {
        const [obj] = state.objects.splice(idxToRemove, 1);
        state.objects.splice(action.before.index, 0, obj);
      }
    }

    await redisClient.set(key, JSON.stringify(state));
    io.to(roomId).emit("room-state", state);
  });

  socket.on("redo", async ({ roomId }) => {
    const key = `room:${roomId}:state`;
    const raw = await redisClient.get(key);
    let state = safeParseJSON(raw, { objects: [], history: { undo: [], redo: [] } });

    if (!state.history || !state.history.redo || state.history.redo.length === 0) return;

    const action = state.history.redo.pop();
    state.history.undo = state.history.undo || [];
    state.history.undo.push(action);

    if (action.type === "CREATE") {
      // re-create
      state.objects.push(action.after);
    }

    if (action.type === "DELETE") {
      // re-delete
      state.objects = state.objects.filter((o) => o.id !== action.before.id);
    }

    if (action.type === "UPDATE") {
      state.objects = state.objects.map((o) =>
        o.id === action.after.id ? action.after : o
      );
    }

    if (action.type === "MOVE") {
      // reapply delta
      const { ids, delta } = action.after;
      state.objects = state.objects.map((o) => {
        if (!ids.includes(o.id)) return o;
        if (o.type === "STROKE") {
          return {
            ...o,
            points: (o.points || []).map((p) => ({ x: p.x + delta.dx, y: p.y + delta.dy })),
            updatedAt: Date.now(),
          };
        }
        return {
          ...o,
          x: o.x + delta.dx,
          y: o.y + delta.dy,
          updatedAt: Date.now(),
        };
      });
    }

    if (action.type === "REORDER") {
      const idx = state.objects.findIndex(o => o.id === action.after.id);
      if (idx !== -1) {
        const [obj] = state.objects.splice(idx, 1);
        if (action.after.action === "bring-to-front") {
          state.objects.push(obj);
        } else {
          state.objects.unshift(obj);
        }
      }
    }

    await redisClient.set(key, JSON.stringify(state));
    io.to(roomId).emit("room-state", state);
  });

  /* ---------------- DISCONNECT ---------------- */
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

/* ---------------- HEALTH ---------------- */
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "collab-service" });
});

server.listen(PORT, () => {
  console.log(`Collaboration Service running on port ${PORT}`);
});