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

// CORS: allow Vercel frontend. Preflight needs allowedHeaders including Authorization.
const corsOpts = {
  origin: process.env.CORS_ORIGIN || true, // true = reflect request origin (allow any)
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOpts));

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "api-gateway" });
});

app.use("/room", roomRoutes);

connectDB().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`API Gateway running on port ${PORT}`);
  });
});
