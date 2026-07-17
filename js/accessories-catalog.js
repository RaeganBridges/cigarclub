(function () { // Browse-in-store accessories catalog for the shop accessories panel
  var root = document.querySelector("[data-accessories-catalog]"); // Catalog grid mount point
  var filtersEl = document.querySelector("[data-accessories-filters]"); // Category filter chip row
  var statusEl = document.querySelector("[data-accessories-status]"); // Live region for empty / error messages
  if (!root) { return; } // Exit when this page has no catalog markup

  var items = []; // Loaded accessory rows from JSON or fallbacks
  var activeCategory = "all"; // Current filter chip value
  var fallbackImage = "images/ICON-07.png"; // Shared accessories icon when an item has no photo

  var availabilityLabels = { // Human-readable availability badge text
    "in-stock": "In stock", // Ready on the shelf
    limited: "Limited", // Few pieces remaining
    ask: "Ask in store", // Confirm with staff
  };

  var fallbackItems = [ // Embedded examples when fetch cannot run (file:// or offline)
    { id: "xikar-x2", name: "X2 Dual Blade Cutter", maker: "Xikar", category: "cutters", material: "Stainless steel", shape: "Double guillotine", price: "$45", availability: "in-stock", note: "Clean, even cuts with lifetime warranty — a reliable everyday cutter.", image: "images/IMG_4341.JPG" }, // Cutter example
    { id: "colibri-v-cut", name: "V-Cut Cigar Cutter", maker: "Colibri", category: "cutters", material: "Stainless steel", shape: "V-cut", price: "$55", availability: "in-stock", note: "Concentrates the draw with a deep V notch — popular with fuller-bodied smokes.", image: "images/IMG_4341.JPG" }, // Cutter example
    { id: "credo-synchro", name: "Credo Synchro Cut", maker: "Credo", category: "cutters", material: "Stainless steel", shape: "Scissor cutter", price: "$38", availability: "limited", note: "Scissor-style cut with a controlled close — good for ring gauges up to 54.", image: "images/IMG_4341.JPG" }, // Cutter example
    { id: "xikar-forb", name: "Forb Soft Flame", maker: "Xikar", category: "lighters", material: "Metal", shape: "Soft flame", price: "$40", availability: "in-stock", note: "Classic soft flame for a gentle toast — easy to control on windless evenings.", image: "images/IMG_4341.JPG" }, // Lighter example
    { id: "vector-triple", name: "Triple Torch Lighter", maker: "Vector", category: "lighters", material: "Metal", shape: "Triple torch", price: "$65", availability: "in-stock", note: "Hot, focused torch for denser cigars and outdoor lighting.", image: "images/IMG_4341.JPG" }, // Lighter example
    { id: "table-torch", name: "Tabletop Quad Torch", maker: "Assorted", category: "lighters", material: "Metal", shape: "Table torch", price: "$85", availability: "ask", note: "Stable table lighter for lounge nights — fuel type and finish vary by shipment.", image: "images/IMG_4341.JPG" }, // Lighter example
    { id: "boveda-65", name: "Boveda 65% 60g", maker: "Boveda", category: "storage", material: "2-way humidity", shape: "Pack", price: "$6", availability: "in-stock", note: "Set-and-forget humidity control for travel humidors and small desktop boxes.", image: "images/ICON-07.png" }, // Storage example
    { id: "travel-humidor", name: "5-Count Travel Humidor", maker: "The Cigar Club", category: "storage", material: "Cedar lined", shape: "Travel case", price: "$35", availability: "in-stock", note: "Protects a short rotation on the road — fits easily in a bag or glove box.", image: "images/IMG_4341.JPG" }, // Storage example
    { id: "desktop-humidor", name: "25-Count Desktop Humidor", maker: "Assorted", category: "storage", material: "Spanish cedar", shape: "Desktop box", price: "$120", availability: "limited", note: "Glass-top desktop box with hygrometer — ask staff which finish is on the shelf.", image: "images/IMG_4341.JPG" }, // Storage example
    { id: "ashtray-rest", name: "Ceramic Cigar Rest", maker: "Assorted", category: "tools", material: "Ceramic", shape: "Ashtray", price: "$28", availability: "in-stock", note: "Stable rest for lounge nights — ask about colors currently on the shelf.", image: "images/IMG_4341.JPG" }, // Tools example
    { id: "punch-kit", name: "Punch & Tool Kit", maker: "Assorted", category: "tools", material: "Metal", shape: "Multi-tool", price: "Ask in store", availability: "ask", note: "Punches, picks, and pocket tools rotate often — staff will show what is in stock.", image: "images/ICON-07.png" }, // Tools example
    { id: "draw-poker", name: "Draw Poker Tool", maker: "Xikar", category: "tools", material: "Metal", shape: "Draw tool", price: "$18", availability: "in-stock", note: "Clears a tight draw without shredding the filler — pocket-friendly size.", image: "images/ICON-07.png" }, // Tools example
  ];

  function escapeHtml(text) { // Escape catalog text before inserting into HTML
    return String(text || "") // Coerce missing values to empty string
      .replace(/&/g, "&amp;") // Escape ampersands
      .replace(/</g, "&lt;") // Escape less-than
      .replace(/>/g, "&gt;") // Escape greater-than
      .replace(/"/g, "&quot;"); // Escape double quotes
  }

  function resolveDataUrl(relativePath) { // Build absolute URL that works on GitHub Pages subpaths
    var script = document.querySelector("script[src*=\"accessories-catalog.js\"]"); // Find this script tag
    if (!script || !script.src) { return relativePath; } // Fall back to relative path
    var base = script.src.replace(/js\/accessories-catalog\.js(\?.*)?$/, ""); // Site root from script URL
    return base + relativePath; // Absolute URL for the JSON file
  }

  function normalizeItem(raw) { // Normalize one JSON row into a safe catalog item
    return { // Shared in-memory shape for rendering
      id: raw.id || "", // Stable item id
      name: raw.name || "Untitled accessory", // Display name
      maker: raw.maker || "", // Brand or maker
      category: String(raw.category || "tools").toLowerCase(), // Filter key
      material: raw.material || "", // Material or type label
      shape: raw.shape || "", // Form factor label
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
    window.dispatchEvent(new CustomEvent("product-catalog-updated", { detail: { panel: "accessories" } })); // Broadcast catalog paint
  }

  function renderFilters() { // Highlight the active filter chip
    if (!filtersEl) { return; } // Skip when filter markup is missing
    var buttons = filtersEl.querySelectorAll("[data-accessories-filter]"); // All filter chip buttons
    buttons.forEach(function (button) { // Update selected state on each chip
      var value = button.getAttribute("data-accessories-filter"); // Chip category value
      var isActive = value === activeCategory; // Whether this chip is selected
      button.classList.toggle("is-active", isActive); // Style the active chip
      button.setAttribute("aria-pressed", isActive ? "true" : "false"); // Expose pressed state to AT
    });
  }

  function renderCatalog() { // Draw the filtered accessories selection into the grid
    var visible = filteredItems(); // Items for the current chip
    renderFilters(); // Sync chip selected styles

    if (!visible.length) { // Nothing matches this filter
      root.innerHTML = ""; // Clear previous tiles
      if (statusEl) { // Announce empty filter to visitors
        statusEl.hidden = false; // Show the status line
        statusEl.textContent = items.length // Distinguish empty inventory from empty filter
          ? "No accessories in this category right now — try another filter or ask in store."
          : "Selection updates in the shop. Stop by to see what is on the shelf today.";
      }
      notifyCatalogUpdated(); // Remeasure after clearing tiles
      return; // Stop after empty state
    }

    if (statusEl) { // Hide status when tiles are showing
      statusEl.hidden = true; // Remove empty-state message
      statusEl.textContent = ""; // Clear leftover copy
    }

    root.innerHTML = visible.map(function (item) { // Build one tile per visible accessory
      var badge = availabilityLabels[item.availability] || availabilityLabels.ask; // Badge label
      var metaParts = [item.material, item.shape].filter(Boolean); // Material and form line
      var meta = metaParts.join(" · "); // Joined meta string
      return '<article class="pipes-item" data-category="' + escapeHtml(item.category) + '">' // Reuse pipes/cigars tile styles
        + '<div class="pipes-item__media">' // Image frame
        + '<img src="' + escapeHtml(item.image) + '" alt="" class="pipes-item__image" loading="lazy">' // Accessory photo
        + "</div>" // End media
        + '<div class="pipes-item__body">' // Text column
        + '<div class="pipes-item__topline">' // Name row with badge
        + '<h3 class="pipes-item__name">' + escapeHtml(item.name) + "</h3>" // Accessory name
        + '<span class="pipes-item__badge pipes-item__badge--' + escapeHtml(item.availability) + '">' + escapeHtml(badge) + "</span>" // Availability badge
        + "</div>" // End topline
        + (item.maker ? '<p class="pipes-item__maker">' + escapeHtml(item.maker) + "</p>" : "") // Brand line
        + (meta ? '<p class="pipes-item__meta">' + escapeHtml(meta) + "</p>" : "") // Material · form
        + (item.note ? '<p class="pipes-item__note">' + escapeHtml(item.note) + "</p>" : "") // Shop note
        + '<p class="pipes-item__price">' + escapeHtml(item.price) + "</p>" // Price or ask copy
        + "</div>" // End body
        + "</article>"; // End tile
    }).join(""); // Combine all tiles
    notifyCatalogUpdated(); // Remeasure panel height after painting tiles
  }

  function onFilterClick(event) { // Handle clicks on category filter chips
    var button = event.target.closest("[data-accessories-filter]"); // Find the clicked chip
    if (!button || !filtersEl.contains(button)) { return; } // Ignore clicks outside chips
    activeCategory = button.getAttribute("data-accessories-filter") || "all"; // Apply selected category
    renderCatalog(); // Re-render the grid for the new filter
  }

  function useFallbackExamples() { // Paint embedded examples when JSON cannot load
    items = fallbackItems.map(normalizeItem); // Use the built-in sample accessories
    renderCatalog(); // Draw the example tiles immediately
  }

  function loadCatalog() { // Fetch accessories.json and render the selection
    useFallbackExamples(); // Show examples right away so the grid is never empty
    var url = resolveDataUrl("data/accessories.json"); // Absolute JSON URL
    var cacheBust = url + (url.indexOf("?") === -1 ? "?" : "&") + "ts=" + Date.now(); // Avoid stale cache
    return fetch(cacheBust, { cache: "no-store" }).then(function (response) { // Request catalog JSON
      if (!response.ok) { throw new Error("Missing accessories.json"); } // Fail when file is absent
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
