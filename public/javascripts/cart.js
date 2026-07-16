$(function () {
  var cart = [];
  var $cartItems = $('#cart-items');
  var $checkoutItems = $('#checkout-items');
  var $cartEmpty = $('#cart-empty');
  var $cartCount = $('#cart-count');
  var $cartTotal = $('#cart-total');
  var $checkoutTotal = $('#checkout-total');
  var $cartSummary = $('#cart-summary');
  var $checkoutSummary = $('#checkout-summary');
  var $checkoutStatus = $('#checkout-status');
  var $checkoutButton = $('#checkout-button');
  var isCheckoutPage = $checkoutItems.length > 0;

  function saveCart() {
    localStorage.setItem('lunaCart', JSON.stringify(cart));
  }

  function formatCurrency(amount) {
    return '$' + amount.toFixed(2);
  }

  function getCartCount() {
    return cart.reduce(function (count, item) {
      return count + (item.quantity || 0);
    }, 0);
  }

  function renderCart() {
    saveCart();

    var targetItems = isCheckoutPage ? $checkoutItems : $cartItems;
    targetItems.empty();

    var targetSummary = isCheckoutPage ? $checkoutSummary : $cartSummary;
    var targetTotal = isCheckoutPage ? $checkoutTotal : $cartTotal;

    if (cart.length === 0) {
      $cartEmpty.show();
      if (targetSummary.length) {
        targetSummary.hide();
      }
      $cartCount.text('0');
      if (targetTotal.length) {
        targetTotal.text(formatCurrency(0));
      }
      if ($checkoutStatus.length) {
        $checkoutStatus.text('');
      }
      return;
    }

    $cartEmpty.hide();
    if (targetSummary.length) {
      targetSummary.show();
    }
    $cartCount.text(getCartCount());

    var total = 0;
    cart.forEach(function (item) {
      total += item.price * item.quantity;
      var $li = $('<li class="cart-item"></li>');
      var $info = $('<div class="cart-item-info"></div>');
      $info.append('<strong>' + item.name + '</strong>');
      $info.append('<div class="cart-item-meta">' + formatCurrency(item.price) + ' × ' + item.quantity + ' = ' + formatCurrency(item.price * item.quantity) + '</div>');

      var $quantityControls = $('<div class="cart-item-qty-controls"></div>');
      var $decrease = $('<button class="qty-button" type="button">−</button>');
      var $quantity = $('<span class="qty-value">' + item.quantity + '</span>');
      var $increase = $('<button class="qty-button" type="button">+</button>');
      $decrease.on('click', function () {
        if (item.quantity > 1) {
          item.quantity--;
          renderCart();
        } else {
          cart = cart.filter(function (cartItem) {
            return cartItem.name !== item.name;
          });
          renderCart();
        }
      });
      $increase.on('click', function () {
        item.quantity++;
        renderCart();
      });
      $quantityControls.append($decrease).append($quantity).append($increase);

      var $remove = $('<button class="remove-from-cart" type="button">Remove</button>');
      $remove.on('click', function () {
        cart = cart.filter(function (cartItem) {
          return cartItem.name !== item.name;
        });
        renderCart();
      });

      $li.append($info).append($quantityControls).append($remove);
      targetItems.append($li);
    });

    if (targetTotal.length) {
      targetTotal.text(formatCurrency(total));
    }
  }

  $('.add-to-cart').on('click', function (e) {
    e.preventDefault();
    var name = $(this).data('name');
    var price = parseFloat($(this).data('price'));
    var available = $(this).data('stock') !== 0 && $(this).data('soldout') !== true;
    if (!available) {
      alert('This product is sold out.');
      return;
    }

    var existing = cart.find(function (item) {
      return item.name === name;
    });

    if (existing) {
      existing.quantity = (existing.quantity || 1) + 1;
    } else {
      cart.push({ name: name, price: price, quantity: 1 });
    }
    renderCart();
  });

  $checkoutButton.on('click', function () {
    if (!cart.length) {
      alert('Your cart is empty.');
      return;
    }

    if (isCheckoutPage) {
      var paymentMethod = $('input[name="paymentMethod"]:checked').val();
      if (!paymentMethod) {
        alert('Please select a payment method.');
        return;
      }

      $.ajax({
        url: '/api/orders',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
          items: cart.map(function(item) { return { name: item.name, quantity: item.quantity }; }),
          paymentMethod: paymentMethod
        }),
        success: function () {
          cart = [];
          renderCart();
          if ($checkoutStatus.length) {
            $checkoutStatus.text('Order placed successfully. Thank you!');
          }
          alert('Order placed successfully.');
        },
        error: function (xhr) {
          alert(xhr.responseJSON && xhr.responseJSON.message ? xhr.responseJSON.message : 'Order failed.');
        }
      });
    } else {
      window.location.href = '/checkout';
    }
  });

  var savedCart = JSON.parse(localStorage.getItem('lunaCart') || '[]');
  cart = savedCart;
  renderCart();
});
