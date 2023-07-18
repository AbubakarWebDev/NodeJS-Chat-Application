const router = require("express").Router();
const authenticateToken = require("../../middlewares/authenticateToken");
const ChatController = require("../../controllers/chatController");

router.get("/", authenticateToken, ChatController.getAllChats);
router.post("/", authenticateToken, ChatController.getOrCreateChat);

router.post("/group", authenticateToken, ChatController.createGroupChat);
router.put("/group/add-member", authenticateToken, ChatController.addtoGroup);
router.put("/group/rename", authenticateToken, ChatController.renameGroupChat);
router.put("/group/users", authenticateToken, ChatController.updateGroupUsers);
router.put("/group/admins", authenticateToken, ChatController.updateAdminUsers);
router.put(
  "/group/remove-member",
  authenticateToken,
  ChatController.removeFromGroup
);

module.exports = router;
