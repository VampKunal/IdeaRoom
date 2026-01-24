const { createClient } = require("redis");

// Upstash: use rediss://default:PASSWORD@host:port (TLS). Local: redis://localhost:6379
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const redisClient = createClient({
  url: REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => (retries > 20 ? new Error("Redis max retries") : Math.min(500, 50 * (retries + 1))),
  },
});

redisClient.connect().catch((err) => {
  console.error("Redis initial connect failed:", err.message);
});

redisClient.on("connect", () => {
  console.log("Redis connected");
});

redisClient.on("error", (err) => {
  console.error("Redis error:", err.message);
});

module.exports = redisClient;
