const DAYS_HE = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const MONTHS_HE = [
  "", "ינואר", "פברואר", "מרס", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

// Working days: Sun(0)–Thu(4) in JS getDay()
const WORKING_DAYS_JS = [0, 1, 2, 3, 4]; // Sun=0, Mon=1, ..., Thu=4

// Format a Date object as YYYY-MM-DD using LOCAL time (not UTC!)
function toLocalDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Parse a YYYY-MM-DD string into a Date in local time
function parseDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function getDayNameHe(dateStr) {
  const d = parseDate(dateStr);
  return DAYS_HE[d.getDay()];
}

export function getMonthNameHe(month) {
  return MONTHS_HE[month] || "";
}

export function formatDateHe(dateStr) {
  const d = parseDate(dateStr);
  return `${DAYS_HE[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
}

export function getWorkingDaysForMonth(year, month) {
  const days = [];
  const numDays = new Date(year, month, 0).getDate(); // month is 1-indexed here
  for (let day = 1; day <= numDays; day++) {
    const d = new Date(year, month - 1, day);
    if (WORKING_DAYS_JS.includes(d.getDay())) {
      days.push(toLocalDateStr(d));
    }
  }
  return days;
}

export function groupByWeek(dates) {
  const weeks = [];
  let currentWeek = [];
  for (const dateStr of dates) {
    const d = parseDate(dateStr);
    if (d.getDay() === 0 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(dateStr);
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);
  return weeks;
}

export function isToday(dateStr) {
  return dateStr === toLocalDateStr(new Date());
}

export { DAYS_HE, MONTHS_HE };
