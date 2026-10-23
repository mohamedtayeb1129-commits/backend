const express = require("express");
const { getAllEmploys, createEmploys, deleteEmploy, updateEmploy } = require("../controllers/EmploysController");
const router = express.Router()

router.get("/",getAllEmploys)
router.post("/",createEmploys)
router.delete("/:id",deleteEmploy)
router.put("/:id",updateEmploy)

module.exports = router