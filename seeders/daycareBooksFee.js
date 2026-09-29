require("dotenv").config();

const sequelize = require("../config/db");
const bcrypt = require("bcryptjs");

const DaycareBooksFee = require("../models/DaycareBooksFee");

const DEFAULT_LEVELS = [
    { level_id: "prescolaire", label: "التحضيري", uniform: 0, books: 0, books_disabled: false, order: 1 },
    { level_id: "annee1", label: "السنة الأولى", uniform: 0, books: 0, books_disabled: false, order: 2 },
    { level_id: "annee2", label: "السنة الثانية", uniform: 0, books: 0, books_disabled: false, order: 3 },
    { level_id: "annee3", label: "السنة الثالثة", uniform: 0, books: 0, books_disabled: false, order: 4 },
    { level_id: "annee4", label: "السنة الرابعة", uniform: 0, books: 0, books_disabled: false, order: 5 },
    { level_id: "annee5", label: "السنة الخامسة", uniform: 0, books: 0, books_disabled: true, order: 6 },
    { level_id: "annee6", label: "السنة السادسة", uniform: 0, books: 0, books_disabled: true, order: 7 },
];

async function seedDaycareBooksFees() {
        await sequelize.sync();

  try {
    for (const level of DEFAULT_LEVELS) {
      await DaycareBooksFee.findOrCreate({
        where: {
          level_id: level.level_id,
        },
        defaults: level,
      });
    }

    console.log("✅ Daycare & Books fees seeded successfully");
    process.exit()
  } catch (error) {
    console.error("❌ Error seeding fees:", error);
    process.exit()

  }
}

seedDaycareBooksFees();