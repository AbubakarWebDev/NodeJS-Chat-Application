const router = require("express").Router();
const AuthController = require("../../controllers/authController");

const authController = new AuthController();

// Protected Routes
router.post("/reset-password", authController.resetPassword);
router.post("/forgot-password", authController.sendUserPasswordResetEmail);

// Public Routes
router.post("/login", authController.loginUser);
router.post("/register", authController.registerUser);

module.exports = router;
