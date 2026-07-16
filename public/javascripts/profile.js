$(function () {
  var $form = $('#profile-form');
  var $status = $('#profile-status');
  var $name = $('#profile-name');
  var $email = $('#profile-email');
  var $phone = $('#profile-phone');
  var $address = $('#profile-address');
  var $summary = $('#profile-cart-summary');
  var $items = $('#profile-cart-items');
  var $orders = $('#profile-orders');
  var $cartCard = $('#profile-cart-card');
  var $ordersCard = $('#profile-orders-card');
  var $adminDashboard = $('#admin-dashboard');
  var $adminAddButton = $('#admin-add-product');
  var $adminAddModal = $('#admin-add-product-modal');
  var $adminAddForm = $('#admin-add-product-form');
  var $adminAddCancel = $('#admin-add-product-cancel');
  var $adminAddClose = $('#admin-add-product-close');
  var $signout = $('#profile-signout');
  var $signinPrompt = $('#profile-signin-prompt');
  var currentUser = null;

  function setProfileState(signedIn) {
    $form.toggle(signedIn);
    $signinPrompt.toggle(!signedIn);
    $signout.toggle(signedIn);
    $status.toggle(signedIn);
  }

  function setProfileView(isAdmin) {
    $cartCard.toggle(!isAdmin);
    $ordersCard.toggle(!isAdmin);
    $adminDashboard.toggle(isAdmin);
  }

  function openAdminAddModal() {
    $adminAddForm[0].reset();
    $adminAddModal.css('display', 'flex');
  }

  function closeAdminAddModal() {
    $adminAddModal.hide();
  }

  function showSignInPrompt() {
    localStorage.removeItem('lunaUser');
    $status.text('Please sign in to view your profile.');
    $name.val('');
    $email.val('');
    $phone.val('');
    $address.val('');
    setProfileState(false);
    $cartCard.hide();
    $ordersCard.hide();
    $adminDashboard.hide();
    $orders.html('');
    $summary.html('');
    $items.html('');
  }

  function loadProfile() {
    $.get('/api/auth/me', function (result) {
      if (!result.user) {
        currentUser = null;
        showSignInPrompt();
        return;
      }

      currentUser = result.user;
      $name.val(currentUser.name || '');
      $email.val(currentUser.email || '');
      $phone.val(currentUser.phone || '');
      $address.val(currentUser.address || '');
      $status.text('');
      setProfileState(true);
      if (currentUser.role === 'admin') {
        setProfileView(true);
        loadAdminDashboard();
      } else {
        setProfileView(false);
        loadCart();
        loadOrders();
      }
    }).fail(function () {
      currentUser = null;
      showSignInPrompt();
    });
  }

  function loadCart() {
    var cart = JSON.parse(localStorage.getItem('lunaCart') || '[]');
    if (!cart.length) {
      $summary.html('<strong>Your cart is empty.</strong>');
      $items.html('<p class="profile-cart-empty">No items yet.</p>');
      return;
    }

    var total = cart.reduce(function (sum, item) {
      return sum + item.price;
    }, 0);

    $summary.html('<strong>Total:</strong> $' + total.toFixed(2));
    $items.empty();
    cart.forEach(function (item) {
      $items.append('<div class="profile-cart-item"><strong>' + item.name + '</strong><br>$' + item.price.toFixed(2) + '</div>');
    });
  }

  function loadOrders() {
    $orders.html('<p>Loading orders...</p>');

    $.ajax({
      url: '/api/orders',
      method: 'GET',
      dataType: 'json',
      success: function (result) {
        if (!result.ok || !result.orders || !result.orders.length) {
          $orders.html('<p class="profile-cart-empty">No orders yet.</p>');
          return;
        }

        $orders.empty();
        result.orders.forEach(function (order) {
          var $order = $('<div class="profile-cart-item"></div>');
          $order.append('<strong>Order #' + order.id + '</strong> - <span>' + order.status + '</span><br>');
          $order.append('<small>' + new Date(order.createdAt).toLocaleString() + '</small>');
          $order.append('<div><strong>Total:</strong> $' + parseFloat(order.total).toFixed(2) + '</div>');

          var $list = $('<ul></ul>');
          order.items.forEach(function (item) {
            $list.append('<li>' + (item.quantity || 1) + '× ' + item.name + ' (' + item.price + ')</li>');
          });

          $order.append($list);

          if (order.status !== 'cancelled') {
            var $cancel = $('<button class="btn btn-default order-cancel-button" type="button">Cancel order</button>');
            $cancel.on('click', function () {
              if (!confirm('Cancel order #' + order.id + '?')) {
                return;
              }

              $.ajax({
                url: '/api/orders/' + order.id + '/cancel',
                method: 'POST',
                success: function () {
                  loadOrders();
                  alert('Order cancelled. A cancellation email has been sent.');
                },
                error: function (xhr) {
                  var message = xhr.responseJSON && xhr.responseJSON.message ? xhr.responseJSON.message : 'Could not cancel order.';
                  alert(message);
                }
              });
            });
            $order.append($cancel);
          } else {
            $order.append('<div><em>Order cancelled on ' + new Date(order.cancelledAt).toLocaleString() + '</em></div>');
          }

          $orders.append($order);
        });
      },
      error: function (xhr) {
        var message = xhr.responseJSON && xhr.responseJSON.message ? xhr.responseJSON.message : 'Unable to load orders.';
        $orders.html('<p class="profile-cart-empty">' + message + '</p>');
      }
    });
  }

  function loadAdminDashboard() {
    var $adminProducts = $('#admin-products');
    $adminProducts.html('<p>Loading admin data...</p>');

    $.get('/api/products', function (result) {
      if (!result || !result.length) {
        $adminProducts.html('<p>No products found.</p>');
        return;
      }

      var $list = $('<div></div>');
      result.forEach(function (product) {
        var $item = $('<div class="profile-cart-item"></div>');
        var $form = $('<form class="admin-stock-form"></form>');
        $form.append('<strong>' + product.name + '</strong>');
        $form.append('<p>Price: <input type="text" name="price" value="' + (product.price || '') + '" style="width: 90px; margin-left: 8px;"></p>');
        $form.append('<label>Stock: <input type="number" name="stock" min="0" value="' + (product.stock || 0) + '" style="width: 80px; margin-left: 8px;"></label>');
        $form.append('<label style="margin-left: 12px;"><input type="checkbox" name="soldOut" ' + (product.soldOut ? 'checked' : '') + '> Sold out</label>');
        $form.append('<button class="btn btn-primary" type="submit" style="margin-left: 12px;">Save</button>');
        $form.on('submit', function (e) {
          e.preventDefault();
          var stockValue = Number($form.find('input[name="stock"]').val() || 0);
          var soldOutValue = $form.find('input[name="soldOut"]').is(':checked');

          $.ajax({
            url: '/api/products/update',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ id: product.id, stock: stockValue, price: $form.find('input[name="price"]').val() || product.price, soldOut: soldOutValue }),
            success: function () {
              loadAdminDashboard();
              alert('Inventory updated.');
            },
            error: function (xhr) {
              var message = xhr.responseJSON && xhr.responseJSON.message ? xhr.responseJSON.message : 'Could not update stock.';
              alert(message);
            }
          });
        });

        $item.append($form);
        $list.append($item);
      });

      $adminProducts.html($list);
      loadAdminReviews();
    }).fail(function () {
      $adminProducts.html('<p>Could not load admin dashboard.</p>');
      $('#admin-reviews').html('<p>Could not load admin reviews.</p>');
    });
  }

  function loadAdminReviews() {
    var $adminReviews = $('#admin-reviews');
    $adminReviews.html('<p>Loading reviews...</p>');

    $.ajax({
      url: '/api/reviews',
      method: 'GET',
      dataType: 'json',
      success: function (result) {
        if (!result.ok || !result.reviews || !result.reviews.length) {
          $adminReviews.html('<p>No reviews have been submitted yet.</p>');
          return;
        }

        var $reviewsList = $('<div></div>');
        $reviewsList.append('<h4>Product reviews</h4>');
        result.reviews.forEach(function (review) {
          var $item = $('<div class="profile-cart-item"></div>');
          $item.append('<strong>' + review.productName + '</strong> <span>(' + review.rating + '/5)</span>');
          $item.append('<p>' + review.comment + '</p>');
          $item.append('<small>By ' + review.userName + ' on ' + new Date(review.createdAt).toLocaleString() + '</small>');
          $reviewsList.append($item);
        });

        $adminReviews.html($reviewsList);
      },
      error: function () {
        $adminReviews.html('<p>Could not load reviews.</p>');
      }
    });
  }

  $adminAddButton.on('click', function () {
    openAdminAddModal();
  });

  $adminAddCancel.on('click', function () {
    closeAdminAddModal();
  });

  $adminAddClose.on('click', function () {
    closeAdminAddModal();
  });

  $adminAddModal.on('click', function (e) {
    if (e.target === this) {
      closeAdminAddModal();
    }
  });

  $adminAddForm.on('submit', function (e) {
    e.preventDefault();
    var formData = {
      name: $adminAddForm.find('input[name="name"]').val().trim(),
      brand: $adminAddForm.find('input[name="brand"]').val().trim(),
      price: $adminAddForm.find('input[name="price"]').val().trim(),
      badge: $adminAddForm.find('input[name="badge"]').val().trim(),
      emoji: $adminAddForm.find('input[name="emoji"]').val().trim(),
      description: $adminAddForm.find('textarea[name="description"]').val().trim(),
      stock: Number($adminAddForm.find('input[name="stock"]').val() || 0),
      soldOut: $adminAddForm.find('input[name="soldOut"]').is(':checked'),
      image1: $adminAddForm.find('input[name="image1"]').val().trim(),
      image2: $adminAddForm.find('input[name="image2"]').val().trim(),
      image3: $adminAddForm.find('input[name="image3"]').val().trim(),
      modelImage: $adminAddForm.find('input[name="modelImage"]').val().trim()
    };

    if (!formData.name || !formData.brand || !formData.price || !formData.description) {
      alert('Please fill in name, brand, price and description.');
      return;
    }

    $.ajax({
      url: '/api/products/add',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(formData),
      success: function () {
        closeAdminAddModal();
        loadAdminDashboard();
        alert('Product added successfully.');
      },
      error: function (xhr) {
        var message = xhr.responseJSON && xhr.responseJSON.message ? xhr.responseJSON.message : 'Could not add product.';
        alert(message);
      }
    });
  });

  $form.on('submit', function (e) {
    e.preventDefault();
    if (!currentUser) {
      $status.text('Please sign in before updating your profile.');
      return;
    }

    var saved = {
      name: $name.val().trim(),
      email: $email.val().trim(),
      phone: $phone.val().trim(),
      address: $address.val().trim()
    };

    localStorage.setItem('lunaUser', JSON.stringify(saved));
    $status.text('Your profile has been updated.');
  });

  $signout.on('click', function () {
    $.post('/api/auth/signout', function () {
      localStorage.removeItem('lunaUser');
      currentUser = null;
      showSignInPrompt();
      window.location.href = '/auth';
    });
  });

  loadProfile();
  loadCart();
});
