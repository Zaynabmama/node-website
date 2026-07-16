$(function () {
  var $reviewForm = $('#review-form');
  var $reviewRating = $('#review-rating');
  var $reviewComment = $('#review-comment');
  var $reviewStatus = $('#review-status');
  var $reviewList = $('#review-list');
  var productId = $('#product-details').data('product-id');

  function renderReviews(reviews) {
    if (!reviews || !reviews.length) {
      $reviewList.html('<p class="product-no-reviews">No reviews yet. Be the first to review this product.</p>');
      return;
    }

    var html = '<div class="review-summary">';
    html += '<h4>Customer reviews</h4>';
    reviews.forEach(function (review) {
      html += '<div class="review-item">';
      html += '<div class="review-header"><strong>' + review.userName + '</strong> <span>(' + new Date(review.createdAt).toLocaleDateString() + ')</span></div>';
      html += '<div class="review-rating">' + '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating) + '</div>';
      html += '<p>' + (review.comment || '<em>No comment provided.</em>') + '</p>';
      html += '</div>';
    });
    html += '</div>';
    $reviewList.html(html);
  }

  $reviewForm.on('submit', function (e) {
    e.preventDefault();
    if (!productId) {
      return;
    }

    var payload = {
      rating: Number($reviewRating.val()),
      comment: $reviewComment.val().trim()
    };

    $.ajax({
      url: '/api/products/' + productId + '/reviews',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(payload),
      success: function (result) {
        if (result.ok) {
          $reviewRating.val('5');
          $reviewComment.val('');
          $reviewStatus.text('Thank you! Your review was submitted.');
          renderReviews(result.product.reviews);
        }
      },
      error: function (xhr) {
        var message = xhr.responseJSON && xhr.responseJSON.message ? xhr.responseJSON.message : 'Could not submit review.';
        $reviewStatus.text(message);
      }
    });
  });

  if ($reviewList.length && $reviewList.data('reviews')) {
    renderReviews($reviewList.data('reviews'));
  }
});
