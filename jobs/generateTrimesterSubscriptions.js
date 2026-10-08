// jobs/generateTrimesterSubscriptions.js
const cron = require("node-cron");
const { Op } = require("sequelize");
const Student = require("../models/Student");
const Zone = require("../models/Zone");
const Subscription = require("../models/Subscription");
const TuitionFee = require("../models/TuitionFee");
const JobLog = require("../models/JobLog");
const Holiday = require("../models/Holiday");
const SchoolYear = require("../models/SchoolYear");

const JOB_NAME = "generate_trimester_subscriptions";

// how many days after a trimester start the job is still allowed to run (catch-up if server was down)
const CATCHUP_DAYS = 14;

function toDateOnly(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function daysBetween(fromDateOnly, toDateOnlyStr) {
    return Math.floor((new Date(toDateOnlyStr) - new Date(fromDateOnly)) / 86400000);
}

// the school year that contains the given day (DATEONLY strings compare correctly as text)
async function getSchoolYearFor(today) {
    return SchoolYear.findOne({
        where: {
            start_date: { [Op.lte]: today },
            end_date: { [Op.gte]: today },
        },
    });
}

// Trimester starts for a school year:
//   T1 -> school_years.start_date
//   T2 -> first day of the earliest term-1 holiday inside that school year
//   T3 -> first day of the earliest term-2 holiday inside that school year
// Period key stays "YYYY-T1" (year T1 starts in) so existing JobLog rows still match
async function getTrimesterStarts(schoolYear) {
    const year = Number(String(schoolYear.start_date).slice(0, 4));

    const holidays = await Holiday.findAll({
        where: {
            start_date: { [Op.between]: [schoolYear.start_date, schoolYear.end_date] },
        },
        order: [["start_date", "ASC"]],
    });

    const firstStartOfTerm = term => {
        const h = holidays.find(h => h.term === term);
        return h ? h.start_date : null; // DATEONLY -> "YYYY-MM-DD"
    };

    const starts = [
        { period: `${year}-T1`, start: schoolYear.start_date },
        { period: `${year}-T2`, start: firstStartOfTerm(1) },
        { period: `${year}-T3`, start: firstStartOfTerm(2) },
    ];

    for (const t of starts) {
        if (!t.start) {
            console.warn(`[${JOB_NAME}] no holiday found for ${t.period}, that trimester will be skipped`);
        }
    }

    return starts.filter(t => t.start);
}

// Returns the most recently started trimester if we're within CATCHUP_DAYS of its start, else null
async function currentTrimester(date = new Date()) {
    const today = toDateOnly(date);

    const schoolYear = await getSchoolYearFor(today);
    if (!schoolYear) return null;

    const starts = await getTrimesterStarts(schoolYear);

    const started = starts
        .filter(t => t.start <= today)
        .sort((a, b) => a.start.localeCompare(b.start));

    if (started.length === 0) return null;

    const latest = started[started.length - 1];
    if (daysBetween(latest.start, today) > CATCHUP_DAYS) return null;

    return { period: latest.period, start: latest.start, schoolYear };
}

async function currentTrimesterPeriod(date = new Date()) {
    const t = await currentTrimester(date);
    return t ? t.period : null;
}

async function hasRunForPeriod(period) {
    const log = await JobLog.findOne({ where: { job_name: JOB_NAME, period } });
    return !!log;
}

async function runTrimesterSubscriptionJob() {
    const trimester = await currentTrimester();

    if (!trimester) {
        console.log(`[${JOB_NAME}] not a trimester-start window, skipping`);
        return;
    }

    const { period, start, schoolYear } = trimester;

    if (await hasRunForPeriod(period)) {
        console.log(`[${JOB_NAME}] already ran for ${period}, skipping`);
        return;
    }

    // monthly tuition fees, one per class level
    const monthlyFees = await TuitionFee.findAll({ where: { type: "monthly" } });
    if (monthlyFees.length === 0) {
        // throw before JobLog is written so the job retries on the next daily run
        throw new Error(`no monthly TuitionFee rows found, cannot compute amounts for ${period}`);
    }
    const feeByLevel = Object.fromEntries(monthlyFees.map(f => [f.label, f]));

    const month = start.slice(0, 7); // "YYYY-MM" of the trimester start

    const students = await Student.findAll({ where: { is_deleted: false } });
    const zones = await Zone.findAll();
    const zoneMap = Object.fromEntries(zones.map(z => [z.id, z]));

    let created = 0;
    let existing = 0;
    let skipped = 0;

    for (const student of students) {
        const last = await Subscription.findOne({
            where: { student_id: student.id },
            order: [["month", "DESC"]],
        });

        if (!last) {
            continue;
        }

        // only regenerate for students actually on the quarterly plan
        if (last.payment_type !== "يدفع بالثلاثي") continue;

        const fee = feeByLevel[student.class];
        if (!fee) {
            console.warn(`[${JOB_NAME}] student ${student.id}: no monthly fee for class "${student.class}"`);
            skipped++;
            continue;
        }

        const usesTransport = !!last.transport;
        const zone = last.zone_id ? zoneMap[last.zone_id] : null;

        // zone is only required when the student uses transport
        if (usesTransport && !zone) {
            console.warn(`[${JOB_NAME}] student ${student.id}: transport=true but zone ${last.zone_id} not found`);
            skipped++;
            continue;
        }

        // quarterly = (monthly tuition for the class + zone amount) * 3
        // no one-time additions (book/uniform) on renewal
        let amount = (fee.amount + (zone ? zone.amount : 0)) * 3;

        // findOrCreate relies on the unique index (student_id, school_year_id, month),
        // so re-running the job never creates duplicates
        const [, wasCreated] = await Subscription.findOrCreate({
            where: {
                student_id: student.id,
                school_year_id: schoolYear.id,
                month,
            },
            defaults: {
                amount,
                transport: usesTransport,
                payment_type: "يدفع بالثلاثي",
                status: "non payé",
                zone_id: zone ? zone.id : null,
                is_take_book: !!last.is_take_book,
                is_take_uniform: !!last.is_take_uniform,
            },
        });

        wasCreated ? created++ : existing++;
    }

    await JobLog.create({ job_name: JOB_NAME, period });
    console.log(`[${JOB_NAME}] ${period}: created ${created}, already existed ${existing}, skipped ${skipped}`);
}

function startTrimesterSubscriptionJob() {
    runTrimesterSubscriptionJob().catch(err => {
        console.error(`[${JOB_NAME}] boot run failed:`, err);
    });

    // dates now come from the DB (school years + holidays), so check daily;
    // the job decides if today is inside a trimester-start window (JobLog prevents double runs)
    cron.schedule("5 0 * * *", () => runTrimesterSubscriptionJob().catch(err =>
        console.error(`[${JOB_NAME}] scheduled run failed:`, err)));
}

module.exports = {
    runTrimesterSubscriptionJob,
    startTrimesterSubscriptionJob,
    hasRunForPeriod,
    currentTrimesterPeriod, // async
    getTrimesterStarts,     // now takes a SchoolYear row, not a year number
    JOB_NAME
};