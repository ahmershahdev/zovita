window.Zovita = window.Zovita || {};

window.Zovita.shop = (function () {
  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function initDropdownControl(control, onChange) {
    var wrapper = control ? control.closest("[data-filter-dropdown]") : null;
    if (!wrapper) {
      return {
        setValue: function () {},
      };
    }

    var trigger = wrapper.querySelector("[data-filter-trigger]");
    var label = wrapper.querySelector("[data-filter-label]");
    var list = wrapper.querySelector("[data-filter-list]");
    var options = Array.prototype.slice.call(
      wrapper.querySelectorAll("[data-filter-option]"),
    );

    if (!trigger || !label || !list || options.length === 0) {
      return {
        setValue: function () {},
      };
    }

    function closeList() {
      wrapper.classList.remove("is-open");
      trigger.setAttribute("aria-expanded", "false");
    }

    function openList() {
      wrapper.classList.add("is-open");
      trigger.setAttribute("aria-expanded", "true");
    }

    function setValue(value) {
      var nextValue = normalize(value);
      var match = options.find(function (option) {
        return normalize(option.getAttribute("data-value")) === nextValue;
      });

      if (!match) {
        return false;
      }

      control.value = match.getAttribute("data-value") || "";
      label.textContent = match.textContent || "";
      return true;
    }

    trigger.addEventListener("click", function () {
      if (wrapper.classList.contains("is-open")) {
        closeList();
      } else {
        openList();
      }
    });

    options.forEach(function (option) {
      option.addEventListener("click", function () {
        setValue(option.getAttribute("data-value"));
        closeList();
        if (typeof onChange === "function") {
          onChange();
        }
      });
    });

    document.addEventListener("click", function (event) {
      if (!wrapper.contains(event.target)) {
        closeList();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeList();
      }
    });

    setValue(control.value);

    return {
      setValue: setValue,
    };
  }

  function initCatalog(catalog) {
    var queryInput = catalog.querySelector("[data-filter-query]");
    var typeInput = catalog.querySelector("[data-filter-type]");
    var sectionInput = catalog.querySelector("[data-filter-section]");
    var sortInput = catalog.querySelector("[data-filter-sort]");
    var grid = catalog.querySelector("[data-product-grid]");
    var countText = catalog.querySelector("[data-product-count]");
    var emptyState = catalog.querySelector("[data-empty-state]");
    var cards = Array.prototype.slice.call(
      catalog.querySelectorAll("[data-product-card]"),
    );

    if (!grid || cards.length === 0) {
      return;
    }

    var typeDropdown = initDropdownControl(typeInput, applyFilters);
    var sectionDropdown = initDropdownControl(sectionInput, applyFilters);
    var sortDropdown = initDropdownControl(sortInput, applyFilters);

    cards.forEach(function (card, index) {
      card.setAttribute("data-original-index", String(index));
    });

    function updateCount(visibleCount) {
      if (countText) {
        countText.textContent =
          String(visibleCount) +
          (visibleCount === 1 ? " product" : " products");
      }

      if (emptyState) {
        emptyState.classList.toggle("is-visible", visibleCount === 0);
      }
    }

    function getSortValue(card, sortBy) {
      if (sortBy === "price-low" || sortBy === "price-high") {
        return parseInt(card.getAttribute("data-price") || "0", 10);
      }

      if (sortBy === "name") {
        return normalize(card.getAttribute("data-name"));
      }

      return parseInt(card.getAttribute("data-original-index") || "0", 10);
    }

    function applyHashSectionFilter() {
      if (!sectionInput) {
        return;
      }

      var hashSection = normalize(
        (window.location.hash || "").replace(/^#/, ""),
      );
      if (!hashSection) {
        return;
      }

      if (typeof sectionDropdown.setValue === "function") {
        sectionDropdown.setValue(hashSection);
      }
    }

    function applyFilters() {
      var query = normalize(queryInput ? queryInput.value : "");
      var type = normalize(typeInput ? typeInput.value : "all");
      var section = normalize(sectionInput ? sectionInput.value : "all");
      var sortBy = normalize(sortInput ? sortInput.value : "featured");

      var visibleCards = cards.filter(function (card) {
        var cardName = normalize(card.getAttribute("data-name"));
        var cardType = normalize(card.getAttribute("data-type"));
        var cardSection = normalize(card.getAttribute("data-section"));

        var matchQuery = query === "" || cardName.indexOf(query) !== -1;
        var matchType = type === "all" || cardType === type;
        var matchSection = section === "all" || cardSection === section;

        return matchQuery && matchType && matchSection;
      });

      visibleCards.sort(function (left, right) {
        if (sortBy === "price-low") {
          return getSortValue(left, sortBy) - getSortValue(right, sortBy);
        }

        if (sortBy === "price-high") {
          return getSortValue(right, sortBy) - getSortValue(left, sortBy);
        }

        if (sortBy === "name") {
          return getSortValue(left, sortBy).localeCompare(
            getSortValue(right, sortBy),
          );
        }

        return getSortValue(left, sortBy) - getSortValue(right, sortBy);
      });

      cards.forEach(function (card) {
        card.classList.add("is-hidden");
      });

      visibleCards.forEach(function (card) {
        card.classList.remove("is-hidden");
        grid.appendChild(card);
      });

      updateCount(visibleCards.length);
    }

    if (queryInput) {
      queryInput.addEventListener("input", applyFilters);
    }

    [typeInput, sectionInput, sortInput].forEach(function (control) {
      if (!control) {
        return;
      }

      if (control.tagName === "SELECT") {
        control.addEventListener("change", applyFilters);
      }
    });

    window.addEventListener("hashchange", function () {
      applyHashSectionFilter();
      applyFilters();
    });

    if (typeInput && normalize(typeInput.value) === "") {
      typeDropdown.setValue("all");
    }

    if (sectionInput && normalize(sectionInput.value) === "") {
      sectionDropdown.setValue("all");
    }

    if (sortInput && normalize(sortInput.value) === "") {
      sortDropdown.setValue("featured");
    }

    applyHashSectionFilter();
    applyFilters();
  }

  return {
    init: function () {
      document.querySelectorAll("[data-shop-catalog]").forEach(initCatalog);
    },
  };
})();
