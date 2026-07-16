(function () { // Wrap in IIFE to avoid polluting global scope
  var compactClass = "is-header-compact"; // Body class when logo shrinks into header
  var scrollThreshold = 25; // Pixels scrolled before compact header activates
  var ticking = false; // Throttle flag for scroll handler
  var fullLogo = document.querySelector(".logo-img--full"); // Expanded LOGO_01 image
  var compactLogo = document.querySelector(".logo-img--compact"); // Compact LOGO_02 image
  var isCompact = null; // Remember last applied state to avoid redundant toggles

  function setCompactState(compact) { // Toggle compact header without moving menu or theme controls
    if (isCompact === compact) { return; } // Skip when state is unchanged
    isCompact = compact; // Store the newly applied state
    document.body.classList.toggle(compactClass, compact); // Drive logo morph in CSS only
    if (fullLogo) { // Update accessibility for the large logo
      fullLogo.setAttribute("aria-hidden", compact ? "true" : "false"); // Hide from AT when faded out
    }
    if (compactLogo) { // Update accessibility for the compact logo
      compactLogo.setAttribute("aria-hidden", compact ? "false" : "true"); // Show to AT when visible
      compactLogo.setAttribute("alt", compact ? "Cigar Club" : ""); // Alt text only while visible
    }
  }

  function updateHeader() { // Toggle compact header based on scroll position
    ticking = false; // Allow next scroll frame to run
    setCompactState(window.scrollY > scrollThreshold); // Compact after scrolling past threshold
  }

  function onScroll() { // Request animation frame for smooth scroll handling
    if (!ticking) { // Skip if update already scheduled
      window.requestAnimationFrame(updateHeader); // Run update on next paint
      ticking = true; // Block duplicate scheduling until update runs
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true }); // Listen for page scroll
  updateHeader(); // Set initial header state on load
})();
