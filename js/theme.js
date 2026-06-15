(function () { // Wrap in IIFE to avoid polluting global scope
  var storageKey = "theme"; // localStorage key for saved preference
  var root = document.documentElement; // <html> element receives data-theme attribute
  var toggle = document.querySelector(".theme-toggle"); // Theme toggle button on the page

  function getPreferredTheme() { // Resolve theme when none is saved
    if (window.matchMedia("(prefers-color-scheme: light)").matches) { // OS prefers light mode
      return "light"; // Default to light when system preference is light
    }
    return "dark"; // Default to dark when system preference is dark
  }

  function getStoredTheme() { // Read saved theme from localStorage
    return localStorage.getItem(storageKey); // Returns "light", "dark", or null
  }

  function applyTheme(theme) { // Apply theme to the document
    root.setAttribute("data-theme", theme); // Set data-theme on <html> for CSS selectors
    localStorage.setItem(storageKey, theme); // Persist choice for future visits
    if (toggle) { // Update toggle button label if button exists
      toggle.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode"); // Accessible label
    }
  }

  function initTheme() { // Set initial theme on page load
    var saved = getStoredTheme(); // Check for a saved user preference
    applyTheme(saved || getPreferredTheme()); // Use saved theme or system default
  }

  function toggleTheme() { // Flip between light and dark
    var current = root.getAttribute("data-theme"); // Read active theme
    applyTheme(current === "dark" ? "light" : "dark"); // Switch to the opposite theme
  }

  initTheme(); // Apply theme as soon as script runs

  if (toggle) { // Wire up click handler when toggle button is present
    toggle.addEventListener("click", toggleTheme); // Switch theme on button click
  }
})();
