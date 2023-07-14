const router = require('express').Router();

const authenticateToken = require('../../middlewares/authenticateToken');

const { getAllMessages, sendMessage, updateReadBy } = require("../../controllers/messageController");

router.get('/', authenticateToken, getAllMessages);
router.post('/', authenticateToken, sendMessage);
router.put('/readBy', authenticateToken, updateReadBy);

module.exports = router;