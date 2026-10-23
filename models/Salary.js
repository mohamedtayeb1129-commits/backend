const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Teacher = require("./Teacher");

const Salary = sequelize.define("salary", {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    teacher_id: {
        type: DataTypes.BIGINT,
        references: {
            model: Teacher,
            key: "id"
        }
    },
    month: {
        type: DataTypes.INTEGER, // 1-12
    },
    year: {
        type: DataTypes.INTEGER,
    },
    total_hours: {
        type: DataTypes.DECIMAL(10, 2),
    },
    total_salary: {
        type: DataTypes.DECIMAL(10, 2),
    },
    anomalies: {
        type: DataTypes.INTEGER, // count of unmatched دخول/خروج
        defaultValue: 0
    }
})

module.exports = Salary