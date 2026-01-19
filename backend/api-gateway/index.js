const express = require("express");
const roomRoutes = require("./routes/roomRoutes");
const cors = require("cors");
const { connectDB } = require("./db");

const app = express();
const PORT = 5000;

app.use(express.json());
app.use(cors());

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "api-gateway" });
});

app.use("/room", roomRoutes);

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
  });
});
