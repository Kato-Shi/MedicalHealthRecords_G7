const { Patient, User } = require("../models");

const PATIENT_INCLUDE = [
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
];

const MANAGEMENT_ROLES = ["admin", "manager", "staff"];
const CLINICAL_ROLES = [...MANAGEMENT_ROLES, "doctor"];

const ensureDoctor = async (doctorId) => {
  if (!doctorId) {
    return null;
  }

  const doctor = await User.findByPk(doctorId);
  if (!doctor) {
    throw new Error("DOCTOR_NOT_FOUND");
  }

  if (doctor.role !== "doctor") {
    throw new Error("INVALID_DOCTOR_ROLE");
  }

  return doctor;
};

const ensurePatientUser = async (userId) => {
  if (!userId) {
    return null;
  }

  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  if (user.role !== "patient") {
    throw new Error("USER_NOT_PATIENT_ROLE");
  }

  const existingProfile = await Patient.findOne({ where: { userId } });
  if (existingProfile) {
    throw new Error("PATIENT_PROFILE_EXISTS");
  }

  return user;
};

const createPatient = async (req, res) => {
  try {
    const {
      userId,
      primaryDoctorId,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      contactNumber,
      email,
      address,
      emergencyContactName,
      emergencyContactPhone,
      medicalHistory,
      notes,
    } = req.body;

    if (!firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: "First name and last name are required",
      });
    }

    const isClinical = CLINICAL_ROLES.includes(req.user.role);
    let linkedUserId = null;

    if (req.user.role === "patient") {
      if (userId && userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "Patients can only create their own profile",
        });
      }

      const existingProfile = await Patient.findOne({
        where: { userId: req.user.id },
      });

      if (existingProfile) {
        return res.status(400).json({
          success: false,
          message: "Profile already exists",
        });
      }

      linkedUserId = req.user.id;
    } else if (userId) {
      if (!isClinical) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to link profiles",
        });
      }

      try {
        await ensurePatientUser(userId);
        linkedUserId = userId;
      } catch (error) {
        if (error.message === "USER_NOT_FOUND") {
          return res.status(404).json({
            success: false,
            message: "Linked user not found",
          });
        }

        if (error.message === "USER_NOT_PATIENT_ROLE") {
          return res.status(400).json({
            success: false,
            message: "Linked user must have the patient role",
          });
        }

        if (error.message === "PATIENT_PROFILE_EXISTS") {
          return res.status(400).json({
            success: false,
            message: "Linked user already has a patient profile",
          });
        }

        throw error;
      }
    }

    if (primaryDoctorId) {
      try {
        await ensureDoctor(primaryDoctorId);
      } catch (error) {
        if (error.message === "DOCTOR_NOT_FOUND") {
          return res.status(404).json({
            success: false,
            message: "Primary doctor not found",
          });
        }

        if (error.message === "INVALID_DOCTOR_ROLE") {
          return res.status(400).json({
            success: false,
            message: "Assigned primary doctor must have the doctor role",
          });
        }

        throw error;
      }
    }

    const patient = await Patient.create({
      userId: linkedUserId,
      primaryDoctorId,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      contactNumber,
      email,
      address,
      emergencyContactName,
      emergencyContactPhone,
      medicalHistory,
      notes,
    });

    const created = await Patient.findByPk(patient.id, {
      include: PATIENT_INCLUDE,
    });

    return res.status(201).json({
      success: true,
      message: "Patient profile created",
      data: {
        patient: created.toJSON(),
      },
    });
  } catch (error) {
    console.error("Create patient error:", error);

    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.errors.map((err) => err.message),
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to create patient",
    });
  }
};

