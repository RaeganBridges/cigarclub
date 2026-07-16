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
  var intervalMs = 5500; // Seconds between automatic review changes
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches; // Respect motion preference
  var pointerStartX = null; // Track pointer drag start X position
  var pointerStartY = null; // Track pointer drag start Y position
  var pointerStartScrollLeft = 0; // Track scroll position at drag start
  var scrollFrameId = null; // Batch scroll-to-dot updates with animation frames

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

  function updateDots() { // Sync dot selected state with the active slide
    getDots().forEach(function (dot, dotIndex) { // Update every dot button
      var isActive = dotIndex === activeIndex; // Whether this dot matches active slide
      dot.classList.toggle("is-active", isActive); // Highlight active dot
      dot.setAttribute("aria-selected", isActive ? "true" : "false"); // Expose state to assistive tech
    });
  }

  function updateSlides() { // Sync slide state with the active index
    getSlides().forEach(function (slide, slideIndex) { // Update every slide card
      slide.classList.toggle("is-active", slideIndex === activeIndex); // Highlight the current review card
    });
  }

  function setActiveReview(index) { // Store and render the active review index
    if (!reviews.length) { return; } // Skip before reviews load
    activeIndex = (index + reviews.length) % reviews.length; // Wrap index inside review count
    updateSlides(); // Refresh active slide class
    updateDots(); // Refresh active dot class
  }

  function scrollToActiveReview() { // Move the viewport to the active review
    var slides = getSlides(); // Current slide elements
    var activeSlide = slides[activeIndex]; // Slide that should be visible
    if (!activeSlide) { return; } // Abort when the target slide is missing
    viewport.scrollTo({ // Scroll the row to the selected review
      left: activeSlide.offsetLeft, // Align target slide with the viewport start
      behavior: reducedMotion ? "auto" : "smooth", // Respect reduced-motion preference
    });
  }

  function showReview(index) { // Switch to a specific review by scrolling
    if (!reviews.length) { return; } // Skip empty lists
    var nextIndex = (index + reviews.length) % reviews.length; // Wrap index inside review count
    if (nextIndex === activeIndex) { return; } // Ignore no-op selections
    setActiveReview(nextIndex); // Update active slide and dot immediately
    scrollToActiveReview(); // Move the visible viewport to that slide
  }

  function nextReview() { // Advance to the next review
    showReview(activeIndex + 1, 1); // Move forward with a leftward exit
  }

  function prevReview() { // Go back to the previous review
    showReview(activeIndex - 1, -1); // Move backward with a rightward exit
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

  function pulseButton(button) { // Add a quick press bounce to arrow buttons
    if (!button || reducedMotion) { return; } // Skip when motion is reduced
    button.classList.remove("is-pressed"); // Restart animation if already playing
    void button.offsetWidth; // Force reflow so the class can retrigger
    button.classList.add("is-pressed"); // Play the press bounce
    window.setTimeout(function () { button.classList.remove("is-pressed"); }, 280); // Clear after the bounce
  }

  function bindControls() { // Wire prev, next, dots, and swipe interactions
    if (prevBtn) { // Previous button exists in markup
      prevBtn.addEventListener("click", function () { // Manual previous navigation
        pulseButton(prevBtn); // Bounce the pressed arrow
        prevReview(); // Show prior review
        startAutoPlay(); // Restart timer after manual jump
      });
    }
    if (nextBtn) { // Next button exists in markup
      nextBtn.addEventListener("click", function () { // Manual next navigation
        pulseButton(nextBtn); // Bounce the pressed arrow
        nextReview(); // Show next review
        startAutoPlay(); // Restart timer after manual jump
      });
    }
    dotsEl.addEventListener("click", function (event) { // Dot navigation clicks
      var dot = event.target.closest("[data-review-dot]"); // Find clicked dot button
      if (!dot) { return; } // Ignore clicks outside dots
      var target = Number(dot.getAttribute("data-review-dot")); // Destination review index
      showReview(target); // Jump to the selected review
      startAutoPlay(); // Restart timer after manual jump
    });
    root.addEventListener("mouseenter", stopAutoPlay); // Pause while pointer is over carousel
    root.addEventListener("mouseleave", startAutoPlay); // Resume when pointer leaves carousel
    root.addEventListener("focusin", stopAutoPlay); // Pause while a control has focus
    root.addEventListener("focusout", function (event) { // Resume when focus leaves carousel
      if (!root.contains(event.relatedTarget)) { startAutoPlay(); } // Only resume when focus exits root
    });

    function syncActiveFromScroll() { // Match active dot to the scrolled review
      var slides = getSlides(); // Current slide elements
      if (!slides.length) { return; } // Skip when slides are missing
      var viewportCenter = viewport.scrollLeft + (viewport.clientWidth / 2); // Find center of visible area
      var closestIndex = activeIndex; // Start with the current active slide
      var closestDistance = Infinity; // Track the nearest slide distance
      slides.forEach(function (slide, slideIndex) { // Compare each slide to the viewport center
        var slideCenter = slide.offsetLeft + (slide.offsetWidth / 2); // Find center of this slide
        var distance = Math.abs(slideCenter - viewportCenter); // Measure distance from viewport center
        if (distance < closestDistance) { // Use the nearest slide so far
          closestDistance = distance; // Store the smaller distance
          closestIndex = slideIndex; // Store the nearest slide index
        }
      });
      if (closestIndex !== activeIndex) { // Only update when the nearest slide changes
        setActiveReview(closestIndex); // Sync active slide and dot to scroll position
      }
    }

    function queueScrollSync() { // Throttle scroll updates to animation frames
      if (scrollFrameId !== null) { return; } // Skip when an update is already queued
      scrollFrameId = window.requestAnimationFrame(function () { // Run after browser scrolls
        scrollFrameId = null; // Clear queued frame handle
        syncActiveFromScroll(); // Update active state from scroll position
      });
    }

    viewport.addEventListener("scroll", function () { // Detect touch, wheel, and trackpad scrolling
      queueScrollSync(); // Sync dots after scroll movement
    }, { passive: true }); // Keep scrolling smooth
    viewport.addEventListener("pointerdown", function (event) { // Start mouse drag scrolling
      if (event.pointerType === "mouse" && event.button !== 0) { return; } // Only left-click for mouse drag
      pointerStartX = event.clientX; // Store drag start X position
      pointerStartY = event.clientY; // Store drag start Y position
      pointerStartScrollLeft = viewport.scrollLeft; // Store current horizontal scroll position
      stopAutoPlay(); // Pause while the user interacts
      if (viewport.setPointerCapture) { viewport.setPointerCapture(event.pointerId); } // Keep receiving move/up events
    });
    viewport.addEventListener("pointermove", function (event) { // Scroll the row during mouse drag
      if (pointerStartX === null || pointerStartY === null) { return; } // Ignore moves without a drag start
      var deltaX = event.clientX - pointerStartX; // Measure horizontal pointer travel
      var deltaY = event.clientY - pointerStartY; // Measure vertical pointer travel
      if (Math.abs(deltaX) > 4 && Math.abs(deltaX) > Math.abs(deltaY)) { // Treat clear horizontal movement as a drag
        viewport.scrollLeft = pointerStartScrollLeft - deltaX; // Move content opposite the pointer travel
        if (event.cancelable) { event.preventDefault(); } // Avoid text selection while dragging
      }
    }, { passive: false }); // Allow preventDefault once a horizontal swipe is locked
    viewport.addEventListener("pointerup", function () { // Finish mouse drag scrolling
      pointerStartX = null; // Clear drag start X
      pointerStartY = null; // Clear drag start Y
      syncActiveFromScroll(); // Snap active state to final position
      startAutoPlay(); // Resume auto-play after interaction
    });
    viewport.addEventListener("pointercancel", function () { // Abort interrupted gestures
      pointerStartX = null; // Clear drag start X
      pointerStartY = null; // Clear drag start Y
      startAutoPlay(); // Resume auto-play
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
