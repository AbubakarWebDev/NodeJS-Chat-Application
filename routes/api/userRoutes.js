const router = require("express").Router();
const authenticateToken = require("../../middlewares/authenticateToken");
const UserController = require("../../controllers/userController");

const userController = new UserController();

// Protected Routes
router.get(
  "/",
  authenticateToken,
  userController.getAllUsers.bind(userController)
);
router.get(
  "/loggedin",
  authenticateToken,
  userController.getLoggedInUser.bind(userController)
);
router.post(
  "/change-password",
  authenticateToken,
  userController.changePassword.bind(userController)
);

// Public Routes
router.get("/:id", userController.checkUserExists.bind(userController));

module.exports = router;
