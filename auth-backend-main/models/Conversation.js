const mongoose = require("mongoose");

const ConversationSchema = new mongoose.Schema(
  {
    listing: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true, index: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    lastMessageAt: { type: Date, default: Date.now },
    lastMessagePreview: { type: String, maxlength: 200 },
  },
  { timestamps: true }
);

// One conversation per buyer per listing.
ConversationSchema.index({ listing: 1, buyer: 1 }, { unique: true });

module.exports = mongoose.model("Conversation", ConversationSchema);
