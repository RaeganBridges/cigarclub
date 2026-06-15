(function () { // Scrolling events and tasks announcement bar
  var config = window.CigarClubCalendar || {}; // Read calendar settings from calendar-config.js
  var loader = window.CigarClubEventsLoader; // Shared calendar event loader
  var ticker = document.querySelector(".events-ticker"); // Scrolling announcement bar element
  if (!ticker || !loader) { return; } // Exit if ticker markup or loader is missing

  var textEls = ticker.querySelectorAll(".events-ticker-text"); // Duplicate text nodes for seamless loop
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

  function buildTickerMessage(items) { // Compose scrolling text from the next upcoming event only
    var upcoming = loader.upcomingItems(items); // Future items sorted by start time
    var nextEvent = upcoming.filter(function (item) { return !isTask(item); })[0]; // Soonest non-task calendar event
    if (!nextEvent) { return null; } // No banner when calendar has no upcoming events
    var when = formatWhen(nextEvent); // Formatted date/time for the event
    return cleanTitle(nextEvent.summary) + (when ? " \u2014 " + when : ""); // Event name and date only
  }

  function hideTicker() { // Remove banner when there is nothing to announce
    ticker.hidden = true; // Hide the events bar from layout
  }

  function expandForMarquee(message) { // Repeat copy so text fills wide screens edge to edge
    var chunk = message + "   \u2726   "; // One segment plus star divider
    var targetLength = Math.max(window.innerWidth * 0.9, 320); // Minimum track length for full-screen feel
    var expanded = chunk; // Start with one segment
    while (expanded.length < targetLength) { // Keep repeating until bar feels continuously filled
      expanded += chunk; // Append another segment
    }
    return expanded; // Long marquee string for one track copy
  }

  function setScrollSpeed() { // Tune animation speed from track width (slightly faster than before)
    var track = ticker.querySelector(".events-ticker-track"); // Animated marquee row
    if (!track || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { return; } // Skip when motion is reduced
    var pixelsPerSecond = 110; // Slightly faster scroll rate across the viewport
    var duration = Math.max(12, track.scrollWidth / pixelsPerSecond); // Shorter duration = faster motion
    track.style.animationDuration = duration + "s"; // Apply computed speed to CSS animation
  }

  function showMessage(message) { // Render message in both ticker text nodes
    var expanded = expandForMarquee(message); // Lengthen copy so it spans the full screen width
    textEls.forEach(function (el) { // Update each duplicated span
      el.textContent = expanded; // Set scrolling announcement copy
    });
    ticker.hidden = false; // Ensure ticker is visible after content is set
    requestAnimationFrame(setScrollSpeed); // Recalculate speed after text reflow
  }

  function refreshTicker() { // Fetch latest calendar data and show or hide banner
    loader.loadEvents().then(function (items) { // Fetch from best available source
      var message = buildTickerMessage(items); // Next event text, or null if none
      if (!message) { hideTicker(); return; } // Remove banner when no upcoming events
      showMessage(message); // Display next event in scrolling bar
    }).catch(function () { // Handle fetch/parse failures gracefully
      hideTicker(); // Hide banner when event data cannot be loaded
    });
  }

  refreshTicker(); // Initial ticker load on page open
  window.addEventListener("resize", setScrollSpeed); // Keep scroll speed accurate on viewport resize
  setInterval(refreshTicker, config.refreshMs || 300000); // Poll for calendar updates every 5 minutes
})();
