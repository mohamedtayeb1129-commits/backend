const express = require("express");
require("dotenv").config();
const cors = require("cors");
const sequelize = require("./config/db");
const app = express();
const appStart = require("./app");
require("./models/index")

const { startMonthlySubscriptionJob } = require("./jobs/generateMonthlySubscriptions");
const { startFinalizeStaffSalariesJob } = require("./jobs/finalizeStaffSalaries");
const { startSummerBreakSubscriptionJob } = require("./jobs/summerBreakSubscriptionJob");



const port = process.env.PORT || 5000;

const startDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Neon PostgreSQL connected");

    await sequelize.sync({ alter: true });
    console.log("✅ Database synchronized");
  } catch (error) {
    console.error("❌ Database error:", error);
  }
};

startDatabase();
app.use(express.json());
app.use(cors());

app.use("/api/v1", appStart);


app.listen(port, async () => {
  console.log(`Server started on port ${port}`);

  try {
    // order matters: the break job must not run at the same time as the monthly job
    await startSummerBreakSubscriptionJob();
    startMonthlySubscriptionJob();
    startFinalizeStaffSalariesJob();
  } catch (err) {
    console.error("Failed to start jobs:", err);
  }
});