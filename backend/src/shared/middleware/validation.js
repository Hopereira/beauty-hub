/**
 * Request Validation Middleware
 * Joi schema validation for body, query, and params
 */

const { ValidationError } = require('../errors');

/**
 * Validate request data against Joi schema
 * @param {object} schema - Joi schema
 * @param {string} source - Request property to validate ('body', 'query', 'params')
 * @returns {Function} Express middleware
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const data = req[source];
    
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const details = error.details.map(d => ({
        field: d.path.join('.'),
        message: d.message.replace(/"/g, "'"),
      }));

      return next(new ValidationError(
        'Erro de validação nos dados enviados.',
        details
      ));
    }

    // Replace with validated/sanitized data
    req[source] = value;
    next();
  };
}

/**
 * Validate multiple sources at once
 * @param {object} schemas - Object with source keys and Joi schemas
 * @returns {Function} Express middleware
 */
function validateAll(schemas) {
  return (req, res, next) => {
    const errors = [];

    for (const [source, schema] of Object.entries(schemas)) {
      const { error, value } = schema.validate(req[source], {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
      });

      if (error) {
        errors.push(...error.details.map(d => ({
          field: `${source}.${d.path.join('.')}`,
          message: d.message.replace(/"/g, "'"),
        })));
      } else {
        req[source] = value;
      }
    }

    if (errors.length > 0) {
      return next(new ValidationError(
        'Erro de validação nos dados enviados.',
        errors
      ));
    }

    next();
  };
}

/**
 * Common Joi extensions and helpers
 */
const Joi = require('joi');

// Custom Joi extensions
const customJoi = Joi.extend((joi) => ({
  type: 'string',
  base: joi.string(),
  messages: {
    'string.cpf': '{{#label}} deve ser um CPF válido',
    'string.cnpj': '{{#label}} deve ser um CNPJ válido',
    'string.phone': '{{#label}} deve ser um telefone válido',
  },
  rules: {
    cpf: {
      validate(value, helpers) {
        if (!isValidCPF(value)) {
          return helpers.error('string.cpf');
        }
        return value.replace(/\D/g, '');
      },
    },
    cnpj: {
      validate(value, helpers) {
        if (!isValidCNPJ(value)) {
          return helpers.error('string.cnpj');
        }
        return value.replace(/\D/g, '');
      },
    },
    phone: {
      validate(value, helpers) {
        const cleaned = value.replace(/\D/g, '');
        if (cleaned.length < 10 || cleaned.length > 11) {
          return helpers.error('string.phone');
        }
        return cleaned;
      },
    },
  },
}));

// CPF validation
function isValidCPF(cpf) {
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11 || /^(\d)\1+$/.test(cleaned)) return false;
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleaned.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleaned.charAt(10))) return false;
  
  return true;
}

// CNPJ validation
function isValidCNPJ(cnpj) {
  const cleaned = cnpj.replace(/\D/g, '');
  if (cleaned.length !== 14 || /^(\d)\1+$/.test(cleaned)) return false;
  
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleaned.charAt(i)) * weights1[i];
  }
  let digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (digit !== parseInt(cleaned.charAt(12))) return false;
  
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleaned.charAt(i)) * weights2[i];
  }
  digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (digit !== parseInt(cleaned.charAt(13))) return false;
  
  return true;
}

// Common schema patterns
const schemas = {
  uuid: customJoi.string().uuid({ version: 'uuidv4' }),
  email: customJoi.string().email().lowercase().trim(),
  password: customJoi.string().min(6).max(100),
  phone: customJoi.string().phone(),
  cpf: customJoi.string().cpf(),
  cnpj: customJoi.string().cnpj(),
  slug: customJoi.string().lowercase().trim().pattern(/^[a-z0-9-]+$/),
  pagination: {
    page: customJoi.number().integer().min(1).default(1),
    limit: customJoi.number().integer().min(1).max(100).default(20),
  },
  dateRange: {
    startDate: customJoi.date().iso(),
    endDate: customJoi.date().iso().min(Joi.ref('startDate')),
  },
};

module.exports = {
  validate,
  validateAll,
  Joi: customJoi,
  schemas,
};
