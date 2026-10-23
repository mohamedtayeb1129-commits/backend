const cron = require("node-cron");
const { calculateMonthlySalaries } = require("../services/salaryService");
const { calculateStaffSalaries } = require("../services/staffSalaryService");
const Employ = require("../models/Employ");
const Supervisor = require("../models/Supervisor");

function isWithinPayrollWindow(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // 1-12
    const day = date.getDate();

    // Cas 1 : septembre de l'année N, à partir du 15
    if (month === 9 && day >= 15) return true;

    // Cas 2 : octobre à décembre de l'année N
    if (month >= 10 && month <= 12) return true;

    // Cas 3 : janvier à juin de l'année N+1
    if (month >= 1 && month <= 6) return true;

    return false;
}

function startSalaryJobTest() {
    cron.schedule("*/10 * * * * *", async () => {
        try {
            const now = new Date();

            console.log("🧪 TEST salary job:", now.toLocaleString());

            const teacherResults = await calculateMonthlySalaries();
            console.log("Teacher salaries:", teacherResults);

            const employResults = await calculateStaffSalaries(
                "employ",
                Employ
            );
            console.log("Employé salaries:", employResults);

            const supervisorResults = await calculateStaffSalaries(
                "Supervisor",
                Supervisor
            );
            console.log("Surveillant salaries:", supervisorResults);

        } catch (err) {
            console.error("Salary job failed:", err);
        }
    });
}
module.exports = startSalaryJobTest;