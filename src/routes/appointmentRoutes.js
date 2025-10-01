const express = require("express");
const {
  createAppointment,
  getAppointments,
  getAppointmentById,
  updateAppointment,
  deleteAppointment,
} = require("../controllers/appointmentController");
const { authenticateToken } = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");

const router = express.Router();

router.use(authenticateToken);

const appointmentAccessRoles = ["admin", "manager", "staff", "doctor", "patient"];

router.post("/", requireRole(appointmentAccessRoles), createAppointment);
router.get("/", requireRole(appointmentAccessRoles), getAppointments);
router.get("/:appointmentId", requireRole(appointmentAccessRoles), getAppointmentById);
router.put("/:appointmentId", requireRole(appointmentAccessRoles), updateAppointment);
router.delete("/:appointmentId", requireRole(appointmentAccessRoles), deleteAppointment);

module.exports = router;
