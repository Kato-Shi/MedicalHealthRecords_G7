"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Appointment extends Model {
    static associate(models) {
      this.belongsTo(models.Patient, {
        as: "patient",
        foreignKey: "patientId",
      });

      this.belongsTo(models.User, {
        as: "doctor",
        foreignKey: "doctorId",
      });

      this.belongsTo(models.User, {
        as: "createdBy",
        foreignKey: "createdById",
      });
    }
  }

  Appointment.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      patientId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      doctorId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      createdById: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      appointmentDate: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("scheduled", "completed", "cancelled"),
        allowNull: false,
        defaultValue: "scheduled",
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      location: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Appointment",
    },
  );

  return Appointment;
};
