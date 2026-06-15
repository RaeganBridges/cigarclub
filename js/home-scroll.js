(function () { // Wrap in IIFE to avoid polluting global scope
  var compactClass = "is-header-compact"; // Body class when logo shrinks into header
  var scrollThreshold = 25; // Pixels scrolled before compact header activates
  var ticking = false; // Throttle flag for scroll handler

  function updateHeader() { // Toggle compact header based on scroll position
    ticking = false; // Allow next scroll frame to run
    if (window.scrollY > scrollThreshold) { // User has scrolled past threshold
      document.body.classList.add(compactClass); // Shrink logo into header bar
    } else { // Near top of page
      document.body.classList.remove(compactClass); // Restore large overlapping logo
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
