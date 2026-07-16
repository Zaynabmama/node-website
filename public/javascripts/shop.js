$(function () {
  var $searchForm = $('#search-form');
  var $searchInput = $('#search-input');

  $searchForm.on('submit', function (e) {
    e.preventDefault();
    var query = $searchInput.val().trim();
    window.location.href = '/shop?search=' + encodeURIComponent(query);
  });
});
