(function (root) { // Shared iCal helpers for browser and Node sync script
  function unfoldIcal(raw) { // Join RFC 5545 folded continuation lines
    return raw.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, ""); // Merge lines that start with space/tab
  }

  function parseDtstartLine(line) { // Parse DTSTART variants from Google Calendar iCal
    if (line.indexOf("DTSTART") !== 0) { return null; } // Skip non-DTSTART lines
    if (line.indexOf("VALUE=DATE:") !== -1) { // All-day event date
      return { value: line.split("VALUE=DATE:")[1], dateOnly: true }; // DATE-only value
    }
    var colonIndex = line.lastIndexOf(":"); // Value follows the last colon (handles TZID param)
    if (colonIndex === -1) { return null; } // Malformed DTSTART line
    return { value: line.slice(colonIndex + 1), dateOnly: false }; // DATE-TIME value
  }

  function parseIcalDate(value, isDateOnly) { // Convert iCal datetime string to Date object
    if (!value) { return null; } // Skip empty values
    if (isDateOnly || value.length === 8) { // DATE format YYYYMMDD
      var y = value.slice(0, 4); // Year digits
      var m = value.slice(4, 6); // Month digits
      var d = value.slice(6, 8); // Day digits
      return new Date(y + "-" + m + "-" + d + "T12:00:00"); // Noon local avoids DST edge cases
    }
    if (value.indexOf("T") === -1) { return new Date(value); } // Pass through ISO-like strings
    var clean = value.replace("Z", ""); // Strip UTC suffix for manual parsing
    if (clean.indexOf("T") !== -1 && clean.length >= 15) { // Compact datetime YYYYMMDDTHHMMSS
      var yy = clean.slice(0, 4); // Year
      var mm = clean.slice(4, 6); // Month
      var dd = clean.slice(6, 8); // Day
      var hh = clean.slice(9, 11); // Hour
      var mi = clean.slice(11, 13); // Minute
      var ss = clean.slice(13, 15) || "00"; // Seconds
      if (value.indexOf("Z") !== -1) { // UTC datetime
        return new Date(Date.UTC(Number(yy), Number(mm) - 1, Number(dd), Number(hh), Number(mi), Number(ss))); // UTC Date
      }
      return new Date(yy + "-" + mm + "-" + dd + "T" + hh + ":" + mi + ":" + ss); // Floating local datetime
    }
    return new Date(value); // Last-resort Date parsing
  }

  function parseIcalDateIso(value, isDateOnly) { // Same parser but returns ISO string for JSON export
    var date = parseIcalDate(value, isDateOnly); // Parse into Date object
    return date ? date.toISOString() : null; // Convert to ISO or null
  }

  function readNamedField(line, name) { // Read a property that may include parameters before the colon
    if (line.indexOf(name) !== 0) { return null; } // Line does not start with the property name
    if (line.charAt(name.length) !== ":" && line.charAt(name.length) !== ";") { return null; } // Require exact property boundary
    var colonIndex = line.indexOf(":"); // Value begins after the first colon
    if (colonIndex === -1) { return null; } // Malformed property line
    return line.slice(colonIndex + 1); // Return the property value
  }

  function unescapeIcalText(value) { // Decode common iCal text escapes from Google Calendar
    return String(value || "") // Coerce missing values to empty string
      .replace(/\\n/gi, "\n") // Convert escaped newlines into real line breaks
      .replace(/\\,/g, ",") // Unescape commas
      .replace(/\\;/g, ";") // Unescape semicolons
      .replace(/\\\\/g, "\\"); // Unescape backslashes last
  }

  function parseIcalFeed(raw) { // Parse VEVENT and VTODO blocks from unfolded iCal text
    var items = []; // Normalized calendar items
    var unfolded = unfoldIcal(raw); // Unfold wrapped lines before splitting blocks
    var blocks = unfolded.split(/BEGIN:(VEVENT|VTODO)/); // Split feed into event/task blocks
    blocks.forEach(function (block) { // Walk each parsed block
      if (block.indexOf("END:VEVENT") === -1 && block.indexOf("END:VTODO") === -1) { return; } // Skip non-event chunks
      var isTodo = block.indexOf("END:VTODO") !== -1; // Detect task entries
      var summary = ""; // Event/task title
      var description = ""; // Event/task description
      var categories = ""; // Optional iCal categories
      var dtstart = ""; // Raw DTSTART value
      var dateOnly = false; // Whether DTSTART uses DATE not DATE-TIME
      block.split(/\r?\n/).forEach(function (line) { // Parse line-based iCal fields
        var summaryValue = readNamedField(line, "SUMMARY"); // Read SUMMARY (with optional params)
        if (summaryValue !== null) { summary = unescapeIcalText(summaryValue); return; } // Store title
        var descriptionValue = readNamedField(line, "DESCRIPTION"); // Read DESCRIPTION (with optional params)
        if (descriptionValue !== null) { description = unescapeIcalText(descriptionValue); return; } // Store description
        var categoriesValue = readNamedField(line, "CATEGORIES"); // Read CATEGORIES (with optional params)
        if (categoriesValue !== null) { categories = unescapeIcalText(categoriesValue); return; } // Store categories
        var dt = parseDtstartLine(line); // Parse DTSTART variants
        if (dt) { dtstart = dt.value; dateOnly = dt.dateOnly; } // Store start date fields
      });
      var start = parseIcalDate(dtstart, dateOnly); // Convert DTSTART to Date
      if (!start) { return; } // Skip blocks without a valid start
      items.push({ summary: summary, description: description, categories: categories, start: start, allDay: dateOnly, isTodo: isTodo }); // Store normalized item
    });
    return items; // Return all parsed items
  }

  function parseIcalFeedIso(raw) { // Parse iCal and return ISO start strings for JSON sync
    return parseIcalFeed(raw).map(function (item) { // Map parsed items
      return { // JSON-safe item shape
        summary: item.summary, // Event title
        description: item.description, // Event description
        categories: item.categories, // iCal categories
        start: item.start.toISOString(), // ISO datetime string
        allDay: item.allDay, // All-day flag
        isTodo: item.isTodo, // Task flag
      };
    });
  }

  var api = { // Exported helper functions
    unfoldIcal: unfoldIcal, // Expose line unfolding
    parseIcalDate: parseIcalDate, // Expose Date parser
    parseIcalDateIso: parseIcalDateIso, // Expose ISO parser
    parseIcalFeed: parseIcalFeed, // Expose feed parser returning Date objects
    parseIcalFeedIso: parseIcalFeedIso, // Expose feed parser returning ISO strings
  };

  if (typeof module !== "undefined" && module.exports) { // Node.js environment (sync script)
    module.exports = api; // Export for require() in sync-calendar.js
    return; // Stop before assigning to window
  }

  root.CigarClubIcal = api; // Browser global for events-ticker.js
})(typeof globalThis !== "undefined" ? globalThis : window);
