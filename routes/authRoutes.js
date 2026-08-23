import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

const DEFAULT_USERS = [
  { _id: "64b1f0010000000000000001", name: "Super Admin", email: "admin@hdi.org", password: "password123", role: "admin", dept: "Administration", isActive: true },
  { _id: "64b1f0010000000000000002", name: "Chairman Board", email: "chairman@hdi.org", password: "password123", role: "chairman", dept: "Executive Office", isActive: true },
];

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "hdi_ifrs_secure_jwt_secret_key_2026_x892", {
    expiresIn: process.env.JWT_EXPIRE || "30d",
  });
};

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Please provide email and password" });
    }

    let user = null;

    if (mongoose.connection.readyState === 1) {
      user = await User.findOne({ email }).select("+password");
      if (user && typeof user.matchPassword === "function") {
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
          return res.status(401).json({ message: "Invalid credentials" });
        }
      }
    } else {
      console.warn("MongoDB offline: using local development fallback credentials check");
      const defaultUser = DEFAULT_USERS.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
      if (defaultUser && (password === defaultUser.password || password === "password123")) {
        user = defaultUser;
      }
    }

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Your account is deactivated. Contact system admin." });
    }

    const token = generateToken(user._id);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      dept: user.dept,
      token,
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get("/me", protect, async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const user = await User.findById(req.user._id);
      if (user) {
        return res.json({
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          dept: user.dept,
        });
      }
    }
    
    res.json({
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      dept: req.user.dept,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
