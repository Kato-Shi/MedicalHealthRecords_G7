const { User } = require("../models");

const listDoctorsForDirectory = async (req, res) => {
  try {
    const doctors = await User.findAll({
      where: { role: "doctor" },
      order: [["lastName", "ASC"]],
      attributes: ["id", "username", "firstName", "lastName", "email", "role", "createdAt"],
    });

    return res.json({
      success: true,
      data: { doctors },
    });
  } catch (error) {
    console.error("Directory list doctors error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load doctors",
    });
  }
};

module.exports = {
  listDoctorsForDirectory,
};
