/**
* Authentication Routes
* ---------------------
* This router handles user authentication and profile-related endpoints.
*
* Features:
* - Register new users
* - Login existing users (JWT-based authentication)
* - Fetch the currently logged-in user's profile
*/

const express = require("express");
const {
   register,
   login,
   getProfile,
} = require("../controllers/authController"); // Controller functions for authentication
const { authenticateToken } = require("../middleware/auth"); // Middleware for JWT authentication

const router = express.Router(); // Initialize Express Router

// ---------------------- Routes ----------------------

/**
* @route   POST /api/auth/register
* @desc    Register a new user
* @body    {string} username - Unique username
* @body    {string} email - User email
* @body    {string} password - User password
* @access  Public (no authentication required)
*/
router.post("/register", register);

/**
* @route   POST /api/auth/login
* @desc    Login a user and return JWT token
* @body    {string} email - User email
* @body    {string} password - User password
* @returns {string} token - JWT token for authenticated requests
* @access  Public (no authentication required)
*/
router.post("/login", login);

/**
* @route   GET /api/auth/profile
* @desc    Get the current authenticated user's profile
* @header  {string} Authorization - Bearer JWT token
* @access  Private (requires valid authentication)
*/
router.get("/profile", authenticateToken, getProfile);

// Export router to be mounted in app.js
module.exports = router;