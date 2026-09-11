import mongoose from "mongoose";

const itemSchema = new mongoose.Schema(
  {
    type: { type: String, default: "In Budget" },
    category: { type: String },
    note: { type: String },
    currency: { type: String, default: "NGN" },
    payMode: { type: String, default: "bank" },
    card: { type: Number, default: 0 },
    cash: { type: Number, default: 0 },
    bank: { type: Number, default: 0 },
    vat: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  { _id: false, strict: false }
);

const claimSchema = new mongoose.Schema(
  {
    claimId: {
      type: String,
      required: true,
      unique: true,
    },
    claimantName: {
      type: String,
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    dept: {
      type: String,
      default: "Operations",
    },
    title: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      default: 0,
    },
    date: {
      type: String,
      required: true,
    },
    time: {
      type: String,
    },
    status: {
      type: String,
      enum: ["new", "reviewed", "verified", "approved_for_payment", "paid", "rejected"],
      default: "new",
    },
    companyName: {
      type: String,
      default: "Halal And Haram Distinction Development Initiative (HDI)",
    },
    contactPerson: String,
    contactEmail: String,
    claimType: String,
    reasons: [
      {
        option: String,
        chg: Boolean,
      },
    ],
    items: [itemSchema],
    beneficiaries: [
      {
        name: String,
        purposes: [
          {
            purpose: String,
            amount: Number,
          },
        ],
        total: Number,
      },
    ],
    documents: [
      {
        name: String,
        size: { type: mongoose.Schema.Types.Mixed },
        mimeType: String,
        data: { type: String, select: true },  // base64 data URL
      },
    ],
    note: String,
    history: [
      {
        action: String,
        by: String,
        role: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
        note: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Claim = mongoose.model("Claim", claimSchema);
export default Claim;
