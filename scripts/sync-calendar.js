#!/usr/bin/env node
const https = require("https"); // Node HTTPS client for iCal fetch

const calendarConfig = { // Calendar feed settings (matches js/calendar-config.js)
  icalUrl: "https://calendar.google.com/calendar/ical/9d624c02bc316b9c422aa30a1f3f580a11b1a85b2412df9d30bf675adfcdf607%40group.calendar.google.com/public/basic.ics", // Public club iCal URL
  timeZone: "America/Chicago", // Club timezone label stored in JSON
};

function fetchText(url) { // Download URL body as UTF-8 text
  return new Promise(function (resolve, reject) { // Wrap callback API in a Promise
    https.get(url, function (response) { // Start HTTPS GET request
      if (response.statusCode !== 200) { // Reject non-success HTTP codes
        reject(new Error("HTTP " + response.statusCode)); // Surface status code in error
        return; // Stop processing failed response
      }
      var body = ""; // Accumulate response chunks
      response.on("data", function (chunk) { body += chunk; }); // Append each chunk
      response.on("end", function () { resolve(body); }); // Resolve when download completes
    }).on("error", reject); // Forward network errors to Promise
  });
}

function parseIcalDate(value, isDateOnly) { // Parse iCal DTSTART into ISO string
  if (!value) { return null; } // Skip empty values
  if (isDateOnly || value.length === 8) { // DATE format YYYYMMDD
    var y = value.slice(0, 4); // Year digits
    var m = value.slice(4, 6); // Month digits
    var d = value.slice(6, 8); // Day digits
    return y + "-" + m + "-" + d + "T12:00:00.000Z"; // Noon UTC for all-day stability
  }
  if (value.endsWith("Z")) { // UTC datetime with Z suffix
    var clean = value.replace("Z", ""); // Remove trailing Z
    var yy = clean.slice(0, 4); // Year
    var mm = clean.slice(4, 6); // Month
    var dd = clean.slice(6, 8); // Day
    var hh = clean.slice(9, 11); // Hour
    var mi = clean.slice(11, 13); // Minute
    var ss = clean.slice(13, 15) || "00"; // Seconds
    return new Date(Date.UTC(Number(yy), Number(mm) - 1, Number(dd), Number(hh), Number(mi), Number(ss))).toISOString(); // UTC ISO string
  }
  return new Date(value).toISOString(); // Fallback Date parsing
}

function parseIcalFeed(raw) { // Parse VEVENT and VTODO entries from iCal text
  var items = []; // Normalized calendar items for JSON export
  var blocks = raw.split(/BEGIN:(VEVENT|VTODO)/); // Split into event/task blocks
  blocks.forEach(function (block) { // Walk each block
    if (block.indexOf("END:VEVENT") === -1 && block.indexOf("END:VTODO") === -1) { return; } // Skip non-event chunks
    var isTodo = block.indexOf("END:VTODO") !== -1; // Detect Google Tasks / VTODO rows
    var summary = ""; // Title field
    var description = ""; // Description field
    var categories = ""; // Categories field
    var dtstart = ""; // Raw DTSTART value
    var dateOnly = false; // Whether DTSTART is DATE not DATE-TIME
    block.split(/\r?\n/).forEach(function (line) { // Parse line-based iCal properties
      if (line.indexOf("SUMMARY:") === 0) { summary = line.slice(8); } // Read SUMMARY
      if (line.indexOf("DESCRIPTION:") === 0) { description = line.slice(12); } // Read DESCRIPTION
      if (line.indexOf("CATEGORIES:") === 0) { categories = line.slice(11); } // Read CATEGORIES
      if (line.indexOf("DTSTART;VALUE=DATE:") === 0) { dtstart = line.slice(19); dateOnly = true; } // All-day start
      if (line.indexOf("DTSTART:") === 0 && !dtstart) { dtstart = line.slice(8); } // Timed start
    });
    var startIso = parseIcalDate(dtstart, dateOnly); // Convert start to ISO string
    if (!startIso) { return; } // Skip invalid entries
    items.push({ summary: summary, description: description, categories: categories, start: startIso, allDay: dateOnly, isTodo: isTodo }); // Store normalized row
  });
  return items; // Return all parsed items
}

fetchText(calendarConfig.icalUrl) // Download public iCal feed
  .then(parseIcalFeed) // Parse into normalized items
  .then(function (items) { // Build JSON payload for static site
    var payload = { // JSON document written to data/calendar-events.json
      updatedAt: new Date().toISOString(), // Timestamp of last successful sync
      timeZone: calendarConfig.timeZone, // Club timezone for client formatting
      items: items, // Upcoming events and tasks from iCal feed
    };
    process.stdout.write(JSON.stringify(payload, null, 2)); // Print pretty JSON to stdout
  })
  .catch(function (error) { // Handle fetch/parse failures in CI
    console.error(error); // Log error for GitHub Actions logs
    process.exit(1); // Fail workflow when sync cannot complete
  });
