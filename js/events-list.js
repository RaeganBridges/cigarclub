(function () { // Render upcoming events list on events page
  var loader = window.CigarClubEventsLoader; // Shared calendar event loader
  var config = window.CigarClubCalendar || {}; // Calendar settings from config file
  var listRoot = document.querySelector(".events-upcoming"); // Upcoming events section container
  if (!listRoot || !loader) { return; } // Exit when markup or loader is missing

  var dateFormatter = new Intl.DateTimeFormat("en-US", { // Format timed event dates
    weekday: "long", // Full day name
    month: "long", // Full month name
    day: "numeric", // Day of month
    hour: "numeric", // Hour for timed events
    minute: "2-digit", // Minutes for timed events
    timeZone: config.timeZone || "America/Chicago", // Club timezone from config
  });
  var dateOnlyFormatter = new Intl.DateTimeFormat("en-US", { // Format all-day event dates
    weekday: "long", // Full day name
    month: "long", // Full month name
    day: "numeric", // Day of month
    timeZone: config.timeZone || "America/Chicago", // Club timezone from config
  });

  function formatWhen(item) { // Build human-readable date/time string for one item
    if (!item.start) { return ""; } // Skip if start date is missing
    if (item.allDay) { return dateOnlyFormatter.format(item.start); } // All-day items omit time
    return dateFormatter.format(item.start); // Timed items include clock time
  }

  function renderEmpty() { // Show message when no upcoming events are synced
    listRoot.innerHTML = "<p class=\"events-upcoming__empty\">No upcoming events are published on <strong>The Cigar Club</strong> calendar yet. Use the button below to add one on the correct calendar.</p>"; // Empty state copy
  }

  function renderItems(items) { // Build list markup for upcoming events
    var list = document.createElement("ul"); // Unordered list of events
    list.className = "events-upcoming__list"; // Styled events list class
    items.forEach(function (item) { // Walk each upcoming event
      var row = document.createElement("li"); // One event row
      row.className = "events-upcoming__item"; // Styled event item class
      var title = document.createElement("h3"); // Event title heading
      title.className = "events-upcoming__title"; // Styled title class
      title.textContent = item.summary || "Untitled event"; // Event name text
      var when = document.createElement("p"); // Event date/time line
      when.className = "events-upcoming__when"; // Styled date class
      when.textContent = formatWhen(item); // Formatted date/time string
      row.appendChild(title); // Add title to row
      row.appendChild(when); // Add date to row
      if (item.description) { // Optional description paragraph
        var details = document.createElement("p"); // Event details text
        details.className = "events-upcoming__details"; // Styled details class
        details.textContent = item.description; // Description copy
        row.appendChild(details); // Add details to row
      }
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
