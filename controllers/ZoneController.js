const { validationResult, body } = require("express-validator");
const Zone = require("../models/Zone");
const User = require("../models/Users");
const ActivityLog = require("../models/ActivityLog");

const getUser = async (req) => {
    const userId = req.userId;
    return await User.findByPk(userId);
};

// Helper for activity logs
const createActivityLog = async (
    req,
    action,
    entityType,
    entityId,
    entityName,
    description
) => {
    const user = await getUser(req);

    await ActivityLog.create({
        action,
        entity_type: entityType,
        entity_id: entityId,
        entity_name: entityName,
        description,
        user_name: `${user.name} ${user.last_name}`,
        user_role: user.role,
        user_id: user.id,
    });
};

// =========================
// CREATE ZONE
// =========================
exports.createZone = [
    body("label")
        .trim()
        .notEmpty()
        .withMessage("Label is required."),

    body("amount")
        .notEmpty()
        .withMessage("Amount is required.")
        .isNumeric()
        .withMessage("Amount must be a number.")
        .custom((value) => {
            if (Number(value) < 0) {
                throw new Error("Amount cannot be negative.");
            }
            return true;
        }),

    body("amount_yearly")
        .notEmpty()
        .withMessage("Amount yearly is required.")
        .isNumeric()
        .withMessage("Amount yearly must be a number.")
        .custom((value) => {
            if (Number(value) < 0) {
                throw new Error("Amount yearly cannot be negative.");
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
                amount,
                amount_yearly
            } = req.body;

            const zone = await Zone.create({
                label,
                amount,
                amount_yearly
            });

           await createActivityLog(
                req,
                "create",
                "zone",
                zone.id,
                zone.label,
                `تمت إضافة المنطقة ${zone.label}`
            );


            return res.status(201).json({
                message: "Zone added successfully.",
                zone,
            });

        } catch (error) {
            console.error("Create zone error:", error);

            return res.status(500).json({
                message: "Server error.",
            });
        }
    }
];


// =========================
// GET ALL ZONES
// =========================
exports.getAllZone = async (req, res) => {
    try {
        const zones = await Zone.findAll({
            where: {
                is_deleted: false
            },
            order: [["createdAt", "DESC"]],
        });

        return res.status(200).json({
            message: "Zones retrieved successfully.",
            zones,
        });

    } catch (error) {
        console.error("Get zones error:", error);

        return res.status(500).json({
            message: "Server error.",
        });
    }
};


// =========================
// UPDATE ZONE
// =========================
exports.updateZone = [
    body("label")
        .trim()
        .notEmpty()
        .withMessage("Label is required."),

    body("amount")
        .notEmpty()
        .withMessage("Amount is required.")
        .isNumeric()
        .withMessage("Amount must be a number.")
        .custom((value) => {
            if (Number(value) < 0) {
                throw new Error("Amount cannot be negative.");
            }
            return true;
        }),

    body("amount_yearly")
        .notEmpty()
        .withMessage("Amount yearly is required.")
        .isNumeric()
        .withMessage("Amount yearly must be a number.")
        .custom((value) => {
            if (Number(value) < 0) {
                throw new Error("Amount yearly cannot be negative.");
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

            const zone = await Zone.findOne({
                where: {
                    id,
                    is_deleted: false
                }
            });

            if (!zone) {
                return res.status(404).json({
                    message: "Zone not found.",
                });
            }

            const oldLabel = zone.label;
            const oldAmount = zone.amount;
            const oldAmountYearly = zone.amount_yearly;

            const {
                label,
                amount,
                amount_yearly
            } = req.body;

            await zone.update({
                label,
                amount,
                amount_yearly
            });

           await createActivityLog(
                req,
                "update",
                "zone",
                zone.id,
                zone.label,
                `تم تعديل المنطقة ${oldLabel} - الشهري: ${oldAmount} → ${amount} - السنوي: ${oldAmountYearly} → ${amount_yearly}`
            );

            return res.status(200).json({
                message: "Zone updated successfully.",
                zone,
            });

        } catch (error) {
            console.error("Update zone error:", error);

            return res.status(500).json({
                message: "Server error.",
            });
        }
    }
];


// =========================
// DELETE ZONE
// =========================
exports.deleteZone = async (req, res) => {
    try {
        const { id } = req.params;

        const zone = await Zone.findOne({
            where: {
                id,
                is_deleted: false
            }
        });

        if (!zone) {
            return res.status(404).json({
                message: "Zone not found.",
            });
        }
        const zoneName = zone.label;
        // Soft delete
        await zone.update({
            is_deleted: true
        });

        await createActivityLog(
            req,
            "delete",
            "zone",
            zone.id,
            zoneName,
            `تم حذف المنطقة ${zoneName}`
        );

        return res.status(200).json({
            message: "Zone deleted successfully.",
        });

    } catch (error) {
        console.error("Delete zone error:", error);

        return res.status(500).json({
            message: "Server error.",
        });
    }
};