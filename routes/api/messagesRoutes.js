const router = require("express").Router();

const authenticateToken = require("../../middlewares/authenticateToken");

const MessageController = require("../../controllers/messageController");

router.get("/", authenticateToken, MessageController.getAllMessages);
router.post("/", authenticateToken, MessageController.sendMessage);
router.put("/readBy", authenticateToken, MessageController.updateReadBy);

module.exports = router;
