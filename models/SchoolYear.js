const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const SchoolYear = sequelize.define(
  "school_year",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    label: { type: DataTypes.STRING, allowNull: false }, // e.g. "2026-2027"
    start_date: { type: DataTypes.DATEONLY, allowNull: false },
    end_date: { type: DataTypes.DATEONLY, allowNull: false },
  },
  {
    tableName: "school_years",
    underscored: true,
    validate: {
      endAfterStart() {
        if (this.end_date < this.start_date) {
          throw new Error("end_date must be on or after start_date");
        }
      },
    },
  },
);

module.exports = SchoolYear;
