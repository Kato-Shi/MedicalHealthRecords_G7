"use strict";

const { v4: uuidv4 } = require("uuid");

module.exports = {
  async up(queryInterface) {
    const patientUserId = await queryInterface.rawSelect(
      "Users",
      {
        where: {
          email: "patient@example.com",
        },
      },
      ["id"],
    );

    const doctorId = await queryInterface.rawSelect(
      "Users",
      {
        where: {
          email: "drsmith@example.com",
        },
      },
      ["id"],
    );

    if (!patientUserId || !doctorId) {
      return;
    }

    await queryInterface.bulkInsert(
      "Patients",
      [
        {
          id: uuidv4(),
          userId: patientUserId,
          primaryDoctorId: doctorId,
          firstName: "Jamie",
          lastName: "Rivera",
          dateOfBirth: "1990-05-14",
          gender: "other",
          contactNumber: "+1-555-0100",
          email: "patient@example.com",
          address: "123 Wellness Way, Healthy City",
          emergencyContactName: "Alex Rivera",
          emergencyContactPhone: "+1-555-0199",
          medicalHistory: "Seasonal allergies. No known drug allergies.",
          notes: "Prefers telehealth follow-ups when possible.",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("Patients", {
      email: "patient@example.com",
    });
  },
};
