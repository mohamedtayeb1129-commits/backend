
const { validationResult, body } = require("express-validator");
const Employ = require("../models/Employ");
const ActivityLog = require("../models/ActivityLog");
const { User } = require("../models");
const StaffSalary = require("../models/StaffSalary");

const getUser = async (req) => {
        const userId = req.userId;
        const user = await User.findByPk(userId);
        return user
}
// ==================== CREATE ====================

exports.createEmploys = [
    body("name")
        .trim()
        .notEmpty()
        .withMessage("Name is required."),

    body("last_name")
        .trim()
        .notEmpty()
        .withMessage("Last name is required."),

    body("cin")
        .notEmpty()
        .withMessage("CIN is required.")
        .trim()
        .matches(/^\d{8}$/)
        .withMessage("Invalid CIN. CIN must contain exactly 8 digits."),

    body("phone")
        .optional({ checkFalsy: true })
        .trim()
        .matches(/^\d{8}$/)
        .withMessage("Invalid phone number."),

    body("salary")
        .notEmpty()
        .withMessage("Salary is required.")
        .isNumeric()
        .withMessage("Salary must be a number.")
        .custom((value) => {
            if (Number(value) < 0) {
                throw new Error("Salary cannot be negative.");
            }
            return true;
        }),

    body("status")
        .isIn(["نشط", "في إجازة", "غير نشط"])
        .withMessage("Invalid employ status."),

    body("role")
        .isIn([
            "كاتب(ة)",
            "محاسب(ة)",
            "سائق",
            "عامل(ة) نظافة",
            "عون أمن"
        ])
        .withMessage("Invalid employ role."),

    async (req, res) => {
        try {
            const errors = validationResult(req);
            const user = await getUser(req);

            if (!errors.isEmpty()) {
                return res.status(400).json({
                    message: "Validation failed",
                    errors: errors.array(),
                });
            }

            const {
                name,
                last_name,
                cin,
                phone,
                salary,
                date_deposited,
                status,
                role,
                joined_date,
            } = req.body;

            // Check CIN
            const existingEmploy = await Employ.findOne({
                where: { cin }
            });
          

            if (existingEmploy) {
                return res.status(400).json({
                    message: "CIN already exists."
                });
            }

            // Create employ
            const employ = await Employ.create({
                name,
                last_name,
                cin,
                phone,
                salary,
                date_deposited,
                status,
                role,
                joined_date
            });

              const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      const joinedDate = new Date(joined_date);

      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

      let workedDays = null;
      if (
        joinedDate.getFullYear() === currentYear &&
        joinedDate.getMonth() + 1 === currentMonth
      ) {
        workedDays = daysInMonth - joinedDate.getDate() + 1;
      }

await StaffSalary.create({
    person_type: "employ",
    person_id: employ.id,
   month: currentMonth,
    year: currentYear,
    base_salary: salary, // full contract salary — shown as-is in "الراتب الأساسي"
    absence_days: 0,
    unjustified_absence_days: 0,
    worked_days: workedDays, // null = full month, no proration
    days_in_month: daysInMonth,
});

            // Activity log
            await ActivityLog.create({
                action: "create",
                entity_type: "employ",
                entity_id: employ.id,
                entity_name: `${employ.name} ${employ.last_name}`,
                description: `تمت إضافة الموظف ${employ.name} ${employ.last_name}`,
                user_name: `${user.name} ${user.last_name}`,
                user_role: user.role,
                user_id: user.id,
            });

            return res.status(201).json({
                message: "Employ added successfully.",
                employ,
            });

        } catch (error) {
            console.error("Create employ error:", error);

            return res.status(500).json({
                message: "Server error.",
            });
        }
    }
];


// ==================== GET ALL ====================

exports.getAllEmploys = async (req, res) => {
    try {
        const employs = await Employ.findAll({
            where: {
                is_deleted: false
            },
            order: [["createdAt", "DESC"]],
        });

        return res.status(200).json({
            message: "Employs retrieved successfully.",
            employs,
        });

    } catch (error) {
        console.error("Get employs error:", error);

        return res.status(500).json({
            message: "Server error.",
        });
    }
};


// ==================== DELETE ====================

exports.deleteEmploy = async (req, res) => {
    try {
        const { id } = req.params;

        const employ = await Employ.findByPk(id);

        if (!employ) {
            return res.status(404).json({
                message: "Employ not found.",
            });
        }

        const user = await getUser(req);

        // Soft delete
        await employ.update({
            is_deleted: true
        });

        // Activity log
        await ActivityLog.create({
            action: "delete",
            entity_type: "employ",
            entity_id: employ.id,
            entity_name: `${employ.name} ${employ.last_name}`,
            description: `تم حذف الموظف ${employ.name} ${employ.last_name}`,
            user_name: `${user.name} ${user.last_name}`,
            user_role: user.role,
            user_id: user.id,
        });

        return res.status(200).json({
            message: "Employ deleted successfully.",
        });

    } catch (error) {
        console.error("Delete employ error:", error);

        return res.status(500).json({
            message: "Server error.",
        });
    }
};


// ==================== UPDATE ====================

exports.updateEmploy = [
    body("name")
        .trim()
        .notEmpty()
        .withMessage("Name is required."),

    body("last_name")
        .trim()
        .notEmpty()
        .withMessage("Last name is required."),

    body("cin")
        .notEmpty()
        .withMessage("CIN is required.")
        .trim()
        .matches(/^\d{8}$/)
        .withMessage("Invalid CIN. CIN must contain exactly 8 digits."),

    body("phone")
        .optional({ checkFalsy: true })
        .trim()
        .matches(/^\d{8}$/)
        .withMessage("Invalid phone number."),

    body("salary")
        .notEmpty()
        .withMessage("Salary is required.")
        .isNumeric()
        .withMessage("Salary must be a number.")
        .custom((value) => {
            if (Number(value) < 0) {
                throw new Error("Salary cannot be negative.");
            }
            return true;
        }),

    body("status")
        .isIn(["نشط", "في إجازة", "غير نشط"])
        .withMessage("Invalid employ status."),

    body("role")
        .isIn([
            "كاتب(ة)",
            "محاسب(ة)",
            "سائق",
            "عامل(ة) نظافة",
            "عون أمن"
        ])
        .withMessage("Invalid employ role."),

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
                name,
                last_name,
                cin,
                phone,
                salary,
                date_deposited,
                status,
                role
            } = req.body;

            // Find employ
            const employ = await Employ.findByPk(id);

            if (!employ) {
                return res.status(404).json({
                    message: "Employ not found.",
                });
            }

            // Check if CIN belongs to another employ
            const existingEmploy = await Employ.findOne({
                where: {
                    cin
                }
            });

            if (existingEmploy && existingEmploy.id !== employ.id) {
                return res.status(400).json({
                    message: "CIN already exists."
                });
            }

            const user = await getUser(req);

            // Update employ
            await employ.update({
                name,
                last_name,
                cin,
                phone,
                salary,
                date_deposited,
                status,
                role
            });

            // Activity log
            await ActivityLog.create({
                action: "update",
                entity_type: "employ",
                entity_id: employ.id,
                entity_name: `${employ.name} ${employ.last_name}`,
                description: `تم تعديل معلومات الموظف ${employ.name} ${employ.last_name}`,
                user_name: `${user.name} ${user.last_name}`,
                user_role: user.role,
                user_id: user.id,
            });

            return res.status(200).json({
                message: "Employ updated successfully.",
                employ,
            });

        } catch (error) {
            console.error("Update employ error:", error);

            return res.status(500).json({
                message: "Server error.",
            });
        }
    }
];

