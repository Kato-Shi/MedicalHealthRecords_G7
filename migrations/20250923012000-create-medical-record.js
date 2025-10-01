"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("MedicalRecords", {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal("uuid_generate_v4()"),
      },
      patientId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "Patients",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      doctorId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "Users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      createdById: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "Users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      visitDate: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      diagnosis: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      treatmentPlan: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      followUpDate: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      attachments: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("NOW()"),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("NOW()"),
      },
    });

    await queryInterface.addIndex("MedicalRecords", ["patientId", "visitDate"]);
    await queryInterface.addIndex("MedicalRecords", ["doctorId", "visitDate"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("MedicalRecords");
  },
};