const getPatients = async (req, res) => {
  try {
    if (req.user.role === "patient") {
      const profile = await Patient.findOne({
        where: { userId: req.user.id },
        include: PATIENT_INCLUDE,
      });

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: "Patient profile not found",
        });
      }

      return res.json({
        success: true,
        data: {
          patients: [profile.toJSON()],
        },
      });
    }

    const patients = await Patient.findAll({
      include: PATIENT_INCLUDE,
      order: [["createdAt", "DESC"]],
    });

    return res.json({
      success: true,
      data: {
        patients: patients.map((patient) => patient.toJSON()),
      },
    });
  } catch (error) {
    console.error("Get patients error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch patients",
    });
  }
};

const getPatientById = async (req, res) => {
  try {
    const { patientId } = req.params;

    const patient = await Patient.findByPk(patientId, {
      include: PATIENT_INCLUDE,
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    if (
      req.user.role === "patient" &&
      patient.userId &&
      patient.userId !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this record",
      });
    }

    if (
      req.user.role === "doctor" &&
      patient.primaryDoctorId &&
      patient.primaryDoctorId !== req.user.id &&
      !MANAGEMENT_ROLES.includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        message: "Not assigned to this patient",
      });
    }

    return res.json({
      success: true,
      data: {
        patient: patient.toJSON(),
      },
    });
  } catch (error) {
    console.error("Get patient error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch patient",
    });
  }
};

const updatePatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    const updates = { ...req.body };

    const patient = await Patient.findByPk(patientId, {
      include: PATIENT_INCLUDE,
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    const isClinical = CLINICAL_ROLES.includes(req.user.role);
    const isOwner = patient.userId && patient.userId === req.user.id;

    if (!isClinical && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this patient",
      });
    }

    if (!isClinical) {
      const allowedSelfUpdateFields = new Set([
        "contactNumber",
        "email",
        "address",
        "emergencyContactName",
        "emergencyContactPhone",
        "medicalHistory",
        "notes",
      ]);

      Object.keys(updates).forEach((key) => {
        if (!allowedSelfUpdateFields.has(key)) {
          delete updates[key];
        }
      });
    } else if (updates.userId) {
      try {
        await ensurePatientUser(updates.userId);
      } catch (error) {
        if (error.message === "USER_NOT_FOUND") {
          return res.status(404).json({
            success: false,
            message: "Linked user not found",
          });
        }

        if (error.message === "USER_NOT_PATIENT_ROLE") {
          return res.status(400).json({
            success: false,
            message: "Linked user must have the patient role",
          });
        }

        if (error.message === "PATIENT_PROFILE_EXISTS") {
          return res.status(400).json({
            success: false,
            message: "Linked user already has a patient profile",
          });
        }
      }
    }

    if (updates.primaryDoctorId) {
      try {
        await ensureDoctor(updates.primaryDoctorId);
      } catch (error) {
        if (error.message === "DOCTOR_NOT_FOUND") {
          return res.status(404).json({
            success: false,
            message: "Primary doctor not found",
          });
        }

        if (error.message === "INVALID_DOCTOR_ROLE") {
          return res.status(400).json({
            success: false,
            message: "Assigned primary doctor must have the doctor role",
          });
        }
      }
    }

    await patient.update(updates);
    await patient.reload({ include: PATIENT_INCLUDE });

    return res.json({
      success: true,
      message: "Patient updated",
      data: {
        patient: patient.toJSON(),
      },
    });
  } catch (error) {
    console.error("Update patient error:", error);

    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.errors.map((err) => err.message),
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to update patient",
    });
  }
};

const deletePatient = async (req, res) => {
  try {
    const { patientId } = req.params;

    if (!MANAGEMENT_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only authorized staff can delete patient profiles",
      });
    }

    const patient = await Patient.findByPk(patientId);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    await patient.destroy();

    return res.json({
      success: true,
      message: "Patient deleted",
    });
  } catch (error) {
    console.error("Delete patient error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to delete patient",
    });
  }
};

module.exports = {
  createPatient,
  getPatients,
  getPatientById,
  updatePatient,
  deletePatient,
};
