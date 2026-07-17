(function () { // Wrap in IIFE to avoid polluting global scope
  var header = document.querySelector(".site-header"); // Sticky header containing expand panel
  if (!header) { return; } // Exit on pages without site header

  var toggle = header.querySelector(".nav-expand-toggle"); // Button that opens/closes nav panel
  var panel = header.querySelector(".header-nav-panel"); // Collapsible navigation link bar
  if (!toggle || !panel) { return; } // Exit if expand nav markup is missing

  var openClass = "is-nav-open"; // Class on header when panel is expanded
  var closeDelayMs = 320; // Wait for icon pop-out transitions before hiding panel

  function setOpen(isOpen) { // Sync panel visibility, aria state, and header class
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false"); // Expose open state to assistive tech

    if (isOpen) { // Expanding navigation panel
      panel.hidden = false; // Allow panel to render before height transition
      requestAnimationFrame(function () { // Wait one frame so transition can run
        header.classList.add(openClass); // Slide/fade panel open
      });
      return; // Done handling open state
    }

    header.classList.remove(openClass); // Start slide/fade closed
    window.setTimeout(function () { // Wait for CSS transition to finish
      panel.hidden = true; // Remove panel from layout and tab order when fully closed
    }, closeDelayMs);
  }

  toggle.addEventListener("click", function () { // Toggle panel when menu button is clicked
    var isOpen = header.classList.contains(openClass); // Read current expanded state
    setOpen(!isOpen); // Flip open/closed
  });

  panel.querySelectorAll("a").forEach(function (link) { // Close panel after user picks a destination
    link.addEventListener("click", function () { setOpen(false); }); // Collapse so next page loads with menu closed
  });

  document.addEventListener("keydown", function (event) { // Listen for keyboard shortcuts
    if (event.key === "Escape") { // User pressed Escape while menu may be open
      setOpen(false); // Collapse navigation panel
    }
  });

  document.addEventListener("click", function (event) { // Close when clicking outside header nav
    if (!header.classList.contains(openClass)) { return; } // Skip if panel is already closed
    if (header.contains(event.target)) { return; } // Skip clicks inside header
    setOpen(false); // Collapse panel for outside clicks
  });

  setOpen(false); // Ensure panel starts collapsed on load
})();
