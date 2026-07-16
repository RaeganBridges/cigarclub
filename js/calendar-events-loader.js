(function (root) { // Shared calendar event loading for ticker and events list
  function getConfig() { // Read global calendar settings
    return root.CigarClubCalendar || {}; // Fall back to empty object
  }

  function resolveDataUrl(relativePath) { // Build absolute URL for JSON files from script location
    var script = document.querySelector("script[src*=\"calendar-config.js\"]"); // Find config script tag
    if (!script || !script.src) { return relativePath; } // Fall back to relative path
    var base = script.src.replace(/js\/calendar-config\.js(\?.*)?$/, ""); // Site root from script URL
    return base + relativePath; // Absolute URL that works on GitHub Pages subpaths
  }

  function normalizeItem(raw) { // Convert stored JSON item to in-memory shape
    return { // Shared item object used across calendar UI
      summary: raw.summary || "", // Event or task title
      description: raw.description || "", // Optional description text
      categories: raw.categories || "", // Optional iCal categories
      start: raw.start ? new Date(raw.start) : null, // Parsed start datetime
      allDay: Boolean(raw.allDay), // All-day flag from sync script
      isTodo: Boolean(raw.isTodo), // Task flag from VTODO or markers
    };
  }

  function itemsFromPayload(payload) { // Extract normalized items array from JSON payload
    if (Array.isArray(payload)) { return payload.map(normalizeItem); } // Plain array file
    return (payload.items || []).map(normalizeItem); // Object wrapper with items array
  }

  function fetchJson(relativePath) { // Fetch one JSON file with cache busting
    var url = resolveDataUrl(relativePath); // Resolve absolute URL from site root
    var cacheBust = url + (url.indexOf("?") === -1 ? "?" : "&") + "ts=" + Date.now(); // Avoid stale browser cache
    return fetch(cacheBust, { cache: "no-store" }).then(function (response) { // Request JSON file
      if (!response.ok) { throw new Error("Missing " + relativePath); } // Fail when file is absent
      return response.json(); // Parse JSON payload
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

  function fetchFromApi(calendarId, apiKey) { // Load events live via Google Calendar API
    var now = new Date().toISOString(); // Current time in ISO format for timeMin
    var encodedId = encodeURIComponent(calendarId); // URL-safe calendar id
    var url = "https://www.googleapis.com/calendar/v3/calendars/" + encodedId + "/events?key=" + encodeURIComponent(apiKey) + "&timeMin=" + encodeURIComponent(now) + "&maxResults=50&singleEvents=true&orderBy=startTime"; // API request URL
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

  function fetchAllFromApi() { // Load events from every configured calendar via API
    var config = getConfig(); // Read calendar settings
    if (!config.apiKey) { return Promise.reject(new Error("No API key")); } // Skip without credentials
    var ids = config.embedCalendarIds || [config.calendarId]; // All calendar IDs to query
    return Promise.all(ids.map(function (id) { // Query each calendar in parallel
      return fetchFromApi(id, config.apiKey).catch(function () { return []; }); // Ignore one failed calendar
    })).then(function (results) { // Merge API results
      return mergeItems(results); // Combined unique items
    });
  }

  function fetchFromIcal() { // Load events live from public Google iCal feed
    var config = getConfig(); // Read calendar settings
    var ical = root.CigarClubIcal; // Shared iCal parser from ical-utils.js
    var icalUrl = config.icalUrl; // Public iCal URL from calendar-config.js
    if (!icalUrl || !ical) { return Promise.reject(new Error("iCal unavailable")); } // Require URL and parser
    return fetch(icalUrl, { cache: "no-store" }).then(function (response) { // Request public iCal feed
      if (!response.ok) { throw new Error("iCal HTTP " + response.status); } // Fail on HTTP errors
      return response.text(); // Read iCal document as text
    }).then(function (raw) { // Parse iCal into normalized event items
      return ical.parseIcalFeed(raw).map(function (item) { // Map each parsed VEVENT/VTODO
        return normalizeItem({ // Shared item shape for ticker and list
          summary: item.summary, // Event title
          description: item.description, // Event description
          categories: item.categories, // iCal categories
          start: item.start.toISOString(), // ISO datetime string
          allDay: item.allDay, // All-day flag
          isTodo: item.isTodo, // Task flag
        });
      });
    });
  }

  function loadFromJsonSources() { // Load synced and manual JSON event files
    var config = getConfig(); // Read calendar settings
    var jsonPath = config.jsonPath || "data/calendar-events.json"; // Auto-synced JSON path
    var manualPath = config.manualPath || "data/events-manual.json"; // Manual events JSON path
    return Promise.all([ // Load both JSON files in parallel
      fetchJson(jsonPath).then(itemsFromPayload).catch(function () { return []; }), // Synced events (optional)
      fetchJson(manualPath).then(itemsFromPayload).catch(function () { return []; }), // Manual events (optional)
    ]).then(function (results) { // Merge JSON sources
      return mergeItems(results); // Combined synced + manual items
    });
  }

  function loadBootstrapEvents() { // Read embedded fallback events from calendar-config.js
    return (getConfig().bootstrapEvents || []).map(normalizeItem); // Normalize config rows
  }

  function loadEvents() { // Prefer synced JSON so the ticker always has the latest committed events
    return loadFromJsonSources().then(function (jsonItems) { // Load calendar-events.json (+ manual) first
      if (jsonItems.length) { return jsonItems; } // Use synced site data whenever it is available
      return fetchFromIcal().then(function (icalItems) { // Fall back to live iCal when JSON is empty
        if (icalItems.length) { return icalItems; } // Use live calendar feed
        return loadBootstrapEvents(); // Embedded config as last resort
      }).catch(function () { // iCal blocked or failed
        return loadBootstrapEvents(); // Embedded config fallback
      });
    }).catch(function () { // JSON path failed entirely
      return fetchAllFromApi().catch(function () { // Try API when configured
        return fetchFromIcal().catch(function () { return loadBootstrapEvents(); }); // Then iCal, then bootstrap
      });
    });
  }

  function upcomingItems(items) { // Filter and sort future events/tasks
    var now = Date.now() - 60000; // Include events starting within the last minute
    return items.filter(function (item) { // Keep only upcoming items
      return item.start && item.start.getTime() >= now; // Start time is now or later
    }).sort(function (a, b) { // Sort soonest first
      return a.start.getTime() - b.start.getTime(); // Ascending by start time
    });
  }

  root.CigarClubEventsLoader = { // Public loader API for ticker and events list
    loadEvents: loadEvents, // Fetch merged event data
    upcomingItems: upcomingItems, // Filter to future items sorted by date
    normalizeItem: normalizeItem, // Expose item normalizer
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
