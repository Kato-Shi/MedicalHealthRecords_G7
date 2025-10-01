const { MedicalRecord, Patient, User } = require("../models");

const STAFF_ROLES = ["admin", "manager", "staff"];
const CLINICAL_ROLES = ["admin", "manager", "staff", "doctor"];

const MEDICAL_RECORD_INCLUDE = [
  {
    model: Patient,
    as: "patient",
    include: [
      {
        model: User,
        as: "user",
        attributes: ["id", "username", "email", "role"],
      },
      {
        model: User,
        as: "primaryDoctor",
        attributes: ["id", "username", "email", "role"],
      },
    ],
  },
  {
    model: User,
    as: "doctor",
    attributes: ["id", "username", "email", "role"],
  },
  {
    model: User,
    as: "createdBy",
    attributes: ["id", "username", "email", "role"],
  },
];

const ensureDoctor = async (doctorId) => {
  const doctor = await User.findByPk(doctorId);
  if (!doctor) {
    throw new Error("DOCTOR_NOT_FOUND");
  }

  if (doctor.role !== "doctor") {
    throw new Error("INVALID_DOCTOR_ROLE");
  }

  return doctor;
};

const ensurePatient = async (patientId) => {
  if (!patientId) {
    throw new Error("PATIENT_REQUIRED");
  }

  const patient = await Patient.findByPk(patientId);
  if (!patient) {
    throw new Error("PATIENT_NOT_FOUND");
  }

  return patient;
};

const createMedicalRecord = async (req, res) => {
  try {
    if (!CLINICAL_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only clinical staff can create medical records",
      });
    }

    const {
      patientId,
      doctorId,
      title,
      visitDate,
      description,
      diagnosis,
      treatmentPlan,
      followUpDate,
      attachments,
    } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    let resolvedDoctorId = doctorId || null;
    if (req.user.role === "doctor") {
      resolvedDoctorId = req.user.id;
    }

    if (!resolvedDoctorId) {
      return res.status(400).json({
        success: false,
        message: "Doctor is required",
      });
    }

    try {
      await ensureDoctor(resolvedDoctorId);
    } catch (error) {
      if (error.message === "DOCTOR_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Doctor not found",
        });
      }

      if (error.message === "INVALID_DOCTOR_ROLE") {
        return res.status(400).json({
          success: false,
          message: "Assigned doctor must have the doctor role",
        });
      }

      throw error;
    }

    try {
      await ensurePatient(patientId);
    } catch (error) {
      if (error.message === "PATIENT_REQUIRED") {
        return res.status(400).json({
          success: false,
          message: "Patient is required",
        });
      }

      if (error.message === "PATIENT_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Patient not found",
        });
      }

      throw error;
    }

    const record = await MedicalRecord.create({
      patientId,
      doctorId: resolvedDoctorId,
      createdById: req.user.id,
      title,
      visitDate,
      description,
      diagnosis,
      treatmentPlan,
      followUpDate,
      attachments,
    });

    const created = await MedicalRecord.findByPk(record.id, {
      include: MEDICAL_RECORD_INCLUDE,
    });

    return res.status(201).json({
      success: true,
      message: "Medical record created",
      data: {
        record: created.toJSON(),
      },
    });
  } catch (error) {
    console.error("Create medical record error:", error);

    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.errors.map((err) => err.message),
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to create medical record",
    });
  }
};

const getMedicalRecords = async (req, res) => {
  try {
    const where = {};

    if (req.user.role === "patient") {
      const patientProfile = await Patient.findOne({ where: { userId: req.user.id } });
      if (!patientProfile) {
        return res.status(404).json({
          success: false,
          message: "Patient profile not found",
        });
      }

      where.patientId = patientProfile.id;
    } else if (req.user.role === "doctor") {
      where.doctorId = req.user.id;
    }

    const records = await MedicalRecord.findAll({
      where,
      include: MEDICAL_RECORD_INCLUDE,
      order: [["createdAt", "DESC"]],
    });

    return res.json({
      success: true,
      data: {
        records: records.map((record) => record.toJSON()),
      },
    });
  } catch (error) {
    console.error("Get medical records error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch medical records",
    });
  }
};

const getMedicalRecordById = async (req, res) => {
  try {
    const { recordId } = req.params;

    const record = await MedicalRecord.findByPk(recordId, {
      include: MEDICAL_RECORD_INCLUDE,
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Medical record not found",
      });
    }

    const patientUserId = record.patient?.user?.id;
    const canView =
      STAFF_ROLES.includes(req.user.role) ||
      (req.user.role === "doctor" && record.doctorId === req.user.id) ||
      (req.user.role === "patient" && patientUserId === req.user.id);

    if (!canView) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this record",
      });
    }

    return res.json({
      success: true,
      data: {
        record: record.toJSON(),
      },
    });
  } catch (error) {
    console.error("Get medical record error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch medical record",
    });
  }
};

const updateMedicalRecord = async (req, res) => {
  try {
    const { recordId } = req.params;
    const updates = { ...req.body };

    const record = await MedicalRecord.findByPk(recordId, {
      include: MEDICAL_RECORD_INCLUDE,
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Medical record not found",
      });
    }

    const canManageAll = STAFF_ROLES.includes(req.user.role);
    const isDoctorOwner = req.user.role === "doctor" && record.doctorId === req.user.id;

    if (!canManageAll && !isDoctorOwner) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this record",
      });
    }

    if (updates.doctorId) {
      try {
        await ensureDoctor(updates.doctorId);
      } catch (error) {
        if (error.message === "DOCTOR_NOT_FOUND") {
          return res.status(404).json({
            success: false,
            message: "Doctor not found",
          });
        }

        if (error.message === "INVALID_DOCTOR_ROLE") {
          return res.status(400).json({
            success: false,
            message: "Assigned doctor must have the doctor role",
          });
        }
      }

      if (!canManageAll) {
        delete updates.doctorId;
      }
    }

    if (updates.patientId && canManageAll) {
      try {
        await ensurePatient(updates.patientId);
      } catch (error) {
        if (error.message === "PATIENT_NOT_FOUND") {
          return res.status(404).json({
            success: false,
            message: "Patient not found",
          });
        }

        if (error.message === "PATIENT_REQUIRED") {
          return res.status(400).json({
            success: false,
            message: "Patient is required",
          });
        }
      }
    } else {
      delete updates.patientId;
    }

    await record.update(updates);
    await record.reload({ include: MEDICAL_RECORD_INCLUDE });

    return res.json({
      success: true,
      message: "Medical record updated",
      data: {
        record: record.toJSON(),
      },
    });
  } catch (error) {
    console.error("Update medical record error:", error);

    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.errors.map((err) => err.message),
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to update medical record",
    });
  }
};

const deleteMedicalRecord = async (req, res) => {
  try {
    const { recordId } = req.params;

    const record = await MedicalRecord.findByPk(recordId, {
      include: MEDICAL_RECORD_INCLUDE,
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Medical record not found",
      });
    }

    const canManageAll = STAFF_ROLES.includes(req.user.role);
    const isDoctorOwner = req.user.role === "doctor" && record.doctorId === req.user.id;

    if (!canManageAll && !isDoctorOwner) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this record",
      });
    }

    await record.destroy();

    return res.json({
      success: true,
      message: "Medical record deleted",
    });
  } catch (error) {
    console.error("Delete medical record error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to delete medical record",
    });
  }
};

module.exports = {
  createMedicalRecord,
  getMedicalRecords,
  getMedicalRecordById,
  updateMedicalRecord,
  deleteMedicalRecord,
};
