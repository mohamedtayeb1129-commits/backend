// jobs/generateMonthlySubscriptions.js
const cron = require("node-cron");
const { Op } = require("sequelize");
const Student = require("../models/Student");
const Zone = require("../models/Zone");
const Price = require("../models/Price");
const Subscription = require("../models/Subscription");
const JobLog = require("../models/JobLog");
const SchoolYear = require("../models/SchoolYear");

const JOB_NAME = "generate_monthly_subscriptions";
const TIMEZONE = "Africa/Tunis";

// "YYYY-MM" in Tunisia time
function currentPeriod(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: TIMEZONE,
        year: "numeric",
        month: "2-digit",
    }).formatToParts(date);

    const year = parts.find((p) => p.type === "year").value;
    const month = parts.find((p) => p.type === "month").value;
    return `${year}-${month}`;
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

    const activeSchoolYear = await SchoolYear.findOne({
        where: { status: "active" },
        order: [["start_date", "DESC"]],
    });

    if (!activeSchoolYear) {
        console.log(`[${JOB_NAME}] no active school year found, skipping`);
        return;
    }

    const students = await Student.findAll({ where: { is_deleted: false } });
    const zones = await Zone.findAll();
    const prices = await Price.findAll({ where: { type: "monthly" } });

    const zoneMap = Object.fromEntries(zones.map((z) => [String(z.id), z]));
    const priceMap = Object.fromEntries(prices.map((p) => [p.label, p]));

    let created = 0;
    let existing = 0;
    let skipped = 0;
    let failed = 0;

    for (const student of students) {
        try {
            // template = the student's latest REAL subscription (has a payment type)
            const template = await Subscription.findOne({
                where: {
                    student_id: student.id,
                    payment_type: { [Op.ne]: null },
                },
                order: [["id", "DESC"]],
            });

            // only monthly payers get a new row every month
            if (!template || template.payment_type !== "يدفع شهريًا") {
                skipped++;
                continue;
            }

            const price = priceMap[student.class];
            if (!price) {
                console.warn(`[${JOB_NAME}] no monthly price for class "${student.class}" (student ${student.id})`);
                skipped++;
                continue;
            }

            let zoneAmount = 0;
            if (template.transport && template.zone_id) {
                const zone = zoneMap[String(template.zone_id)];
                if (!zone) {
                    console.warn(`[${JOB_NAME}] zone ${template.zone_id} not found (student ${student.id})`);
                    skipped++;
                    continue;
                }
                zoneAmount = parseFloat(zone.amount);
            }

            // books and uniform are one-time, so they are not added to monthly rows
            let amount = parseFloat(price.amount) + zoneAmount;

            if (template.promotion === "discount_50") amount = amount / 2;
            else if (template.promotion === "free") amount = 0;

            const [, wasCreated] = await Subscription.findOrCreate({
                where: {
                    student_id: student.id,
                    school_year_id: activeSchoolYear.id,
                    month: period,
                },
                defaults: {
                    amount,
                    transport: template.transport,
                    zone_id: template.zone_id,
                    payment_type: template.payment_type,
                    is_take_book: template.is_take_book,
                    is_take_uniform: template.is_take_uniform,
                    promotion: template.promotion,
                    siblings_count: template.siblings_count,
                    status: "non payé",
                },
            });

            if (wasCreated) created++;
            else existing++;
        } catch (err) {
            failed++;
            console.error(`[${JOB_NAME}] student ${student.id} failed:`, err.message);
        }
    }

    // log only if everything worked, so a failed run is retried on next boot
    // (safe to retry: findOrCreate never makes a second row)
    if (failed === 0) {
        await JobLog.create({ job_name: JOB_NAME, period });
    }

    console.log(
        `[${JOB_NAME}] ${period}: created ${created}, already existed ${existing}, skipped ${skipped}, failed ${failed}`
    );
}

function startMonthlySubscriptionJob() {
    // run once on boot in case a scheduled run was missed during downtime
    runMonthlySubscriptionJob().catch((err) => {
        console.error(`[${JOB_NAME}] boot run failed:`, err);
    });

    // 1st of every month at 00:05, Tunisia time
    cron.schedule(
        "5 0 1 * *",
        () => {
            runMonthlySubscriptionJob().catch((err) => {
                console.error(`[${JOB_NAME}] scheduled run failed:`, err);
            });
        },
        { timezone: TIMEZONE }
    );
}

module.exports = {
    runMonthlySubscriptionJob,
    startMonthlySubscriptionJob,
    hasRunThisMonth,
    currentPeriod,
    JOB_NAME,
};