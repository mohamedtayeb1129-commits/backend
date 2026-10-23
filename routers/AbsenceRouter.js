const express = require("express");
const { createStudentAbsence, createTeacherAbsence, createSupervisorAbsence, createEmployAbsence, getAllAbsenceStudent, getAllAbsenceTeacher, getAllAbsenceSupervisor, getAllAbsenceEmploys } = require("../controllers/AbsenceController");
const router = express.Router()

router.get("/student",getAllAbsenceStudent)
router.get("/teacher",getAllAbsenceTeacher)
router.get("/supervisor",getAllAbsenceSupervisor)
router.get("/employ",getAllAbsenceEmploys)

router.post("/student",createStudentAbsence)
router.post("/teacher",createTeacherAbsence)
router.post("/supervisor",createSupervisorAbsence)
router.post("/employ",createEmployAbsence)

module.exports = router