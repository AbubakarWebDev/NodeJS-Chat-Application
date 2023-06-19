const router = require('express').Router();

const authenticateToken = require('../../middlewares/authenticateToken');

const { 
    checkUserExists, 
    getLoggedInUser, 
    changePassword,
    getAllUsers
} = require('../../controllers/userController');


// Protected Routes
router.get('/', authenticateToken, getAllUsers);
router.get('/loggedin', authenticateToken, getLoggedInUser);
router.post('/change-password', authenticateToken, changePassword);

// Public Routes
router.get('/:id', checkUserExists);

module.exports = router;