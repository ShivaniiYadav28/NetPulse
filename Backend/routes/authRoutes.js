const express = require("express");

const controller = require("../controllers/authController");

const {
  authenticate,
  csrfProtection,
  requireAllowedOrigin,
} = require("../middleware/authMiddleware");

const { authRateLimit } = require("../middleware/authRateLimit");

const router = express.Router();

// Register a new user
router.post(
  "/register",
  requireAllowedOrigin,
  authRateLimit,
  controller.register,
);

// Log in an existing user
router.post(
  "/login",
  requireAllowedOrigin,
  authRateLimit,
  controller.login,
);

// Get the current authenticated user
router.get(
  "/me",
  authenticate,
  controller.currentUser,
);

// Log out the authenticated user
router.post(
  "/logout",
  requireAllowedOrigin,
  authenticate,
  csrfProtection,
  controller.logout,
);

module.exports = router;
