const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const StaffPayment = sequelize.define("staff_payment", {
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
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
    },
    status: {
        type: DataTypes.ENUM("payé", "no payé", "en attente"),
        defaultValue: "en attente"
    }
}, {
    timestamps: true,
});

module.exports = StaffPayment