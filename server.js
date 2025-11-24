/**
* Server Entry Point
* ------------------
* This file starts the Express server, initializes the database connection,
* synchronizes models (in development), and handles graceful shutdown.
*
* Key Responsibilities:
* - Authenticate connection to the database
* - Synchronize database models (development only)
* - Start Express server on specified PORT
* - Handle SIGTERM and SIGINT for clean shutdown
*/

const app = require("./src/app"); // Import the Express app
const db = require("./src/models"); // Import Sequelize models and database instance
const { DataTypes } = require("sequelize");

// Set server port (from .env or default to 3000)
const PORT = process.env.PORT || 3000;

/**
 * Ensures name fields exist on the Users table even if the migration has not
 * been run on the current database. This prevents login/registration failures
 * caused by a missing "firstName"/"lastName" column when older schemas are in
 * use (as seen in the Supabase screenshot).
 */
const ensureUserNameColumns = async () => {
  const queryInterface = db.sequelize.getQueryInterface();
  const table = await queryInterface.describeTable("Users");

  const addColumnIfMissing = async (column, definition) => {
    if (!table[column]) {
      await queryInterface.addColumn("Users", column, definition);
      console.log(`ℹ️ Added missing Users.${column} column`);
    }
  };

  await addColumnIfMissing("firstName", {
    type: DataTypes.STRING,
    allowNull: true,
  });

  await addColumnIfMissing("lastName", {
    type: DataTypes.STRING,
    allowNull: true,
  });
};

/**
* Starts the Express server and connects to the database.
*/
const startServer = async () => {
 try {
  // ✅ Test database connection
  await db.sequelize.authenticate();
  console.log("✅ Database connection established successfully.");

  // ✅ Backfill missing name columns if migrations have not run
  await ensureUserNameColumns();

   // ✅ Sync database models in development only
   // "sync()" automatically creates/updates tables based on models
   // ⚠️ WARNING: In production, always use migrations instead!
   if (process.env.NODE_ENV === "development") {
     await db.sequelize.sync({ alter: false }); // { alter: false } means no schema modifications
     console.log("✅ Database models synchronized.");
   }

   // ✅ Start Express server
   app.listen(PORT, () => {
     console.log(`🚀 Server is running on port ${PORT}`);
     console.log(`🔗 API Health Check: http://localhost:${PORT}/api/health`);
     console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
   });
 } catch (error) {
   // ❌ Handle startup errors (e.g., DB connection failed)
   console.error("❌ Unable to start server:", error);
   process.exit(1); // Exit process with failure code
 }
};

/**
* Graceful Shutdown Handlers
* --------------------------
* Ensures database connections are closed properly when the server
* receives termination signals (e.g., Ctrl+C or Kubernetes shutdown).
*/
process.on("SIGTERM", async () => {
 console.log("🛑 SIGTERM received, shutting down gracefully...");
 await db.sequelize.close(); // Close DB connection
 process.exit(0); // Exit cleanly
});

process.on("SIGINT", async () => {
 console.log("🛑 SIGINT received (Ctrl+C), shutting down gracefully...");
 await db.sequelize.close(); // Close DB connection
 process.exit(0); // Exit cleanly
});

// ✅ Initialize server
startServer();

