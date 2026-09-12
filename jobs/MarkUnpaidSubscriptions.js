// jobs/markUnpaidSubscriptions.js
const cron = require("node-cron");
const { Op } = require("sequelize");
const Subscription = require("../models/Subscription");
const JobLog = require("../models/JobLog");

const JOB_NAME = "mark_unpaid_subscriptions";

// Calendar-month billing cycle now (1st -> 1st).
// Job runs on the 1st, so it closes out the period that just ended: last month.
function closedPeriod(date = new Date()) {
    const prev = new Date(date.getFullYear(), date.getMonth() - 1, 1);
    return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
}

function periodRange(period) {
    const [year, month] = period.split("-").map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    return { start, end };
}

async function hasRunThisMonth(period = closedPeriod()) {
    const log = await JobLog.findOne({ where: { job_name: JOB_NAME, period } });
    return !!log;
}

async function runMarkUnpaidSubscriptionsJob() {
    const period = closedPeriod();

    if (await hasRunThisMonth(period)) {
        console.log(`[${JOB_NAME}] already ran for ${period}, skipping`);
        return;
    }

    const { start, end } = periodRange(period);

    const [updatedCount] = await Subscription.update(
        { status: "non payé" },
        {
            where: {
                status: "en attente",
                createdAt: { [Op.gte]: start, [Op.lt]: end },
            },
        }
    );

    await JobLog.create({ job_name: JOB_NAME, period });
    console.log(`[${JOB_NAME}] marked ${updatedCount} subscriptions as non payé for ${period}`);
}

function startMarkUnpaidSubscriptionsJob() {
    // run once on boot, in case a scheduled run was missed during downtime
    runMarkUnpaidSubscriptionsJob().catch(err => {
        console.error(`[${JOB_NAME}] boot run failed:`, err);
    });

    // 1st of every month, 00:10 (5 min after subscription generation)
    cron.schedule("10 0 1 * *", () => {
        runMarkUnpaidSubscriptionsJob().catch(err => {
            console.error(`[${JOB_NAME}] scheduled run failed:`, err);
        });
    }, { timezone: "Africa/Tunis" });
}

module.exports = {
    runMarkUnpaidSubscriptionsJob,
    startMarkUnpaidSubscriptionsJob,
    hasRunThisMonth,
    closedPeriod,
    JOB_NAME
};