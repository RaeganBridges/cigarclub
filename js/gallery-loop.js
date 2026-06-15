(function () { // Wrap in IIFE to avoid polluting global scope
  var scrollEl = document.querySelector(".gallery-scroll"); // Horizontal scroll container
  if (!scrollEl) { return; } // Exit if gallery is not on this page

  var brick = scrollEl.querySelector(".gallery-brick"); // Staggered two-row grid block
  if (!brick) { return; } // Exit if gallery content is missing

  var rows = Array.prototype.slice.call(brick.querySelectorAll(".gallery-row")); // Top and bottom rows
  if (!rows.length) { return; } // Exit if gallery rows are missing

  var loopWidth = 0; // Pixel width of one original card set
  var originalStart = 0; // Scroll offset where the original card set begins
  var isAdjusting = false; // Prevent scroll handler re-entry during jump
  var hasStarted = false; // Whether initial scroll position has been applied

  function duplicateRow(row) { // Prepend and append clones for bidirectional loop
    if (row.dataset.loopReady === "true") { return; } // Skip rows already duplicated
    var items = Array.prototype.slice.call(row.querySelectorAll(":scope > .gallery-item")); // Original cards only
    if (!items.length) { return; } // Skip empty rows

    items.forEach(function (item) { // Mark originals so clones can be identified later
      item.classList.add("gallery-item--original"); // Tag card as part of the original set
    });

    items.slice().reverse().forEach(function (item) { // Prepend leading clones in original order
      var lead = item.cloneNode(true); // Duplicate card for leftward loop
      lead.classList.remove("gallery-item--original"); // Leading copy is not an original
      lead.classList.add("gallery-item--clone"); // Mark as duplicate card
      lead.setAttribute("aria-hidden", "true"); // Hide from assistive tech
      row.insertBefore(lead, items[0]); // Insert before first original card
    });

    items.forEach(function (item) { // Append trailing clones after originals
      var trail = item.cloneNode(true); // Duplicate card for rightward loop
      trail.classList.remove("gallery-item--original"); // Trailing copy is not an original
      trail.classList.add("gallery-item--clone"); // Mark as duplicate card
      trail.setAttribute("aria-hidden", "true"); // Hide from assistive tech
      row.appendChild(trail); // Append after last original card
    });

    row.dataset.loopReady = "true"; // Prevent duplicate clones on re-init
  }

  function measureLoop() { // Measure original set width and its scroll offset
    var row = rows[0]; // Use top row as width reference for both rows
    var originals = row.querySelectorAll(".gallery-item--original"); // Cards in the middle set
    if (!originals.length) { return; } // Skip until row duplication has run

    var firstLeading = row.querySelector(".gallery-item--clone"); // First leading clone at row start
    var firstOriginal = originals[0]; // First card in the original set
    if (!firstLeading || !firstOriginal) { return; } // Skip until clones exist

    loopWidth = firstOriginal.offsetLeft - firstLeading.offsetLeft; // Full cycle width including inter-set gap
    originalStart = loopWidth; // Leading section width equals scroll offset for original set
  }

  function normalizeScroll() { // Keep scroll position inside the middle (original) loop range
    if (loopWidth <= 0) { return; } // Skip until measured

    var left = scrollEl.scrollLeft; // Current horizontal scroll offset
    var maxScroll = Math.max(0, scrollEl.scrollWidth - scrollEl.clientWidth); // Physical scroll limit
    var min = originalStart; // Start of original card set
    var max = originalStart + loopWidth; // Start of trailing clone set
    var changed = false; // Track whether position needs updating
    var guard = 0; // Safety counter to prevent runaway wrap loops

    while (left >= max && guard < 10) { // Scrolled into trailing clone set
      left -= loopWidth; // Rewind one cycle into original set
      changed = true; // Mark adjustment needed
      guard += 1; // Increment safety counter
    }

    while (left < min && guard < 10) { // Scrolled into leading clone set
      left += loopWidth; // Jump forward one cycle into original set
      changed = true; // Mark adjustment needed
      guard += 1; // Increment safety counter
    }

    if (!changed && maxScroll > 0 && guard < 10) { // Stuck at physical edge without crossing threshold
      if (left >= maxScroll - 2) { // Hit right edge of scroll container
        left -= loopWidth; // Wrap back into original set
        changed = true; // Mark adjustment needed
      } else if (left <= 1 && hasStarted) { // Hit left edge after initialization
        left += loopWidth; // Wrap forward into original set
        changed = true; // Mark adjustment needed
      }
    }

    if (changed) { // Apply loop correction
      isAdjusting = true; // Block recursive scroll events
      scrollEl.scrollLeft = left; // Apply looped scroll position
      isAdjusting = false; // Re-enable scroll handling
    }
  }

  function initScrollPosition() { // Begin on the original card set, not the leading clones
    if (loopWidth <= 0) { return; } // Skip until measured
    isAdjusting = true; // Block scroll handler during setup
    scrollEl.scrollLeft = originalStart; // Align first original card to loop start
    isAdjusting = false; // Re-enable scroll handling
    hasStarted = true; // Mark initialization complete
  }

  function setupGallery() { // Measure loop geometry and normalize scroll position
    measureLoop(); // Refresh width and original start offset
    if (!hasStarted) { // Only jump on first setup so resize does not reset user scroll
      initScrollPosition(); // Start on the middle (original) card set
    }
    normalizeScroll(); // Correct if outside the loop range
  }

  function onGalleryScroll() { // Handle scroll events on gallery container
    if (isAdjusting) { return; } // Ignore programmatic scroll adjustments
    normalizeScroll(); // Loop when bounds are crossed
  }

  function onGalleryWheel(event) { // Map vertical wheel/trackpad motion to horizontal scroll
    if (loopWidth <= 0) { return; } // Skip until measured
    var delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY; // Pick dominant axis
    if (delta === 0) { return; } // Ignore empty wheel events
    event.preventDefault(); // Stop page from scrolling vertically instead
    scrollEl.scrollLeft += delta; // Move gallery horizontally
    normalizeScroll(); // Wrap when loop bounds are crossed
  }

  function whenLayoutReady(callback) { // Run after browser has finished layout
    requestAnimationFrame(function () { // Wait for next paint
      requestAnimationFrame(callback); // Wait one more frame for stable sizes
    });
  }

  rows.forEach(duplicateRow); // Build leading and trailing clone sets in each row
  brick.dataset.loopReady = "true"; // Mark gallery as initialized

  whenLayoutReady(setupGallery); // Initial setup after layout
  window.addEventListener("load", function () { whenLayoutReady(setupGallery); }); // Re-measure after images load
  window.addEventListener("resize", function () { whenLayoutReady(setupGallery); }); // Re-measure on resize
  scrollEl.addEventListener("scroll", onGalleryScroll, { passive: true }); // Native horizontal scroll / drag
  scrollEl.addEventListener("wheel", onGalleryWheel, { passive: false }); // Trackpad and mouse wheel over gallery

  if ("onscrollend" in scrollEl) { // Use scrollend when browser supports it (momentum scroll)
    scrollEl.addEventListener("scrollend", normalizeScroll, { passive: true }); // Wrap after touch momentum stops
  }
})();
