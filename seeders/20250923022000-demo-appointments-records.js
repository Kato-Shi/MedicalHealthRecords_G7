"use strict";

const { v4: uuidv4 } = require("uuid");

module.exports = {
  async up(queryInterface) {
    const patientId = await queryInterface.rawSelect(
      "Patients",
      {
        where: { email: "patient@example.com" },
      },
      ["id"],
    );

    const doctorId = await queryInterface.rawSelect(
      "Users",
      {
        where: { email: "drsmith@example.com" },
      },
      ["id"],
    );

    const staffId = await queryInterface.rawSelect(
      "Users",
      {
        where: { email: "staff@example.com" },
      },
      ["id"],
    );

    if (!patientId || !doctorId) {
      return;
    }

    const appointmentId = uuidv4();
    const createdById = staffId || doctorId;

    await queryInterface.bulkInsert(
      "Appointments",
      [
        {
          id: appointmentId,
          patientId,
          doctorId,
          createdById,
          appointmentDate: new Date(Date.now() + 86400000),
          status: "scheduled",
          reason: "Annual wellness visit",
          notes: "Patient requested early morning slot",
          location: "Room 204",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    );

    await queryInterface.bulkInsert(
      "MedicalRecords",
      [
        {
          id: uuidv4(),
          patientId,
          doctorId,
          createdById: doctorId,
          title: "Comprehensive wellness check",
          visitDate: new Date().toISOString().slice(0, 10),
          description: "Routine examination with vitals and lifestyle discussion.",
          diagnosis: "Overall good health; monitor blood pressure trends.",
          treatmentPlan: "Continue exercise regimen; follow-up labs in six months.",
          followUpDate: new Date(Date.now() + 15552000000).toISOString().slice(0, 10),
          attachments: [{
            type: "lab-order",
            description: "Requested lipid panel and CBC.",
          }],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("MedicalRecords", {
      title: "Comprehensive wellness check",
    });

    await queryInterface.bulkDelete("Appointments", {
      reason: "Annual wellness visit",
    });
  },
};
