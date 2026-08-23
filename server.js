import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import claimRoutes from "./routes/claimRoutes.js";
import User from "./models/User.js";
import Claim from "./models/Claim.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Database connection status middleware
app.use((req, res, next) => {
  if (
    req.path.startsWith("/api/") &&
    req.path !== "/api/health" &&
    req.path !== "/api/auth/login" &&
    mongoose.connection.readyState !== 1
  ) {
    return res.status(503).json({
      message: "Database connection unavailable. Please ensure MongoDB service is running.",
    });
  }
  next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/claims", claimRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? "Connected" : dbState === 2 ? "Connecting" : "Disconnected";
  res.json({ status: "OK", dbStatus, timestamp: new Date() });
});

// Seed default users and sample data if database is empty
const seedInitialData = async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log("Seeding initial default users into MongoDB...");
      const defaultUsers = [
        { name: "Super Admin", email: "admin@hdi.org", password: "abc123", role: "admin", dept: "IT Administration" },
      ];

      for (const userData of defaultUsers) {
        await User.create(userData);
      }
      console.log("Default users created successfully.");
    }

    const claimCount = await Claim.countDocuments();
    if (claimCount === 0) {
      console.log("Seeding sample claims into MongoDB...");
      const sampleClaims = [
        { claimId: "MDOS-10049281", claimantName: "Ibrahim Musa", dept: "Operations", title: "Official Duty Expense", amount: 45000, date: "2026-08-20", status: "new", note: "Initial claim submission for transit and logistics." },
        { claimId: "MDOS-20491823", claimantName: "Chidinma Okoro", dept: "Finance & Accounts", title: "Audit & Supervision", amount: 120000, date: "2026-08-18", status: "verified", note: "Verified by FO. Forwarded for Chairman review." },
        { claimId: "MDOS-39281048", claimantName: "Samuel Ekong", dept: "Audit", title: "Overseas Travel & Hotel", amount: 285000, date: "2026-08-15", status: "further_approval", note: "Submitted to Chairman & Board for high-value review." },
        { claimId: "MDOS-48201938", claimantName: "Funmi Adisa", dept: "Admin", title: "Office Consumables & Supplies", amount: 68000, date: "2026-08-12", status: "approved_for_payment", note: "Verified by Chairman. Sent to Accountant for disbursement." },
        { claimId: "MDOS-59302910", claimantName: "Ibrahim Musa", dept: "Operations", title: "Taxi Fare & Sundry", amount: 35000, date: "2026-08-05", status: "paid", note: "Payment completed successfully." },
      ];

      await Claim.insertMany(sampleClaims);
      console.log("Sample claims created successfully.");
    }
  } catch (err) {
    console.error("Error seeding initial data:", err.message);
  }
};

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`HDI IFRS Express Backend running on port ${PORT}`);
});

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.error("Error: MONGO_URI is not defined in environment variables.");
    return;
  }

  try {
    console.log(`Connecting to MongoDB...`);
    await mongoose.connect(mongoUri, { dbName: "IFRS" });
    console.log("Connected to MongoDB successfully!");
    await seedInitialData();
  } catch (err) {
    console.error("MongoDB Connection Error:", err.message);
    console.warn("Please verify MONGO_URI in your backend/.env file and ensure your Ubuntu MongoDB server is accessible.");
  }
};

connectDB();
