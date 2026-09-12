require("dotenv").config();

const sequelize = require("../config/db");
const SchoolInfo = require("../models/SchoolInfo");
async function createSchool() {
  try {
    await sequelize.sync();
    await SchoolInfo.create({
      name: "École Privée Mohamed Tayeb School",
      address: "Cité ELhouda - elfaouar",
      email: "contact@ecole.tn",
      phone: "+216 73 200 145",
      director: "Mr Mohamed ben brahim",
      academic_year: "2026/2027",
    });
    console.log("School Info created");
    process.exit();
  } catch (err) {
    console.log(err);
    process.exit();
  }
}
createSchool();
