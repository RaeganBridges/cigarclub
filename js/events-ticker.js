(function () { // Wrap in IIFE to avoid polluting global scope
  var config = window.CigarClubCalendar || {}; // Read calendar settings from calendar-config.js
  var ticker = document.querySelector(".events-ticker"); // Scrolling announcement bar element
  if (!ticker) { return; } // Exit if ticker markup is not on this page

  var textEls = ticker.querySelectorAll(".events-ticker-text"); // Duplicate text nodes for seamless loop
  var fallbackText = "View upcoming events on our calendar \u2192"; // Default message when no events are loaded
  var loadingText = "Loading upcoming events\u2026"; // Shown while event data is being fetched
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

  function resolveDataUrl(relativePath) { // Build absolute URL for JSON files from script location
    var script = document.querySelector("script[src*=\"calendar-config.js\"]"); // Find config script tag
    if (!script || !script.src) { return relativePath; } // Fall back to relative path
    var base = script.src.replace(/js\/calendar-config\.js(\?.*)?$/, ""); // Site root from script URL
    return base + relativePath; // Absolute URL that works on GitHub Pages subpaths
  }

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
    ticker.hidden = false; // Ensure ticker is visible after content is set
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

  function fetchJson(relativePath) { // Fetch one JSON file with cache busting
    var url = resolveDataUrl(relativePath); // Resolve absolute URL from site root
    var cacheBust = url + (url.indexOf("?") === -1 ? "?" : "&") + "ts=" + Date.now(); // Avoid stale browser cache
    return fetch(cacheBust, { cache: "no-store" }).then(function (response) { // Request JSON file
      if (!response.ok) { throw new Error("Missing " + relativePath); } // Fail when file is absent
      return response.json(); // Parse JSON payload
    });
  }

  function itemsFromPayload(payload) { // Extract normalized items array from JSON payload
    if (Array.isArray(payload)) { return payload.map(normalizeItem); } // Plain array file
    return (payload.items || []).map(normalizeItem); // Object wrapper with items array
  }

  function fetchFromApi() { // Load events live via Google Calendar API when apiKey is set
    if (!config.apiKey) { return Promise.reject(new Error("No API key")); } // Skip without credentials
    var now = new Date().toISOString(); // Current time in ISO format for timeMin
    var calendarId = encodeURIComponent(config.calendarId); // URL-safe calendar id
    var url = "https://www.googleapis.com/calendar/v3/calendars/" + calendarId + "/events?key=" + encodeURIComponent(config.apiKey) + "&timeMin=" + encodeURIComponent(now) + "&maxResults=50&singleEvents=true&orderBy=startTime"; // API request URL
    return fetch(url).then(function (response) { // Request upcoming events
      if (!response.ok) { throw new Error("Calendar API request failed"); } // Fail on HTTP errors
      return response.json(); // Parse JSON payload
    }).then(function (data) { // Map API events to shared item shape
      return (data.items || []).map(function (event) { // Normalize each API event
        var startField = event.start || {}; // API start object
        var allDay = Boolean(startField.date && !startField.dateTime); // All-day when only date is present
        var startValue = startField.dateTime || startField.date; // Pick datetime or date string
        var start = allDay ? new Date(startValue + "T12:00:00.000Z") : new Date(startValue); // Parse start date
        return normalizeItem({ summary: event.summary, description: event.description, start: start.toISOString(), allDay: allDay, isTodo: false }); // Normalized row
      });
    });
  }

  function mergeItems(lists) { // Combine multiple item arrays without duplicates
    var combined = []; // Accumulated unique items
    var seen = {}; // Track summary+start keys
    lists.forEach(function (list) { // Walk each source list
      list.forEach(function (item) { // Walk each item in source
        var key = (item.summary || "") + "|" + (item.start ? item.start.toISOString() : ""); // Unique key
        if (seen[key]) { return; } // Skip duplicate entry
        seen[key] = true; // Mark key as seen
        combined.push(item); // Keep unique item
      });
    });
    return combined; // Return merged list
  }

  function loadEvents() { // Load events from API, synced JSON, and manual JSON
    var jsonPath = config.jsonPath || "data/calendar-events.json"; // Auto-synced JSON path
    var manualPath = config.manualPath || "data/events-manual.json"; // Manual events JSON path
    return fetchFromApi().catch(function () { // Try live API first when key is configured
      return Promise.all([ // Load both JSON files in parallel
        fetchJson(jsonPath).then(itemsFromPayload).catch(function () { return []; }), // Synced events (optional)
        fetchJson(manualPath).then(itemsFromPayload).catch(function () { return []; }), // Manual events (optional)
      ]).then(function (results) { // Merge JSON sources
        return mergeItems(results); // Combined synced + manual items
      });
    });
  }

  function refreshTicker() { // Fetch latest calendar data and update ticker text
    loadEvents().then(function (items) { // Fetch from best available source
      showMessage(buildTickerMessage(items)); // Build and display announcement text
    }).catch(function () { // Handle fetch/parse failures gracefully
      showMessage(fallbackText); // Show generic calendar link message
    });
  }

  showMessage(loadingText); // Show loading state immediately so bar is visible
  refreshTicker(); // Initial ticker load on page open
  setInterval(refreshTicker, config.refreshMs || 300000); // Poll for calendar updates every 5 minutes
})();
