const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const StaffSalary = sequelize.define("staff_salary", {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    person_type: {
        type: DataTypes.ENUM("employ", "supervisor"),
        allowNull: false
    },
    person_id: {
        type: DataTypes.BIGINT,
        allowNull: false
    },
    month: {
        type: DataTypes.INTEGER,
    },
    year: {
        type: DataTypes.INTEGER,
    },
    base_salary: {
        type: DataTypes.DECIMAL(10, 2),
    },
    absence_days: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    unjustified_absence_days: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    worked_days: {                 // NEW: actual days worked this month (proration)
        type: DataTypes.INTEGER,
        allowNull: true
    },
    days_in_month: {               // NEW: total days in that month
        type: DataTypes.INTEGER,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM(
            "payé",
            "non payé",
            "en attente"
        ),
        defaultValue: "en attente",
    },
    total_salary: {
        type: DataTypes.DECIMAL(10, 2),
    }

}, {
    indexes: [
        { unique: true, fields: ["person_type", "person_id", "month", "year"] }
    ],
    hooks: {
        beforeSave: (staffSalary) => {
            if (staffSalary.base_salary !== null && staffSalary.base_salary !== undefined) {
                const base = parseFloat(staffSalary.base_salary);
                const daysInMonth = staffSalary.days_in_month || 30;
                const dailyRate = base / daysInMonth;

                // Prorate only if worked_days is explicitly set and less than full month
                let proratedBase = base;
                if (staffSalary.worked_days !== null && staffSalary.worked_days !== undefined) {
                    proratedBase = dailyRate * staffSalary.worked_days;
                }

                const deduction = dailyRate * (staffSalary.unjustified_absence_days || 0);
                let total = proratedBase - deduction;
                if (total < 0) total = 0;
                staffSalary.total_salary = total.toFixed(2);
            }
        }
    }
});

module.exports = StaffSalary;