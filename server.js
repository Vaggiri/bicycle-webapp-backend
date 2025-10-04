require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const authRoutes = require("./routes/auth");

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);

// Protected main page route (example)
const { authMiddleware } = require("./middleware/auth");
app.get("/api/main", authMiddleware, (req, res) => {
  // req.user is populated by authMiddleware
  res.json({
    message: `Main page goes here for ${req.user.role === "bicycle_owner" ? "Owner" : "User"}`,
    user: req.user,
  });
});

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => console.error("MongoDB connection error:", err));