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

const appointmentViewRoles = ["manager", "staff", "doctor", "patient"];
const appointmentPatientOnly = ["patient"];

router.post("/", requireRole(appointmentPatientOnly), createAppointment);
router.get("/", requireRole(appointmentViewRoles), getAppointments);
router.get("/:appointmentId", requireRole(appointmentViewRoles), getAppointmentById);
router.put("/:appointmentId", requireRole(appointmentPatientOnly), updateAppointment);
router.delete("/:appointmentId", requireRole(appointmentPatientOnly), deleteAppointment);

module.exports = router;
