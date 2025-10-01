const express = require("express");
const {
  createMedicalRecord,
  getMedicalRecords,
  getMedicalRecordById,
  updateMedicalRecord,
  deleteMedicalRecord,
} = require("../controllers/medicalRecordController");
const { authenticateToken } = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");

const router = express.Router();

router.use(authenticateToken);

const clinicalRoles = ["admin", "manager", "staff", "doctor"];
const recordReadRoles = [...clinicalRoles, "patient"];

router.post("/", requireRole(clinicalRoles), createMedicalRecord);
router.get("/", requireRole(recordReadRoles), getMedicalRecords);
router.get("/:recordId", requireRole(recordReadRoles), getMedicalRecordById);
router.put("/:recordId", requireRole(clinicalRoles), updateMedicalRecord);
router.delete("/:recordId", requireRole(clinicalRoles), deleteMedicalRecord);

module.exports = router;
