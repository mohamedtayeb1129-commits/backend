const express = require("express");
const { createZone, getAllZone, deleteZone, updateZone } = require("../controllers/ZoneController");
const router = express.Router()

router.get("/",getAllZone)
router.post("/",createZone)
router.delete("/:id",deleteZone)
router.put("/:id",updateZone)

module.exports = router