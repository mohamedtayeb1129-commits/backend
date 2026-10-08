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
module.exports = {currentPeriod,TIMEZONE}