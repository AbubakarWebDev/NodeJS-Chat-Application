const router = require("express").Router();

const authenticateToken = require("../../middlewares/authenticateToken");

const UserController = require("../../controllers/userController");

// Protected Routes
router.get("/", authenticateToken, UserController.getAllUsers);
router.put("/", authenticateToken, UserController.updateUserProfile);
router.put("/avatar", authenticateToken, UserController.updateUserAvatar);
router.get("/loggedin", authenticateToken, UserController.getLoggedInUser);
router.post("/change-password", authenticateToken, UserController.changePassword);

// Public Routes
router.get("/:id", UserController.checkUserExists);

module.exports = router;
