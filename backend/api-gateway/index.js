// Load Firebase Admin (must be before routes that use auth)
require("./firebase");

const express = require("express");
const roomRoutes = require("./routes/roomRoutes");
const cors = require("cors");
const { connectDB } = require("./db");

const app = express();
const PORT = process.env.PORT || 5000;

app.set("trust proxy", 1);

// CORS first (before json) so OPTIONS preflight is handled. Support comma-separated CORS_ORIGIN; trim and drop trailing slash.
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean)
  : null;
const corsOrigin = corsOrigins?.length ? (corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins) : true;
const corsOpts = {
  origin: corsOrigin,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOpts));
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "api-gateway" });
});

app.use("/room", roomRoutes);

connectDB().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`API Gateway running on port ${PORT}`);
  });
});
