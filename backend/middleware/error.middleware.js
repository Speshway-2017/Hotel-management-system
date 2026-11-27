import { safeLog } from '../utils/logger.js';

export const notFoundHandler = (_req, _res, next) => {
  const error = new Error('Route not found');
  error.statusCode = 404;
  next(error);
};

export const errorHandler = (err, req, res, _next) => {
  const statusCode = err.statusCode || (err.message?.includes('CORS') ? 403 : 500);
  const isDev = process.env.NODE_ENV === 'development';

  if (statusCode >= 500) {
    safeLog('error', `Unhandled server error on ${req.method} ${req.originalUrl}`, {
      statusCode,
      message: err.message,
    });
  }

  res.status(statusCode).json({
    success: false,
    message: statusCode >= 500 && !isDev ? 'Internal Server Error' : (err.message || 'Internal Server Error'),
    stack: isDev ? err.stack : undefined,
  });
};
