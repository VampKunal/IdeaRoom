const { createClient } = require("redis");

// Upstash: use rediss://default:PASSWORD@host:port (TLS). Local: redis://localhost:6379
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const redisClient = createClient({
  url: REDIS_URL,
  socket: {
    // Upstash can close idle connections; allow more retries and longer backoff
    reconnectStrategy: (retries) => (retries > 50 ? new Error("Redis max retries") : Math.min(2000, 100 * (retries + 1))),
  },
});

redisClient.on("connect", () => console.log("Redis connected"));
redisClient.on("error", (err) => console.error("Redis error:", err.message));

/** Call before any command. Reconnects if client was closed (Upstash idle, network drop, etc.). */
async function ensureConnected() {
  if (!redisClient.isOpen) {
    try {
      await redisClient.connect();
    } catch (e) {
      console.error("Redis connect/reconnect failed:", e.message);
      throw e;
    }
  }
}

function wrap(name) {
  const fn = redisClient[name].bind(redisClient);
  return async function (...args) {
    await ensureConnected();
    try {
      return await fn(...args);
    } catch (e) {
      // Upstash or network may have closed the connection; reconnect and retry once
      if (e?.name === "ClientClosedError" || (e?.message && String(e.message).includes("closed"))) {
        await ensureConnected();
        return await fn(...args);
      }
      throw e;
    }
  };
}

redisClient.get = wrap("get");
redisClient.set = wrap("set");
redisClient.hSet = wrap("hSet");
redisClient.hGetAll = wrap("hGetAll");
redisClient.hDel = wrap("hDel");
redisClient.hVals = wrap("hVals");

// Start connecting on load (non-blocking)
redisClient.connect().catch(() => {});

module.exports = redisClient;
