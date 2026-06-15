(function () { // Build Google Calendar embed URL from site config
  var config = window.CigarClubCalendar || {}; // Read calendar settings from calendar-config.js
  var iframe = document.querySelector(".calendar-embed"); // Google Calendar iframe on events page
  var openLink = document.querySelector(".calendar-open-link"); // Link to open calendar in Google
  var addLink = document.querySelector(".calendar-add-link"); // Link to create event on club calendar
  if (!iframe) { return; } // Exit on pages without calendar embed

  var calendarIds = config.embedCalendarIds || [config.calendarId]; // Calendars to include in embed
  var params = new URLSearchParams(); // Build Google Calendar embed query string
  params.set("height", "700"); // Match iframe height attribute
  params.set("wkst", "1"); // Week starts on Sunday
  params.set("bgcolor", "#fdfddc"); // Cream background to match site
  params.set("ctz", config.timeZone || "America/Chicago"); // Club timezone
  params.set("mode", config.embedMode || "AGENDA"); // Agenda list shows upcoming events clearly
  params.set("showTitle", "0"); // Hide duplicate calendar title in embed
  params.set("showNav", "1"); // Show month/week navigation
  params.set("showDate", "1"); // Show date picker
  params.set("showPrint", "0"); // Hide print button
  params.set("showTabs", "1"); // Allow switching between month/week/agenda views
  params.set("showCalendars", "0"); // Hide calendar list sidebar

  calendarIds.forEach(function (id) { // Append each calendar source to embed
    if (id) { params.append("src", id); } // Google supports multiple src parameters
  });

  iframe.src = "https://calendar.google.com/calendar/embed?" + params.toString(); // Apply embed URL to iframe

  var calendarCid = config.calendarCid || ""; // Base64 calendar id for Google Calendar web links
  if (openLink && calendarCid) { // Update open link when cid is configured
    openLink.href = "https://calendar.google.com/calendar/u/0/r?cid=" + encodeURIComponent(calendarCid); // Open club calendar in Google
  }

  if (addLink && calendarCid) { // Update add-event link when cid is configured
    addLink.href = "https://calendar.google.com/calendar/u/0/r/eventedit?cid=" + encodeURIComponent(calendarCid); // Create event on club calendar
  }
})();
