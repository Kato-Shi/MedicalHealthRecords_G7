const { User } = require("../models");

/**
* Controller: Get Admin Dashboard Data
* ----------------------------------------------------
* - Only accessible by admin users (protected by RBAC)
* - Retrieves statistics about users in the system
* - Returns total users and breakdown by role
*
* @route GET /admin/dashboard
* @access Admin
*/
const getDashboard = async (req, res) => {
 try {
   // Count all users in the system
   const totalUsers = await User.count();

   // Count users by role
   const adminCount = await User.count({ where: { role: "admin" } });
   const managerCount = await User.count({ where: { role: "manager" } });
   const staffCount = await User.count({ where: { role: "staff" } });

   // Send response with user statistics
   res.json({
     success: true,
     message: "Dashboard data retrieved successfully",
     data: {
       statistics: {
         totalUsers,
         adminCount,
         managerCount,
         staffCount,
       },
     },
   });
 } catch (error) {
   // Log error and send internal server error response
   console.error("Dashboard error:", error);
   res.status(500).json({
     success: false,
     message: "Internal server error",
   });
 }
};

/**
* Controller: Get All Users
* ----------------------------------------------------
* - Only admins can access this endpoint
* - Fetches all users from the database (ordered by newest first)
* - Automatically removes passwords before returning
*
* @route GET /admin/users
* @access Admin
*/
const getAllUsers = async (req, res) => {
 try {
   // Fetch all users and order them by created date (descending)
   const users = await User.findAll({
     order: [["createdAt", "DESC"]],
   });

   // Send response with sanitized users (passwords removed in toJSON)
   res.json({
     success: true,
     data: {
       users: users.map((user) => user.toJSON()), // Ensure password is removed
     },
   });
 } catch (error) {
   console.error("Get all users error:", error);
   res.status(500).json({
     success: false,
     message: "Internal server error",
   });
 }
};

/**
* Controller: Delete a User
* ----------------------------------------------------
* - Only admins can delete users
* - Prevents an admin from deleting their own account
* - Returns success message when deletion is complete
*
* @route DELETE /admin/users/:userId
* @access Admin
*/
const deleteUser = async (req, res) => {
 try {
   const { userId } = req.params; // Extract user ID from request params

   // Prevent an admin from deleting their own account
   if (parseInt(userId) === req.user.id) {
     return res.status(400).json({
       success: false,
       message: "Cannot delete your own account",
     });
   }

   // Check if user exists
   const user = await User.findByPk(userId);

   if (!user) {
     return res.status(404).json({
       success: false,
       message: "User not found",
     });
   }

   // Delete the user from the database
   await user.destroy();

   res.json({
     success: true,
     message: "User deleted successfully",
   });
 } catch (error) {
   console.error("Delete user error:", error);
   res.status(500).json({
     success: false,
     message: "Internal server error",
   });
 }
};

module.exports = {
 getDashboard,
 getAllUsers,
 deleteUser,
};

