const express = require("express");
const { createStudent, getAllStudents, deleteStudents, updateStudent, reenrollStudent, previewPrice } = require("../controllers/StudentController");
const router = express.Router()

router.get("/",getAllStudents)
router.post("/",createStudent)
router.delete("/:id",deleteStudents)
router.post("/:id/reenroll",reenrollStudent)
router.put("/:id",updateStudent)
router.get("/price-preview", previewPrice);

module.exports = router