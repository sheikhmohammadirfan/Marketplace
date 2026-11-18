const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/chatController");
const { authenticate } = require("../middleware/auth");
const { signSocketToken } = require("../utils/tokens");

router.use(authenticate);

router.get("/socket-token", (req, res) => {
  const token = signSocketToken(req.user.id);
  res.json({ token });
});

router.post("/conversations", ctrl.startConversation);
router.get("/conversations", ctrl.getConversations);
router.get("/conversations/:conversationId/messages", ctrl.getMessages);
router.post("/conversations/:conversationId/messages", ctrl.sendMessage);
router.get("/unread-count", ctrl.getUnreadCount);

module.exports = router;
