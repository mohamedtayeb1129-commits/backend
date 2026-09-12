// jobs/generateMonthlySubscriptions.js
const cron = require("node-cron");
const Student = require("../models/Student");
const Zone = require("../models/Zone");
const Subscription = require("../models/Subscription");
const JobLog = require("../models/JobLog");

const JOB_NAME = "generate_monthly_subscriptions";

function currentPeriod(date = new Date()) {
    // "YYYY-MM"
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

async function hasRunThisMonth(period = currentPeriod()) {
    const log = await JobLog.findOne({ where: { job_name: JOB_NAME, period } });
    return !!log;
}

async function runMonthlySubscriptionJob() {
    const period = currentPeriod();

    if (await hasRunThisMonth(period)) {
        console.log(`[${JOB_NAME}] already ran for ${period}, skipping`);
        return;
    }

    const students = await Student.findAll();
    const zones = await Zone.findAll();
    const zoneMap = Object.fromEntries(zones.map(z => [z.id, z]));

    let created = 0;
    let skipped = 0;

    for (const student of students) {
        // most recent subscription tells us which zone this student is in
        const lastSubscription = await Subscription.findOne({
            where: { student_id: student.id },
            order: [["createdAt", "DESC"]]
        });

        if (!lastSubscription || !lastSubscription.zone_id) {
            skipped++;
            continue;
        }

        const zone = zoneMap[lastSubscription.zone_id];
        if (!zone) {
            skipped++;
            continue;
        }

        await Subscription.create({
            amount: zone.price,
            transport: !!lastSubscription.transport,
            status: "non payé",
            student_id: student.id,
            zone_id: zone.id
        });

        created++;
    }

    await JobLog.create({ job_name: JOB_NAME, period });
    console.log(`[${JOB_NAME}] created ${created} subscriptions, skipped ${skipped} for ${period}`);
}

function startMonthlySubscriptionJob() {
    // run once on boot, in case a scheduled run was missed during downtime
    runMonthlySubscriptionJob().catch(err => {
        console.error(`[${JOB_NAME}] boot run failed:`, err);
    });

    // then on the 1st of every month at 00:05
    cron.schedule("5 0 1 * *", () => {
        runMonthlySubscriptionJob().catch(err => {
            console.error(`[${JOB_NAME}] scheduled run failed:`, err);
        });
    });
}

module.exports = {
    runMonthlySubscriptionJob,
    startMonthlySubscriptionJob,
    hasRunThisMonth,
    currentPeriod,
    JOB_NAME
};