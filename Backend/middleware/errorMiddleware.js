function notFoundHandler(req, res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.status = 404;
  next(error);
}

function errorHandler(error, _req, res, _next) {
  const status = error.status || error.statusCode || 500;
  const message = status === 500 ? "Internal server error" : error.message;

  if (status >= 500) {
    console.error("Request failed:", error.message);
  }

  res.status(status).json({
    success: false,
    message,
  });
}

module.exports = { notFoundHandler, errorHandler };
