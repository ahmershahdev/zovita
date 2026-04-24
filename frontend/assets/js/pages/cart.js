window.Zovita = window.Zovita || {};

window.Zovita.cart = (function () {
  var shippingFlat = 180;
  var couponCodes = {
    ZOVITA10: { type: "percent", value: 10 },
    SAVE150: { type: "flat", value: 150 },
    CARE120: { type: "flat", value: 120 },
  };

  function formatPkr(amount) {
    return "PKR " + Number(amount).toLocaleString();
  }

  function initCart() {
    var cartRoot = document.querySelector("[data-cart-root]");

    if (!cartRoot) {
      return;
    }

    var cartList = cartRoot.querySelector("[data-cart-list]");
    var emptyState = cartRoot.querySelector("[data-cart-empty]");
    var couponInput = cartRoot.querySelector("[data-coupon-input]");
    var couponButton = cartRoot.querySelector("[data-coupon-apply]");
    var couponMessage = cartRoot.querySelector("[data-coupon-message]");

    var subtotalText = cartRoot.querySelector("[data-summary-subtotal]");
    var shippingText = cartRoot.querySelector("[data-summary-shipping]");
    var discountText = cartRoot.querySelector("[data-summary-discount]");
    var totalText = cartRoot.querySelector("[data-summary-total]");

    var activeCoupon = null;

    function getItems() {
      return Array.prototype.slice.call(
        cartRoot.querySelectorAll("[data-cart-item]"),
      );
    }

    function updateLinePrice(item) {
      var unit = parseInt(item.getAttribute("data-price") || "0", 10);
      var qtyValue = item.querySelector("[data-qty-value]");
      var linePrice = item.querySelector("[data-line-price]");
      var qty = parseInt(qtyValue ? qtyValue.textContent : "1", 10) || 1;
      var lineTotal = unit * qty;

      if (linePrice) {
        linePrice.textContent = formatPkr(lineTotal);
      }

      return lineTotal;
    }

    function getDiscount(subtotal) {
      if (!activeCoupon || !couponCodes[activeCoupon]) {
        return 0;
      }

      var coupon = couponCodes[activeCoupon];

      if (coupon.type === "percent") {
        return Math.round((subtotal * coupon.value) / 100);
      }

      return Math.min(subtotal, coupon.value);
    }

    function updateSummary() {
      var subtotal = 0;
      var items = getItems();

      items.forEach(function (item) {
        subtotal += updateLinePrice(item);
      });

      var shipping = items.length > 0 ? shippingFlat : 0;
      var discount = getDiscount(subtotal);
      var total = Math.max(0, subtotal + shipping - discount);

      if (subtotalText) {
        subtotalText.textContent = formatPkr(subtotal);
      }

      if (shippingText) {
        shippingText.textContent = formatPkr(shipping);
      }

      if (discountText) {
        discountText.textContent = "-" + formatPkr(discount);
      }

      if (totalText) {
        totalText.textContent = formatPkr(total);
      }

      if (emptyState) {
        emptyState.classList.toggle("is-visible", items.length === 0);
      }

      if (cartList) {
        cartList.classList.toggle("is-empty", items.length === 0);
      }

      try {
        window.localStorage.setItem("zv-cart-count", String(items.length));
      } catch (error) {
        // Ignore storage failures in private/incognito contexts.
      }

      document.dispatchEvent(
        new CustomEvent("zv:cart-count", {
          detail: { count: items.length },
        }),
      );
    }

    function setCouponMessage(text, isError) {
      if (!couponMessage) {
        return;
      }

      couponMessage.textContent = text;
      couponMessage.classList.add("is-visible");
      couponMessage.classList.toggle("is-error", Boolean(isError));
    }

    cartRoot.addEventListener("click", function (event) {
      var decreaseButton = event.target.closest("[data-qty-decrease]");
      var increaseButton = event.target.closest("[data-qty-increase]");
      var removeButton = event.target.closest("[data-remove-item]");
      var cartItem = event.target.closest("[data-cart-item]");

      if (!cartItem) {
        return;
      }

      var qtyValue = cartItem.querySelector("[data-qty-value]");
      var currentQty = parseInt(qtyValue ? qtyValue.textContent : "1", 10) || 1;

      if (decreaseButton) {
        if (currentQty > 1 && qtyValue) {
          qtyValue.textContent = String(currentQty - 1);
          updateSummary();
        }
        return;
      }

      if (increaseButton) {
        if (qtyValue) {
          qtyValue.textContent = String(currentQty + 1);
          updateSummary();
        }
        return;
      }

      if (removeButton) {
        cartItem.remove();
        updateSummary();
      }
    });

    if (couponButton && couponInput) {
      couponButton.addEventListener("click", function () {
        var code = String(couponInput.value || "")
          .trim()
          .toUpperCase();

        if (!code) {
          activeCoupon = null;
          setCouponMessage("Coupon removed.", false);
          updateSummary();
          return;
        }

        if (!couponCodes[code]) {
          setCouponMessage("Invalid coupon code.", true);
          return;
        }

        activeCoupon = code;
        setCouponMessage("Coupon applied: " + code, false);
        updateSummary();
      });
    }

    updateSummary();
  }

  return {
    init: initCart,
  };
})();
