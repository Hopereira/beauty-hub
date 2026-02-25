/**
 * Custom Application Error Classes
 * Provides typed errors for consistent error handling
 */

const { HTTP_STATUS, ERROR_CODES } = require('../constants');

class AppError extends Error {
  constructor(message, statusCode = HTTP_STATUS.INTERNAL_ERROR, code = ERROR_CODES.INTERNAL_ERROR, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      success: false,
      message: this.message,
      error: {
        code: this.code,
        details: this.details,
      },
    };
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, details);
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource', id = null) {
    const message = id ? `${resource} com ID ${id} não encontrado.` : `${resource} não encontrado.`;
    super(message, HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Não autorizado.', code = ERROR_CODES.AUTH_TOKEN_INVALID) {
    super(message, HTTP_STATUS.UNAUTHORIZED, code);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Acesso negado. Permissão insuficiente.') {
    super(message, HTTP_STATUS.FORBIDDEN, ERROR_CODES.AUTH_FORBIDDEN);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Conflito de dados.', details = null) {
    super(message, HTTP_STATUS.CONFLICT, ERROR_CODES.DUPLICATE_ENTRY, details);
  }
}

class TenantError extends AppError {
  constructor(message, code = ERROR_CODES.TENANT_NOT_FOUND) {
    super(message, HTTP_STATUS.BAD_REQUEST, code);
  }
}

class TenantSuspendedError extends AppError {
  constructor(tenantSlug) {
    super(
      `Tenant "${tenantSlug}" está suspenso. Entre em contato com o suporte.`,
      HTTP_STATUS.FORBIDDEN,
      ERROR_CODES.TENANT_SUSPENDED
    );
  }
}

class TenantMismatchError extends AppError {
  constructor() {
    super(
      'Operação não permitida para este tenant.',
      HTTP_STATUS.FORBIDDEN,
      ERROR_CODES.TENANT_MISMATCH
    );
  }
}

class SubscriptionError extends AppError {
  constructor(message, code = ERROR_CODES.SUBSCRIPTION_EXPIRED) {
    super(message, HTTP_STATUS.FORBIDDEN, code);
  }
}

class FeatureNotAvailableError extends AppError {
  constructor(feature) {
    super(
      `Recurso "${feature}" não disponível no seu plano atual.`,
      HTTP_STATUS.FORBIDDEN,
      ERROR_CODES.FEATURE_NOT_AVAILABLE
    );
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Muitas requisições. Tente novamente mais tarde.') {
    super(message, HTTP_STATUS.TOO_MANY_REQUESTS, ERROR_CODES.RATE_LIMIT_EXCEEDED);
  }
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  TenantError,
  TenantSuspendedError,
  TenantMismatchError,
  SubscriptionError,
  FeatureNotAvailableError,
  RateLimitError,
};
