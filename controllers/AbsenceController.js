const { body, validationResult } = require("express-validator");
const Student = require("../models/Student");
const Absence = require("../models/Absence");
const Teacher = require("../models/Teacher");
const Supervisor = require("../models/Supervisor");
const Employ = require("../models/Employ");
const Subject = require("../models/Subject");

exports.createStudentAbsence = [
    body("reason")
        .trim()
        .notEmpty()
        .withMessage("Absence reason is required."),

    body("date")
        .notEmpty()
        .withMessage("Absence date is required.")
        .isISO8601()
        .withMessage("Invalid absence date."),

    body("justification")
        .notEmpty()
        .withMessage("Justification is required.")
        .isBoolean()
        .withMessage("Justification must be true or false."),

    body("person_id")
        .notEmpty()
        .withMessage("Student ID is required.")
        .isInt()
        .withMessage("Invalid student ID."),

    async (req, res) => {
        try {
            const errors = validationResult(req);

            if (!errors.isEmpty()) {
                return res.status(400).json({
                    message: "Validation failed",
                    errors: errors.array(),
                });
            }

            const {
                reason,
                date,
                justification,
                person_id
            } = req.body;

            const student = await Student.findByPk(person_id);

            if (!student) {
                return res.status(404).json({
                    message: "Student not found."
                });
            }

            const absence = await Absence.create({
                reason,
                date,
                justification,
                person_type: "élève",
                person_id
            });

            return res.status(201).json({
                message: "Student absence added successfully.",
                absence
            });

        } catch (error) {
            console.error("Create student absence error:", error);

            return res.status(500).json({
                message: "Server error."
            });
        }
    }
];

exports.createTeacherAbsence = [
    body("reason")
        .trim()
        .notEmpty()
        .withMessage("Absence reason is required."),

    body("date")
        .notEmpty()
        .withMessage("Absence date is required.")
        .isISO8601()
        .withMessage("Invalid absence date."),

    body("justification")
        .notEmpty()
        .withMessage("Justification is required.")
        .isBoolean()
        .withMessage("Justification must be true or false."),

    body("person_id")
        .notEmpty()
        .withMessage("teacher ID is required.")
        .isInt()
        .withMessage("Invalid teacher ID."),

    async (req, res) => {
        try {
            const errors = validationResult(req);

            if (!errors.isEmpty()) {
                return res.status(400).json({
                    message: "Validation failed",
                    errors: errors.array(),
                });
            }

            const {
                reason,
                date,
                justification,
                person_id
            } = req.body;

            const teacher = await Teacher.findByPk(person_id);

            if (!teacher) {
                return res.status(404).json({
                    message: "teacher not found."
                });
            }

            const absence = await Absence.create({
                reason,
                date,
                justification,
                person_type: "maître",
                person_id
            });

            return res.status(201).json({
                message: "teacher absence added successfully.",
                absence
            });

        } catch (error) {
            console.error("Create teacher absence error:", error);

            return res.status(500).json({
                message: "Server error."
            });
        }
    }
];

exports.createSupervisorAbsence = [
    body("reason")
        .trim()
        .notEmpty()
        .withMessage("Absence reason is required."),

    body("date")
        .notEmpty()
        .withMessage("Absence date is required.")
        .isISO8601()
        .withMessage("Invalid absence date."),

    body("justification")
        .notEmpty()
        .withMessage("Justification is required.")
        .isBoolean()
        .withMessage("Justification must be true or false."),

    body("person_id")
        .notEmpty()
        .withMessage("supervisor ID is required.")
        .isInt()
        .withMessage("Invalid supervisor ID."),

    async (req, res) => {
        try {
            const errors = validationResult(req);

            if (!errors.isEmpty()) {
                return res.status(400).json({
                    message: "Validation failed",
                    errors: errors.array(),
                });
            }

            const {
                reason,
                date,
                justification,
                person_id
            } = req.body;

            const supervisor = await Supervisor.findByPk(person_id);

            if (!supervisor) {
                return res.status(404).json({
                    message: "supervisor not found."
                });
            }

            const absence = await Absence.create({
                reason,
                date,
                justification,
                person_type: "surveillants",
                person_id
            });

            return res.status(201).json({
                message: "Supervisor absence added successfully.",
                absence
            });

        } catch (error) {
            console.error("Create supervisor absence error:", error);

            return res.status(500).json({
                message: "Server error."
            });
        }
    }
];

