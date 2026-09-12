const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const DaycareBooksFee = sequelize.define("daycare_books_fees", {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    level_id: {
        type: DataTypes.ENUM(
            "prescolaire",
            "annee1",
            "annee2",
            "annee3",
            "annee4",
            "annee5",
            "annee6"
        ),
        allowNull: false
    },
    label: {
        type: DataTypes.STRING,
        allowNull: false
    },
    daycare: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    books: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    books_disabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
})

module.exports = DaycareBooksFee