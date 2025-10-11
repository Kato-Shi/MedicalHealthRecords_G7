"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class PasswordResetToken extends Model {
        static associate(models) {
            PasswordResetToken.belongsTo(models.User, {
                foreignKey: "userId",
                as: "user",
            });
        }
    }

    PasswordResetToken.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            userId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            token: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            expiresAt: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            used: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
        },
        {
            sequelize,
            modelName: "PasswordResetToken",
        },
    );

    return PasswordResetToken;
};
