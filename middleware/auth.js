import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";

const DEFAULT_USERS = [
  { _id: "64b1f0010000000000000001", name: "Super Admin", email: "admin@hdi.org", role: "admin", dept: "Administration", isActive: true },
  { _id: "64b1f0010000000000000002", name: "Chairman Board", email: "chairman@hdi.org", role: "chairman", dept: "Executive Office", isActive: true },
];

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "hdi_ifrs_secure_jwt_secret_key_2026_x892");

      if (mongoose.connection.readyState === 1) {
        req.user = await User.findById(decoded.id).select("-password");
      } else {
        req.user = DEFAULT_USERS.find(u => u._id === decoded.id) || DEFAULT_USERS[4];
      }

      if (!req.user) {
        return res.status(401).json({ message: "Not authorized, user not found" });
      }

      if (!req.user.isActive) {
        return res.status(403).json({ message: "User account is deactivated" });
      }

      return next();
    } catch (error) {
      console.error("JWT Auth error:", error.message);
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token provided" });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `User role '${req.user?.role}' is not authorized to access this route`,
      });
    }
    next();
  };
};
