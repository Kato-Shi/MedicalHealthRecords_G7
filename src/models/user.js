"use strict";
const { Model } = require("sequelize");
const bcrypt = require("bcryptjs");
module.exports = (sequelize, DataTypes) => {
    class User extends Model {
        static associate(models) {
            // Link a user account to a patient profile when applicable
            this.hasOne(models.Patient, {
                as: "patientProfile",
                foreignKey: "userId",
            });

            // Allow doctors to have a panel of patients assigned to them
            this.hasMany(models.Patient, {
                as: "assignedPatients",
                foreignKey: "primaryDoctorId",
            });

            // Doctor schedule management
            this.hasMany(models.Appointment, {
                as: "appointmentsAsDoctor",
                foreignKey: "doctorId",
            });

            // Staff or doctors who booked an appointment
            this.hasMany(models.Appointment, {
                as: "appointmentsCreated",
                foreignKey: "createdById",
            });

            // Clinical documentation authored by the user
            this.hasMany(models.MedicalRecord, {
                as: "medicalRecordsAuthored",
                foreignKey: "doctorId",
            });

            this.hasMany(models.MedicalRecord, {
                as: "medicalRecordsCreated",
                foreignKey: "createdById",
            });

            this.hasMany(models.PasswordResetToken, {
                as: "passwordResetTokens",
                foreignKey: "userId",
            });
        }
        async validatePassword(password) {
            return bcrypt.compare(password, this.password);
        }
        toJSON() {
            const values = { ...this.get() };
            delete values.password;
            return values;
        }   
    }
    User.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            username: {
                type: DataTypes.STRING,
                allowNull: false,
                unique:{
                    msg: 'Username already exists.'
                },
                validate: {
                    len: {
                        args: [3, 50],
                        msg: "Username must be between 3 and 50 characters.",
                    },
                },
            },
            email: {
                type: DataTypes.STRING,
                allowNull: false,
                unique:{
                    msg: 'Email already exists.'
                },
                validate: {
                    isEmail: {
                        msg: "Must be a valid email address.",
                    },
                },
            },
            password: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    len: {
                        args: [6, 100],
                        msg: "Password must be at least 6 characters long.",
                    },
                },
            },
            role: {
                type: DataTypes.ENUM("admin", "manager", "staff", "doctor", "patient"),
                allowNull: false,
                defaultValue: "patient",
                validate: {
                    isIn: {
                        args: [["admin", "manager", "staff", "doctor", "patient"]],
                        msg: "Role must be admin, manager, staff, doctor, or patient.",
                    },
                },
            },
        },
        {
        sequelize,
        modelName: "User",
        hooks: {
            beforeCreate: async (user) => {
                if (user.password) {
                    const salt = await bcrypt.genSalt(10);
                    user.password = await bcrypt.hash(user.password, salt);
                }
            },
            beforeUpdate: async (user) => {
                if (user.changed('password')) {
                    const salt = await bcrypt.genSalt(10);
                    user.password = await bcrypt.hash(user.password, salt);
                }
            },
        },
    },
);
    return User;
};