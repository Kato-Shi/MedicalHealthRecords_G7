const express = require("express");
const {
  createPatient,
  getPatients,
  getPatientById,
  updatePatient,
  deletePatient,
} = require("../controllers/patientController");
const { authenticateToken } = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");

const router = express.Router();

router.use(authenticateToken);

router.post(
  "/",
  requireRole(["admin", "manager", "staff", "doctor", "patient"]),
  createPatient,
);

router.get(
  "/",
  requireRole(["admin", "manager", "staff", "doctor", "patient"]),
  getPatients,
);

router.get(
  "/:patientId",
  requireRole(["admin", "manager", "staff", "doctor", "patient"]),
  getPatientById,
);

router.put(
  "/:patientId",
  requireRole(["admin", "manager", "staff", "doctor", "patient"]),
  updatePatient,
);

router.delete(
  "/:patientId",
  requireRole(["admin", "manager", "staff"]),
  deletePatient,
);

module.exports = router;
