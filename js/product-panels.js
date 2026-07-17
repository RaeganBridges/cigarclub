(function () { // Smooth in-page switcher for cigars / pipes / accessories panels
  var tabs = Array.prototype.slice.call(document.querySelectorAll("[data-product-tab]")); // Product switcher buttons
  var panels = Array.prototype.slice.call(document.querySelectorAll("[data-product-panel]")); // Matching product panels
  var panelsRoot = document.querySelector("[data-product-panels]"); // Shared wrapper for height-locked crossfades
  var switcherTrack = document.querySelector(".product-switcher__track"); // Track that anchors the sliding indicator
  var indicator = document.querySelector(".product-switcher__indicator"); // Sliding gold underline under the active tab
  if (!tabs.length || !panels.length || !panelsRoot) { return; } // Exit when this page has no switcher markup

  var titles = { // Browser tab titles for each product panel
    cigars: "Cigars | The Cigar Club Nashville", // Cigars panel title
    pipes: "Pipes | The Cigar Club Nashville", // Pipes panel title
    accessories: "Accessories | The Cigar Club Nashville", // Accessories panel title
  };
  var tabOrder = ["cigars", "pipes", "accessories"]; // Left-to-right order for directional motion
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches; // Respect reduced-motion preference
  var activeId = null; // Currently visible panel id
  var isAnimating = false; // Prevent overlapping panel transitions
  var transitionMs = 750; // Match the CSS panel transition duration

  function normalizeId(value) { // Map hash or button values to a known panel id
    var id = String(value || "").replace(/^#/, "").toLowerCase(); // Strip hash and normalize case
    if (id === "cigars" || id === "pipes" || id === "accessories") { return id; } // Accept known ids
    return "cigars"; // Default to cigars when the hash is missing or invalid
  }

  function tabIndex(id) { // Return the left-to-right index for a panel id
    var index = tabOrder.indexOf(id); // Find the panel in the switcher order
    return index === -1 ? 0 : index; // Fall back to the first tab when unknown
  }

  function updateTabs(id) { // Sync switcher button styles and pressed state
    tabs.forEach(function (tab) { // Update every product tab
      var isActive = tab.getAttribute("data-product-tab") === id; // Whether this tab matches the active panel
      tab.classList.toggle("is-active", isActive); // Enlarge and recolor the selected tab
      tab.setAttribute("aria-pressed", isActive ? "true" : "false"); // Expose pressed state to assistive tech
    });
    updateIndicator(id); // Slide the gold underline under the active tab
  }

  function updateIndicator(id) { // Position the sliding underline under the active tab
    if (!indicator || !switcherTrack) { return; } // Skip when indicator markup is missing
    var activeTab = tabs.find(function (tab) { // Find the selected switcher button
      return tab.getAttribute("data-product-tab") === id; // Match the active panel id
    });
    if (!activeTab) { // Hide the indicator when no tab is active
      indicator.style.width = "0px"; // Collapse the underline
      return; // Stop without measuring
    }
    var trackRect = switcherTrack.getBoundingClientRect(); // Track bounds for relative positioning
    var tabRect = activeTab.getBoundingClientRect(); // Active tab bounds for underline size
    var left = tabRect.left - trackRect.left + switcherTrack.scrollLeft; // Relative left edge inside the track
    indicator.style.left = left + "px"; // Move the underline under the tab
    indicator.style.width = tabRect.width + "px"; // Match the underline to the tab width
  }

  function clearPanelMotion(panel) { // Remove temporary enter/leave classes from a panel
    panel.classList.remove( // Reset motion-only classes
      "is-entering-from-right", // Clear forward enter
      "is-entering-from-left", // Clear backward enter
      "is-leaving-to-left", // Clear forward leave
      "is-leaving-to-right" // Clear backward leave
    );
  }

  function refreshActiveHeight() { // Keep the wrapper tall enough for the visible catalog
    if (isAnimating) { return; } // Do not fight an in-progress crossfade
    var currentPanel = panels.find(function (panel) { // Find the active product panel
      return panel.getAttribute("data-product-panel") === activeId; // Match current id
    });
    if (!currentPanel || currentPanel.hidden) { // Skip when nothing visible is ready
      panelsRoot.style.height = ""; // Let the wrapper size naturally
      return; // Stop when there is no active panel
    }
    panelsRoot.style.height = ""; // Clear any temporary lock first
    panelsRoot.style.height = currentPanel.offsetHeight + "px"; // Match the full panel content height
    window.requestAnimationFrame(function () { // Release after layout settles
      if (!isAnimating) { panelsRoot.style.height = ""; } // Allow natural growth after catalogs paint
    });
  }

  function showPanel(id, instant) { // Crossfade to the requested product panel
    id = normalizeId(id); // Ensure we use a valid panel id
    if (id === activeId || isAnimating) { return; } // Skip no-ops and mid-animation clicks
    var nextPanel = panels.find(function (panel) { // Find the destination panel
      return panel.getAttribute("data-product-panel") === id; // Match data attribute
    });
    var currentPanel = panels.find(function (panel) { // Find the currently visible panel
      return panel.getAttribute("data-product-panel") === activeId; // Match current id
    });
    if (!nextPanel) { return; } // Abort if the target panel is missing

    var movingForward = tabIndex(id) >= tabIndex(activeId || "cigars"); // Choose slide direction from tab order
    updateTabs(id); // Highlight the matching switcher button
    document.title = titles[id] || titles.cigars; // Update the browser tab title
    if (window.history && window.history.replaceState) { // Keep the URL hash in sync without reloading
      window.history.replaceState(null, "", "#" + id); // Reflect the active panel in the address bar
    } else { // Older browsers without history API
      window.location.hash = id; // Fall back to a normal hash update
    }

    if (!currentPanel || instant || reduceMotion) { // First paint or reduced motion: swap immediately
      panels.forEach(function (panel) { // Hide every panel first
        var isNext = panel === nextPanel; // Whether this is the destination panel
        clearPanelMotion(panel); // Drop any leftover motion classes
        panel.classList.toggle("is-active", isNext); // Mark the visible panel
        panel.hidden = !isNext; // Use hidden for inactive panels
        panel.setAttribute("aria-hidden", isNext ? "false" : "true"); // Expose visibility to AT
      });
      panelsRoot.style.height = ""; // Let the wrapper size itself naturally
      activeId = id; // Remember the active panel
      refreshActiveHeight(); // Remeasure after the instant swap
      updateIndicator(id); // Ensure the underline settles after layout
      return; // No animation path
    }

    isAnimating = true; // Lock the switcher during the crossfade
    panelsRoot.style.height = currentPanel.offsetHeight + "px"; // Lock height so the page does not jump
    nextPanel.hidden = false; // Make the next panel available for fading in
    nextPanel.setAttribute("aria-hidden", "false"); // Announce the incoming panel
    clearPanelMotion(nextPanel); // Ensure a clean enter class toggle
    nextPanel.classList.add(movingForward ? "is-entering-from-right" : "is-entering-from-left"); // Start off-screen in the travel direction
    nextPanel.classList.add("is-active"); // Include the next panel in the active stack

    requestAnimationFrame(function () { // Wait one frame so the enter state can paint
      requestAnimationFrame(function () { // Wait a second frame so the browser commits the start styles
        currentPanel.classList.add(movingForward ? "is-leaving-to-left" : "is-leaving-to-right"); // Exit opposite the enter direction
        nextPanel.classList.remove("is-entering-from-right", "is-entering-from-left"); // Ease the next panel into place
        panelsRoot.style.height = Math.max(nextPanel.scrollHeight, nextPanel.offsetHeight) + "px"; // Fit the full incoming catalog
      });
    });

    window.setTimeout(function () { // Finish after the CSS transition ends
      currentPanel.classList.remove("is-active", "is-leaving-to-left", "is-leaving-to-right"); // Clear outgoing panel state
      clearPanelMotion(nextPanel); // Clear any leftover enter class
      currentPanel.hidden = true; // Hide the previous panel from layout and AT
      currentPanel.setAttribute("aria-hidden", "true"); // Mark previous panel as hidden
      panelsRoot.style.height = ""; // Release the temporary height lock
      activeId = id; // Store the new active panel id
      isAnimating = false; // Allow the next switch
      refreshActiveHeight(); // Remeasure once the catalog is fully visible
      updateIndicator(id); // Reposition the underline after any layout shift
    }, transitionMs); // Match the CSS panel transition duration
  }

  tabs.forEach(function (tab) { // Wire each product switcher control
    tab.addEventListener("click", function () { // Handle tab activation
      showPanel(tab.getAttribute("data-product-tab"), false); // Animate to the selected panel
    });
  });

  window.addEventListener("hashchange", function () { // Support browser back/forward between panels
    showPanel(window.location.hash, false); // Animate to the hash panel
  });

  window.addEventListener("product-catalog-updated", function () { // Catalog scripts finished painting tiles
    refreshActiveHeight(); // Expand the wrapper so example products are not clipped
    updateIndicator(activeId || "cigars"); // Keep the underline aligned after catalog growth
  });

  window.addEventListener("resize", function () { // Keep the underline aligned on viewport changes
    updateIndicator(activeId || "cigars"); // Recalculate indicator position and width
  });

  showPanel(window.location.hash || "cigars", true); // Open hash panel or default cigars on first paint
  window.requestAnimationFrame(function () { // Wait one frame for fonts and layout
    updateIndicator(activeId || "cigars"); // Place the underline under the initial tab
  });
})();
