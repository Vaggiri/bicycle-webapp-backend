const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const router = express.Router();

// Register
router.post("/register", async (req, res) => {
  const { role, name, email, password } = req.body;
  try {
    if (!role || !name || !email || !password)
      return res.status(400).json({ message: "All fields are required." });

    const userExists = await User.findOne({ email });
    if (userExists)
      return res.status(400).json({ message: "Email already registered." });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ role, name, email, password: hashedPassword });
    await user.save();

    res.status(201).json({ message: "User registered successfully." });
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
});

// Login
router.post("/login", async (req, res) => {
  const { role, email, password } = req.body;
  try {
    const user = await User.findOne({ email, role });
    if (!user)
      return res.status(400).json({ message: "Invalid credentials." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials." });

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
});

router.post("/forgot-password", async (req, res) => {
    const { email } = req.body;
    try {
      const user = await User.findOne({ email });
      if (!user) return res.status(400).json({ message: "No user with that email found." });
  
      const token = crypto.randomBytes(32).toString("hex");
      user.resetPasswordToken = token;
      user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
      await user.save();
  
      // Send email (replace with your SMTP config)
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: "your-email@gmail.com", pass: "your-app-password" }
      });
      const resetUrl = `http://localhost:5173/reset-password/${token}`;
      await transporter.sendMail({
        to: user.email,
        subject: "Reset your Bicycle Locker password",
        html: `<p>Click <a href="${resetUrl}">here</a> to reset your password.<br>This link expires in 1 hour.</p>`
      });
  
      res.json({ message: "Password reset link sent to your email." });
    } catch (err) {
      res.status(500).json({ message: "Server error." });
    }
  });
  
  // Reset Password - Set New Password
  router.post("/reset-password/:token", async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;
    try {
      const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() }
      });
      if (!user) return res.status(400).json({ message: "Invalid or expired token." });
  
      user.password = await bcrypt.hash(password, 10);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
  
      res.json({ message: "Password reset successful! You can now log in." });
    } catch (err) {
      res.status(500).json({ message: "Server error." });
    }
  });

module.exports = router;