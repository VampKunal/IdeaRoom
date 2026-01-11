const { createClient } = require("redis");

const redisClient = createClient({
  url: "redis://localhost:6379",
});

redisClient.connect();

redisClient.on("connect", () => {
  console.log("Redis connected");
});

redisClient.on("error", console.error);

module.exports = redisClient;
