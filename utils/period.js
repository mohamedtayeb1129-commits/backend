const MONTH_LABELS = [
    "جانفي", "فيفري", "مارس", "أفريل", "ماي", "جوان",
    "جويلية", "أوت", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

// month=1..12 => range = 1st of month -> 1st of next month
function getPeriodRange(month, year) {
    const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const end = new Date(year, month, 1, 0, 0, 0, 0);
    return { start, end, label: MONTH_LABELS[month - 1] };
}

function getYearPeriods(year) {
    const periods = [];
    for (let m = 1; m <= 12; m++) {
        periods.push({ month: m, ...getPeriodRange(m, year) });
    }
    return periods;
}

module.exports = { getPeriodRange, getYearPeriods, MONTH_LABELS };