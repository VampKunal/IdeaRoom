// Prefer Upstash REST when set: no persistent TCP, avoids "Socket closed unexpectedly" on Railway.
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  const { Redis } = require("@upstash/redis");
  const r = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  console.log("Redis using Upstash REST API");
  module.exports = {
    get: (k) => r.get(k),
    set: (k, v) => r.set(k, v),
    hSet: (k, field, val) => r.hset(k, { [field]: val }),
    // Upstash REST may auto-parse JSON; ensure we return strings for consistency
    hGetAll: (k) => r.hgetall(k).then((o) => {
      if (!o) return {};
      const result = {};
      for (const [field, val] of Object.entries(o)) {
        result[field] = typeof val === "string" ? val : JSON.stringify(val);
      }
      return result;
    }),
    hDel: (k, f) => r.hdel(k, f),
    hVals: (k) => r.hvals(k).then((a) => {
      if (!a) return [];
      return a.map(v => typeof v === "string" ? v : JSON.stringify(v));
    }),
  };
  // Skip TCP setup below
} else {
const { createClient } = require("redis");

// Upstash TCP: rediss://default:PASSWORD@host:port . Local: redis://localhost:6379
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const redisClient = createClient({
  url: REDIS_URL,
  socket: {
    connectTimeout: 10000,
    // Never stop retrying (Upstash/network often close sockets). Cap delay at 30s.
    reconnectStrategy: (retries) => Math.min(30000, 500 * (retries + 1)),
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

function isRetryableRedisError(e) {
  if (!e) return false;
  const n = e?.name || "";
  const m = String(e?.message || "");
  return (
    n === "ClientClosedError" ||
    n === "SocketClosedUnexpectedlyError" ||
    m.includes("closed") ||
    m.includes("Socket closed unexpectedly")
  );
}

function wrap(name) {
  const fn = redisClient[name].bind(redisClient);
  return async function (...args) {
    await ensureConnected();
    try {
      return await fn(...args);
    } catch (e) {
      if (isRetryableRedisError(e)) {
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
}