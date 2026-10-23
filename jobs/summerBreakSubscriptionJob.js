// jobs/summerBreakSubscriptionJob.js
const cron = require("node-cron");
const { Op } = require("sequelize");
const Subscription = require("../models/Subscription");
const JobLog = require("../models/JobLog");
const SchoolYear = require("../models/SchoolYear");

const JOB_NAME = "summer_break_subscriptions";

const toDateOnly = (d) => d.toISOString().slice(0, 10); // 'YYYY-MM-DD'

const addDays = (dateStr, days) => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return toDateOnly(d);
};

// the school year whose break starts today (day after its end_date)
async function findSchoolYearEndingToday(dateStr) {
    const schoolYears = await SchoolYear.findAll();
    return schoolYears.find((y) => addDays(y.end_date, 1) === dateStr) || null;
}

// "YYYY-summer", keyed by the school year that just ended
async function currentSummerBreakPeriod(date = new Date()) {
    const dateStr = toDateOnly(date);
    const schoolYear = await findSchoolYearEndingToday(dateStr);
    if (!schoolYear) return null;

    const year = new Date(schoolYear.start_date).getFullYear();
    return `${year}-summer`;
}

async function hasRunForPeriod(period) {
    const log = await JobLog.findOne({ where: { job_name: JOB_NAME, period } });
    return !!log;
}

async function runSummerBreakSubscriptionJob() {
    const period = await currentSummerBreakPeriod();

    if (!period) {
        console.log(`[${JOB_NAME}] not the day after a school year's end_date, skipping`);
        return;
    }

    if (await hasRunForPeriod(period)) {
        console.log(`[${JOB_NAME}] already ran for ${period}, skipping`);
        return;
    }

    const [deactivated] = await Subscription.update(
        { is_active: false, deactivated_by_break: true },
        { where: { is_active: true } }
    );

    await JobLog.create({ job_name: JOB_NAME, period });
    console.log(`[${JOB_NAME}] deactivated ${deactivated} subscriptions for ${period}`);
}

function startSummerBreakSubscriptionJob() {
    runSummerBreakSubscriptionJob().catch(err => {
        console.error(`[${JOB_NAME}] boot run failed:`, err);
    });

    // school year end_date isn't fixed, so run daily and let
    // currentSummerBreakPeriod() decide, from SchoolYear, whether
    // today is the day after a school year ended
    cron.schedule("10 0 * * *", () => runSummerBreakSubscriptionJob().catch(err =>
        console.error(`[${JOB_NAME}] scheduled run failed:`, err)));
}

module.exports = {
    runSummerBreakSubscriptionJob,
    startSummerBreakSubscriptionJob,
    hasRunForPeriod,
    currentSummerBreakPeriod,
    JOB_NAME
};