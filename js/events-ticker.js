(function () { // Scrolling events and tasks announcement bar
  var config = window.CigarClubCalendar || {}; // Read calendar settings from calendar-config.js
  var loader = window.CigarClubEventsLoader; // Shared calendar event loader
  var ticker = document.querySelector(".events-ticker"); // Scrolling announcement bar element
  if (!ticker || !loader) { return; } // Exit if ticker markup or loader is missing

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
    var upcoming = loader.upcomingItems(items); // Future items sorted by start time
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

  function refreshTicker() { // Fetch latest calendar data and update ticker text
    loader.loadEvents().then(function (items) { // Fetch from best available source
      showMessage(buildTickerMessage(items)); // Build and display announcement text
    }).catch(function () { // Handle fetch/parse failures gracefully
      showMessage(fallbackText); // Show generic calendar link message
    });
  }

  showMessage(loadingText); // Show loading state immediately so bar is visible
  refreshTicker(); // Initial ticker load on page open
  setInterval(refreshTicker, config.refreshMs || 300000); // Poll for calendar updates every 5 minutes
})();
