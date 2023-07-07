const router = require('express').Router();

const authenticateToken = require('../../middlewares/authenticateToken');

const {
    addtoGroup,
    getAllChats,
    getOrCreateChat,
    createGroupChat,
    renameGroupChat,
    removeFromGroup,
    updateGroupUsers
} = require("../../controllers/chatController");

router.get('/', authenticateToken, getAllChats);
router.post('/', authenticateToken, getOrCreateChat);

router.post('/group', authenticateToken, createGroupChat);
router.put('/group/users', authenticateToken, updateGroupUsers);
router.put('/group/rename', authenticateToken, renameGroupChat);
router.put('/group/add-member', authenticateToken, addtoGroup);
router.put('/group/remove-member', authenticateToken, removeFromGroup);


module.exports = router;