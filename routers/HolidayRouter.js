const express = require("express");
const { getAllHoliday, createHoliday, updateHoliday } = require("../controllers/HolidayController");
const router = express.Router()

router.get("/",getAllHoliday)
router.post("/",createHoliday)
router.put("/:id",updateHoliday)

module.exports = router