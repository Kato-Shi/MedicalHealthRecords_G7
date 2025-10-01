"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class MedicalRecord extends Model {
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

  MedicalRecord.init(
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
        allowNull: true,
      },
      createdById: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      visitDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      diagnosis: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      treatmentPlan: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      followUpDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      attachments: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "MedicalRecord",
    },
  );

  return MedicalRecord;
};
