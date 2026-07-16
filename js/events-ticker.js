(function () { // Scrolling events and tasks announcement bar
  var config = window.CigarClubCalendar || {}; // Read calendar settings from calendar-config.js
  var loader = window.CigarClubEventsLoader; // Shared calendar event loader
  var ticker = document.querySelector(".events-ticker"); // Scrolling announcement bar element
  if (!ticker || !loader) { return; } // Exit if ticker markup or loader is missing

  var textEls = ticker.querySelectorAll(".events-ticker-text"); // Duplicate text nodes for seamless loop
  var eventDivider = ' <span class="events-ticker-sep" aria-hidden="true">·</span> '; // Clear separator between the three events
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches; // Respect reduced-motion preference
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

  function escapeHtml(text) { // Escape calendar text before inserting into ticker HTML
    return (text || "") // Fallback for empty strings
      .replace(/&/g, "&amp;") // Escape ampersands
      .replace(/</g, "&lt;") // Escape less-than
      .replace(/>/g, "&gt;") // Escape greater-than
      .replace(/"/g, "&quot;"); // Escape double quotes
  }

  function buildEventSegment(event) { // Build one HTML segment with bold event name
    var title = escapeHtml(cleanTitle(event.summary)); // Sanitized event title text
    var when = formatWhen(event); // Formatted date/time for this event
    return '<strong class="events-ticker-name">' + title + "</strong>" + (when ? " \u2014 " + escapeHtml(when) : ""); // Bold name plus date
  }

  function buildTickerMessage(items) { // Compose scrolling HTML from up to three upcoming events
    var upcoming = loader.upcomingItems(items).filter(function (item) { // Future non-task events only
      return !isTask(item); // Skip calendar tasks in the banner
    }).slice(0, 3); // Show at most three upcoming events
    if (!upcoming.length) { return null; } // No banner when calendar has no upcoming events
    return upcoming.map(buildEventSegment).join(eventDivider); // Separate events with a visible dot
  }

  function showTicker() { // Reveal banner after content is ready
    ticker.removeAttribute("hidden"); // Remove hidden attribute for reliable display
  }

  function hideTicker() { // Remove banner when there is nothing to announce
    ticker.setAttribute("hidden", ""); // Hide the events bar from layout
  }

  function expandForMarquee(message) { // Repeat the three-event block so the marquee can loop
    if (reducedMotion) { return message; } // Show the three events once when motion is reduced
    var gap = ' <span class="events-ticker-sep" aria-hidden="true">·</span> '; // Gap between repeated blocks
    var chunk = message + gap; // One full three-event pass plus trailing separator
    var expanded = chunk + chunk; // Two copies required for the seamless -50% CSS loop
    while (expanded.replace(/<[^>]+>/g, "").length < Math.max(window.innerWidth * 0.8, 280)) { // Fill wide screens without endless HTML
      expanded += chunk; // Append another three-event block
    }
    return expanded; // Marquee string for one track copy
  }

  function setScrollSpeed() { // Tune animation speed from track width
    var track = ticker.querySelector(".events-ticker-track"); // Animated marquee row
    if (!track || reducedMotion) { return; } // Skip when motion is reduced
    var pixelsPerSecond = 90; // Steady scroll so all three events are readable
    var duration = Math.max(16, track.scrollWidth / pixelsPerSecond); // Longer duration keeps names readable
    track.style.animationDuration = duration + "s"; // Apply computed speed to CSS animation
  }

  function showMessage(message) { // Render HTML message in both ticker text nodes
    var expanded = expandForMarquee(message); // Lengthen copy for looping when motion is allowed
    textEls.forEach(function (el) { // Update each duplicated span
      el.innerHTML = expanded; // Set scrolling announcement HTML with up to three events
    });
    ticker.removeAttribute("hidden"); // Ensure ticker is visible after content is set
    requestAnimationFrame(setScrollSpeed); // Recalculate speed after text reflow
  }

  function refreshTicker() { // Fetch latest calendar data and show or hide banner
    loader.loadEvents().then(function (items) { // Fetch from synced JSON first
      var message = buildTickerMessage(items); // Up to three upcoming events, or null if none
      if (!message) { hideTicker(); return; } // Remove banner when no upcoming events
      showMessage(message); // Display events in scrolling bar
      showTicker(); // Ensure banner is visible
    }).catch(function () { // Handle fetch/parse failures gracefully
      var fallback = buildTickerMessage(loadBootstrapFromConfig()); // Try embedded config events
      if (!fallback) { hideTicker(); return; } // Hide banner when no fallback events exist
      showMessage(fallback); // Display fallback events in scrolling bar
      showTicker(); // Ensure banner is visible
    });
  }

  function loadBootstrapFromConfig() { // Read embedded fallback events when fetch fails
    return (config.bootstrapEvents || []).map(function (raw) { // Map config rows to item shape
      return { summary: raw.summary || "", start: raw.start ? new Date(raw.start) : null, allDay: Boolean(raw.allDay), isTodo: Boolean(raw.isTodo) }; // Normalized item
    });
  }

  refreshTicker(); // Initial ticker load on page open
  window.addEventListener("resize", setScrollSpeed); // Keep scroll speed accurate on viewport resize
  setInterval(refreshTicker, config.refreshMs || 300000); // Poll for calendar updates every 5 minutes
})();
