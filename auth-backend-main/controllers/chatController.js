const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const Listing = require("../models/Listing");

// Starts (or returns the existing) conversation between the current user and a listing's seller.
const startConversation = async (req, res) => {
  try {
    const { listingId } = req.body;
    const listing = await Listing.findById(listingId);
    if (!listing) return res.status(404).json({ message: "Listing not found" });

    if (listing.status === "removed") return res.status(404).json({ message: "Listing not found" });

    if (listing.seller.toString() === req.user.id) {
      return res.status(400).json({ message: "You can't start a conversation on your own listing" });
    }

    let conversation = await Conversation.findOne({ listing: listingId, buyer: req.user.id });
    if (!conversation) {
      conversation = await Conversation.create({
        listing: listingId,
        buyer: req.user.id,
        seller: listing.seller,
      });
    }

    res.status(201).json({ conversation });
  } catch (err) {
    console.error("Start conversation error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      $or: [{ buyer: req.user.id }, { seller: req.user.id }],
    })
      .sort({ lastMessageAt: -1 })
      .populate("listing", "title price thumbnail status")
      .populate("buyer", "name")
      .populate("seller", "name");

    res.json({ conversations });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

async function assertParticipant(req, res, conversation) {
  const isParticipant =
    conversation.buyer.toString() === req.user.id || conversation.seller.toString() === req.user.id;
  if (!isParticipant) {
    res.status(403).json({ message: "You are not part of this conversation" });
    return false;
  }
  return true;
}

const getMessages = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.conversationId);
    if (!conversation) return res.status(404).json({ message: "Conversation not found" });
    if (!(await assertParticipant(req, res, conversation))) return;

    const messages = await Message.find({ conversation: conversation._id })
      .sort({ createdAt: 1 })
      .limit(500);

    res.json({ conversation, messages });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// Shared by the REST endpoint and the socket handler so both paths behave identically.
async function createMessage({ conversationId, senderId, text }) {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw Object.assign(new Error("Conversation not found"), { status: 404 });

  const isParticipant =
    conversation.buyer.toString() === senderId || conversation.seller.toString() === senderId;
  if (!isParticipant) throw Object.assign(new Error("Not a participant"), { status: 403 });

  if (!text || !text.trim()) throw Object.assign(new Error("Message text required"), { status: 400 });

  const message = await Message.create({ conversation: conversationId, sender: senderId, text: text.trim() });

  conversation.lastMessageAt = new Date();
  conversation.lastMessagePreview = text.trim().slice(0, 200);
  await conversation.save();

  return { conversation, message };
}

const sendMessage = async (req, res) => {
  try {
    const { text } = req.body;
    const { message, conversation } = await createMessage({
      conversationId: req.params.conversationId,
      senderId: req.user.id,
      text,
    });

    // Push to anyone connected via socket, in addition to the REST response.
    const io = req.app.get("io");
    if (io) io.to(`conv:${conversation._id}`).emit("new-message", message);

    res.status(201).json({ message });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || "Internal server error" });
  }
};

module.exports = { startConversation, getConversations, getMessages, sendMessage, createMessage };
