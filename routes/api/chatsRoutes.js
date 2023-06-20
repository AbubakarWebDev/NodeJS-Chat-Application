const router = require('express').Router();

const authenticateToken = require('../../middlewares/authenticateToken');

const {
    getOrCreateChat,
    getAllChats
} = require("../../controllers/chatController");

router.get('/', authenticateToken, getAllChats);
router.post('/', authenticateToken, getOrCreateChat);


module.exports = router;