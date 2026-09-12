const DaycareBooksFee = require("../models/DaycareBooksFee");

// GET /api/settings/daycare-books-fees
exports.getDaycareBooksFees = async (req, res) => {
    try {
        const levels = await DaycareBooksFee.findAll({
            order: [["order", "ASC"]],
        });
        return res.status(200).json({
            success: true,
            data: levels,
        });
    } catch (error) {
        console.error("Erreur getDaycareBooksFees:", error);
        return res.status(500).json({
            success: false,
            message: "حدث خطأ أثناء جلب معاليم الميدعة والكتب",
            error: error.message,
        });
    }
};

// PUT /api/settings/daycare-books-fees (bulk update)
exports.updateDaycareBooksFees = async (req, res) => {
    try {
        const { levels } = req.body;

        if (!Array.isArray(levels) || levels.length === 0) {
            return res.status(400).json({
                success: false,
                message: "قائمة المستويات مطلوبة ويجب أن تكون غير فارغة",
            });
        }

        for (const lvl of levels) {
            const levelId = lvl.level_id || lvl.id;

            if (!levelId) {
                return res.status(400).json({
                    success: false,
                    message: "معرّف المستوى (level_id) مفقود",
                });
            }

            const daycare = Number(lvl.daycare) || 0;
            const booksDisabled = Boolean(lvl.books_disabled);
            const books = booksDisabled ? 0 : Number(lvl.books) || 0;

            if (daycare < 0 || books < 0) {
                return res.status(400).json({
                    success: false,
                    message: `القيم يجب أن تكون موجبة للمستوى ${levelId}`,
                });
            }

            await DaycareBooksFee.update(
                {
                    daycare,
                    books,
                    books_disabled: booksDisabled,
                },
                {
                    where: { level_id: levelId },
                }
            );
        }

        const updatedLevels = await DaycareBooksFee.findAll({
            order: [["order", "ASC"]],
        });

        return res.status(200).json({
            success: true,
            message: "تم تحديث معاليم الميدعة والكتب بنجاح",
            data: updatedLevels,
        });
    } catch (error) {
        console.error("Erreur updateDaycareBooksFees:", error);
        return res.status(500).json({
            success: false,
            message: "حدث خطأ أثناء تحديث معاليم الميدعة والكتب",
            error: error.message,
        });
    }
};

// PATCH /api/settings/daycare-books-fees/:levelId (single update)
exports.updateSingleLevel = async (req, res) => {
    try {
        const { levelId } = req.params;
        const { daycare, books, books_disabled } = req.body;

        const level = await DaycareBooksFee.findOne({ where: { level_id: levelId } });

        if (!level) {
            return res.status(404).json({
                success: false,
                message: "المستوى غير موجود",
            });
        }

        if (daycare !== undefined) {
            if (Number(daycare) < 0) {
                return res.status(400).json({
                    success: false,
                    message: "معاليم الميدعة لا يمكن أن تكون سالبة",
                });
            }
            level.daycare = Number(daycare);
        }

        if (books_disabled !== undefined) {
            level.books_disabled = Boolean(books_disabled);
        }

        if (books !== undefined && !level.books_disabled) {
            if (Number(books) < 0) {
                return res.status(400).json({
                    success: false,
                    message: "معاليم الكتب لا يمكن أن تكون سالبة",
                });
            }
            level.books = Number(books);
        }

        if (level.books_disabled) {
            level.books = 0;
        }

        await level.save();

        return res.status(200).json({
            success: true,
            message: "تم تحديث المستوى بنجاح",
            data: level,
        });
    } catch (error) {
        console.error("Erreur updateSingleLevel:", error);
        return res.status(500).json({
            success: false,
            message: "حدث خطأ أثناء تحديث المستوى",
            error: error.message,
        });
    }
};