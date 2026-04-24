window.Zovita = window.Zovita || {};

window.Zovita.navigation = (function () {
  function parseCount(value) {
    var count = parseInt(String(value || "0"), 10);
    return Number.isNaN(count) || count < 0 ? 0 : count;
  }

  function setStoredCount(key, value) {
    try {
      window.localStorage.setItem(key, String(parseCount(value)));
    } catch (error) {
      return;
    }
  }

  function getStoredCount(key) {
    try {
      return parseCount(window.localStorage.getItem(key));
    } catch (error) {
      return 0;
    }
  }

  function updateNavBadges(kind, count) {
    var safeCount = parseCount(count);

    document
      .querySelectorAll('[data-nav-count="' + kind + '"]')
      .forEach(function (badge) {
        badge.textContent = String(safeCount);
      });
  }

  function syncNavCounts() {
    var cartCount = getStoredCount("zv-cart-count");
    var wishlistCount = getStoredCount("zv-wishlist-count");

    var cartRoot = document.querySelector("[data-cart-root]");
    var wishlistRoot = document.querySelector("[data-wishlist-root]");

    if (cartRoot) {
      cartCount = cartRoot.querySelectorAll("[data-cart-item]").length;
      setStoredCount("zv-cart-count", cartCount);
    }

    if (wishlistRoot) {
      wishlistCount = wishlistRoot.querySelectorAll(
        "[data-wishlist-item]",
      ).length;
      setStoredCount("zv-wishlist-count", wishlistCount);
    }

    updateNavBadges("cart", cartCount);
    updateNavBadges("wishlist", wishlistCount);

    document.addEventListener("zv:cart-count", function (event) {
      var nextCount = parseCount(
        event && event.detail ? event.detail.count : 0,
      );
      setStoredCount("zv-cart-count", nextCount);
      updateNavBadges("cart", nextCount);
    });

    document.addEventListener("zv:wishlist-count", function (event) {
      var nextCount = parseCount(
        event && event.detail ? event.detail.count : 0,
      );
      setStoredCount("zv-wishlist-count", nextCount);
      updateNavBadges("wishlist", nextCount);
    });
  }

  function initQuickMenu() {
    var root = document.querySelector("[data-quick-menu]");
    if (!root) {
      return;
    }

    var toggle = root.querySelector("[data-quick-toggle]");
    var dropdown = root.querySelector("[data-quick-dropdown]");

    if (!toggle || !dropdown) {
      return;
    }

    function closeQuickMenu() {
      root.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    }

    function openQuickMenu() {
      root.classList.add("is-open");
      toggle.setAttribute("aria-expanded", "true");
    }

    toggle.addEventListener("click", function () {
      if (root.classList.contains("is-open")) {
        closeQuickMenu();
      } else {
        openQuickMenu();
      }
    });

    document.addEventListener("click", function (event) {
      if (!root.contains(event.target)) {
        closeQuickMenu();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeQuickMenu();
      }
    });
  }

  function initOffcanvas() {
    var openButton = document.querySelector("[data-offcanvas-open]");
    var closeButton = document.querySelector("[data-offcanvas-close]");
    var overlay = document.querySelector("[data-offcanvas-overlay]");
    var panel = document.querySelector("[data-offcanvas]");

    if (!openButton || !closeButton || !overlay || !panel) {
      return;
    }

    panel.setAttribute("aria-hidden", "true");

    function openMenu() {
      document.body.classList.add("zv-offcanvas-open");
      openButton.setAttribute("aria-expanded", "true");
      panel.setAttribute("aria-hidden", "false");
    }

    function closeMenu() {
      document.body.classList.remove("zv-offcanvas-open");
      openButton.setAttribute("aria-expanded", "false");
      panel.setAttribute("aria-hidden", "true");
    }

    openButton.addEventListener("click", openMenu);
    closeButton.addEventListener("click", closeMenu);
    overlay.addEventListener("click", closeMenu);

    panel.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeMenu);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeMenu();
      }
    });
  }

  function markActiveLinks() {
    var page = (
      window.location.pathname.split("/").pop() || "index.php"
    ).toLowerCase();

    document.querySelectorAll("[data-nav-link]").forEach(function (link) {
      var href = (link.getAttribute("href") || "").toLowerCase();
      var normalized = href.split("/").pop();

      if (!normalized) {
        return;
      }

      if ((page === "" && normalized === "index.php") || normalized === page) {
        link.classList.add("is-active");
        link.setAttribute("aria-current", "page");
      }
    });
  }

  return {
    init: function () {
      syncNavCounts();
      initQuickMenu();
      initOffcanvas();
      markActiveLinks();
    },
  };
})();