exports.createEmployAbsence = [
    body("reason")
        .trim()
        .notEmpty()
        .withMessage("Absence reason is required."),

    body("date")
        .notEmpty()
        .withMessage("Absence date is required.")
        .isISO8601()
        .withMessage("Invalid absence date."),

    body("justification")
        .notEmpty()
        .withMessage("Justification is required.")
        .isBoolean()
        .withMessage("Justification must be true or false."),

    body("person_id")
        .notEmpty()
        .withMessage("Employ ID is required.")
        .isInt()
        .withMessage("Invalid employ ID."),

    async (req, res) => {
        try {
            const errors = validationResult(req);

            if (!errors.isEmpty()) {
                return res.status(400).json({
                    message: "Validation failed",
                    errors: errors.array(),
                });
            }

            const {
                reason,
                date,
                justification,
                person_id
            } = req.body;

            const employ = await Employ.findByPk(person_id);

            if (!employ) {
                return res.status(404).json({
                    message: "Employ not found."
                });
            }

            const absence = await Absence.create({
                reason,
                date,
                justification,
                person_type: "employé",
                person_id
            });

            return res.status(201).json({
                message: "Employ absence added successfully.",
                absence
            });

        } catch (error) {
            console.error("Create employ absence error:", error);

            return res.status(500).json({
                message: "Server error."
            });
        }
    }
];

exports.getAllAbsenceStudent = async (req, res) => {
    try {
        const absences = await Absence.findAll({
            where: {
                person_type: "élève"
            },
            order: [["createdAt", "DESC"]],
        });

        const persons = await Promise.all(
            absences.map(async (absence) => {

                const student = await Student.findByPk(absence.person_id);

                if (!student) {
                    return {
                        ...absence.toJSON(),
                        student: null
                    };
                }


                return {
                    ...absence.toJSON(),
                    person: {
                        id: student.id,
                        name: student.name,
                        last_name: student.last_name,
                        class: student.class
                    }
                };
            })
        );

        return res.status(200).json({
            message: "Absence students retrieved successfully.",
            persons,
        });

    } catch (error) {
        console.error("Get student absences error:", error);

        return res.status(500).json({
            message: "Server error.",
        });
    }
};

exports.getAllAbsenceSupervisor = async (req, res) => {
    try {
        const absences = await Absence.findAll({
             where: {
                person_type: "surveillants"
            },
            order: [["createdAt", "DESC"]],
        });

        const persons = await Promise.all(
            absences.map(async (absence) => {

                const supervisor = await Supervisor.findByPk(absence.person_id);

                if (!supervisor) {
                    return {
                        ...absence.toJSON(),
                        supervisor: null
                    };
                }


                return {
                    ...absence.toJSON(),
                    person: {
                        id: supervisor.id,
                        name: supervisor.name,
                        last_name: supervisor.last_name,
                        role: supervisor.role
                    }
                };
            })
        );

        return res.status(200).json({
            message: "Absence supervisors retrieved successfully.",
            persons,
        });

    } catch (error) {
        console.error("Get supervisors error:", error);

        return res.status(500).json({
            message: "Server error.",
        });
    }
};

exports.getAllAbsenceTeacher = async (req, res) => {
    try {
        const absences = await Absence.findAll({
             where: {
                person_type: "maître"
            },
            order: [["createdAt", "DESC"]],
        });

        const persons = await Promise.all(
            absences.map(async (absence) => {

                const teacher = await Teacher.findByPk(absence.person_id,{
                    include:[{
                        model:Subject,
                        as:"subject"
                    }]
                });

                if (!teacher) {
                    return {
                        ...absence.toJSON(),
                        teacher: null
                    };
                }
                return {
                    ...absence.toJSON(),
                    person: {
                        id: teacher.id,
                        name: teacher.name,
                        last_name: teacher.last_name,
                        subjects: teacher.subject.map(subject => subject.label)
                    }
                };
            })
        );

        return res.status(200).json({
            message: "Absence teacher retrieved successfully.",
            persons,
        });

    } catch (error) {
        console.error("Get teacher error:", error);

        return res.status(500).json({
            message: "Server error.",
        });
    }
};

exports.getAllAbsenceEmploys = async (req, res) => {
    try {
        const absences = await Absence.findAll({
             where: {
                person_type: "employé"
            },
            order: [["createdAt", "DESC"]],
        });

        const persons = await Promise.all(
            absences.map(async (absence) => {

                const employ = await Employ.findByPk(absence.person_id);

                if (!employ) {
                    return {
                        ...absence.toJSON(),
                        employ: null
                    };
                }


                return {
                    ...absence.toJSON(),
                    person: {
                        id: employ.id,
                        name: employ.name,
                        last_name: employ.last_name,
                        role: employ.role
                    }
                };
            })
        );

        return res.status(200).json({
            message: "Absence employs retrieved successfully.",
            persons,
        });

    } catch (error) {
        console.error("Get employs error:", error);

        return res.status(500).json({
            message: "Server error.",
        });
    }
};