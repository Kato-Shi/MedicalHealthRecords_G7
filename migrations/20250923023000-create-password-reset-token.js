"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.sequelize.query(
            'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";',
        );
        await queryInterface.createTable("PasswordResetTokens", {
            id: {
                allowNull: false,
                primaryKey: true,
                type: Sequelize.UUID,
                defaultValue: Sequelize.literal("uuid_generate_v4()"),
            },
            userId: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: "Users",
                    key: "id",
                },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
            },
            token: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true,
            },
            expiresAt: {
                type: Sequelize.DATE,
                allowNull: false,
            },
            used: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
            },
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable("PasswordResetTokens");
    },
};
