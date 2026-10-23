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

function startSalaryJob() {
    cron.schedule("5 0 * * *", async () => {
        const now = new Date();

        if (now.getDate() !== 10) return;
        if (!isWithinPayrollWindow(now)) {
            console.log("Salary job skipped: outside payroll window (Sept 15 - June 30)");
            return;
        }

        try {
            console.log("Running salary job for", now.toISOString().slice(0, 10));

            const teacherResults = await calculateMonthlySalaries();
            console.log("Teacher salaries (hourly):", teacherResults);

            const employResults = await calculateStaffSalaries("employ", Employ);
            console.log("Employé salaries (absence-based):", employResults);

            const supervisorResults = await calculateStaffSalaries("supervisor", Supervisor);
            console.log("Surveillant salaries (absence-based):", supervisorResults);
        } catch (err) {
            console.error("Salary job failed:", err);
        }
    });
}

module.exports = startSalaryJob;