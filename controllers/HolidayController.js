const { validationResult, body } = require("express-validator");
const Holiday = require("../models/Holiday");

const {createActivityLog} = require("../utils/createActivityLog");

exports.getAllHoliday = async (req, res) => {
    try {
        const holidays = await Holiday.findAll({
            order: [["start_date", "DESC"]],
        });

        res.status(200).json(holidays);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch holidays",
            error: error.message,
        });
    }
};

exports.createHoliday = [

    body("label")
        .trim()
        .notEmpty()
        .withMessage("Holiday label is required"),

    body("term")
        .notEmpty()
        .withMessage("Term is required")
        .isInt({ min: 1, max: 3 })
        .withMessage("Term must be 1, 2, or 3"),

    body("start_date")
        .notEmpty()
        .withMessage("Start date is required")
        .isISO8601()
        .withMessage("Start date must be a valid date"),

    body("end_date")
        .notEmpty()
        .withMessage("End date is required")
        .isISO8601()
        .withMessage("End date must be a valid date")
        .custom((endDate, { req }) => {
            if (
                req.body.start_date &&
                new Date(endDate) < new Date(req.body.start_date)
            ) {
                throw new Error(
                    "End date must be on or after the start date"
                );
            }

            return true;
        }),

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
            label,
            term,
            start_date,
            end_date,
        } = req.body;

        const holiday = await Holiday.create({
            label,
            term,
            start_date,
            end_date,
        });

        await createActivityLog(
            req,
            "create",
            "holiday",
            holiday.id,
            holiday.label,
            `تمت إضافة العطلة ${holiday.label}`
        );

        res.status(201).json({
            message: "Holiday created successfully",
            holiday,
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to create holiday",
            error: error.message,
        });
    }
}
]

exports.updateHoliday = [
    body("label")
        .trim()
        .notEmpty()
        .withMessage("Holiday label is required"),

    body("term")
        .notEmpty()
        .withMessage("Term is required")
        .isInt({ min: 1, max: 3 })
        .withMessage("Term must be 1, 2, or 3"),

    body("start_date")
        .notEmpty()
        .withMessage("Start date is required")
        .isISO8601()
        .withMessage("Start date must be a valid date"),

    body("end_date")
        .notEmpty()
        .withMessage("End date is required")
        .isISO8601()
        .withMessage("End date must be a valid date")
        .custom((endDate, { req }) => {
            if (
                req.body.start_date &&
                new Date(endDate) < new Date(req.body.start_date)
            ) {
                throw new Error(
                    "End date must be on or after the start date"
                );
            }

            return true;
        }),

    async (req, res) => {
    try {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({
                message: "Validation failed",
                errors: errors.array(),
            });
        }

        const { id } = req.params;

        const {
            label,
            term,
            start_date,
            end_date,
        } = req.body;

        const holiday = await Holiday.findByPk(id);

        if (!holiday) {
            return res.status(404).json({
                message: "Holiday not found",
            });
        }

        await holiday.update({
            label,
            term,
            start_date,
            end_date,
        });

        await createActivityLog(
            req,
            "update",
            "holiday",
            holiday.id,
            holiday.label,
            `تم تعديل العطلة ${holiday.label}`
        );

        res.status(200).json({
            message: "Holiday updated successfully",
            holiday,
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to update holiday",
            error: error.message,
        });
    }
}
]
