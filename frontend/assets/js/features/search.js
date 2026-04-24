window.Zovita = window.Zovita || {};

window.Zovita.search = (function () {
  var SEARCH_LIMIT = 8;
  var INPUT_DEBOUNCE_MS = 120;

  var searchItems = [
    {
      title: "Centrum Adults Multivitamin",
      url: "shop-category-a.php#daily-vitamins",
      type: "Product",
      category: "Multivitamins",
      keywords: "centrum tablets vitamins daily wellness",
    },
    {
      title: "Surbex T Tablets",
      url: "shop-category-a.php#daily-vitamins",
      type: "Product",
      category: "Multivitamins",
      keywords: "surbex vitamin b complex",
    },
    {
      title: "Surbex Z Tablets",
      url: "shop-category-a.php#daily-vitamins",
      type: "Product",
      category: "Multivitamins",
      keywords: "surbex zinc vitamins",
    },
    {
      title: "CAC-1000 Plus Orange 20 Tablets",
      url: "shop-category-a.php#pain-relief",
      type: "Product",
      category: "Bone Support",
      keywords: "calcium vitamin c effervescent",
    },
    {
      title: "Magnesium Glycinate 500mg",
      url: "shop-category-a.php#pain-relief",
      type: "Product",
      category: "Bone Support",
      keywords: "magnesium glycinate tablets",
    },
    {
      title: "Nutrifactor Magnesium 500mg",
      url: "shop-category-a.php#pain-relief",
      type: "Product",
      category: "Bone Support",
      keywords: "nutrifactor magnesium tablets",
    },
    {
      title: "Nutrifactor Melatonix 5mg",
      url: "shop-category-a.php#daily-vitamins",
      type: "Product",
      category: "Sleep Support",
      keywords: "melatonin sleep support",
    },
    {
      title: "Normega Fish Oil 500mg",
      url: "shop-category-a.php#daily-vitamins",
      type: "Product",
      category: "Sleep Support",
      keywords: "omega fish oil softgel",
    },
    {
      title: "Nutrifactor Nutra-C Plus",
      url: "shop-category-a.php#immunity-support",
      type: "Product",
      category: "Sleep Support",
      keywords: "vitamin c immunity",
    },
    {
      title: "Acnes Creamy Wash 50g",
      url: "shop-category-b.php#acne-control",
      type: "Medicine",
      category: "Acne Care",
      keywords: "acne face wash skin",
    },
    {
      title: "Acsolve Topical Lotion 30ml",
      url: "shop-category-b.php#acne-control",
      type: "Medicine",
      category: "Acne Care",
      keywords: "acne lotion topical",
    },
    {
      title: "Adapco Gel 15g",
      url: "shop-category-b.php#acne-control",
      type: "Medicine",
      category: "Acne Care",
      keywords: "adapalene acne gel",
    },
    {
      title: "Benclin Gel 10g",
      url: "shop-category-b.php#acne-control",
      type: "Medicine",
      category: "Acne Care",
      keywords: "clindamycin acne gel",
    },
    {
      title: "Skinoren Cream 10g",
      url: "shop-category-b.php#acne-control",
      type: "Medicine",
      category: "Acne Care",
      keywords: "azelaic acid skinoren",
    },
    {
      title: "Skin A Cream 10g",
      url: "shop-category-b.php#acne-control",
      type: "Medicine",
      category: "Acne Care",
      keywords: "retinoid skin cream",
    },
    {
      title: "Acdermin Gel 20g",
      url: "shop-category-b.php#derma-repair",
      type: "Medicine",
      category: "Derma Essentials",
      keywords: "derma gel pigmentation care",
    },
    {
      title: "Eventone-C Cream 30g",
      url: "shop-category-b.php#derma-repair",
      type: "Medicine",
      category: "Derma Essentials",
      keywords: "eventone c cream",
    },
    {
      title: "Mandelac Face Wash 100ml",
      url: "shop-category-b.php#derma-repair",
      type: "Product",
      category: "Derma Essentials",
      keywords: "face wash derma",
    },
    {
      title: "Bannet-Z Tooth Paste 100g",
      url: "shop-category-c.php#oral-care",
      type: "Product",
      category: "Oral Care",
      keywords: "toothpaste oral hygiene",
    },
    {
      title: "Sensodyne Rapid Action Mint 70g",
      url: "shop-category-c.php#oral-care",
      type: "Product",
      category: "Oral Care",
      keywords: "sensitive teeth toothpaste",
    },
    {
      title: "Clinica Mouth wash 250ml",
      url: "shop-category-c.php#oral-care",
      type: "Product",
      category: "Oral Care",
      keywords: "mouthwash oral rinse",
    },
    {
      title: "Enziclor Mouth wash 240ml",
      url: "shop-category-c.php#oral-care",
      type: "Product",
      category: "Oral Care",
      keywords: "mouthwash gum care",
    },
    {
      title: "Clinica gel 70g",
      url: "shop-category-c.php#oral-care",
      type: "Medicine",
      category: "Oral Care",
      keywords: "oral gel pain relief",
    },
    {
      title: "Somogel Gel 20g",
      url: "shop-category-c.php#oral-care",
      type: "Medicine",
      category: "Oral Care",
      keywords: "oral ulcer gel",
    },
    {
      title: "Ensure Milk Powder Vanilla 400g",
      url: "shop-category-c.php#nutrition-support",
      type: "Product",
      category: "Supplements",
      keywords: "ensure nutrition powder",
    },
    {
      title: "Ensure Milk Powder Vanilla 850g",
      url: "shop-category-c.php#nutrition-support",
      type: "Product",
      category: "Supplements",
      keywords: "ensure nutrition powder large",
    },
    {
      title: "Ensure Plus Liquid 250ml",
      url: "shop-category-c.php#nutrition-support",
      type: "Product",
      category: "Supplements",
      keywords: "ensure plus drink",
    },
    {
      title: "Livity Milk Powder Chocolate 400g",
      url: "shop-category-c.php#nutrition-support",
      type: "Product",
      category: "Supplements",
      keywords: "livity chocolate nutrition",
    },
    {
      title: "Livity Chocolate Soft Pack 175g",
      url: "shop-category-c.php#nutrition-support",
      type: "Product",
      category: "Supplements",
      keywords: "livity chocolate soft pack",
    },
    {
      title: "Livity Vanilla Soft Pack 175g",
      url: "shop-category-c.php#nutrition-support",
      type: "Product",
      category: "Supplements",
      keywords: "livity vanilla soft pack",
    },
    {
      title: "Hylo Eye Drops 0.2% 5ml",
      url: "shop-category-c.php#eye-ear-care",
      type: "Medicine",
      category: "Eyes and Ears",
      keywords: "eye drops dry eyes",
    },
    {
      title: "Softeal Eye Drops 10ml",
      url: "shop-category-c.php#eye-ear-care",
      type: "Medicine",
      category: "Eyes and Ears",
      keywords: "eye lubrication drops",
    },
    {
      title: "Evion Capsules 400mg",
      url: "shop-category-a.php#daily-vitamins",
      type: "Product",
      category: "Multivitamins",
      keywords: "vitamin e capsules",
    },
    {
      title: "Nutrifactor Biotin Plus 2500mcg",
      url: "shop-category-c.php#nutrition-support",
      type: "Product",
      category: "Supplements",
      keywords: "biotin hair skin nails",
    },
    {
      title: "CAC-1000 Plus Orange 10 Tablets",
      url: "shop-category-a.php#pain-relief",
      type: "Product",
      category: "Bone Support",
      keywords: "calcium vitamin c 10 tablets",
    },
    {
      title: "Normega Fish Oil 1000mg",
      url: "shop-category-c.php#nutrition-support",
      type: "Product",
      category: "Supplements",
      keywords: "fish oil omega 3",
    },
    {
      title: "Herbiotics Biotin 5000mcg",
      url: "shop-category-c.php#nutrition-support",
      type: "Product",
      category: "Supplements",
      keywords: "biotin 5000mcg tablets",
    },
  ]
    .filter(function (item) {
      return normalize(item.type) === "product";
    })
    .map(function (item) {
      var searchText = normalize(
        [item.title, item.category, item.keywords].join(" "),
      );

      return {
        title: item.title,
        url: item.url,
        type: item.type,
        category: item.category,
        searchText: searchText,
      };
    });

  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function renderSuggestions(container, list, suggestions) {
    list.innerHTML = "";

    if (suggestions.length === 0) {
      container.classList.remove("open");
      return;
    }

    var fragment = document.createDocumentFragment();

    suggestions.forEach(function (item, index) {
      var option = document.createElement("a");
      option.className = "zv-suggestion-item";
      option.href = item.url;
      option.setAttribute("data-suggestion-index", String(index));

      var detail = document.createElement("div");
      var title = document.createElement("span");
      var meta = document.createElement("span");
      var type = document.createElement("span");

      title.className = "zv-suggestion-title";
      title.textContent = item.title;

      meta.className = "zv-suggestion-meta";
      meta.textContent = item.category;

      type.className = "zv-suggestion-type";
      type.textContent = item.type;

      detail.appendChild(title);
      detail.appendChild(meta);
      option.appendChild(detail);
      option.appendChild(type);
      fragment.appendChild(option);
    });

    list.appendChild(fragment);

    container.classList.add("open");
  }

  function bindSearch(searchRoot) {
    var input = searchRoot.querySelector("[data-search-input]");
    var dropdown = searchRoot.querySelector("[data-suggestions]");
    var list = searchRoot.querySelector("[data-suggestions-list]");
    var activeIndex = -1;
    var filtered = [];
    var debounceTimer = null;

    if (!input || !dropdown || !list) {
      return;
    }

    function updateSuggestions() {
      var query = normalize(input.value);
      activeIndex = -1;

      if (!query) {
        dropdown.classList.remove("open");
        return;
      }

      filtered = searchItems
        .filter(function (item) {
          return item.searchText.indexOf(query) !== -1;
        })
        .slice(0, SEARCH_LIMIT);

      renderSuggestions(dropdown, list, filtered);
    }

    function queueSuggestionUpdate() {
      if (debounceTimer) {
        window.clearTimeout(debounceTimer);
      }

      debounceTimer = window.setTimeout(updateSuggestions, INPUT_DEBOUNCE_MS);
    }

    function setActive(index) {
      var items = list.querySelectorAll(".zv-suggestion-item");
      items.forEach(function (item, itemIndex) {
        item.classList.toggle("is-active", itemIndex === index);
      });
    }

    input.addEventListener("input", queueSuggestionUpdate);
    input.addEventListener("focus", queueSuggestionUpdate);

    input.addEventListener("keydown", function (event) {
      var items = list.querySelectorAll(".zv-suggestion-item");

      if (!dropdown.classList.contains("open") || items.length === 0) {
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        activeIndex = (activeIndex + 1) % items.length;
        setActive(activeIndex);
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        activeIndex = (activeIndex - 1 + items.length) % items.length;
        setActive(activeIndex);
        return;
      }

      if (event.key === "Enter" && activeIndex > -1) {
        event.preventDefault();
        window.location.href = items[activeIndex].getAttribute("href");
        return;
      }

      if (event.key === "Enter" && activeIndex === -1 && items.length > 0) {
        event.preventDefault();
        window.location.href = items[0].getAttribute("href");
        return;
      }

      if (event.key === "Escape") {
        dropdown.classList.remove("open");
      }
    });

    document.addEventListener("click", function (event) {
      if (!searchRoot.contains(event.target)) {
        dropdown.classList.remove("open");
      }
    });
  }

  return {
    init: function () {
      document.querySelectorAll("[data-search-root]").forEach(bindSearch);
    },
  };
})();
