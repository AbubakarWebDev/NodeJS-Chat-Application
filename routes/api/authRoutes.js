const router = require('express').Router();

const { 
    loginUser, 
    registerUser, 
    sendUserPasswordResetEmail,
    resetPassword
} = require('../../controllers/authController');


// Protected Routes
router.post('/reset-password', resetPassword);
router.post('/forgot-password', sendUserPasswordResetEmail);

// Public Routes
router.post('/login', loginUser);
router.post('/register', registerUser);

module.exports = router;