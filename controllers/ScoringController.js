const { body, validationResult, param } = require("express-validator");
const Teacher = require("../models/Teacher");
const Scoring = require("../models/Scoring");
const { Op, fn, col } = require("sequelize");
const { createActivityLog } = require("../utils/createActivityLog");

function getPayYearOf(value) {
  let y, m, d;
  if (typeof value === "string") {
    [y, m, d] = value.slice(0, 10).split("-").map(Number);
  } else {
    const dt = new Date(value);
    y = dt.getFullYear();
    m = dt.getMonth() + 1;
    d = dt.getDate();
  }
  return m === 12 && d > 20 ? y + 1 : y;
}



exports.createScoring = [
    body("noticed")
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ max: 255 })
        .withMessage("Noticed must not exceed 255 characters."),

    body("sense")
        .notEmpty()
        .withMessage("Sense is required.")
        .isIn(["دخول", "خروج"])
        .withMessage("Invalid sense."),

    body("date")
        .notEmpty()
        .withMessage("Date is required.")
        .isISO8601()
        .withMessage("Invalid date."),

    body("time")
        .notEmpty()
        .withMessage("Time is required.")
        .matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/)
        .withMessage("Invalid time."),

    body("justification")
        .notEmpty()
        .withMessage("Justification is required.")
        .isBoolean()
        .withMessage("Justification must be true or false."),

    body("teacher_id")
        .notEmpty()
        .withMessage("Teacher ID is required.")
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
                noticed,
                sense,
                date,
                time,
                justification,
                teacher_id
            } = req.body;
            const teacher = await Teacher.findByPk(teacher_id);

            if (!teacher) {
                return res.status(404).json({
                    message: "Teacher not found."
                });
            }
            const scoring = await Scoring.create({
                noticed,
                sense,
                date,
                time,
                justification,
                teacher_id
            });

           await createActivityLog(
                req,
                "scoring",
                "scoring",
                scoring.id,
                `${teacher.name} ${teacher.last_name}`,
                `تمت إضافة سجل ${sense} للأستاذ ${teacher.name} ${teacher.last_name} بتاريخ ${date}`
            );
            


            return res.status(201).json({
                message: "Scoring added successfully.",
                scoring
            });

        } catch (error) {
            console.error("Create scoring error:", error);

            return res.status(500).json({
                message: "Server error."
            });
        }
    }
];

exports.getAllScoring = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 8, 1), 100);
    const offset = (page - 1) * limit;

    const year = parseInt(req.query.year, 10) || null;
    const month = parseInt(req.query.month, 10) || null; // 1-12, only used with year
    const sense = req.query.sense || null;
    const search = (req.query.search || "").trim();

    const where = {};

    if (year) {
      const pad = (n) => String(n).padStart(2, "0");
      let start, end;
      if (month && month >= 1 && month <= 12) {
        start = `${year}-${pad(month)}-01`;
        end = month === 12 ? `${year + 1}-01-01` : `${year}-${pad(month + 1)}-01`;
      } else {
        start = `${year}-01-01`;
        end = `${year + 1}-01-01`;
      }
      where.date = { [Op.gte]: start, [Op.lt]: end };
    }

    if (sense) where.sense = sense;

    if (search) {
      const like = { [Op.like]: `%${search}%` };
      where[Op.or] = [
        { "$scoringTeacher.name$": like },
        { "$scoringTeacher.last_name$": like },
        { noticed: like },
      ];
    }

    const { count, rows } = await Scoring.findAndCountAll({
      where,
      include: [
        {
          model: Teacher,
          as: "scoringTeacher",
          attributes: ["id", "name", "last_name"],
        },
      ],
      order: [
        ["date", "DESC"],
        ["createdAt", "DESC"],
      ],
      limit,
      offset,
      distinct: true,
    });

     const dateRows = await Scoring.findAll({
      attributes: [[fn("DISTINCT", col("date")), "date"]],
      raw: true,
    });
    const years = [
      ...new Set(dateRows.filter((r) => r.date).map((r) => getPayYearOf(r.date))),
    ].sort((a, b) => b - a);

    return res.status(200).json({
      message: "scoring retrieved successfully.",
      scoring: rows,
      years,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.max(Math.ceil(count / limit), 1),
      },
    });
  } catch (error) {
    console.error("Get scoring error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

const scoringRules = [
    body("noticed")
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ max: 255 })
        .withMessage("Noticed must not exceed 255 characters."),

    body("sense")
        .notEmpty()
        .withMessage("Sense is required.")
        .isIn(["دخول", "خروج"])
        .withMessage("Invalid sense."),

    body("date")
        .notEmpty()
        .withMessage("Date is required.")
        .isISO8601()
        .withMessage("Invalid date."),

    body("time")
        .notEmpty()
        .withMessage("Time is required.")
        .matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/)
        .withMessage("Invalid time."),

    body("justification")
        .notEmpty()
        .withMessage("Justification is required.")
        .isBoolean()
        .withMessage("Justification must be true or false."),

    body("teacher_id")
        .notEmpty()
        .withMessage("Teacher ID is required.")
        .isInt()
        .withMessage("Invalid teacher ID."),
];

exports.updateScoring = [
    param("id").isInt().withMessage("Invalid scoring ID."),
    ...scoringRules,

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
            const { noticed, sense, date, time, justification, teacher_id } = req.body;

            const scoring = await Scoring.findByPk(id);
            if (!scoring) {
                return res.status(404).json({ message: "Scoring not found." });
            }

            const teacher = await Teacher.findByPk(teacher_id);
            if (!teacher) {
                return res.status(404).json({ message: "Teacher not found." });
            }

            await scoring.update({
                noticed,
                sense,
                date,
                time,
                justification,
                teacher_id,
            });
            await createActivityLog(
            req,
            "update",
            "scoring",
            scoring.id,
            `${teacher.name} ${teacher.last_name}`,
            `تم تعديل سجل ${sense} للأستاذ ${teacher.name} ${teacher.last_name} بتاريخ ${date}`
        );

            return res.status(200).json({
                message: "Scoring updated successfully.",
                scoring,
            });
        } catch (error) {
            console.error("Update scoring error:", error);
            return res.status(500).json({ message: "Server error." });
        }
    },
];


exports.deleteScoring = [
    param("id").isInt().withMessage("Invalid scoring ID."),

    async (req, res) => {
        try {
            const errors = validationResult(req);

            if (!errors.isEmpty()) {
                return res.status(400).json({
                    message: "Validation failed",
                    errors: errors.array(),
                });
            }

            const scoring = await Scoring.findByPk(req.params.id);
            if (!scoring) {
                return res.status(404).json({ message: "Scoring not found." });
            }
            const teacher = await Teacher.findByPk(scoring.teacher_id);

            await createActivityLog(
                req,
                "delete",
                "scoring",
                scoring.id,
                teacher ? `${teacher.name} ${teacher.last_name}` : "أستاذ محذوف",
                `تم حذف سجل ${scoring.sense} للأستاذ ${teacher ? `${teacher.name} ${teacher.last_name}` : "غير معروف"} بتاريخ ${scoring.date}`
            );

            await scoring.destroy();

            return res.status(200).json({ message: "Scoring deleted successfully." });
        } catch (error) {
            console.error("Delete scoring error:", error);
            return res.status(500).json({ message: "Server error." });
        }
    },
];