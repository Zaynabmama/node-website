$(function () {
  $('.admin-stock-form').on('submit', function (e) {
    e.preventDefault();
    var $form = $(this);
    var id = Number($form.data('id'));
    var stock = Number($form.find('input[name="stock"]').val() || 0);
    var soldOut = $form.find('input[name="soldOut"]').is(':checked');

    $.ajax({
      url: '/api/products/update',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ id: id, stock: stock, soldOut: soldOut }),
      success: function () {
        alert('Inventory updated.');
        window.location.reload();
      },
      error: function (xhr) {
        alert(xhr.responseJSON && xhr.responseJSON.message ? xhr.responseJSON.message : 'Could not update stock.');
      }
    });
  });
});
