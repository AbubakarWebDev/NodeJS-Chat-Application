const router = require("express").Router();

const AuthController = require("../../controllers/authController");

// Protected Routes
router.post("/reset-password", AuthController.resetPassword);
router.post("/forgot-password", AuthController.sendUserPasswordResetEmail);

// Public Routes
router.post("/login", AuthController.loginUser);
router.post("/register", AuthController.registerUser);

module.exports = router;
