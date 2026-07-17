(function () { // Browse-in-store cigar selection catalog for the shop cigars panel
  var root = document.querySelector("[data-cigars-catalog]"); // Catalog grid mount point
  var filtersEl = document.querySelector("[data-cigars-filters]"); // Category filter chip row
  var statusEl = document.querySelector("[data-cigars-status]"); // Live region for empty / error messages
  if (!root) { return; } // Exit when this page has no catalog markup

  var items = []; // Loaded cigar rows from JSON or fallbacks
  var activeCategory = "all"; // Current filter chip value
  var fallbackImage = "images/ICON-05.png"; // Shared cigar icon when an item has no photo

  var availabilityLabels = { // Human-readable availability badge text
    "in-stock": "In stock", // Ready in the humidor
    limited: "Limited", // Few boxes remaining
    ask: "Ask in store", // Confirm with staff
  };

  var fallbackItems = [ // Embedded examples when fetch cannot run (file:// or offline)
    { id: "padron-1964", name: "1964 Anniversary Series", maker: "Padron", category: "premium", material: "Maduro", shape: "Toro", price: "$18", availability: "in-stock", note: "Nicaraguan puro with rich cocoa and coffee notes — a club favorite for special occasions.", image: "images/IMG_4338.JPG" }, // Premium example
    { id: "fuente-hemingway", name: "Hemingway Short Story", maker: "Arturo Fuente", category: "premium", material: "Connecticut Broadleaf", shape: "Perfecto", price: "$9", availability: "in-stock", note: "Short, flavorful perfecto — ideal when you want a premium smoke without a long sit-down.", image: "images/IMG_4338.JPG" }, // Premium example
    { id: "rocky-decade", name: "Decade", maker: "Rocky Patel", category: "premium", material: "Habano", shape: "Toro", price: "$12", availability: "in-stock", note: "Full-bodied Habano with pepper and leather — great with an evening pour.", image: "images/IMG_4338.JPG" }, // Premium example
    { id: "perdomo-champagne", name: "Champagne Noir", maker: "Perdomo", category: "everyday", material: "Connecticut", shape: "Robusto", price: "$8", availability: "in-stock", note: "Smooth, creamy Connecticut wrapper — an easy recommendation for newer smokers.", image: "images/IMG_4338.JPG" }, // Everyday example
    { id: "undercrown-maduro", name: "Undercrown Maduro", maker: "Drew Estate", category: "everyday", material: "Maduro", shape: "Robusto", price: "$7", availability: "in-stock", note: "Sweet maduro wrapper and a reliable burn — a solid everyday stick at a fair price.", image: "images/IMG_4338.JPG" }, // Everyday example
    { id: "club-sampler", name: "House sampler pack", maker: "The Cigar Club", category: "everyday", material: "Assorted", shape: "Mixed", price: "$45", availability: "in-stock", note: "Staff-picked five-pack rotated weekly — a low-risk way to explore new blends.", image: "images/ICON-05.png" }, // Everyday example
    { id: "limited-box", name: "Limited release box", maker: "Varies", category: "limited", material: "Assorted", shape: "Box", price: "Ask in store", availability: "limited", note: "Small-batch and regional exclusives land here — ask what is in the humidor this week.", image: "images/IMG_4341.JPG" }, // Limited example
    { id: "humidor-rotation", name: "Humidor rotation", maker: "Varies", category: "premium", material: "Assorted", shape: "Assorted", price: "Ask in store", availability: "ask", note: "Our full walk-in humidor holds hundreds of SKUs — staff will walk you to the right shelf.", image: "images/ICON-05.png" }, // Ask-in-store example
  ];

  function escapeHtml(text) { // Escape catalog text before inserting into HTML
    return String(text || "") // Coerce missing values to empty string
      .replace(/&/g, "&amp;") // Escape ampersands
      .replace(/</g, "&lt;") // Escape less-than
      .replace(/>/g, "&gt;") // Escape greater-than
      .replace(/"/g, "&quot;"); // Escape double quotes
  }

  function resolveDataUrl(relativePath) { // Build absolute URL that works on GitHub Pages subpaths
    var script = document.querySelector("script[src*=\"cigars-catalog.js\"]"); // Find this script tag
    if (!script || !script.src) { return relativePath; } // Fall back to relative path
    var base = script.src.replace(/js\/cigars-catalog\.js(\?.*)?$/, ""); // Site root from script URL
    return base + relativePath; // Absolute URL for the JSON file
  }

  function normalizeItem(raw) { // Normalize one JSON row into a safe catalog item
    return { // Shared in-memory shape for rendering
      id: raw.id || "", // Stable item id
      name: raw.name || "Untitled cigar", // Display name
      maker: raw.maker || "", // Brand or maker
      category: String(raw.category || "everyday").toLowerCase(), // Filter key
      material: raw.material || "", // Wrapper type
      shape: raw.shape || "", // Vitola or format
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

  function notifyCatalogUpdated() { // Tell the product panel switcher to remeasure height
    window.dispatchEvent(new CustomEvent("product-catalog-updated", { detail: { panel: "cigars" } })); // Broadcast catalog paint
  }

  function renderFilters() { // Highlight the active filter chip
    if (!filtersEl) { return; } // Skip when filter markup is missing
    var buttons = filtersEl.querySelectorAll("[data-cigars-filter]"); // All filter chip buttons
    buttons.forEach(function (button) { // Update selected state on each chip
      var value = button.getAttribute("data-cigars-filter"); // Chip category value
      var isActive = value === activeCategory; // Whether this chip is selected
      button.classList.toggle("is-active", isActive); // Style the active chip
      button.setAttribute("aria-pressed", isActive ? "true" : "false"); // Expose pressed state to AT
    });
  }

  function renderCatalog() { // Draw the filtered cigar selection into the grid
    var visible = filteredItems(); // Items for the current chip
    renderFilters(); // Sync chip selected styles

    if (!visible.length) { // Nothing matches this filter
      root.innerHTML = ""; // Clear previous tiles
      if (statusEl) { // Announce empty filter to visitors
        statusEl.hidden = false; // Show the status line
        statusEl.textContent = items.length // Distinguish empty inventory from empty filter
          ? "No cigars in this category right now — try another filter or ask in store."
          : "Selection updates in the humidor. Stop by to see what is on the shelf today.";
      }
      notifyCatalogUpdated(); // Remeasure after clearing tiles
      return; // Stop after empty state
    }

    if (statusEl) { // Hide status when tiles are showing
      statusEl.hidden = true; // Remove empty-state message
      statusEl.textContent = ""; // Clear leftover copy
    }

    root.innerHTML = visible.map(function (item) { // Build one tile per visible cigar
      var badge = availabilityLabels[item.availability] || availabilityLabels.ask; // Badge label
      var metaParts = [item.material, item.shape].filter(Boolean); // Wrapper and vitola line
      var meta = metaParts.join(" · "); // Joined meta string
      return '<article class="pipes-item" data-category="' + escapeHtml(item.category) + '">' // Reuse pipes tile styles
        + '<div class="pipes-item__media">' // Image frame
        + '<img src="' + escapeHtml(item.image) + '" alt="" class="pipes-item__image" loading="lazy">' // Cigar photo
        + "</div>" // End media
        + '<div class="pipes-item__body">' // Text column
        + '<div class="pipes-item__topline">' // Name row with badge
        + '<h3 class="pipes-item__name">' + escapeHtml(item.name) + "</h3>" // Cigar name
        + '<span class="pipes-item__badge pipes-item__badge--' + escapeHtml(item.availability) + '">' + escapeHtml(badge) + "</span>" // Availability badge
        + "</div>" // End topline
        + (item.maker ? '<p class="pipes-item__maker">' + escapeHtml(item.maker) + "</p>" : "") // Brand line
        + (meta ? '<p class="pipes-item__meta">' + escapeHtml(meta) + "</p>" : "") // Wrapper · vitola
        + (item.note ? '<p class="pipes-item__note">' + escapeHtml(item.note) + "</p>" : "") // Shop note
        + '<p class="pipes-item__price">' + escapeHtml(item.price) + "</p>" // Price or ask copy
        + "</div>" // End body
        + "</article>"; // End tile
    }).join(""); // Combine all tiles
    notifyCatalogUpdated(); // Remeasure panel height after painting tiles
  }

  function onFilterClick(event) { // Handle clicks on category filter chips
    var button = event.target.closest("[data-cigars-filter]"); // Find the clicked chip
    if (!button || !filtersEl.contains(button)) { return; } // Ignore clicks outside chips
    activeCategory = button.getAttribute("data-cigars-filter") || "all"; // Apply selected category
    renderCatalog(); // Re-render the grid for the new filter
  }

  function useFallbackExamples() { // Paint embedded examples when JSON cannot load
    items = fallbackItems.map(normalizeItem); // Use the built-in sample cigars
    renderCatalog(); // Draw the example tiles immediately
  }

  function loadCatalog() { // Fetch cigars.json and render the selection
    useFallbackExamples(); // Show examples right away so the grid is never empty
    var url = resolveDataUrl("data/cigars.json"); // Absolute JSON URL
    var cacheBust = url + (url.indexOf("?") === -1 ? "?" : "&") + "ts=" + Date.now(); // Avoid stale cache
    return fetch(cacheBust, { cache: "no-store" }).then(function (response) { // Request catalog JSON
      if (!response.ok) { throw new Error("Missing cigars.json"); } // Fail when file is absent
      return response.json(); // Parse JSON payload
    }).then(function (payload) { // Normalize and render items
      var loaded = (payload.items || []).map(normalizeItem); // Build in-memory catalog rows
      if (!loaded.length) { return; } // Keep fallbacks when the file is empty
      items = loaded; // Prefer live JSON when it loads successfully
      renderCatalog(); // Draw the default All filter view
    }).catch(function () { // Keep the embedded examples visible on fetch failure
      useFallbackExamples(); // Re-paint fallbacks if a later failure cleared them
    });
  }

  if (filtersEl) { // Wire filter chips when present
    filtersEl.addEventListener("click", onFilterClick); // Delegate chip clicks
  }

  loadCatalog(); // Initial catalog load
})();
