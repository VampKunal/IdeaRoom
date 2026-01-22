const { createClient } = require("redis");

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const redisClient = createClient({
  url: REDIS_URL,
});

redisClient.connect();

redisClient.on("connect", () => {
  console.log("Redis connected");
});

redisClient.on("error", console.error);

module.exports = redisClient;
