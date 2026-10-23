const { Op } = require("sequelize");
const Scoring = require("../models/Scoring");
const Teacher = require("../models/Teacher");
const TeacherPayment = require("../models/TeacherPayment");

function computeHoursFromRecords(records) {
    let totalMs = 0;
    let anomalies = 0;
    let openEntry = null;

    for (const record of records) {
        const timestamp = new Date(`${record.date}T${record.time}`);

        if (record.sense === "دخول") {
            if (openEntry) anomalies++;
            openEntry = timestamp;
        } else if (record.sense === "خروج") {
            if (openEntry) {
                totalMs += timestamp - openEntry;
                openEntry = null;
            } else {
                anomalies++;
            }
        }
    }

    if (openEntry) anomalies++;

    return {
        hours: totalMs / (1000 * 60 * 60),
        anomalies
    };
}

// Cycle de paie : du 20 du mois (M-1) au 19 du mois M => cette plage est étiquetée "mois M"
function getPayPeriodBounds(month, year) {
    const startDate = new Date(year, month - 2, 20); // JS gère le débordement d'année automatiquement
    const endDate = new Date(year, month - 1, 19);
    return { startDate, endDate };
}

// Détermine à quelle période de paie (month, year) appartient une date de pointage (DATEONLY "YYYY-MM-DD")
function getPayPeriodForDateOnly(dateOnlyStr) {
    let [year, month, day] = dateOnlyStr.split("-").map(Number);
    if (day >= 20) {
        month += 1;
        if (month > 12) {
            month = 1;
            year += 1;
        }
    }
    return { month, year };
}

// markPayable=true : appelé uniquement par le run de paie officiel (cron du 10) -> débloque le statut "no payé"
// markPayable=false : appelé par le recalcul temps réel (hook Scoring) -> ne touche jamais au statut
async function saveTeacherPayment({ teacher_id, month, year, hours, totalSalary, markPayable = false }) {
    const existing = await TeacherPayment.findOne({
        where: { teacher_id, month, year }
    });

    if (existing) {
        existing.hour_count = hours.toFixed(2);
        existing.amount = totalSalary.toFixed(2);
        if (markPayable && existing.status === "en attente") {
            existing.status = "no payé";
        }
        await existing.save();
        return existing;
    }

    return TeacherPayment.create({
        teacher_id,
        month,
        year,
        hour_count: hours.toFixed(2),
        amount: totalSalary.toFixed(2),
        status: markPayable ? "no payé" : "en attente"
    });
}

// Run de paie officiel (appelé par le cron du 10) : calcule la période clôturée et débloque le paiement
async function calculateMonthlySalaries(month, year) {
    const now = new Date();
    if (!month || !year) {
        const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        month = prev.getMonth() + 1;
        year = prev.getFullYear();
    }

    const { startDate, endDate } = getPayPeriodBounds(month, year);
    const teachers = await Teacher.findAll();
    const results = [];

    for (const teacher of teachers) {
        const records = await Scoring.findAll({
            where: {
                teacher_id: teacher.id,
                date: {
                    [Op.between]: [
                        startDate.toISOString().slice(0, 10),
                        endDate.toISOString().slice(0, 10)
                    ]
                }
            },
            order: [["date", "ASC"], ["time", "ASC"]]
        });

        const { hours, anomalies } = computeHoursFromRecords(records);
        const totalSalary = hours * parseFloat(teacher.price_by_hour || 0);

        await saveTeacherPayment({ teacher_id: teacher.id, month, year, hours, totalSalary, markPayable: true });

        results.push({
            teacher_id: teacher.id,
            name: `${teacher.name} ${teacher.last_name}`,
            hour_count: hours.toFixed(2),
            amount: totalSalary.toFixed(2),
            anomalies
        });
    }

    return results;
}

// Recalcul temps réel pour un prof/période donnée (appelé par le hook afterCreate de Scoring)
async function recalculateMonthForTeacher(teacher_id, month, year) {
    const { startDate, endDate } = getPayPeriodBounds(month, year);

    const teacher = await Teacher.findByPk(teacher_id);
    if (!teacher) return;

    const records = await Scoring.findAll({
        where: {
            teacher_id,
            date: {
                [Op.between]: [
                    startDate.toISOString().slice(0, 10),
                    endDate.toISOString().slice(0, 10)
                ]
            }
        },
        order: [["date", "ASC"], ["time", "ASC"]]
    });

    const { hours } = computeHoursFromRecords(records);
    const totalSalary = hours * parseFloat(teacher.price_by_hour || 0);

    await saveTeacherPayment({ teacher_id, month, year, hours, totalSalary, markPayable: false });
}

module.exports = {
    calculateMonthlySalaries,
    computeHoursFromRecords,
    recalculateMonthForTeacher,
    getPayPeriodForDateOnly,
    getPayPeriodBounds,
    getPayPeriodForDateOnly
};