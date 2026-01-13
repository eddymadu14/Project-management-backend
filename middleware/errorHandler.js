
import ApiError from "../utils/ApiError.js";
import Joi from "joi";
import logger from "../utils/logger.js";

const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;

  // Log error details
  logger.error(`${req.method} ${req.originalUrl} - ${err.message}`);

  // Handle Joi validation errors
  if (err instanceof Joi.ValidationError) {
    statusCode = 400;
    message = err.details.map(detail => detail.message).join(", ");
  }

  // Handle ApiError explicitly
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
  }

  // Fallback for unhandled errors
  res.status(statusCode || 500).json({
    success: false,
    message: message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

export default errorHandler;