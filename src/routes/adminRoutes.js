/**
* Admin Routes
* ------------
* This router handles all admin-specific API endpoints.
*
* Features:
* - All routes are protected by authentication middleware
* - Only users with the "admin" role can access these routes
* - Provides endpoints for dashboard data and user management
*/

const express = require("express");
const {
   getDashboard,
   getAllUsers,
   deleteUser,
} = require("../controllers/adminController"); // Controller functions for admin features
const { authenticateToken } = require("../middleware/auth"); // Middleware for JWT authentication
const { requireAdmin } = require("../middleware/rbac"); // Middleware to enforce admin role

const router = express.Router(); // Initialize Express Router

// ---------------------- Middleware ----------------------

// Apply authentication middleware to ALL admin routes
// Ensures the request has a valid JWT token
router.use(authenticateToken);

// Apply role-based access control middleware to ALL admin routes
// Ensures the authenticated user has the "admin" role
router.use(requireAdmin);

// ---------------------- Routes ----------------------

/**
* @route   GET /api/admin/dashboard
* @desc    Fetch admin dashboard data (e.g., stats, system info)
* @access  Private (Admin only)
*/
router.get("/dashboard", getDashboard);

/**
* @route   GET /api/admin/users
* @desc    Retrieve a list of all users in the system
* @access  Private (Admin only)
*/
router.get("/users", getAllUsers);

/**
* @route   DELETE /api/admin/users/:userId
* @desc    Delete a specific user by userId
* @param   {string} userId - The ID of the user to be deleted
* @access  Private (Admin only)
*/
router.delete("/users/:userId", deleteUser);

// Export the router for use in app.js
module.exports = router;

