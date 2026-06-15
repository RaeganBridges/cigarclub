#!/usr/bin/env node
const https = require("https"); // Node HTTPS client for iCal fetch
const fs = require("fs"); // Read optional manual events file
const path = require("path"); // Resolve paths relative to repo root
const ical = require("../js/ical-utils.js"); // Shared iCal parser

const calendarConfig = { // Calendar feed settings (matches js/calendar-config.js)
  calendarId: "9d624c02bc316b9c422aa30a1f3f580a11b1a85b2412df9d30bf675adfcdf607@group.calendar.google.com", // Primary club calendar ID
  embedCalendarIds: [ // Every calendar synced to data/calendar-events.json
    "9d624c02bc316b9c422aa30a1f3f580a11b1a85b2412df9d30bf675adfcdf607@group.calendar.google.com", // The Cigar Club calendar
  ],
  timeZone: "America/Chicago", // Club timezone label stored in JSON
  manualPath: path.join(__dirname, "../data/events-manual.json"), // Optional manual events file
};

function buildIcalUrl(calendarId) { // Build public iCal URL from a calendar ID
  return "https://calendar.google.com/calendar/ical/" + encodeURIComponent(calendarId) + "/public/basic.ics"; // Public basic feed
}

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

function fetchFromApi(calendarId, apiKey) { // Load events via Google Calendar API for one calendar
  var now = new Date().toISOString(); // Current time for timeMin filter
  var encodedId = encodeURIComponent(calendarId); // URL-safe calendar id
  var url = "https://www.googleapis.com/calendar/v3/calendars/" + encodedId + "/events?key=" + encodeURIComponent(apiKey) + "&timeMin=" + encodeURIComponent(now) + "&maxResults=50&singleEvents=true&orderBy=startTime"; // API request URL
  return fetch(url).then(function (response) { // Request upcoming events from Google
    if (!response.ok) { throw new Error("Calendar API HTTP " + response.status); } // Fail on HTTP errors
    return response.json(); // Parse JSON payload
  }).then(function (data) { // Map API events to shared JSON item shape
    return (data.items || []).map(function (event) { // Normalize each API event
      var startField = event.start || {}; // API start object
      var allDay = Boolean(startField.date && !startField.dateTime); // All-day when only date is present
      var startValue = startField.dateTime || startField.date; // Pick datetime or date string
      var start = allDay ? new Date(startValue + "T12:00:00.000Z") : new Date(startValue); // Parse start date
      return { // JSON-safe item row
        summary: event.summary || "", // Event title
        description: event.description || "", // Event description
        categories: "", // API does not expose iCal categories here
        start: start.toISOString(), // ISO datetime string
        allDay: allDay, // All-day flag
        isTodo: false, // Regular API events are not VTODO rows
      };
    });
  });
}

function fetchFromIcal(calendarId) { // Load events via public iCal feed for one calendar
  return fetchText(buildIcalUrl(calendarId)).then(ical.parseIcalFeedIso); // Parse iCal into JSON items
}

function loadManualEvents() { // Read optional hand-edited events from repo JSON file
  try { // Manual file is optional
    var raw = fs.readFileSync(calendarConfig.manualPath, "utf8"); // Read manual events file
    var parsed = JSON.parse(raw); // Parse JSON array or object wrapper
    if (Array.isArray(parsed)) { return parsed; } // Plain array of event rows
    return parsed.items || []; // Object wrapper with items array
  } catch (error) { // Missing or invalid manual file is OK
    return []; // No manual events to merge
  }
}

function mergeItems(itemGroups) { // Combine multiple event arrays without duplicates
  var combined = []; // Accumulated unique items
  var seen = {}; // Track unique keys to avoid duplicate rows
  itemGroups.forEach(function (group) { // Walk each source group
    group.forEach(function (item) { // Walk each item in group
      var key = (item.summary || "") + "|" + (item.start || ""); // Unique key per event
      if (seen[key]) { return; } // Skip duplicate entry
      seen[key] = true; // Mark key as seen
      combined.push(item); // Keep unique item
    });
  });
  return combined; // Return merged list
}

function loadGoogleEvents() { // Fetch all configured calendars via API or iCal
  var apiKey = process.env.GOOGLE_CALENDAR_API_KEY || ""; // API key from GitHub Actions secret
  var calendarIds = calendarConfig.embedCalendarIds || [calendarConfig.calendarId]; // All calendar IDs to sync
  return Promise.all(calendarIds.map(function (calendarId) { // Query each calendar in parallel
    if (apiKey) { // Use Calendar API when credentials are configured
      return fetchFromApi(calendarId, apiKey).catch(function () { return fetchFromIcal(calendarId); }); // Fall back to iCal on API failure
    }
    return fetchFromIcal(calendarId); // Use public iCal feed when no API key is set
  })).then(function (results) { // Merge all calendar results
    return mergeItems(results); // Combined unique items
  });
}

loadGoogleEvents() // Fetch events from Google Calendar
  .then(function (googleItems) { // Merge with optional manual events
    var payload = { // JSON document written to data/calendar-events.json
      updatedAt: new Date().toISOString(), // Timestamp of last successful sync
      timeZone: calendarConfig.timeZone, // Club timezone for client formatting
      source: process.env.GOOGLE_CALENDAR_API_KEY ? "api" : "ical", // Record which sync source was used
      items: mergeItems([googleItems, loadManualEvents()]), // Combined Google + manual events
    };
    process.stdout.write(JSON.stringify(payload, null, 2)); // Print pretty JSON to stdout
  })
  .catch(function (error) { // Still write manual events if Google fetch fails completely
    var payload = { // JSON document with manual events only
      updatedAt: new Date().toISOString(), // Timestamp of fallback write
      timeZone: calendarConfig.timeZone, // Club timezone for client formatting
      source: "manual", // Indicate Google fetch failed
      items: loadManualEvents(), // Manual events only
      error: String(error.message || error), // Store sync error for debugging
    };
    process.stdout.write(JSON.stringify(payload, null, 2)); // Print fallback JSON to stdout
  });
