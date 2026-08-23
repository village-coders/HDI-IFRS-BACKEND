import mongoose from "mongoose";

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
    status: {
      type: String,
      enum: ["new", "verified", "approved_for_payment", "paid", "rejected"],
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
    items: [
      {
        type: String,
        category: String,
        note: String,
        currency: String,
        payMode: String,
        card: Number,
        cash: Number,
        bank: Number,
        vat: Number,
        total: Number,
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
