const asyncHandler = (fn) => (req, res, next) => {
  // Return a new promise that resolves the request handler and catches any errors
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
