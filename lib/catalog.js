'use strict';

const store = require('./store');

/** Adds derived, display-ready fields to a raw product record. */
function decorate(product) {
  const reviews = Array.isArray(product.reviews) ? product.reviews : [];
  const reviewCount = reviews.length;
  const sum = reviews.reduce((acc, review) => acc + (Number(review.rating) || 0), 0);
  return Object.assign({}, product, {
    rating: reviewCount ? Math.round((sum / reviewCount) * 10) / 10 : 0,
    reviewCount,
    available: !product.soldOut && product.stock > 0
  });
}

function getProducts() {
  return store.read('products').map(decorate);
}

function findProduct(id) {
  const product = store.read('products').find((item) => item.id === Number(id));
  return product ? decorate(product) : null;
}

function relatedProducts(product, limit) {
  const products = getProducts().filter((item) => item.id !== product.id);
  const sameCategory = products.filter((item) => item.category === product.category);
  const rest = products.filter((item) => item.category !== product.category);
  return sameCategory.concat(rest).slice(0, limit || 3);
}

module.exports = {
  decorate,
  getProducts,
  findProduct,
  relatedProducts
};
