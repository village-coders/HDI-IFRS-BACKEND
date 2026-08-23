import express from "express";
import Claim from "../models/Claim.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

// @route   GET /api/claims
// @desc    Get all claims
// @access  Private
router.get("/", async (req, res) => {
  try {
    const claims = await Claim.find({}).sort({ createdAt: -1 });
    res.json(claims);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/claims
// @desc    Create new claim
// @access  Private
router.post("/", async (req, res) => {
  try {
    const {
      id,
      claimant,
      title,
      amount,
      date,
      dept,
      companyName,
      contactPerson,
      contactEmail,
      claimType,
      reasons,
      items,
      note,
    } = req.body;

    const claim = await Claim.create({
      claimId: id || "MDOS-" + Math.floor(10000000000000 + Math.random() * 90000000000000),
      claimantName: claimant || req.user.name,
      user: req.user._id,
      dept: dept || req.user.dept || "Operations",
      title: title || "General Expense Claim",
      amount: amount || 0,
      date: date || new Date().toISOString().slice(0, 10),
      status: "new",
      companyName,
      contactPerson,
      contactEmail,
      claimType,
      reasons: reasons || [],
      items: items || [],
      note,
      history: [
        {
          action: "Claim Created",
          by: req.user.name,
          role: req.user.role,
          note: note || "Initial claim submission",
        },
      ],
    });

    res.status(201).json(claim);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/claims/:id/status
// @desc    Update claim status / feedback transition
// @access  Private
router.put("/:id/status", async (req, res) => {
  try {
    const { status, note } = req.body;
    const claim = await Claim.findOne({ claimId: req.params.id }) || await Claim.findById(req.params.id);

    if (!claim) {
      return res.status(404).json({ message: "Claim not found" });
    }

    claim.status = status;
    if (note) claim.note = note;

    claim.history.push({
      action: `Status updated to ${status}`,
      by: req.user.name,
      role: req.user.role,
      note: note || "",
    });

    await claim.save();
    res.json(claim);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/claims/:id
// @desc    Delete claim
// @access  Private (Admin only)
router.delete("/:id", async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only Admin can delete claims" });
    }

    const claim = await Claim.findOne({ claimId: req.params.id }) || await Claim.findById(req.params.id);

    if (!claim) {
      return res.status(404).json({ message: "Claim not found" });
    }

    await Claim.deleteOne({ _id: claim._id });
    res.json({ message: "Claim deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
