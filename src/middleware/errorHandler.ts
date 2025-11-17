import { Request, Response, NextFunction } from 'express';

/**
 * Standardized error response interface
 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  path: string;
}

/**
 * Custom application error class
 */
export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;

  constructor(message: string, statusCode: number, code: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = 'AppError';

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Request logging middleware
 * Logs incoming requests for debugging purposes
 */
export const requestLogger = (req: Request, _res: Response, next: NextFunction): void => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.url;
  const ip = req.ip || req.socket.remoteAddress;

  // Log request (excluding sensitive data)
  console.log(`[${timestamp}] ${method} ${url} - IP: ${ip}`);

  // Don't log request body to avoid exposing sensitive data like passwords
  // In production, use a proper logging library with configurable log levels

  next();
};

/**
 * Global error handler middleware
 * Formats errors according to standardized ErrorResponse interface
 * Maps different error types to appropriate HTTP status codes
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Default error values
  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let errorMessage = 'An unexpected error occurred';
  let errorDetails: any = undefined;

  // Log error for debugging (sanitize sensitive data)
  const sanitizedError = sanitizeError(err);
  console.error(`[ERROR] ${req.method} ${req.path}:`, sanitizedError);

  // Handle custom AppError
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    errorCode = err.code;
    errorMessage = err.message;
    errorDetails = err.details;
  }
  // Handle known error patterns from services
  else if (err.message) {
    const errorMapping = mapErrorMessage(err.message);
    statusCode = errorMapping.statusCode;
    errorCode = errorMapping.code;
    errorMessage = errorMapping.message;
  }

  // Format error response
  const errorResponse: ErrorResponse = {
    error: {
      code: errorCode,
      message: errorMessage,
      ...(errorDetails && { details: errorDetails }),
    },
    timestamp: new Date().toISOString(),
    path: req.path,
  };

  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * Map error messages to appropriate HTTP status codes and error codes
 * @param message - Error message from service layer
 * @returns Object with statusCode, code, and message
 */
function mapErrorMessage(message: string): {
  statusCode: number;
  code: string;
  message: string;
} {
  // Extract error code if present (format: "ERROR_CODE: message")
  const parts = message.split(':');
  const potentialCode = parts[0].trim();
  const errorMessage = parts.length > 1 ? parts.slice(1).join(':').trim() : message;

  // Validation errors (400 Bad Request)
  if (
    potentialCode.includes('INVALID_EMAIL') ||
    potentialCode.includes('INVALID_FIRST_NAME') ||
    potentialCode.includes('INVALID_LAST_NAME') ||
    potentialCode.includes('INVALID_PASSWORD') ||
    potentialCode.includes('INVALID_AMOUNT') ||
    potentialCode.includes('INVALID_PAGINATION') ||
    potentialCode.includes('VALIDATION_ERROR')
  ) {
    return {
      statusCode: 400,
      code: potentialCode,
      message: errorMessage,
    };
  }

  // Not found errors (404 Not Found)
  if (potentialCode.includes('ACCOUNT_NOT_FOUND') || potentialCode.includes('USER_NOT_FOUND')) {
    return {
      statusCode: 404,
      code: potentialCode,
      message: errorMessage,
    };
  }

  // Business logic errors (422 Unprocessable Entity)
  if (
    potentialCode.includes('INSUFFICIENT_BALANCE') ||
    potentialCode.includes('USER_BLACKLISTED') ||
    potentialCode.includes('EMAIL_EXISTS') ||
    potentialCode.includes('INVALID_TRANSFER')
  ) {
    return {
      statusCode: 422,
      code: potentialCode,
      message: errorMessage,
    };
  }

  // Default to internal server error
  return {
    statusCode: 500,
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
  };
}

/**
 * Sanitize error object to remove sensitive data
 * Ensures passwords, tokens, and other sensitive information are never logged
 * @param err - Error object to sanitize
 * @returns Sanitized error object safe for logging
 */
function sanitizeError(err: Error | AppError): any {
  const sanitized: any = {
    name: err.name,
    message: err.message,
    stack: err.stack,
  };

  // If it's an AppError, include additional properties
  if (err instanceof AppError) {
    sanitized.statusCode = err.statusCode;
    sanitized.code = err.code;

    // Sanitize details if present
    if (err.details) {
      sanitized.details = sanitizeObject(err.details);
    }
  }

  return sanitized;
}

/**
 * Recursively sanitize an object to remove sensitive fields
 * @param obj - Object to sanitize
 * @returns Sanitized object
 */
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }

  const sanitized: any = {};
  const sensitiveFields = [
    'password',
    'passwordHash',
    'password_hash',
    'token',
    'accessToken',
    'refreshToken',
    'apiKey',
    'secret',
    'authorization',
  ];

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      // Check if field is sensitive (case-insensitive)
      const isSensitive = sensitiveFields.some(
        (field) => key.toLowerCase().includes(field.toLowerCase())
      );

      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object') {
        sanitized[key] = sanitizeObject(obj[key]);
      } else {
        sanitized[key] = obj[key];
      }
    }
  }

  return sanitized;
}

/**
 * 404 Not Found handler for undefined routes
 */
export const notFoundHandler = (req: Request, res: Response, _next: NextFunction): void => {
  const errorResponse: ErrorResponse = {
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Cannot ${req.method} ${req.path}`,
    },
    timestamp: new Date().toISOString(),
    path: req.path,
  };

  res.status(404).json(errorResponse);
};
