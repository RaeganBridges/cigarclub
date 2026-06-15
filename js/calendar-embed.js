(function () { // Wrap in IIFE to avoid polluting global scope
  var config = window.CigarClubCalendar || {}; // Read calendar settings from calendar-config.js
  var iframe = document.querySelector(".calendar-embed"); // Google Calendar iframe on events page
  var openLink = document.querySelector(".calendar-open-link"); // Link to open calendar in Google
  if (!iframe) { return; } // Exit on pages without calendar embed

  var calendarIds = config.embedCalendarIds || [config.calendarId]; // Calendars to include in embed
  var params = new URLSearchParams(); // Build Google Calendar embed query string
  params.set("height", "700"); // Match iframe height attribute
  params.set("wkst", "1"); // Week starts on Sunday
  params.set("bgcolor", "#fdfddc"); // Cream background to match site
  params.set("ctz", config.timeZone || "America/Chicago"); // Club timezone
  params.set("mode", config.embedMode || "WEEK"); // Week view by default
  params.set("showTitle", "0"); // Hide duplicate calendar title in embed
  params.set("showNav", "1"); // Show month/week navigation
  params.set("showDate", "1"); // Show date picker
  params.set("showPrint", "0"); // Hide print button
  params.set("showTabs", "0"); // Hide month/week/agenda tabs
  params.set("showCalendars", "0"); // Hide calendar list sidebar

  calendarIds.forEach(function (id) { // Append each calendar source to embed
    if (id) { params.append("src", id); } // Google supports multiple src parameters
  });

  var embedUrl = "https://calendar.google.com/calendar/embed?" + params.toString(); // Final iframe URL
  iframe.src = embedUrl; // Apply embed URL to iframe

  if (openLink) { // Update fallback open link to match first calendar
    var firstId = calendarIds[0] || config.calendarId; // Primary calendar for open link
    openLink.href = "https://calendar.google.com/calendar/embed?src=" + encodeURIComponent(firstId) + "&ctz=" + encodeURIComponent(config.timeZone || "America/Chicago"); // Open link URL
  }
})();
