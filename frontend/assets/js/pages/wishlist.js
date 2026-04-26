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

    root.addEventListener("click", function (event) {
      var removeButton = event.target.closest("[data-remove-item]");

      if (removeButton) {
        event.preventDefault();
        event.stopPropagation();

        var item = removeButton.closest("[data-wishlist-item]");
        if (item) {
          item.style.transition = "opacity 0.25s ease, transform 0.25s ease";
          item.style.opacity = "0";
          item.style.transform = "scale(0.96)";
          setTimeout(function () {
            item.remove();
            updateState();
          }, 260);
        }
        return;
      }

      var addToCartLink = event.target.closest("[data-wishlist-item] .zv-btn-primary");
      if (addToCartLink) {
        event.stopPropagation();
      }
    });

    if (removeSelectedButton) {
      removeSelectedButton.addEventListener("click", function () {
        getItems().forEach(function (item) {
          var checkbox = item.querySelector("[data-select-item]");
          if (checkbox && checkbox.checked) {
            item.remove();
          }
        });

        updateState();
      });
    }

    updateState();
  }

  return {
    init: initWishlist,
  };
})();
