const { Op } = require("sequelize");
const { User, Patient } = require("../models");

const DOCTOR_ROLE = "doctor";

const listDoctors = async (req, res) => {
  try {
    const doctors = await User.findAll({
      where: { role: DOCTOR_ROLE },
      order: [["createdAt", "DESC"]],
      attributes: ["id", "username", "firstName", "lastName", "email", "role", "createdAt"],
    });

    return res.json({
      success: true,
      data: { doctors },
    });
  } catch (error) {
    console.error("List doctors error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to list doctors",
    });
  }
};

const createDoctor = async (req, res) => {
  try {
    const { username, firstName, lastName, email, password } = req.body;

    if (!username || !firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Username, first name, last name, email, and password are required",
      });
    }

    const doctor = await User.create({
      username,
      firstName,
      lastName,
      email,
      password,
      role: DOCTOR_ROLE,
    });

    return res.status(201).json({
      success: true,
      message: "Doctor account created",
      data: { doctor: doctor.toJSON() },
    });
  } catch (error) {
    console.error("Create doctor error:", error);

    if (error.name === "SequelizeUniqueConstraintError") {
      const field = error.errors?.[0]?.path || "field";
      return res.status(400).json({
        success: false,
        message: `${field} already exists`,
      });
    }

    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.errors.map((err) => err.message),
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to create doctor",
    });
  }
};

const deleteDoctor = async (req, res) => {
  try {
    const { doctorId } = req.params;

    const doctor = await User.findByPk(doctorId);

    if (!doctor || doctor.role !== DOCTOR_ROLE) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    await doctor.destroy();

    return res.json({
      success: true,
      message: "Doctor removed successfully",
    });
  } catch (error) {
    console.error("Delete doctor error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to remove doctor",
    });
  }
};

const assignDoctorToPatient = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { patientId } = req.body;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: "Patient ID is required",
      });
    }

    const doctor = await User.findByPk(doctorId);
    if (!doctor || doctor.role !== DOCTOR_ROLE) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    const patient = await Patient.findByPk(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    patient.primaryDoctorId = doctorId;
    await patient.save();

    return res.json({
      success: true,
      message: "Doctor assigned to patient",
      data: { patient: patient.toJSON() },
    });
  } catch (error) {
    console.error("Assign doctor error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to assign doctor",
    });
  }
};

module.exports = {
  listDoctors,
  createDoctor,
  deleteDoctor,
  assignDoctorToPatient,
};
