const express = require("express");
const { getAllSupervisors, createSupervisors, deleteSupervisor, updateSupervisor } = require("../controllers/SupervisorsController");
const router = express.Router()

router.get("/",getAllSupervisors)
router.post("/",createSupervisors)
router.delete("/:id",deleteSupervisor)
router.put("/:id",updateSupervisor)

module.exports = router