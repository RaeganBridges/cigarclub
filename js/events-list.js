(function () { // Render upcoming events list on events page
  var loader = window.CigarClubEventsLoader; // Shared calendar event loader
  var config = window.CigarClubCalendar || {}; // Calendar settings from config file
  var listRoot = document.querySelector(".events-upcoming"); // Upcoming events section container
  if (!listRoot || !loader) { return; } // Exit when markup or loader is missing

  var timeZone = config.timeZone || "America/Chicago"; // Club timezone from config

  var dateFormatter = new Intl.DateTimeFormat("en-US", { // Format timed event dates
    weekday: "long", // Full day name
    month: "long", // Full month name
    day: "numeric", // Day of month
    hour: "numeric", // Hour for timed events
    minute: "2-digit", // Minutes for timed events
    timeZone: timeZone, // Club timezone from config
  });
  var dateOnlyFormatter = new Intl.DateTimeFormat("en-US", { // Format all-day event dates
    weekday: "long", // Full day name
    month: "long", // Full month name
    day: "numeric", // Day of month
    timeZone: timeZone, // Club timezone from config
  });
  var dayFormatter = new Intl.DateTimeFormat("en-US", { // Numeric day for the date badge
    day: "numeric", // Day of month number
    timeZone: timeZone, // Club timezone from config
  });
  var monthFormatter = new Intl.DateTimeFormat("en-US", { // Short month for the date badge
    month: "short", // Abbreviated month label
    timeZone: timeZone, // Club timezone from config
  });
  var weekdayFormatter = new Intl.DateTimeFormat("en-US", { // Weekday for the date badge
    weekday: "short", // Abbreviated weekday label
    timeZone: timeZone, // Club timezone from config
  });

  function formatWhen(item) { // Build human-readable date/time string for one item
    if (!item.start) { return ""; } // Skip if start date is missing
    if (item.allDay) { return dateOnlyFormatter.format(item.start); } // All-day items omit time
    return dateFormatter.format(item.start); // Timed items include clock time
  }

  function renderEmpty() { // Show message when no upcoming events are synced
    listRoot.innerHTML = "<p class=\"events-upcoming__empty\">No upcoming events are published on <strong>The Cigar Club</strong> calendar yet.</p>"; // Empty state copy
  }

  function renderItems(items) { // Build list markup for upcoming events
    var list = document.createElement("ul"); // Unordered list of events
    list.className = "events-upcoming__list"; // Styled events list class
    items.forEach(function (item) { // Walk each upcoming event
      var row = document.createElement("li"); // One event row
      row.className = "events-upcoming__item"; // Styled event item class

      var badge = document.createElement("div"); // Date badge column
      badge.className = "events-upcoming__badge"; // Styled date badge class
      badge.setAttribute("aria-hidden", "true"); // Decorative; full date is in the when line

      var weekday = document.createElement("span"); // Weekday label in the badge
      weekday.className = "events-upcoming__badge-weekday"; // Styled weekday class
      weekday.textContent = item.start ? weekdayFormatter.format(item.start) : ""; // Abbreviated weekday

      var day = document.createElement("span"); // Day number in the badge
      day.className = "events-upcoming__badge-day"; // Styled day number class
      day.textContent = item.start ? dayFormatter.format(item.start) : ""; // Numeric day

      var month = document.createElement("span"); // Month label in the badge
      month.className = "events-upcoming__badge-month"; // Styled month class
      month.textContent = item.start ? monthFormatter.format(item.start) : ""; // Abbreviated month

      badge.appendChild(weekday); // Add weekday to badge
      badge.appendChild(day); // Add day number to badge
      badge.appendChild(month); // Add month to badge

      var body = document.createElement("div"); // Text column beside the badge
      body.className = "events-upcoming__body"; // Styled body class

      var title = document.createElement("h3"); // Event title heading
      title.className = "events-upcoming__title"; // Styled title class
      title.textContent = item.summary || "Untitled event"; // Event name text

      var when = document.createElement("p"); // Event date/time line
      when.className = "events-upcoming__when"; // Styled date class
      when.textContent = formatWhen(item); // Formatted date/time string

      body.appendChild(title); // Add title to body
      body.appendChild(when); // Add date to body

      if (item.description) { // Optional description paragraph
        var details = document.createElement("p"); // Event details text
        details.className = "events-upcoming__details"; // Styled details class
        details.textContent = item.description; // Description copy
        body.appendChild(details); // Add details to body
      }

      row.appendChild(badge); // Add date badge to row
      row.appendChild(body); // Add text body to row
      list.appendChild(row); // Add row to list
    });
    listRoot.innerHTML = ""; // Clear loading placeholder
    listRoot.appendChild(list); // Insert rendered list
  }

  function refreshList() { // Fetch latest events and update list UI
    loader.loadEvents().then(function (items) { // Load merged event data
      var upcoming = loader.upcomingItems(items); // Filter to future events only
      if (!upcoming.length) { renderEmpty(); return; } // Show empty state when none found
      renderItems(upcoming); // Render upcoming events list
    }).catch(function () { // Handle fetch failures gracefully
      renderEmpty(); // Show empty state on error
    });
  }

  refreshList(); // Initial list load on page open
  setInterval(refreshList, config.refreshMs || 300000); // Poll for calendar updates every 5 minutes
})();
