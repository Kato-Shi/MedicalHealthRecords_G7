const { User, Patient, Appointment, MedicalRecord, sequelize } = require("../models");
const { Op } = require("sequelize");

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

   // Aggregate counts per role to understand capacity mix
   const roleBreakdownRaw = await User.findAll({
     attributes: [
       "role",
       [sequelize.fn("COUNT", sequelize.col("role")), "count"],
     ],
     group: ["role"],
     raw: true,
   });

   const roleBreakdown = roleBreakdownRaw.reduce((acc, item) => {
     acc[item.role] = parseInt(item.count, 10);
     return acc;
   }, {});

   const totalPatients = await Patient.count();
   const scheduledAppointments = await Appointment.count({
     where: {
       status: "scheduled",
       appointmentDate: {
         [Op.gte]: new Date(),
       },
     },
   });

   const recordsDocumented = await MedicalRecord.count();

   // Send response with user statistics
   res.json({
     success: true,
     message: "Dashboard data retrieved successfully",
     data: {
       statistics: {
         totalUsers,
         roleBreakdown,
         totalPatients,
         scheduledAppointments,
         recordsDocumented,
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
     include: [
       {
         model: Patient,
         as: "patientProfile",
       },
     ],
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

