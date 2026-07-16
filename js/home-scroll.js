(function () { // Wrap in IIFE to avoid polluting global scope
  var compactClass = "is-header-compact"; // Body class when logo shrinks into header
  var scrollThreshold = 25; // Pixels scrolled before compact header activates
  var ticking = false; // Throttle flag for scroll handler
  var logoTab = document.querySelector(".logo-tab"); // Home logo tab with both logo images
  var fullLogo = document.querySelector(".logo-img--full"); // Expanded LOGO_01 image
  var compactLogo = document.querySelector(".logo-img--compact"); // Compact LOGO_02 image

  function updateHeader() { // Toggle compact header based on scroll position
    ticking = false; // Allow next scroll frame to run
    var compact = window.scrollY > scrollThreshold; // True once the user scrolls past threshold
    document.body.classList.toggle(compactClass, compact); // Shrink or restore the home header logo
    if (logoTab) { // Keep a matching class on the logo tab for CSS hooks
      logoTab.classList.toggle("is-compact", compact); // Mark tab as compact when scrolled
    }
    if (fullLogo) { // Update accessibility state for the large logo
      fullLogo.setAttribute("aria-hidden", compact ? "true" : "false"); // Hide from AT when faded out
    }
    if (compactLogo) { // Update accessibility state for the compact logo
      compactLogo.setAttribute("aria-hidden", compact ? "false" : "true"); // Show to AT when visible
      if (compact) { // Compact wordmark is the visible brand mark
        compactLogo.setAttribute("alt", "Cigar Club"); // Provide alt text while visible
      } else { // Expanded logo owns the accessible name
        compactLogo.setAttribute("alt", ""); // Decorative while hidden
      }
    }
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
