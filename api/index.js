const app = require("../src/app");
const db = require("../src/models");

let connectionPromise;

async function ensureDatabaseConnection() {
  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = db.sequelize
    .authenticate()
    .then(() => {
      console.log("✅ Database connection ready for serverless request");
      return db.sequelize;
    })
    .catch((error) => {
      connectionPromise = null;
      throw error;
    });

  return connectionPromise;
}

module.exports = async (req, res) => {
  try {
    await ensureDatabaseConnection();
    return app(req, res);
  } catch (error) {
    console.error("❌ Failed to handle request in Vercel handler", error);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Unable to process request",
      });
    }
  }
};
