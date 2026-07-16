(function () { // Browse-in-store pipe selection catalog for pipes.html
  var root = document.querySelector("[data-pipes-catalog]"); // Catalog grid mount point
  var filtersEl = document.querySelector("[data-pipes-filters]"); // Category filter chip row
  var statusEl = document.querySelector("[data-pipes-status]"); // Live region for empty / error messages
  if (!root) { return; } // Exit when this page has no catalog markup

  var items = []; // Loaded pipe rows from JSON
  var activeCategory = "all"; // Current filter chip value
  var fallbackImage = "images/ICON-04.png"; // Shared pipe icon when an item has no photo

  var availabilityLabels = { // Human-readable availability badge text
    "in-stock": "In stock", // Ready on the wall
    limited: "Limited", // Few pieces remaining
    ask: "Ask in store", // Confirm with staff
  };

  function escapeHtml(text) { // Escape catalog text before inserting into HTML
    return String(text || "") // Coerce missing values to empty string
      .replace(/&/g, "&amp;") // Escape ampersands
      .replace(/</g, "&lt;") // Escape less-than
      .replace(/>/g, "&gt;") // Escape greater-than
      .replace(/"/g, "&quot;"); // Escape double quotes
  }

  function resolveDataUrl(relativePath) { // Build absolute URL that works on GitHub Pages subpaths
    var script = document.querySelector("script[src*=\"pipes-catalog.js\"]"); // Find this script tag
    if (!script || !script.src) { return relativePath; } // Fall back to relative path
    var base = script.src.replace(/js\/pipes-catalog\.js(\?.*)?$/, ""); // Site root from script URL
    return base + relativePath; // Absolute URL for the JSON file
  }

  function normalizeItem(raw) { // Normalize one JSON row into a safe catalog item
    return { // Shared in-memory shape for rendering
      id: raw.id || "", // Stable item id
      name: raw.name || "Untitled pipe", // Display name
      maker: raw.maker || "", // Maker or carver
      category: String(raw.category || "briar").toLowerCase(), // Filter key
      material: raw.material || "", // Wood or cob material
      shape: raw.shape || "", // Bowl shape label
      price: raw.price || "Ask in store", // Price string or ask copy
      availability: raw.availability || "ask", // Stock status key
      note: raw.note || "", // Short shop note
      image: raw.image || fallbackImage, // Photo path with fallback
    };
  }

  function filteredItems() { // Return items matching the active category chip
    if (activeCategory === "all") { return items; } // Show full selection
    return items.filter(function (item) { // Keep matching category only
      return item.category === activeCategory; // Compare normalized category keys
    });
  }

  function renderFilters() { // Highlight the active filter chip
    if (!filtersEl) { return; } // Skip when filter markup is missing
    var buttons = filtersEl.querySelectorAll("[data-pipes-filter]"); // All filter chip buttons
    buttons.forEach(function (button) { // Update selected state on each chip
      var value = button.getAttribute("data-pipes-filter"); // Chip category value
      var isActive = value === activeCategory; // Whether this chip is selected
      button.classList.toggle("is-active", isActive); // Style the active chip
      button.setAttribute("aria-pressed", isActive ? "true" : "false"); // Expose pressed state to AT
    });
  }

  function renderCatalog() { // Draw the filtered pipe selection into the grid
    var visible = filteredItems(); // Items for the current chip
    renderFilters(); // Sync chip selected styles

    if (!visible.length) { // Nothing matches this filter
      root.innerHTML = ""; // Clear previous tiles
      if (statusEl) { // Announce empty filter to visitors
        statusEl.hidden = false; // Show the status line
        statusEl.textContent = items.length // Distinguish empty inventory from empty filter
          ? "No pipes in this category right now — try another filter or ask in store."
          : "Selection updates in the shop. Stop by to see what is on the wall.";
      }
      return; // Stop after empty state
    }

    if (statusEl) { // Hide status when tiles are showing
      statusEl.hidden = true; // Remove empty-state message
      statusEl.textContent = ""; // Clear leftover copy
    }

    root.innerHTML = visible.map(function (item) { // Build one tile per visible pipe
      var badge = availabilityLabels[item.availability] || availabilityLabels.ask; // Badge label
      var metaParts = [item.material, item.shape].filter(Boolean); // Material and shape line
      var meta = metaParts.join(" · "); // Joined meta string
      return '<article class="pipes-item" data-category="' + escapeHtml(item.category) + '">' // Selection tile
        + '<div class="pipes-item__media">' // Image frame
        + '<img src="' + escapeHtml(item.image) + '" alt="" class="pipes-item__image" loading="lazy">' // Pipe photo
        + "</div>" // End media
        + '<div class="pipes-item__body">' // Text column
        + '<div class="pipes-item__topline">' // Name row with badge
        + '<h3 class="pipes-item__name">' + escapeHtml(item.name) + "</h3>" // Pipe name
        + '<span class="pipes-item__badge pipes-item__badge--' + escapeHtml(item.availability) + '">' + escapeHtml(badge) + "</span>" // Availability badge
        + "</div>" // End topline
        + (item.maker ? '<p class="pipes-item__maker">' + escapeHtml(item.maker) + "</p>" : "") // Maker line
        + (meta ? '<p class="pipes-item__meta">' + escapeHtml(meta) + "</p>" : "") // Material · shape
        + (item.note ? '<p class="pipes-item__note">' + escapeHtml(item.note) + "</p>" : "") // Shop note
        + '<p class="pipes-item__price">' + escapeHtml(item.price) + "</p>" // Price or ask copy
        + "</div>" // End body
        + "</article>"; // End tile
    }).join(""); // Combine all tiles
  }

  function onFilterClick(event) { // Handle clicks on category filter chips
    var button = event.target.closest("[data-pipes-filter]"); // Find the clicked chip
    if (!button || !filtersEl.contains(button)) { return; } // Ignore clicks outside chips
    activeCategory = button.getAttribute("data-pipes-filter") || "all"; // Apply selected category
    renderCatalog(); // Re-render the grid for the new filter
  }

  function showError() { // Friendly fallback when JSON cannot load
    items = []; // Clear any partial data
    root.innerHTML = ""; // Remove stale tiles
    if (statusEl) { // Point visitors to the shop
      statusEl.hidden = false; // Reveal the status line
      statusEl.textContent = "We could not load the current selection online. Stop by the lounge to see what is on the wall."; // Error copy
    }
  }

  function loadCatalog() { // Fetch pipes.json and render the selection
    var url = resolveDataUrl("data/pipes.json"); // Absolute JSON URL
    var cacheBust = url + (url.indexOf("?") === -1 ? "?" : "&") + "ts=" + Date.now(); // Avoid stale cache
    return fetch(cacheBust, { cache: "no-store" }).then(function (response) { // Request catalog JSON
      if (!response.ok) { throw new Error("Missing pipes.json"); } // Fail when file is absent
      return response.json(); // Parse JSON payload
    }).then(function (payload) { // Normalize and render items
      items = (payload.items || []).map(normalizeItem); // Build in-memory catalog rows
      renderCatalog(); // Draw the default All filter view
    }).catch(showError); // Show visit-the-shop message on failure
  }

  if (filtersEl) { // Wire filter chips when present
    filtersEl.addEventListener("click", onFilterClick); // Delegate chip clicks
  }

  loadCatalog(); // Initial catalog load
})();
