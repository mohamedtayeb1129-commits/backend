const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Holiday = sequelize.define(
    "holiday",
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        label: { type: DataTypes.STRING, allowNull: false }, // e.g. "عطلة الشتاء"
        term: {
            type: DataTypes.INTEGER, // 1 | 2 (no term 3 — that's the final-payment period, no holidays)
            allowNull: false,
            validate: { isIn: [[1, 2]] },
        },
        start_date: { type: DataTypes.DATEONLY, allowNull: false },
        end_date: { type: DataTypes.DATEONLY, allowNull: false }, // same as start_date for one day
    },
    {
        tableName: "holidays",
        underscored: true,
        validate: {
            endAfterStart() {
                if (this.end_date < this.start_date) {
                    throw new Error("end_date must be on or after start_date");
                }
            },
        },
    }
);

module.exports = Holiday;