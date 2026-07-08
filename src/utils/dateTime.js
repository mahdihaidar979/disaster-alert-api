export function formatLebanonTime(date) {
  if (!date) return "Unknown";

  const text = String(date);

  const hasTimezone =
    text.endsWith("Z") ||
    /[+-]\d{2}:\d{2}$/.test(text);

  const utcText = hasTimezone ? text : `${text}Z`;

  return new Date(utcText).toLocaleString("en-GB", {
    timeZone: "Asia/Beirut",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}