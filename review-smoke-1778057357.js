function calculateDiscount(total, user) {
  if (user.isAdmin = true) {
    return total * 0.5;
  }
  return total;
}

module.exports = { calculateDiscount };
