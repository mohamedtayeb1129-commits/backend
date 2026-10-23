const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Teacher = require("./Teacher");

const Scoring = sequelize.define("scoring", {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    noticed: {
        type: DataTypes.STRING,
    },
    sense: {
        type: DataTypes.ENUM("دخول", "خروج"),
    },
    date: {
        type: DataTypes.DATEONLY,
    },
    time: {
        type: DataTypes.TIME,
    },
    justification: {
        type: DataTypes.BOOLEAN,
    },
    teacher_id: {
        type: DataTypes.BIGINT,
        references: {
            model: Teacher,
            key: "id"
        }
    },
}, {
    hooks: {
        afterCreate: async (scoring) => {
            await recalcFor([{ teacher_id: scoring.teacher_id, date: scoring.date }]);
        },

        // If date or teacher_id changed, both the old and the new pay period / teacher must be recalculated
        afterUpdate: async (scoring) => {
            const targets = [{ teacher_id: scoring.teacher_id, date: scoring.date }];

            if (scoring.changed("date") || scoring.changed("teacher_id")) {
                targets.push({
                    teacher_id: scoring.previous("teacher_id"),
                    date: scoring.previous("date")
                });
            }

            await recalcFor(targets);
        },

        afterDestroy: async (scoring) => {
            await recalcFor([{ teacher_id: scoring.teacher_id, date: scoring.date }]);
        }
    }
});

// Recalculates each distinct (teacher, pay period) once
async function recalcFor(targets) {
    const { recalculateMonthForTeacher, getPayPeriodForDateOnly } = require("../services/salaryService");
    const seen = new Set();

    for (const { teacher_id, date } of targets) {
        if (!teacher_id || !date) continue;

        const { month, year } = getPayPeriodForDateOnly(String(date));
        const key = `${teacher_id}-${month}-${year}`;
        if (seen.has(key)) continue;
        seen.add(key);

        await recalculateMonthForTeacher(teacher_id, month, year);
    }
}

module.exports = Scoring;