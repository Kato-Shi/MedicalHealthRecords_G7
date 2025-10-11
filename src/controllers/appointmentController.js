const { Appointment, Patient, User } = require("../models");

const ALLOWED_STATUSES = ["scheduled", "completed", "cancelled"];
const STAFF_ROLES = ["admin", "manager", "staff"];

const APPOINTMENT_INCLUDE = [
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

const resolvePatientForUser = async (user) => {
  if (!user || user.role !== "patient") {
    return null;
  }

  return Patient.findOne({ where: { userId: user.id } });
};

const createAppointment = async (req, res) => {
  try {
    const {
      patientId,
      doctorId,
      appointmentDate,
      status,
      reason,
      notes,
      location,
    } = req.body;

    if (!appointmentDate) {
      return res.status(400).json({
        success: false,
        message: "Appointment date is required",
      });
    }

    let resolvedPatientId = patientId;
    if (req.user.role === "patient") {
      const patientProfile = await resolvePatientForUser(req.user);
      if (!patientProfile) {
        return res.status(400).json({
          success: false,
          message: "Create a patient profile before booking appointments",
        });
      }

      if (patientId && patientId !== patientProfile.id) {
        return res.status(403).json({
          success: false,
          message: "Patients can only book appointments for themselves",
        });
      }

      resolvedPatientId = patientProfile.id;
    }

    if (!resolvedPatientId) {
      return res.status(400).json({
        success: false,
        message: "Patient is required",
      });
    }

    const patient = await Patient.findByPk(resolvedPatientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    let resolvedDoctorId = doctorId;
    if (req.user.role === "doctor" && !doctorId) {
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

    if (status && !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment status",
      });
    }

    const appointment = await Appointment.create({
      patientId: resolvedPatientId,
      doctorId: resolvedDoctorId,
      appointmentDate,
      status: status || "scheduled",
      reason,
      notes,
      location,
      createdById: req.user.id,
    });

    const created = await Appointment.findByPk(appointment.id, {
      include: APPOINTMENT_INCLUDE,
    });

    return res.status(201).json({
      success: true,
      message: "Appointment created",
      data: {
        appointment: created.toJSON(),
      },
    });
  } catch (error) {
    console.error("Create appointment error:", error);

    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.errors.map((err) => err.message),
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to create appointment",
    });
  }
};

const getAppointments = async (req, res) => {
  try {
    const where = {};

    if (req.user.role === "patient") {
      const patientProfile = await resolvePatientForUser(req.user);
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

    const appointments = await Appointment.findAll({
      where,
      include: APPOINTMENT_INCLUDE,
      order: [["appointmentDate", "ASC"]],
    });

    return res.json({
      success: true,
      data: {
        appointments: appointments.map((appointment) => appointment.toJSON()),
      },
    });
  } catch (error) {
    console.error("Get appointments error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch appointments",
    });
  }
};

const getAppointmentById = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const appointment = await Appointment.findByPk(appointmentId, {
      include: APPOINTMENT_INCLUDE,
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    const patientUserId = appointment.patient?.user?.id;
    const canView =
      STAFF_ROLES.includes(req.user.role) ||
      (req.user.role === "doctor" && appointment.doctorId === req.user.id) ||
      (req.user.role === "patient" && patientUserId === req.user.id);

    if (!canView) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this appointment",
      });
    }

    return res.json({
      success: true,
      data: {
        appointment: appointment.toJSON(),
      },
    });
  } catch (error) {
    console.error("Get appointment error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch appointment",
    });
  }
};

const updateAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const updates = { ...req.body };

    const appointment = await Appointment.findByPk(appointmentId, {
      include: APPOINTMENT_INCLUDE,
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    const patientUserId = appointment.patient?.user?.id;
    const canManageAll = STAFF_ROLES.includes(req.user.role);
    const isDoctor = req.user.role === "doctor" && appointment.doctorId === req.user.id;
    const isPatient = req.user.role === "patient" && patientUserId === req.user.id;

    if (!canManageAll && !isDoctor && !isPatient) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this appointment",
      });
    }

    if (updates.status && !ALLOWED_STATUSES.includes(updates.status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment status",
      });
    }

    if (!canManageAll) {
      const allowedFields = new Set(["appointmentDate", "reason", "notes", "status"]);

      Object.keys(updates).forEach((key) => {
        if (!allowedFields.has(key)) {
          delete updates[key];
        }
      });
    }

    if (updates.patientId && canManageAll) {
      const patient = await Patient.findByPk(updates.patientId);
      if (!patient) {
        return res.status(404).json({
          success: false,
          message: "Patient not found",
        });
      }
    } else {
      delete updates.patientId;
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

      if (!canManageAll && !isDoctor) {
        delete updates.doctorId;
      }
    }

    await appointment.update(updates);
    await appointment.reload({ include: APPOINTMENT_INCLUDE });

    return res.json({
      success: true,
      message: "Appointment updated",
      data: {
        appointment: appointment.toJSON(),
      },
    });
  } catch (error) {
    console.error("Update appointment error:", error);

    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.errors.map((err) => err.message),
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to update appointment",
    });
  }
};

const deleteAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const appointment = await Appointment.findByPk(appointmentId, {
      include: APPOINTMENT_INCLUDE,
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    const patientUserId = appointment.patient?.user?.id;
    const canManageAll = STAFF_ROLES.includes(req.user.role);
    const isDoctor = req.user.role === "doctor" && appointment.doctorId === req.user.id;
    const isPatient = req.user.role === "patient" && patientUserId === req.user.id;

    if (!canManageAll && !isDoctor && !isPatient) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this appointment",
      });
    }

    await appointment.destroy();

    return res.json({
      success: true,
      message: "Appointment deleted",
    });
  } catch (error) {
    console.error("Delete appointment error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to delete appointment",
    });
  }
};

module.exports = {
  createAppointment,
  getAppointments,
  getAppointmentById,
  updateAppointment,
  deleteAppointment,
};
