'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add new statuses to the existing enum
    await queryInterface.sequelize.query("ALTER TYPE \"enum_Appointments_status\" ADD VALUE IF NOT EXISTS 'pending';");
    await queryInterface.sequelize.query("ALTER TYPE \"enum_Appointments_status\" ADD VALUE IF NOT EXISTS 'confirmed';");
    await queryInterface.sequelize.query(
      "ALTER TYPE \"enum_Appointments_status\" ADD VALUE IF NOT EXISTS 'reschedule_requested';",
    );

    // Ensure the column definition matches the expanded enum and set a safer default
    await queryInterface.changeColumn('Appointments', 'status', {
      type: Sequelize.ENUM(
        'scheduled',
        'pending',
        'confirmed',
        'reschedule_requested',
        'completed',
        'cancelled',
      ),
      allowNull: false,
      defaultValue: 'confirmed',
    });
  },

  async down(queryInterface, Sequelize) {
    // Preserve data while resetting the default; enum values remain to avoid data loss.
    await queryInterface.changeColumn('Appointments', 'status', {
      type: Sequelize.ENUM(
        'scheduled',
        'pending',
        'confirmed',
        'reschedule_requested',
        'completed',
        'cancelled',
      ),
      allowNull: false,
      defaultValue: 'scheduled',
    });
  },
};
