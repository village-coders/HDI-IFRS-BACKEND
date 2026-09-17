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
// @access  Private (Account Officer, Manager, Admin - everyone except Chairman)
router.post("/", async (req, res) => {
  try {
    if (req.user.role === "chairman") {
      return res.status(403).json({ message: "Chairman Board is not authorized to create claims." });
    }
    const {
      id,
      claimant,
      title,
      amount,
      date,
      time,
      dept,
      companyName,
      contactPerson,
      contactEmail,
      claimType,
      reasons,
      items,
      beneficiaries,
      documents,
      note,
    } = req.body;

    let cleanItems = [];
    if (Array.isArray(items)) {
      cleanItems = items.map((it) => {
        if (typeof it === "string") {
          try { return JSON.parse(it); } catch (e) { return { note: it }; }
        }
        return it;
      });
    } else if (typeof items === "string") {
      try {
        const parsed = JSON.parse(items);
        cleanItems = Array.isArray(parsed) ? parsed : [parsed];
      } catch (e) {
        cleanItems = [];
      }
    }

    let cleanBeneficiaries = [];
    if (Array.isArray(beneficiaries)) {
      cleanBeneficiaries = beneficiaries.map((b) => {
        if (typeof b === "string") {
          try { return JSON.parse(b); } catch (e) { return { name: b }; }
        }
        return b;
      });
    } else if (typeof beneficiaries === "string") {
      try {
        const parsed = JSON.parse(beneficiaries);
        cleanBeneficiaries = Array.isArray(parsed) ? parsed : [parsed];
      } catch (e) {
        cleanBeneficiaries = [];
      }
    }

    const calcAmount = amount || (cleanBeneficiaries && cleanBeneficiaries.length > 0 
      ? cleanBeneficiaries.reduce((sum, b) => sum + (Number(b.total) || 0), 0)
      : 0);

    const primaryClaimant = claimant || (cleanBeneficiaries && cleanBeneficiaries.length > 0 && cleanBeneficiaries[0].name
      ? cleanBeneficiaries.map(b => b.name).filter(Boolean).join(", ")
      : req.user.name);

    const claim = await Claim.create({
      claimId: id || "MDOS-" + Math.floor(10000000000000 + Math.random() * 90000000000000),
      claimantName: primaryClaimant,
      user: req.user._id,
      dept: dept || req.user.dept || "Operations",
      title: title || "General Expense Claim",
      amount: calcAmount,
      date: date || new Date().toISOString().slice(0, 10),
      time: time || new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }),
      status: "new",
      companyName,
      contactPerson,
      contactEmail,
      claimType,
      reasons: reasons || [],
      items: cleanItems,
      beneficiaries: cleanBeneficiaries,
      documents: documents || [],
      note,
      history: [
        {
          action: "Claim Created (Submitted For Manager Review)",
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
    const { status: newStatus, note, documents } = req.body;
    const claim = await Claim.findOne({ claimId: req.params.id }) || await Claim.findById(req.params.id);

    if (!claim) {
      return res.status(404).json({ message: "Claim not found" });
    }

    const currentStatus = claim.status;
    const userRole = req.user.role;

    if (currentStatus === newStatus) {
      return res.status(400).json({ message: `Claim is already in status '${newStatus}'` });
    }

    // Workflow validation rules:
    // 1. Manager review (new -> reviewed or new -> rejected)
    if (newStatus === "reviewed" || (newStatus === "verified" && currentStatus === "new")) {
      if (currentStatus !== "new") {
        return res.status(400).json({ message: `Invalid state transition: Cannot transition from '${currentStatus}' to '${newStatus}'.` });
      }
      if (userRole !== "manager" && userRole !== "admin") {
        return res.status(403).json({ message: "Access denied: Only Managers or Admins can review/approve claims." });
      }
    } else if (newStatus === "approved_for_payment") {
      // 2. Chairman authorization (reviewed/verified -> approved_for_payment)
      if (currentStatus !== "reviewed" && currentStatus !== "verified") {
        return res.status(400).json({ message: `Invalid state transition: Cannot transition from '${currentStatus}' to 'approved_for_payment'. Claim must be reviewed first.` });
      }
      if (userRole !== "chairman" && userRole !== "admin") {
        return res.status(403).json({ message: "Access denied: Only Chairman Board or Admins can authorize payments." });
      }
    } else if (newStatus === "rejected") {
      // Rejection can happen at Manager stage (from 'new') or Chairman stage (from 'reviewed'/'verified')
      if (currentStatus === "new") {
        if (userRole !== "manager" && userRole !== "admin") {
          return res.status(403).json({ message: "Access denied: Only Manager or Admin can reject new claims." });
        }
      } else if (currentStatus === "reviewed" || currentStatus === "verified") {
        if (userRole !== "chairman" && userRole !== "admin") {
          return res.status(403).json({ message: "Access denied: Only Chairman or Admin can reject reviewed claims." });
        }
      } else {
        return res.status(400).json({ message: `Invalid state transition: Cannot reject claim currently in '${currentStatus}' status.` });
      }
    } else if (newStatus === "paid") {
      // 3. Payment disbursement (approved_for_payment -> paid)
      if (currentStatus !== "approved_for_payment") {
        return res.status(400).json({ message: `Invalid state transition: Cannot transition from '${currentStatus}' to 'paid'. Claim must be approved for payment first.` });
      }
      if (userRole !== "account_officer" && userRole !== "admin") {
        return res.status(403).json({ message: "Access denied: Only Account Officer or Admins can mark claims as paid." });
      }
    } else {
      return res.status(400).json({ message: `Invalid target status '${newStatus}' or state transition is not allowed.` });
    }

    claim.status = newStatus;
    if (note) claim.note = note;
    if (documents && Array.isArray(documents) && documents.length > 0) {
      claim.documents = (claim.documents || []).concat(documents);
    }

    let actionLabel = `Status updated to ${newStatus}`;
    if (newStatus === "reviewed") actionLabel = "Claim Reviewed & Approved by Manager";
    else if (newStatus === "approved_for_payment") actionLabel = "Payment Authorized by Chairman Board";
    else if (newStatus === "paid") actionLabel = "Payment Disbursed by Account Officer";
    else if (newStatus === "rejected") {
      actionLabel = currentStatus === "new" ? "Claim Rejected by Manager" : "Claim Rejected by Chairman Board";
    }

    let actionLabel = `Status updated to ${newStatus}`;
    if (newStatus === "reviewed") actionLabel = "Claim Reviewed & Approved by Manager";
    else if (newStatus === "approved_for_payment") actionLabel = "Payment Authorized by Chairman Board";
    else if (newStatus === "paid") actionLabel = "Payment Disbursed by Account Officer";
    else if (newStatus === "rejected") {
      actionLabel = currentStatus === "new" ? "Claim Rejected by Manager" : "Claim Rejected by Chairman Board";
    }

    claim.history.push({
      action: actionLabel,
      by: req.user.name,
      role: req.user.role,
      note: note || "",
      timestamp: new Date(),
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
