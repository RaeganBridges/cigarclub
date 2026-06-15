(function () { // Wrap in IIFE to avoid polluting global scope
  var config = window.CigarClubCalendar || {}; // Read calendar settings from calendar-config.js
  var ticker = document.querySelector(".events-ticker"); // Scrolling announcement bar element
  if (!ticker) { return; } // Exit if ticker markup is not on this page

  var textEls = ticker.querySelectorAll(".events-ticker-text"); // Duplicate text nodes for seamless loop
  var fallbackText = "View upcoming events on our calendar \u2192"; // Default message when no events are loaded
  var dateFormatter = new Intl.DateTimeFormat("en-US", { // Format event dates for ticker copy
    weekday: "short", // Short day name (e.g. Sat)
    month: "short", // Short month name (e.g. Jun)
    day: "numeric", // Day of month
    hour: "numeric", // Hour for timed events
    minute: "2-digit", // Minutes for timed events
    timeZone: config.timeZone || "America/Chicago", // Club timezone from config
  });
  var dateOnlyFormatter = new Intl.DateTimeFormat("en-US", { // Format all-day event dates
    weekday: "short", // Short day name
    month: "short", // Short month name
    day: "numeric", // Day of month
    timeZone: config.timeZone || "America/Chicago", // Club timezone from config
  });

  function isTask(item) { // Detect calendar items marked as tasks
    var title = (item.summary || "").trim(); // Event or task title text
    var description = (item.description || "").trim(); // Event description text
    var categories = (item.categories || "").toLowerCase(); // iCal categories field
    if (item.isTodo) { return true; } // VTODO entries from iCal are tasks
    if (/\[task\]|^task:\s*|\(task\)|#task\b/i.test(title)) { return true; } // Task markers in title
    if (/\[task\]|^task:\s*|\(task\)|#task\b/i.test(description)) { return true; } // Task markers in description
    if (categories.indexOf("task") !== -1) { return true; } // CATEGORIES:Task in iCal feed
    return false; // Treat as a regular event
  }

  function cleanTitle(title) { // Remove task prefix markers from display text
    return (title || "Untitled") // Fallback when title is missing
      .replace(/^\[task\]\s*/i, "") // Strip leading [Task]
      .replace(/^task:\s*/i, "") // Strip leading Task:
      .replace(/^\(task\)\s*/i, "") // Strip leading (task)
      .replace(/^#task\s*/i, "") // Strip leading #task
      .trim(); // Remove leftover whitespace
  }

  function formatWhen(item) { // Build human-readable date/time string for one item
    if (!item.start) { return ""; } // Skip if start date is missing
    if (item.allDay) { return dateOnlyFormatter.format(item.start); } // All-day items omit time
    return dateFormatter.format(item.start); // Timed items include clock time
  }

  function buildTickerMessage(items) { // Compose scrolling text from next event and tasks
    var now = new Date(); // Current time for filtering past items
    var upcoming = items.filter(function (item) { // Keep only future items
      return item.start && item.start.getTime() >= now.getTime() - 60000; // Include events starting within the last minute
    }).sort(function (a, b) { // Sort soonest first
      return a.start.getTime() - b.start.getTime(); // Ascending by start time
    });

    var tasks = upcoming.filter(isTask); // Items marked as tasks
    var nextEvent = upcoming.filter(function (item) { return !isTask(item); })[0]; // Soonest non-task event
    var parts = []; // Message segments joined in the ticker

    if (nextEvent) { // Add next upcoming event headline
      parts.push("Next: " + cleanTitle(nextEvent.summary) + " \u2014 " + formatWhen(nextEvent)); // Next: Name — date
    }

    tasks.forEach(function (task) { // Add every upcoming task to the ticker
      parts.push("Task: " + cleanTitle(task.summary) + (formatWhen(task) ? " \u2014 " + formatWhen(task) : "")); // Task: Name — date
    });

    if (!parts.length) { return fallbackText; } // Fallback when calendar has no upcoming items
    return parts.join("   \u2726   "); // Separate segments with a star divider
  }

  function showMessage(message) { // Render message in both ticker text nodes
    textEls.forEach(function (el) { // Update each duplicated span
      el.textContent = message; // Set scrolling announcement copy
    });
    ticker.hidden = false; // Reveal ticker once content is ready
  }

  function parseIcalDate(value, isDateOnly) { // Parse iCal DTSTART values into Date objects
    if (!value) { return null; } // Skip empty values
    if (isDateOnly || value.length === 8) { // DATE format YYYYMMDD
      var y = value.slice(0, 4); // Year digits
      var m = value.slice(4, 6); // Month digits
      var d = value.slice(6, 8); // Day digits
      return new Date(y + "-" + m + "-" + d + "T12:00:00"); // Noon local avoids DST edge cases
    }
    if (value.indexOf("T") === -1) { return new Date(value); // Pass through ISO-like strings
    }
    var clean = value.replace("Z", ""); // Strip UTC suffix for manual parsing
    if (clean.indexOf("T") !== -1 && clean.length >= 15) { // Compact UTC datetime YYYYMMDDTHHMMSS
      var yy = clean.slice(0, 4); // Year
      var mm = clean.slice(4, 6); // Month
      var dd = clean.slice(6, 8); // Day
      var hh = clean.slice(9, 11); // Hour
      var mi = clean.slice(11, 13); // Minute
      var ss = clean.slice(13, 15) || "00"; // Seconds
      if (value.indexOf("Z") !== -1) { return new Date(Date.UTC(Number(yy), Number(mm) - 1, Number(dd), Number(hh), Number(mi), Number(ss))); } // UTC datetime
      return new Date(yy + "-" + mm + "-" + dd + "T" + hh + ":" + mi + ":" + ss); // Floating local datetime
    }
    return new Date(value); // Last-resort Date parsing
  }

  function parseIcalFeed(raw) { // Parse VEVENT and VTODO blocks from iCal text
    var items = []; // Normalized upcoming calendar items
    var blocks = raw.split(/BEGIN:(VEVENT|VTODO)/); // Split feed into event/task blocks
    blocks.forEach(function (block) { // Walk each parsed block
      if (block.indexOf("END:VEVENT") === -1 && block.indexOf("END:VTODO") === -1) { return; } // Skip non-event chunks
      var isTodo = block.indexOf("END:VTODO") !== -1; // Detect task entries
      var summary = ""; // Event/task title
      var description = ""; // Event/task description
      var categories = ""; // Optional iCal categories
      var dtstart = ""; // Raw DTSTART value
      var dateOnly = false; // Whether DTSTART uses DATE not DATE-TIME
      block.split(/\r?\n/).forEach(function (line) { // Parse line-based iCal fields
        if (line.indexOf("SUMMARY:") === 0) { summary = line.slice(8); } // Read title
        if (line.indexOf("DESCRIPTION:") === 0) { description = line.slice(12); } // Read description
        if (line.indexOf("CATEGORIES:") === 0) { categories = line.slice(11); } // Read categories
        if (line.indexOf("DTSTART;VALUE=DATE:") === 0) { dtstart = line.slice(19); dateOnly = true; } // All-day start
        if (line.indexOf("DTSTART:") === 0 && !dtstart) { dtstart = line.slice(8); } // Timed start
      });
      var start = parseIcalDate(dtstart, dateOnly); // Convert DTSTART to Date
      if (!start) { return; } // Skip blocks without a valid start
      items.push({ summary: summary, description: description, categories: categories, start: start, allDay: dateOnly, isTodo: isTodo }); // Store normalized item
    });
    return items; // Return parsed items
  }

  function normalizeItem(raw) { // Convert stored JSON item to in-memory shape
    return { // Shared item object used by ticker builder
      summary: raw.summary || "", // Event or task title
      description: raw.description || "", // Optional description text
      categories: raw.categories || "", // Optional iCal categories
      start: raw.start ? new Date(raw.start) : null, // Parsed start datetime
      allDay: Boolean(raw.allDay), // All-day flag from sync script
      isTodo: Boolean(raw.isTodo), // Task flag from VTODO or markers
    };
  }

  function fetchFromJson() { // Load pre-synced events from same-origin JSON file
    return fetch("data/calendar-events.json").then(function (response) { // Request static JSON feed
      if (!response.ok) { throw new Error("Events JSON missing"); } // Fail when file is absent
      return response.json(); // Parse JSON payload
    }).then(function (payload) { // Map stored items to normalized shape
      return (payload.items || []).map(normalizeItem); // Convert each stored row
    });
  }

  function normalizeApiEvent(event) { // Convert Google Calendar API event to shared shape
    var startField = event.start || {}; // API start object
    var allDay = Boolean(startField.date && !startField.dateTime); // All-day when only date is present
    var startValue = startField.dateTime || startField.date; // Pick datetime or date string
    var start = allDay ? parseIcalDate(startValue.replace(/-/g, ""), true) : new Date(startValue); // Parse start date
    return { // Normalized item used by ticker builder
      summary: event.summary || "", // Event title from API
      description: event.description || "", // Event description from API
      categories: (event.colorId ? "" : ""), // API has no direct categories string
      start: start, // Parsed start date
      allDay: allDay, // All-day flag
      isTodo: false, // API calendar events are not VTODO
    };
  }

  function fetchFromApi() { // Load events via Google Calendar API when apiKey is set
    if (!config.apiKey) { return Promise.reject(new Error("No API key")); } // Skip without credentials
    var now = new Date().toISOString(); // Current time in ISO format for timeMin
    var calendarId = encodeURIComponent(config.calendarId); // URL-safe calendar id
    var url = "https://www.googleapis.com/calendar/v3/calendars/" + calendarId + "/events?key=" + encodeURIComponent(config.apiKey) + "&timeMin=" + encodeURIComponent(now) + "&maxResults=25&singleEvents=true&orderBy=startTime"; // API request URL
    return fetch(url).then(function (response) { // Request upcoming events
      if (!response.ok) { throw new Error("Calendar API request failed"); } // Fail on HTTP errors
      return response.json(); // Parse JSON payload
    }).then(function (data) { // Map API events to shared item shape
      return (data.items || []).map(normalizeApiEvent); // Normalize each API event
    });
  }

  function fetchFromIcal() { // Load events via public iCal feed through CORS proxy
    var icalUrl = config.icalUrl; // Public iCal URL from config
    if (!icalUrl) { return Promise.reject(new Error("No iCal URL")); } // Skip without feed URL
    var proxy = config.corsProxy || ""; // Optional CORS proxy prefix
    var fetchUrl = proxy ? proxy + encodeURIComponent(icalUrl) : icalUrl; // Build proxied URL for browser fetch
    return fetch(fetchUrl).then(function (response) { // Request iCal text
      if (!response.ok) { throw new Error("iCal request failed"); } // Fail on HTTP errors
      return response.text(); // Read iCal body
    }).then(parseIcalFeed); // Parse iCal into normalized items
  }

  function loadEvents() { // Try synced JSON first, then API, then iCal fallback
    return fetchFromJson().catch(function () { // Prefer same-origin JSON from GitHub Action sync
      return fetchFromApi().catch(function () { // Attempt live API when key is configured
        return fetchFromIcal(); // Last resort: proxied iCal feed
      });
    });
  }

  loadEvents().then(function (items) { // Fetch and render ticker content
    showMessage(buildTickerMessage(items)); // Build and display announcement text
  }).catch(function () { // Handle fetch/parse failures gracefully
    showMessage(fallbackText); // Show generic calendar link message
  });
})();
