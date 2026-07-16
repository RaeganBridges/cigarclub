(function () { // Auto-rotating customer reviews carousel
  var root = document.getElementById("reviews-carousel"); // Carousel mount point on the page
  if (!root) { return; } // Exit when reviews section is not on this page

  var viewport = root.querySelector(".reviews-carousel__viewport"); // Visible review slide area
  var dotsEl = root.querySelector(".reviews-carousel__dots"); // Dot navigation container
  var prevBtn = root.querySelector(".reviews-carousel__btn--prev"); // Previous review button
  var nextBtn = root.querySelector(".reviews-carousel__btn--next"); // Next review button
  if (!viewport || !dotsEl) { return; } // Exit when required markup is missing

  var reviews = []; // Loaded review items
  var activeIndex = 0; // Currently visible review index
  var timerId = null; // Auto-advance interval handle
  var intervalMs = 6000; // Seconds between automatic review changes
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches; // Respect motion preference

  var fallbackReviews = [ // Embedded reviews when JSON fetch fails
    { quote: "There's nothing comparable in middle TN to the Cigar Club. They are always stocked full, the crew is amazing, and they have the best sticks in town. The cigar packs are always awesome and I'm constantly finding a reason to stop by. This place is special and I highly recommend it!", author: "Jordan Young" },
    { quote: "I'm new to cigar smoking and the staff here is super friendly, patient, and knowledgeable, with all my questions and concerns. They make me feel welcome and like I'm not just some idiot coming in with no idea of what I'm doing. They take the time to explain the different kinds, blends, flavor infuses, where the blends come from, etc etc. I highly recommend that if you have the chance to stop in here, you do so. This is for sure going to be my go to spot for all my cigar needs.", author: "Anthony Ochoa" },
    { quote: "Friendliest people in Nashville! They helped me get started with cigars. They answered all of my questions without making me feel dumb. When I come in now they know my name and make a point to talk to me. GREAT CIGARS, GREAT PRICES! I feel like I'm apart of a family there.", author: "Taylor Johnson" },
    { quote: "Selection, selection, selection. Did I mention selection? I've purchased from here for over a decade and appreciate the staff, selection and overall experience every visit.", author: "Curtis L." },
    { quote: "My absolute favorite Cigar shop in Tennessee, I love visiting this location when I'm in the area. Very knowledgeable and helpful, well stocked and very clean and well kept store that obviously smells amazing. Awesome folks to do business with.", author: "James Lovitt" },
  ];

  function escapeHtml(text) { // Escape review text before inserting into DOM
    return (text || "") // Fallback for empty strings
      .replace(/&/g, "&amp;") // Escape ampersands
      .replace(/</g, "&lt;") // Escape less-than
      .replace(/>/g, "&gt;") // Escape greater-than
      .replace(/"/g, "&quot;"); // Escape double quotes
  }

  function buildSlides() { // Render review slides into the viewport
    viewport.innerHTML = reviews.map(function (review, index) { // One blockquote per review
      var activeClass = index === 0 ? " is-active" : ""; // Show first slide initially
      return '<blockquote class="reviews-carousel__slide' + activeClass + '" data-review-index="' + index + '">' // Single review card
        + '<p class="reviews-carousel__quote">“' + escapeHtml(review.quote) + '”</p>' // Quoted review text
        + '<footer class="reviews-carousel__author">— ' + escapeHtml(review.author) + "</footer>" // Review attribution
        + "</blockquote>"; // End review card
    }).join(""); // Combine all slides
  }

  function buildDots() { // Render dot buttons for direct slide selection
    dotsEl.innerHTML = reviews.map(function (review, index) { // One dot per review
      var selected = index === 0 ? "true" : "false"; // Mark first dot selected
      return '<button type="button" class="reviews-carousel__dot' + (index === 0 ? " is-active" : "") + '" role="tab" aria-selected="' + selected + '" aria-label="Review ' + (index + 1) + ' of ' + reviews.length + '" data-review-dot="' + index + '"></button>'; // Dot control
    }).join(""); // Combine all dots
  }

  function getSlides() { // Return all slide elements in the carousel
    return Array.prototype.slice.call(viewport.querySelectorAll(".reviews-carousel__slide")); // NodeList to array
  }

  function getDots() { // Return all dot button elements
    return Array.prototype.slice.call(dotsEl.querySelectorAll(".reviews-carousel__dot")); // NodeList to array
  }

  function showReview(index) { // Switch to a specific review by index
    if (!reviews.length) { return; } // Skip when no reviews loaded
    activeIndex = (index + reviews.length) % reviews.length; // Wrap index inside review count
    getSlides().forEach(function (slide, slideIndex) { // Update slide visibility
      slide.classList.toggle("is-active", slideIndex === activeIndex); // Fade active slide in
    });
    getDots().forEach(function (dot, dotIndex) { // Update dot selected state
      var isActive = dotIndex === activeIndex; // Whether this dot matches active slide
      dot.classList.toggle("is-active", isActive); // Highlight active dot
      dot.setAttribute("aria-selected", isActive ? "true" : "false"); // Expose state to assistive tech
    });
  }

  function nextReview() { // Advance to the next review
    showReview(activeIndex + 1); // Move one slide forward
  }

  function prevReview() { // Go back to the previous review
    showReview(activeIndex - 1); // Move one slide backward
  }

  function stopAutoPlay() { // Clear automatic rotation timer
    if (timerId !== null) { // Only clear when timer is running
      window.clearInterval(timerId); // Stop interval
      timerId = null; // Reset timer handle
    }
  }

  function startAutoPlay() { // Begin automatic review rotation
    stopAutoPlay(); // Prevent duplicate timers
    if (reducedMotion || reviews.length < 2) { return; } // Skip auto-play when motion is reduced
    timerId = window.setInterval(nextReview, intervalMs); // Rotate on interval
  }

  function bindControls() { // Wire prev, next, and dot button interactions
    if (prevBtn) { // Previous button exists in markup
      prevBtn.addEventListener("click", function () { // Manual previous navigation
        prevReview(); // Show prior review
        startAutoPlay(); // Restart timer after manual jump
      });
    }
    if (nextBtn) { // Next button exists in markup
      nextBtn.addEventListener("click", function () { // Manual next navigation
        nextReview(); // Show next review
        startAutoPlay(); // Restart timer after manual jump
      });
    }
    dotsEl.addEventListener("click", function (event) { // Dot navigation clicks
      var dot = event.target.closest("[data-review-dot]"); // Find clicked dot button
      if (!dot) { return; } // Ignore clicks outside dots
      showReview(Number(dot.getAttribute("data-review-dot"))); // Jump to chosen review
      startAutoPlay(); // Restart timer after manual jump
    });
    root.addEventListener("mouseenter", stopAutoPlay); // Pause while pointer is over carousel
    root.addEventListener("mouseleave", startAutoPlay); // Resume when pointer leaves carousel
    root.addEventListener("focusin", stopAutoPlay); // Pause while a control has focus
    root.addEventListener("focusout", function (event) { // Resume when focus leaves carousel
      if (!root.contains(event.relatedTarget)) { startAutoPlay(); } // Only resume when focus exits root
    });
  }

  function initCarousel(items) { // Build carousel UI and start rotation
    reviews = items.filter(function (item) { return item && item.quote; }); // Keep rows with quote text
    if (!reviews.length) { reviews = fallbackReviews.slice(); } // Use fallback when list is empty
    buildSlides(); // Paint review slides
    buildDots(); // Paint dot navigation
    bindControls(); // Attach interaction handlers
    startAutoPlay(); // Begin auto-rotation when allowed
  }

  fetch("data/reviews.json") // Load editable review list from site data
    .then(function (response) { return response.json(); }) // Parse JSON payload
    .then(function (data) { initCarousel((data && data.items) || []); }) // Build carousel from items array
    .catch(function () { initCarousel(fallbackReviews); }); // Use embedded reviews when fetch fails
})();
