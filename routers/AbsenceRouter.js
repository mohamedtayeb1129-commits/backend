const express = require("express");
const { createStudentAbsence, createTeacherAbsence, createSupervisorAbsence, createEmployAbsence, getAllAbsenceStudent, getAllAbsenceTeacher, getAllAbsenceSupervisor, getAllAbsenceEmploys, updateAbsence, deleteAbsence } = require("../controllers/AbsenceController");
const router = express.Router()

router.get("/student",getAllAbsenceStudent)
router.get("/teacher",getAllAbsenceTeacher)
router.get("/supervisor",getAllAbsenceSupervisor)
router.get("/employ",getAllAbsenceEmploys)

router.post("/student",createStudentAbsence)
router.post("/teacher",createTeacherAbsence)
router.post("/supervisor",createSupervisorAbsence)
router.post("/employ",createEmployAbsence)

router.put("/:id",updateAbsence)
router.delete("/:id",deleteAbsence)

module.exports = router