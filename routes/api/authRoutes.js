const router = require('express').Router();

const authMiddleware = require('../../middlewares/auth-middleware');
const { 
    loginUser, 
    registerUser, 
    changePassword, 
    getLoggedInUser, 
    sendUserPasswordResetEmail,
    resetPassword
} = require('../../controllers/authController');

// Public Routes
router.post('/login', loginUser);
router.post('/register', registerUser);

router.post('/reset-password', resetPassword);
router.post('/forgot-password', sendUserPasswordResetEmail);

// Protected Routes
router.get('/loggedin-user', authMiddleware, getLoggedInUser);
router.post('/change-password', authMiddleware, changePassword);

module.exports = router;