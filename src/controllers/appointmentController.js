const { Op } = require("sequelize");
const { Appointment, Patient, User } = require("../models");

const ALLOWED_STATUSES = [
  "scheduled",
  "pending",
  "confirmed",
  "reschedule_requested",
  "completed",
  "cancelled",
];
const STAFF_ROLES = ["manager", "staff"];
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

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

  const existing = await Patient.findOne({ where: { userId: user.id } });
  if (existing) {
    return existing;
  }

  return Patient.create({
    userId: user.id,
    firstName: user.firstName || "Patient",
    lastName: user.lastName || "User",
    email: user.email,
  });
};

const ensureSchedulingWindow = async ({
  appointmentDate,
  patientId,
  doctorId,
  excludeAppointmentId,
}) => {
  const requestedDate = new Date(appointmentDate);
  if (Number.isNaN(requestedDate.getTime())) {
    throw new Error("INVALID_DATE");
  }

  const now = new Date();
  const isSameCalendarDay = requestedDate.toDateString() === now.toDateString();
  if (isSameCalendarDay) {
    throw new Error("SAME_DAY_NOT_ALLOWED");
  }

  const startOfDay = new Date(requestedDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const conflicts = await Appointment.findAll({
    where: {
      appointmentDate: {
        [Op.between]: [startOfDay, endOfDay],
      },
      id: excludeAppointmentId
        ? {
            [Op.ne]: excludeAppointmentId,
          }
        : { [Op.not]: null },
      [Op.or]: [{ doctorId }, { patientId }],
    },
  });

  for (const conflict of conflicts) {
    const diff = Math.abs(
      new Date(conflict.appointmentDate).getTime() - requestedDate.getTime()
    );

    if (diff < SIX_HOURS_MS) {
      throw new Error("WINDOW_TOO_CLOSE");
    }
  }
};

const createAppointment = async (req, res) => {
  try {
    if (req.user.role !== "patient") {
      return res.status(403).json({
        success: false,
        message: "Only patients can create appointments",
      });
    }

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

    const resolvedDoctorId = doctorId;

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

    try {
      await ensureSchedulingWindow({
        appointmentDate,
        patientId: resolvedPatientId,
        doctorId: resolvedDoctorId,
      });
    } catch (error) {
      if (error.message === "INVALID_DATE") {
        return res.status(400).json({
          success: false,
          message: "Invalid appointment date",
        });
      }

      if (error.message === "SAME_DAY_NOT_ALLOWED") {
        return res.status(400).json({
          success: false,
          message: "Same-day appointments are not allowed",
        });
      }

      if (error.message === "WINDOW_TOO_CLOSE") {
        return res.status(400).json({
          success: false,
          message: "Appointments must be at least 6 hours apart for the same day",
        });
      }

      throw error;
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

    if (req.user.role !== "patient") {
      return res.status(403).json({
        success: false,
        message: "Only patients can update appointments",
      });
    }

    if (patientUserId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Patients can only manage their own appointments",
      });
    }

    const allowedFields = new Set(["appointmentDate", "reason", "notes", "status", "location"]);
    Object.keys(updates).forEach((key) => {
      if (!allowedFields.has(key)) {
        delete updates[key];
      }
    });

    if (updates.status && !ALLOWED_STATUSES.includes(updates.status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment status",
      });
    }

    const isCancellation = updates.status === "cancelled";
    if (!isCancellation) {
      if (appointment.status !== "reschedule_requested") {
        return res.status(400).json({
          success: false,
          message: "Appointment must be marked for reschedule before changes",
        });
      }

      if (!updates.appointmentDate) {
        return res.status(400).json({
          success: false,
          message: "Provide a new appointment date to reschedule",
        });
      }

      try {
        await ensureSchedulingWindow({
          appointmentDate: updates.appointmentDate,
          patientId: appointment.patientId,
          doctorId: appointment.doctorId,
          excludeAppointmentId: appointment.id,
        });
      } catch (error) {
        if (error.message === "INVALID_DATE") {
          return res.status(400).json({
            success: false,
            message: "Invalid appointment date",
          });
        }

        if (error.message === "SAME_DAY_NOT_ALLOWED") {
          return res.status(400).json({
            success: false,
            message: "Same-day appointments are not allowed",
          });
        }

        if (error.message === "WINDOW_TOO_CLOSE") {
          return res.status(400).json({
            success: false,
            message: "Appointments must be at least 6 hours apart for the same day",
          });
        }

        throw error;
      }

      updates.status = updates.status || "scheduled";
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

    if (req.user.role !== "patient" || patientUserId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Only the patient can cancel this appointment",
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
