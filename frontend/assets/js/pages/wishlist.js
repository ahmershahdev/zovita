window.Zovita = window.Zovita || {};

window.Zovita.wishlist = (function () {
  function initWishlist() {
    var root = document.querySelector("[data-wishlist-root]");

    if (!root) {
      return;
    }

    var countText = root.querySelector("[data-wishlist-count]");
    var emptyState = root.querySelector("[data-wishlist-empty]");
    var removeSelectedButton = root.querySelector("[data-remove-selected]");

    function getItems() {
      return Array.prototype.slice.call(
        root.querySelectorAll("[data-wishlist-item]"),
      );
    }

    function updateState() {
      var items = getItems();
      var count = items.length;

      if (countText) {
        countText.textContent =
          String(count) + (count === 1 ? " product saved" : " products saved");
      }

      if (emptyState) {
        emptyState.classList.toggle("is-visible", count === 0);
      }

      try {
        window.localStorage.setItem("zv-wishlist-count", String(count));
      } catch (error) {
        // Ignore storage failures in private/incognito contexts.
      }

      document.dispatchEvent(
        new CustomEvent("zv:wishlist-count", {
          detail: { count: count },
        }),
      );
    }

    if (removeSelectedButton) {
      removeSelectedButton.addEventListener("click", function () {
        var selectedSlugs = getItems()
          .map(function (item) {
            var checkbox = item.querySelector("[data-select-item]");

            if (!checkbox || !checkbox.checked) {
              return "";
            }

            return String(item.getAttribute("data-product-slug") || "");
          })
          .filter(function (slug) {
            return slug !== "";
          });

        if (selectedSlugs.length === 0) {
          return;
        }

        window.location.href =
          "wishlist.php?remove=" +
          encodeURIComponent(selectedSlugs.join(","));
      });
    }

    root.addEventListener("click", function (event) {
      var addToCartLink = event.target.closest(
        "[data-wishlist-item] .zv-btn-primary",
      );
      if (addToCartLink) {
        var item = addToCartLink.closest("[data-wishlist-item]");
        if (item) {
          var checkbox = item.querySelector("[data-select-item]");
          if (checkbox) {
            checkbox.checked = false;
          }
        }
      });
    });

    updateState();
  }

  return {
    init: initWishlist,
  };
})();
