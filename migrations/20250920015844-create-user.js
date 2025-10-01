"use strict";


module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`,
    );
    await queryInterface.createTable("Users", {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal("uuid_generate_v4()"),},
        username:{
          type: Sequelize.STRING,
          allowNull: false,
          unique: true,
        },
        email:{
          type: Sequelize.STRING,
          allowNull: false,
          unique: true,
          validate:{
            isEmail: true,
          },
        },
        password:{
          type: Sequelize.STRING,
          allowNull: false,
        },
        role:{
          type: Sequelize.ENUM("admin", "manager", "staff"),
          allowNull: false,
          defaultValue: "staff",
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal.NOW,
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal.NOW,
        },
    });
  },
  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable("Users");
    await queryInterface.sequelize.query(`DROP EXTENSION IF EXISTS "uuid-ossp";`,

    );
  },
};
