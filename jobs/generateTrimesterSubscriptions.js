// jobs/generateTrimesterSubscriptions.js
const cron = require("node-cron");
const Student = require("../models/Student");
const Zone = require("../models/Zone");
const Subscription = require("../models/Subscription");
const JobLog = require("../models/JobLog");

const JOB_NAME = "generate_trimester_subscriptions";

// school year runs Sept -> June; Jan-Aug belongs to the year that started the previous September
function schoolYearStart(date = new Date()) {
    return date.getMonth() >= 8 ? date.getFullYear() : date.getFullYear() - 1;
}

// "YYYY-T1" / "YYYY-T2" / "YYYY-T3", keyed by the school year (year T1 starts in)
function currentTrimesterPeriod(date = new Date()) {
    const year = schoolYearStart(date);
    const m = date.getMonth(); // 0-indexed
    const d = date.getDate();

    if (m === 8 && d >= 15) return `${year}-T1`;       // Sept 15 -> Dec 27
    if (m === 11 && d >= 28) return `${year}-T2`;      // Dec 28 -> Mar 14
    if (m === 2 && d >= 29) return `${year}-T3`;       // Mar 29 -> June 30
    return null; // not a trimester-start day
}

async function hasRunForPeriod(period) {
    const log = await JobLog.findOne({ where: { job_name: JOB_NAME, period } });
    return !!log;
}

async function runTrimesterSubscriptionJob() {
    const period = currentTrimesterPeriod();

    if (!period) {
        console.log(`[${JOB_NAME}] not a trimester-start date, skipping`);
        return;
    }

    if (await hasRunForPeriod(period)) {
        console.log(`[${JOB_NAME}] already ran for ${period}, skipping`);
        return;
    }

    const students = await Student.findAll();
    const zones = await Zone.findAll();
    const zoneMap = Object.fromEntries(zones.map(z => [z.id, z]));

    let created = 0;
    let skipped = 0;

    for (const student of students) {
        const lastSubscription = await Subscription.findOne({
            where: { student_id: student.id },
            order: [["createdAt", "DESC"]]
        });

        if (!lastSubscription || !lastSubscription.zone_id) {
            skipped++;
            continue;
        }

        // only regenerate for students actually on the quarterly plan
        if (lastSubscription.payment_type !== "يدفع بالثلاثي") {
            continue;
        }

        const zone = zoneMap[lastSubscription.zone_id];
        if (!zone) {
            skipped++;
            continue;
        }

        await Subscription.create({
            amount: zone.amount * 3, // full trimester, no one-time addition on renewal
            transport: !!lastSubscription.transport,
            payment_type: "يدفع بالثلاثي",
            status: "non payé",
            student_id: student.id,
            zone_id: zone.id
        });

        created++;
    }

    await JobLog.create({ job_name: JOB_NAME, period });
    console.log(`[${JOB_NAME}] created ${created} subscriptions, skipped ${skipped} for ${period}`);
}

function startTrimesterSubscriptionJob() {
    runTrimesterSubscriptionJob().catch(err => {
        console.error(`[${JOB_NAME}] boot run failed:`, err);
    });

    // T1 start: Sept 15
    cron.schedule("5 0 15 9 *", () => runTrimesterSubscriptionJob().catch(err =>
        console.error(`[${JOB_NAME}] scheduled run failed:`, err)));

    // T2 start: Dec 28
    cron.schedule("5 0 28 12 *", () => runTrimesterSubscriptionJob().catch(err =>
        console.error(`[${JOB_NAME}] scheduled run failed:`, err)));

    // T3 start: Mar 29
    cron.schedule("5 0 29 3 *", () => runTrimesterSubscriptionJob().catch(err =>
        console.error(`[${JOB_NAME}] scheduled run failed:`, err)));
}

module.exports = {
    runTrimesterSubscriptionJob,
    startTrimesterSubscriptionJob,
    hasRunForPeriod,
    currentTrimesterPeriod,
    JOB_NAME
};