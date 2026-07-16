#!/usr/bin/env node
/**
 * Merge driver for data/calendar-events.json.
 * Usage (git): node scripts/merge-calendar-events.js %O %A %B
 * Combines event items from both sides and keeps the newest updatedAt.
 */
const fs = require("fs"); // Read and write JSON conflict sides

function readPayload(filePath) { // Parse one side of the calendar JSON merge
  try { // File may be missing during some merge edge cases
    var parsed = JSON.parse(fs.readFileSync(filePath, "utf8")); // Load JSON document
    if (!parsed || typeof parsed !== "object") { return { items: [] }; } // Guard non-objects
    return parsed; // Return parsed calendar payload
  } catch (error) { // Invalid or missing JSON
    return { items: [] }; // Treat as empty calendar payload
  }
}

function itemKey(item) { // Build a stable unique key for one calendar row
  return String(item.summary || "") + "|" + String(item.start || ""); // Title plus start time
}

function mergeItems(groups) { // Combine event arrays without duplicates
  var combined = []; // Accumulated unique items
  var seen = {}; // Track keys already included
  groups.forEach(function (group) { // Walk each source list
    (group || []).forEach(function (item) { // Walk each event row
      if (!item || typeof item !== "object") { return; } // Skip invalid rows
      var key = itemKey(item); // Unique key for this event
      if (seen[key]) { return; } // Skip duplicates
      seen[key] = true; // Mark as included
      combined.push({ // Normalize fields for stable JSON output
        summary: item.summary || "", // Event title
        description: item.description || "", // Event description
        categories: item.categories || "", // Optional categories
        start: item.start || "", // ISO start datetime
        allDay: Boolean(item.allDay), // All-day flag
        isTodo: Boolean(item.isTodo), // Task flag
      });
    });
  });
  combined.sort(function (a, b) { // Keep deterministic order for cleaner diffs
    return String(a.start).localeCompare(String(b.start)) || String(a.summary).localeCompare(String(b.summary)); // Sort by start then title
  });
  return combined; // Merged unique events
}

function newerTimestamp(a, b) { // Pick the later updatedAt value
  var aTime = Date.parse(a || "") || 0; // Parse first timestamp
  var bTime = Date.parse(b || "") || 0; // Parse second timestamp
  if (aTime >= bTime) { return a || b || new Date().toISOString(); } // Prefer A when equal/newer
  return b || a || new Date().toISOString(); // Prefer B when newer
}

function main(argv) { // Merge ours/theirs calendar JSON into the result path
  var oursPath = argv[2]; // %A current branch file (also write target)
  var theirsPath = argv[3]; // %B incoming branch file
  if (!oursPath || !theirsPath) { // Require both merge sides
    process.stderr.write("Usage: node scripts/merge-calendar-events.js %O %A %B\n"); // Show usage
    process.exit(1); // Fail when args are missing
  }

  var ours = readPayload(oursPath); // Load current branch calendar data
  var theirs = readPayload(theirsPath); // Load incoming calendar data
  var merged = { // Combined calendar document
    updatedAt: newerTimestamp(ours.updatedAt, theirs.updatedAt), // Newest sync timestamp
    timeZone: ours.timeZone || theirs.timeZone || "America/Chicago", // Prefer existing timezone
    source: ours.source || theirs.source || "ical", // Prefer existing source label
    items: mergeItems([ours.items || [], theirs.items || []]), // Union of both event lists
  };

  if (ours.error && !theirs.items) { merged.error = ours.error; } // Preserve sync error when useful
  if (theirs.error && !(ours.items || []).length) { merged.error = theirs.error; } // Preserve theirs error if ours empty

  fs.writeFileSync(oursPath, JSON.stringify(merged, null, 2) + "\n"); // Write merged result to %A
  process.exit(0); // Signal successful merge to Git
}

main(process.argv); // Run merge driver
