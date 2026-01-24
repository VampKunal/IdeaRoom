// Load Firebase Admin (must be before routes that use auth)
require("./firebase");

const express = require("express");
const roomRoutes = require("./routes/roomRoutes");
const cors = require("cors");
const { connectDB } = require("./db");

const app = express();
const PORT = process.env.PORT || 5000;

app.set("trust proxy", 1);
app.use(express.json());
app.use(cors(process.env.CORS_ORIGIN ? { origin: process.env.CORS_ORIGIN, credentials: true } : {}));

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "api-gateway" });
});

app.use("/room", roomRoutes);

connectDB().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`API Gateway running on port ${PORT}`);
  });
});
