const cron = require("node-cron");
const { Op } = require("sequelize");
const StaffSalary = require("../models/StaffSalary");
const Employ = require("../models/Employ");
const Supervisor = require("../models/Supervisor");
const JobLog = require("../models/JobLog");
const TeacherPayment = require("../models/TeacherPayment");
const SchoolYear = require("../models/SchoolYear");
const { recalculateAbsencesForPerson, STAFF_TYPE_TO_ABSENCE_TYPE } = require("../services/staffSalaryService");
const { calculateMonthlySalaries } = require("../services/salaryService");

const JOB_NAME = "finalize_monthly_payments"; // covers staff + teachers

const STAFF_TYPES = [
    { person_type: "employ", PersonModel: Employ },
    { person_type: "supervisor", PersonModel: Supervisor },
];

// Finalizes the PREVIOUS calendar month, whatever day the job runs.
function closedPeriod(date = new Date()) {
    const prev = new Date(date.getFullYear(), date.getMonth() - 1, 1);
    const month = prev.getMonth() + 1;
    const year = prev.getFullYear();
    return { month, year, period: `${year}-${String(month).padStart(2, "0")}` };
}

// The month that is opening now (the one we create "en attente" rows for).
function openPeriod(date = new Date()) {
    return { month: date.getMonth() + 1, year: date.getFullYear() };
}

// True if any part of the given month overlaps a school year.
// Status is ignored on purpose: a closed year still needs its last month finalized.
async function isMonthInSchoolYear(month, year) {
    const mm = String(month).padStart(2, "0");
    const lastDay = new Date(year, month, 0).getDate();
    const first = `${year}-${mm}-01`;
    const last = `${year}-${mm}-${String(lastDay).padStart(2, "0")}`;

    const found = await SchoolYear.findOne({
        where: {
            start_date: { [Op.lte]: last },
            end_date: { [Op.gte]: first },
        },
    });
    return !!found;
}

async function hasRunThisMonth(period) {
    const log = await JobLog.findOne({ where: { job_name: JOB_NAME, period } });
    return !!log;
}

// amount on TeacherPayment holds the total for that (teacher, month, year) row,
// so previous month's total is just a lookup by shifted period.
async function getPreviousMonthAmount(teacher_id, month, year) {
    let prevMonth = month - 1;
    let prevYear = year;
    if (prevMonth < 1) { prevMonth = 12; prevYear -= 1; }

    const prev = await TeacherPayment.findOne({
        where: { teacher_id, month: prevMonth, year: prevYear }
    });
    return prev ? prev.amount : null;
}

// Creates the "en attente" row for the opening month if it does not exist yet.
// recalculateAbsencesForPerson runs first so any logic it has (base salary,
// proration, absences) stays the single source of truth; findOrCreate is the safety net.
async function ensureOpenMonthRow(person_type, person, month, year) {
    const absencePersonType = STAFF_TYPE_TO_ABSENCE_TYPE[person_type];
    await recalculateAbsencesForPerson(person_type, person.id, month, year, absencePersonType);

    const [row, created] = await StaffSalary.findOrCreate({
        where: { person_type, person_id: person.id, month, year },
        defaults: {
            base_salary: person.salary, // <-- change to your real salary field name
            absence_days: 0,
            unjustified_absence_days: 0,
            days_in_month: new Date(year, month, 0).getDate(),
            status: "en attente",
        },
    });
    return created;
}

async function runFinalizeStaffSalariesJob() {
    const now = new Date();
    const { month, year, period } = closedPeriod(now);
    const open = openPeriod(now);

    if (await hasRunThisMonth(period)) {
        console.log(`[${JOB_NAME}] already ran for ${period}, skipping`);
        return;
    }

    // --- Staff (employés / surveillants): all year ---
    let recalculated = 0;
    let finalized = 0;
    let createdRows = 0;

    for (const { person_type, PersonModel } of STAFF_TYPES) {
        const absencePersonType = STAFF_TYPE_TO_ABSENCE_TYPE[person_type];
        const people = await PersonModel.findAll();

        // 1) Close the previous month
        for (const person of people) {
            await recalculateAbsencesForPerson(person_type, person.id, month, year, absencePersonType);
            recalculated++;
        }

        // Anything not already "payé" or "non payé" becomes "non payé".
        // Rows an admin marked "payé" are never overwritten.
        const [updatedCount] = await StaffSalary.update(
            { status: "non payé" },
            {
                where: {
                    person_type,
                    month,
                    year,
                    status: { [Op.notIn]: ["payé", "non payé"] },
                },
            }
        );
        finalized += updatedCount;

        // 2) Open the new month as "en attente"
        for (const person of people) {
            if (await ensureOpenMonthRow(person_type, person, open.month, open.year)) {
                createdRows++;
            }
        }
    }

    console.log(
        `[${JOB_NAME}] staff: recalculated ${recalculated}, finalized ${finalized} as non payé for ${period}, ` +
        `created ${createdRows} en attente rows for ${open.year}-${String(open.month).padStart(2, "0")}`
    );

    // --- Teachers: only for months inside a defined school year ---
    if (await isMonthInSchoolYear(month, year)) {
        const teacherResults = await calculateMonthlySalaries(month, year);

        const [teacherFinalized] = await TeacherPayment.update(
            { status: "non payé" },
            {
                where: {
                    month,
                    year,
                    status: { [Op.notIn]: ["payé", "non payé"] },
                },
            }
        );

        console.log(`[${JOB_NAME}] teachers: computed ${teacherResults.length}, finalized ${teacherFinalized} as non payé for ${period}`);
    } else {
        console.warn(`[${JOB_NAME}] ${period} is outside any school year, skipping teachers`);
    }

    await JobLog.create({ job_name: JOB_NAME, period });
}

function startFinalizeStaffSalariesJob() {
    // Boot catch-up run
    runFinalizeStaffSalariesJob().catch(err => {
        console.error(`[${JOB_NAME}] boot run failed:`, err);
    });

    // 1st of every month, 00:15 (after subscription + unpaid-marking jobs)
    cron.schedule("15 0 1 * *", () => {
        runFinalizeStaffSalariesJob().catch(err => {
            console.error(`[${JOB_NAME}] scheduled run failed:`, err);
        });
    }, { timezone: "Africa/Tunis" });
}

module.exports = {
    runFinalizeStaffSalariesJob,
    startFinalizeStaffSalariesJob,
    hasRunThisMonth,
    closedPeriod,
    openPeriod,
    isMonthInSchoolYear,
    getPreviousMonthAmount,
    JOB_NAME,
};