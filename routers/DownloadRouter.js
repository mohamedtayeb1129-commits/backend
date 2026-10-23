const express = require("express");
const { exportStudents, downloadReport, getAvailableReportPeriods } = require("../controllers/DownloadController");
const router = express.Router()

router.get("/students",exportStudents)
router.get("/reports", downloadReport);
router.get("/available-periods", getAvailableReportPeriods);

module.exports = router