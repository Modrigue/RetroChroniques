(function () {
  "use strict";

  // ===== STATE =====
  var state = {
    reviews: window.CHRONIQUES || [],
    platform: "all",
    showOfficial: true,
    showFanGames: true,
    showRomHacks: true,
    showMultiplayer: false,
    search: "",
    sort: "chronological",
    viewMode: "cards"
  };

  // ===== DOM REFS =====
  var container = document.getElementById("reviews-container");
  var modal = document.getElementById("review-modal");
  var modalBody = document.getElementById("modal-body");
  var countEl = document.getElementById("review-count");
  var searchInput = document.getElementById("search-input");
  var searchClear = document.getElementById("search-clear");
  var sortSelect = document.getElementById("sort-select");
  var scrollTopBtn = document.getElementById("scroll-top");
  var viewToggle = document.getElementById("view-toggle");
  var themeToggle = document.getElementById("theme-toggle");
  var modalPrev = document.getElementById("modal-prev");
  var modalNext = document.getElementById("modal-next");
  var lastOpenedCardId = null;

  // ===== HELPERS =====
  function normalize(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  function renderStars(rating) {
    if (rating === null || rating === undefined) return "N/N";
    var full = Math.floor(rating);
    var half = rating % 1 >= 0.5;
    var stars = "";
    for (var i = 0; i < full; i++) stars += '<span class="star full">\u2605</span>';
    if (half) stars += '<span class="star half-star"><span class="star-empty">\u2605</span><span class="star-filled">\u2605</span></span>';
    return stars;
  }


  function badgeClass(platform) {
    return "badge-" + platform.replace(/\s+/g, "-");
  }

  function categoryLabel(cat) {
    if (cat === "fan-game") return "Fan Game";
    if (cat === "rom-hack") return "ROM Hack";
    return null;
  }

  function extractYoutubeId(url) {
    var m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  function excerpt(paragraphs, maxLen) {
    var text = paragraphs.join(" ");
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen).replace(/\s+\S*$/, "") + "...";
  }

  // ===== FILTER & SORT =====
  function getFiltered() {
    var q = normalize(state.search);
    var results = state.reviews.filter(function (r) {
      // Platform filter
      if (state.platform !== "all") {
        if (r.platforms.indexOf(state.platform) === -1) return false;
      }
      // Category filter (checkboxes)
      if (!state.showOfficial && r.category === "standard") return false;
      if (!state.showFanGames && r.category === "fan-game") return false;
      if (!state.showRomHacks && r.category === "rom-hack") return false;
      // Multiplayer filter
      if (state.showMultiplayer && r.nbPlayers !== 2) return false;
      // Search filter
      if (q) {
        var haystack = normalize(r.title);
        if (haystack.indexOf(q) === -1) return false;
      }
      return true;
    });

    // Sort
    if (state.sort === "rating-desc") {
      results.sort(function (a, b) {
        var ra = a.rating === null ? -1 : a.rating;
        var rb = b.rating === null ? -1 : b.rating;
        return rb - ra;
      });
    } else if (state.sort === "rating-asc") {
      results.sort(function (a, b) {
        var ra = a.rating === null ? 6 : a.rating;
        var rb = b.rating === null ? 6 : b.rating;
        return ra - rb;
      });
    } else if (state.sort === "alpha") {
      results.sort(function (a, b) {
        return normalize(a.title).localeCompare(normalize(b.title));
      });
    }
    // chronological: most recent first (highest id first)
    if (state.sort === "chronological") {
      results.sort(function (a, b) { return b.id - a.id; });
    }

    return results;
  }

  // ===== RENDER CARDS =====
  function renderCards() {
    var reviews = getFiltered();
    countEl.textContent = reviews.length + " chronique" + (reviews.length !== 1 ? "s" : "");

    container.classList.toggle("list-view", state.viewMode === "list");

    if (reviews.length === 0) {
      container.innerHTML = '<div class="no-results">Aucune chronique trouv\u00e9e</div>';
      return;
    }

    var html = "";
    reviews.forEach(function (r, i) {
      var catLabel = categoryLabel(r.category);
      html += '<article class="review-card" data-id="' + r.id + '" style="animation-delay:' + (i * 0.05) + 's">';
      html += '<div class="card-header">';
      html += '<h2 class="card-title">' + escapeHtml(r.title) + '</h2>';
      html += '<span class="card-rating">' + renderStars(r.rating) + '</span>';
      html += '</div>';
      html += '<div class="card-platforms">';
      r.platforms.forEach(function (p) {
        html += '<span class="platform-badge ' + badgeClass(p) + '">' + escapeHtml(p) + '</span>';
      });
      if (catLabel) {
        html += '<span class="category-badge">' + escapeHtml(catLabel) + '</span>';
      }
      if (r.nbPlayers === 2) {
        html += '<span class="players-badge">2P</span>';
      }
      html += '</div>';
      html += '<p class="card-excerpt">' + escapeHtml(excerpt(r.review, 160)) + '</p>';
      html += '</article>';
    });

    container.innerHTML = html;
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // ===== RENDER MODAL =====
  function openModal(id) {
    var r = state.reviews.find(function (x) { return x.id === id; });
    if (!r) return;

    lastOpenedCardId = id;

    // Update prev/next buttons based on filtered list
    var filtered = getFiltered();
    var idx = filtered.findIndex(function (x) { return x.id === id; });
    modalPrev.disabled = idx <= 0;
    modalNext.disabled = idx >= filtered.length - 1;

    var catLabel = categoryLabel(r.category);
    var html = '';
    html += '<h2 class="modal-title">' + escapeHtml(r.title) + '</h2>';
    html += '<div class="modal-meta">';
    r.platforms.forEach(function (p) {
      html += '<span class="platform-badge ' + badgeClass(p) + '">' + escapeHtml(p) + '</span>';
    });
    if (catLabel) {
      html += '<span class="category-badge">' + escapeHtml(catLabel) + '</span>';
    }
    if (r.nbPlayers === 2) {
      html += '<span class="players-badge">2P</span>';
    }
    html += '<span class="modal-rating">' + renderStars(r.rating) + '</span>';
    html += '</div>';

    html += '<div class="modal-review">';
    var insertAfter = r.imagesAfterParagraph || null;
    r.review.forEach(function (p, idx) {
      html += '<p>' + escapeHtml(p) + '</p>';
      if (r.images && r.images.length > 0 && insertAfter === idx + 1) {
        html += '<div class="modal-images">';
        r.images.forEach(function (img) {
          html += '<img class="modal-screenshot" src="' + escapeHtml(img.src) + '" alt="' + escapeHtml(img.alt) + '" loading="lazy">';
        });
        html += '</div>';
      }
    });
    // Images after text if no specific position
    if (r.images && r.images.length > 0 && !insertAfter) {
      html += '<div class="modal-images">';
      r.images.forEach(function (img) {
        html += '<img class="modal-screenshot" src="' + escapeHtml(img.src) + '" alt="' + escapeHtml(img.alt) + '" loading="lazy">';
      });
      html += '</div>';
    }
    html += '</div>';

    // YouTube embeds
    var youtubeLinks = r.links.filter(function (l) { return l.type === "youtube"; });
    youtubeLinks.forEach(function (l) {
      var vid = extractYoutubeId(l.url);
      if (vid) {
        html += '<div class="video-container">';
        html += '<iframe src="https://www.youtube-nocookie.com/embed/' + vid + '" allowfullscreen loading="lazy" title="' + escapeHtml(l.label) + '"></iframe>';
        html += '</div>';
      }
    });

    // Website links
    var webLinks = r.links.filter(function (l) { return l.type === "website"; });
    if (webLinks.length > 0) {
      html += '<div class="modal-links">';
      webLinks.forEach(function (l) {
        html += '<a class="modal-link" href="' + escapeHtml(l.url) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(l.label) + ' \u2197</a>';
      });
      html += '</div>';
    }

    // Bonus ratings
    if (r.bonusRatings) {
      html += '<div class="modal-bonus">';
      html += '<h3>R\u00e9cap de la saga</h3>';
      html += '<ul class="bonus-ratings-list">';
      r.bonusRatings.forEach(function (b) {
        if (b.id) {
          html += '<li><a href="#review-' + b.id + '" class="bonus-rating-link" data-id="' + b.id + '">' + escapeHtml(b.title) + '</a><span class="bonus-rating-stars">' + renderStars(b.rating) + '</span></li>';
        } else {
          html += '<li><span>' + escapeHtml(b.title) + '</span><span class="bonus-rating-stars">' + renderStars(b.rating) + '</span></li>';
        }
      });
      html += '</ul>';
      html += '</div>';
    }

    modalBody.innerHTML = html;
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    location.hash = "review-" + id;
  }

  function closeModal() {
    modal.classList.add("hidden");
    document.body.style.overflow = "";
    if (location.hash.indexOf("review-") !== -1) {
      history.replaceState(null, "", location.pathname + location.search);
    }
    // Scroll back to the card that was opened
    if (lastOpenedCardId !== null) {
      var card = container.querySelector('[data-id="' + lastOpenedCardId + '"]');
      if (card) {
        card.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }

  function navigateModal(direction) {
    var filtered = getFiltered();
    var idx = filtered.findIndex(function (x) { return x.id === lastOpenedCardId; });
    var newIdx = idx + direction;
    if (newIdx >= 0 && newIdx < filtered.length) {
      openModal(filtered[newIdx].id);
      modal.querySelector(".modal-content").scrollTop = 0;
    }
  }

  // ===== EVENT HANDLERS =====
  function initFilters() {
    document.querySelectorAll(".filter-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        document.querySelectorAll(".filter-btn").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        state.platform = btn.dataset.platform;
        renderCards();
      });
    });

    document.getElementById("filter-official").addEventListener("change", function () {
      state.showOfficial = this.checked;
      renderCards();
    });

    document.getElementById("filter-fan-game").addEventListener("change", function () {
      state.showFanGames = this.checked;
      renderCards();
    });

    document.getElementById("filter-rom-hack").addEventListener("change", function () {
      state.showRomHacks = this.checked;
      renderCards();
    });

    document.getElementById("filter-multiplayer").addEventListener("change", function () {
      state.showMultiplayer = this.checked;
      renderCards();
    });
  }

  function initSearch() {
    var timeout;
    searchInput.addEventListener("input", function () {
      clearTimeout(timeout);
      timeout = setTimeout(function () {
        state.search = searchInput.value.trim();
        renderCards();
      }, 300);
      // Show/hide clear button based on input
      if (searchInput.value.length > 0) {
        searchClear.classList.remove("hidden");
      } else {
        searchClear.classList.add("hidden");
      }
    });

    searchClear.addEventListener("click", function () {
      searchInput.value = "";
      state.search = "";
      searchClear.classList.add("hidden");
      renderCards();
      searchInput.focus();
    });
  }

  function initSort() {
    sortSelect.addEventListener("change", function () {
      state.sort = sortSelect.value;
      renderCards();
    });
  }

  function initViewToggle() {
    viewToggle.addEventListener("click", function () {
      state.viewMode = state.viewMode === "cards" ? "list" : "cards";
      viewToggle.querySelector(".view-icon-cards").classList.toggle("hidden");
      viewToggle.querySelector(".view-icon-list").classList.toggle("hidden");
      var tooltip = state.viewMode === "cards" ? "Passer en vue liste" : "Passer en vue grille";
      viewToggle.title = tooltip;
      viewToggle.setAttribute("aria-label", tooltip);
      renderCards();
    });
  }

  function initThemeToggle() {
    themeToggle.addEventListener("click", function () {
      var isAmber = document.body.classList.toggle("theme-amber");
      themeToggle.textContent = isAmber ? "Vert" : "Ambre";
      themeToggle.title = isAmber ? "Passer en thème vert" : "Passer en thème ambre";
    });
  }

  function initModal() {
    container.addEventListener("click", function (e) {
      var card = e.target.closest(".review-card");
      if (card) openModal(parseInt(card.dataset.id, 10));
    });

    modalBody.addEventListener("click", function (e) {
      var link = e.target.closest(".bonus-rating-link");
      if (link) {
        e.preventDefault();
        var id = parseInt(link.dataset.id, 10);
        if (id) openModal(id);
      }
    });

    modal.querySelector(".modal-backdrop").addEventListener("click", closeModal);
    modal.querySelector(".modal-close").addEventListener("click", closeModal);

    modalPrev.addEventListener("click", function () { navigateModal(-1); });
    modalNext.addEventListener("click", function () { navigateModal(1); });

    document.addEventListener("keydown", function (e) {
      if (modal.classList.contains("hidden")) return;
      if (e.key === "Escape") closeModal();
      if (e.key === "ArrowLeft") navigateModal(-1);
      if (e.key === "ArrowRight") navigateModal(1);
    });
  }

  function initScrollTop() {
    window.addEventListener("scroll", function () {
      if (window.scrollY > 400) {
        scrollTopBtn.classList.remove("hidden");
      } else {
        scrollTopBtn.classList.add("hidden");
      }
    });

    scrollTopBtn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function initDeepLink() {
    var hash = location.hash;
    if (hash && hash.indexOf("#review-") === 0) {
      var id = parseInt(hash.replace("#review-", ""), 10);
      if (id) openModal(id);
    }
  }

  // ===== INIT =====
  function init() {
    renderCards();
    initFilters();
    initSearch();
    initSort();
    initViewToggle();
    initThemeToggle();
    initModal();
    initScrollTop();
    initDeepLink();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
