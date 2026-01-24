// Load Firebase Admin (must be before routes that use auth)
require("./firebase");

const express = require("express");
const roomRoutes = require("./routes/roomRoutes");
const cors = require("cors");
const { connectDB, isDBReady } = require("./db");

const app = express();
const PORT = process.env.PORT || 5000;

// CORS: support comma-separated CORS_ORIGIN; trim and drop trailing slash.
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean)
  : null;
const corsOrigin = corsOrigins?.length ? (corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins) : true;

// 1) Explicit OPTIONS handler FIRST – Railway/edge can return before our app; this runs immediately.
app.use((req, res, next) => {
  if (req.method !== "OPTIONS") return next();
  const origin = req.headers.origin;
  let allow = false;
  if (corsOrigin === true) allow = true;
  else if (typeof corsOrigin === "string") allow = origin === corsOrigin;
  else if (Array.isArray(corsOrigin)) allow = !!origin && corsOrigin.includes(origin);
  if (allow && origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  } else if (allow && corsOrigin === true) {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400");
  res.setHeader("Vary", "Origin");
  return res.sendStatus(204);
});

app.set("trust proxy", 1);
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

app.use("/room", (req, res, next) => {
  if (!isDBReady()) return res.status(503).json({ error: "Service temporarily unavailable" });
  next();
});
app.use("/room", roomRoutes);

// Start HTTP server immediately so OPTIONS/health work before MongoDB is ready.
app.listen(PORT, "0.0.0.0", () => {
  console.log(`API Gateway running on port ${PORT}`);
});
connectDB().catch((e) => console.error("MongoDB connect failed:", e.message));
