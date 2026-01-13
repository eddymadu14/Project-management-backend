
/**
 * Standardized success response format
 * @param {Object} res - Express response object
 * @param {Number} statusCode - HTTP status code (default: 200)
 * @param {String} message - Response message
 * @param {Object} [data={}] - Optional data payload
 */
export const successResponse = (res, statusCode = 200, message = "Success", data = {}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data, 
  });
};

/**
 * Standardized error response format
 * @param {Object} res - Express response object
 * @param {Number} statusCode - HTTP status code (default: 500)
 * @param {String|Object} error - Error message or error object
 */
export const errorResponse = (res, statusCode = 500, error = "An unexpected error occurred") => {
  // Normalize error message
  const message = typeof error === "string" ? error : error.message || "An unexpected error occurred";

  return res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === "development" ? error : undefined, // only show details in dev mode
  });
};