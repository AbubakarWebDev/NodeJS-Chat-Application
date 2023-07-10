const router = require('express').Router();

const authenticateToken = require('../../middlewares/authenticateToken');

const { getAllMessages, sendMessage } = require("../../controllers/messageController");

router.get('/', authenticateToken, getAllMessages);
router.post('/', authenticateToken, sendMessage);

module.exports = router;