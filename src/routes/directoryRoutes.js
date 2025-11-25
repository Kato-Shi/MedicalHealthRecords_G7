const express = require("express");
const { authenticateToken } = require("../middleware/auth");
const { listDoctorsForDirectory } = require("../controllers/directoryController");

const router = express.Router();

router.use(authenticateToken);

router.get("/doctors", listDoctorsForDirectory);

module.exports = router;
