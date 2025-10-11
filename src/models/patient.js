"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Patient extends Model {
    static associate(models) {
      this.belongsTo(models.User, {
        as: "user",
        foreignKey: "userId",
      });

      this.belongsTo(models.User, {
        as: "primaryDoctor",
        foreignKey: "primaryDoctorId",
      });

      this.hasMany(models.Appointment, {
        as: "appointments",
        foreignKey: "patientId",
        onDelete: "CASCADE",
      });

      this.hasMany(models.MedicalRecord, {
        as: "medicalRecords",
        foreignKey: "patientId",
        onDelete: "CASCADE",
      });
    }

    toJSON() {
      const values = { ...this.get() };
      return values;
    }
  }

  Patient.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      primaryDoctorId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      firstName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: {
            args: [2, 100],
            msg: "First name must be between 2 and 100 characters.",
          },
        },
      },
      lastName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: {
            args: [2, 100],
            msg: "Last name must be between 2 and 100 characters.",
          },
        },
      },
      dateOfBirth: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      gender: {
        type: DataTypes.ENUM("male", "female", "other", "undisclosed"),
        allowNull: true,
      },
      contactNumber: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          isEmail: {
            msg: "Please provide a valid email address.",
          },
        },
      },
      address: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      emergencyContactName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      emergencyContactPhone: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      medicalHistory: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Patient",
    },
  );

  return Patient;
};
