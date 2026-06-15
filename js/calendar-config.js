window.CigarClubCalendar = { // Global config read by events-ticker.js
  calendarId: "9d624c02bc316b9c422aa30a1f3f580a11b1a85b2412df9d30bf675adfcdf607@group.calendar.google.com", // Google Calendar ID for club events
  apiKey: "", // Optional Google Calendar API key (leave blank to use iCal feed fallback)
  timeZone: "America/Chicago", // Display event times in Central Time
  icalUrl: "https://calendar.google.com/calendar/ical/9d624c02bc316b9c422aa30a1f3f580a11b1a85b2412df9d30bf675adfcdf607%40group.calendar.google.com/public/basic.ics", // Public iCal feed when no API key
  corsProxy: "https://api.allorigins.win/raw?url=", // Proxy prefix for browser iCal fetch
};
