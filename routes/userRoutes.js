import express from "express";
import User from "../models/User.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

// Apply protection to all user routes
router.use(protect);

// @route   GET /api/users
// @desc    Get all users
// @access  Private (Authenticated users)
router.get("/", async (req, res) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    res.json(
      users.map((u) => ({
        _id: u._id,
        name: u.name,
        username: u.username || (u.email ? u.email.split("@")[0] : ""),
        email: u.email,
        role: u.role,
        dept: u.dept,
        isActive: u.isActive,
      }))
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/users
// @desc    Create new user
// @access  Private (Admin only)
router.post("/", authorize("admin"), async (req, res) => {
  try {
    const { name, email, username, password, role, dept } = req.body;

    const userEmail = (email || "").trim().toLowerCase();
    const userUsername = (username || userEmail.split("@")[0] || (name || "").replace(/\s+/g, "")).trim().toLowerCase();

    const userExists = await User.findOne({
      $or: [{ email: userEmail }, { username: userUsername }],
    });

    if (userExists) {
      return res.status(400).json({ message: "User already exists with this email or username" });
    }

    const user = await User.create({
      name,
      email: userEmail,
      username: userUsername,
      password: password || "Password123",
      role: role || "account_officer",
      dept: dept || "Operations",
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      dept: user.dept,
      isActive: user.isActive,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user details or role or active status
// @access  Private (Admin only)
router.put("/:id", authorize("admin"), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.name = req.body.name || user.name;
    user.email = req.body.email ? req.body.email.trim().toLowerCase() : user.email;
    if (req.body.username) {
      user.username = req.body.username.trim().toLowerCase();
    }
    user.role = req.body.role || user.role;
    user.dept = req.body.dept || user.dept;
    if (typeof req.body.isActive === "boolean") {
      user.isActive = req.body.isActive;
    }

    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      username: updatedUser.username || (updatedUser.email ? updatedUser.email.split("@")[0] : ""),
      email: updatedUser.email,
      role: updatedUser.role,
      dept: updatedUser.dept,
      isActive: updatedUser.isActive,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Private (Admin only)
router.delete("/:id", authorize("admin"), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User removed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
