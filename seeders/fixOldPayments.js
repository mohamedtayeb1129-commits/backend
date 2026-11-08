const Scoring = require("../models/Scoring");
const Teacher = require("../models/Teacher");
const TeacherPayment = require("../models/TeacherPayment");
const {
    recalculateMonthForTeacher,
    computeHoursFromRecords,
    getPayPeriodBounds,
    getPayPeriodForDateOnly
} = require("../services/salaryService");
const { Op } = require("sequelize");

const EDITABLE = ["en attente", "non payé"];
const DRY_RUN = process.env.DRY_RUN === "true";

async function up() {
    const targets = new Map(); // key: teacher-month-year

    // 1) periods that already have a payment row
    const payments = await TeacherPayment.findAll({
        attributes: ["teacher_id", "month", "year"],
        raw: true
    });
    for (const p of payments) {
        targets.set(`${p.teacher_id}-${p.month}-${p.year}`, {
            teacher_id: p.teacher_id,
            month: Number(p.month),
            year: Number(p.year)
        });
    }

    // 2) periods that have scoring records (calendar-month rule)
    const scorings = await Scoring.findAll({
        attributes: ["teacher_id", "date"],
        raw: true
    });
    for (const s of scorings) {
        if (!s.teacher_id || !s.date) continue;
        const { month, year } = getPayPeriodForDateOnly(String(s.date));
        targets.set(`${s.teacher_id}-${month}-${year}`, {
            teacher_id: s.teacher_id,
            month,
            year
        });
    }

    console.log(`${DRY_RUN ? "[DRY RUN] " : ""}${targets.size} periods to check`);

    let changed = 0;
    let paidMismatch = 0;

    for (const { teacher_id, month, year } of targets.values()) {
        const teacher = await Teacher.findByPk(teacher_id);
        if (!teacher) continue;

        const existing = await TeacherPayment.findOne({
            where: { teacher_id, month, year }
        });

        // New values, computed the same way as the service
        const { startDate, endDate } = getPayPeriodBounds(month, year);
        const records = await Scoring.findAll({
            where: { teacher_id, date: { [Op.between]: [startDate, endDate] } },
            order: [["date", "ASC"], ["time", "ASC"]]
        });
        const { hours } = computeHoursFromRecords(records);

        const rate =
            existing && existing.status !== "en attente" && existing.hour_rate != null
                ? parseFloat(existing.hour_rate)
                : parseFloat(teacher.price_by_hour || 0);
        const newHours = hours.toFixed(2);
        const newAmount = (Math.round(hours * rate * 100) / 100).toFixed(2);

        const oldHours = existing ? parseFloat(existing.hour_count).toFixed(2) : "-";
        const oldAmount = existing ? parseFloat(existing.amount).toFixed(2) : "-";
        const same = oldHours === newHours && oldAmount === newAmount;
        const label = `teacher ${teacher_id} ${month}/${year}`;

        // Paid rows are never modified, only reported
        if (existing && !EDITABLE.includes(existing.status)) {
            if (!same) {
                paidMismatch++;
                console.warn(
                    `[PAID, NOT CHANGED] ${label} (${existing.status}): ` +
                    `${oldHours}h/${oldAmount} -> would be ${newHours}h/${newAmount}`
                );
            }
            continue;
        }

        if (same) continue;

        console.log(`${label}: ${oldHours}h/${oldAmount} -> ${newHours}h/${newAmount}`);
        changed++;

        if (!DRY_RUN) {
            await recalculateMonthForTeacher(teacher_id, month, year);
        }
    }

    console.log(`done: ${changed} rows ${DRY_RUN ? "would be " : ""}fixed, ${paidMismatch} paid rows differ (not changed)`);
}

async function down() {
    // Nothing to undo: restore from your backup
}

module.exports = { up, down };

// Also runnable directly: node seeders/fixOldPayments.js
if (require.main === module) {
    up()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error(err);
            process.exit(1);
        });
}