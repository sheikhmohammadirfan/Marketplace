const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/chatController");
const { authenticate } = require("../middleware/auth");

router.use(authenticate);

router.post("/conversations", ctrl.startConversation);
router.get("/conversations", ctrl.getConversations);
router.get("/conversations/:conversationId/messages", ctrl.getMessages);
router.post("/conversations/:conversationId/messages", ctrl.sendMessage);

module.exports = router;
