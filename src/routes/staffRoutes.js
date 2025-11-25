const express = require("express");
const {
  listDoctors,
  createDoctor,
  deleteDoctor,
  assignDoctorToPatient,
} = require("../controllers/staffController");
const { authenticateToken } = require("../middleware/auth");
const { requireStaff } = require("../middleware/rbac");

const router = express.Router();

router.use(authenticateToken);
router.use(requireStaff);

router.get("/doctors", listDoctors);
router.post("/doctors", createDoctor);
router.delete("/doctors/:doctorId", deleteDoctor);
router.post("/doctors/:doctorId/assign-patient", assignDoctorToPatient);

module.exports = router;
