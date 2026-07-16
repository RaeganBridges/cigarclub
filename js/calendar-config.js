window.CigarClubCalendar = { // Global config read by events-ticker.js and calendar-embed.js
  calendarId: "9d624c02bc316b9c422aa30a1f3f580a11b1a85b2412df9d30bf675adfcdf607@group.calendar.google.com", // Primary club calendar ID
  calendarCid: "OWQ2MjRjMDJiYzMxNmI5YzQyMmFhMzBhMWYzZjU4MGExMWIxYTg1YjI0MTJkZjlkMzBiZjY3NWFkZmNkZjYwN0Bncm91cC5jYWxlbmRhci5nb29nbGUuY29t", // Base64 calendar id for Google web links
  embedCalendarIds: [ // Every calendar shown in the website embed (add more IDs here if needed)
    "9d624c02bc316b9c422aa30a1f3f580a11b1a85b2412df9d30bf675adfcdf607@group.calendar.google.com", // The Cigar Club calendar
  ],
  apiKey: "", // Optional: paste Google Calendar API key here for live browser updates
  timeZone: "America/Chicago", // Display event times in Central Time
  embedMode: "MONTH", // Embed view: MONTH shows month grid first; WEEK or AGENDA also supported
  jsonPath: "data/calendar-events.json", // Auto-synced JSON from GitHub Action
  manualPath: "data/events-manual.json", // Optional hand-edited events (merged with synced data)
  refreshMs: 5 * 60 * 1000, // Re-fetch event data every 5 minutes
  bootstrapEvents: [ // Fallback events when JSON/iCal fetch is unavailable (e.g. local preview)
    { summary: "holiday", start: "2026-07-17T18:30:00.000Z", allDay: false, isTodo: false }, // Next upcoming club event
    { summary: "Showcase 1", start: "2026-06-16T19:00:00.000Z", allDay: false, isTodo: false }, // Past club event kept for fallback history
    { summary: "TEST", start: "2026-06-18T19:00:00.000Z", allDay: false, isTodo: false }, // Past club event kept for fallback history
  ],
};

window.CigarClubCalendar.icalUrl = "https://calendar.google.com/calendar/ical/" + encodeURIComponent(window.CigarClubCalendar.calendarId).replace(/%40/g, "%40") + "/public/basic.ics"; // Public iCal feed derived from calendar ID
