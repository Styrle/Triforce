import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { config } from '../config';
import { ERROR_CODES } from '../config/constants';

// Custom error class
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = ERROR_CODES.INTERNAL_ERROR,
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Common error factory functions
export const createNotFoundError = (resource: string) =>
  new AppError(`${resource} not found`, 404, ERROR_CODES.NOT_FOUND);

export const createUnauthorizedError = (message: string = 'Unauthorized') =>
  new AppError(message, 401, ERROR_CODES.UNAUTHORIZED);

export const createForbiddenError = (message: string = 'Forbidden') =>
  new AppError(message, 403, ERROR_CODES.FORBIDDEN);

export const createValidationError = (message: string) =>
  new AppError(message, 400, ERROR_CODES.VALIDATION_ERROR);

// Error handler middleware
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log error
  if (err instanceof AppError && err.isOperational) {
    logger.warn(`Operational error: ${err.message}`, {
      statusCode: err.statusCode,
      code: err.code,
      path: req.path,
      method: req.method,
    });
  } else {
    logger.error('Unexpected error:', {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
  }

  // Determine status code and response
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const code = err instanceof AppError ? err.code : ERROR_CODES.INTERNAL_ERROR;

  const response: {
    success: false;
    error: {
      message: string;
      code: string;
      stack?: string;
    };
  } = {
    success: false,
    error: {
      message: err.message || 'An unexpected error occurred',
      code,
    },
  };

  // Include stack trace in development
  if (config.isDevelopment && err.stack) {
    response.error.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

// 404 handler for undefined routes
export function notFoundHandler(
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  res.status(404).json({
    success: false,
    error: {
      message: `Route ${req.method} ${req.path} not found`,
      code: ERROR_CODES.NOT_FOUND,
    },
  });
}

// Async handler wrapper to catch errors in async routes
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export default errorHandler;
