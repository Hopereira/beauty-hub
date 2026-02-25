/**
 * User Validation Schemas
 */

const { Joi, schemas } = require('../../shared/middleware/validation');
const { ROLES } = require('../../shared/constants');

const createUserSchema = Joi.object({
  first_name: Joi.string().min(2).max(100).required()
    .messages({
      'any.required': 'Nome é obrigatório.',
      'string.min': 'Nome deve ter no mínimo 2 caracteres.',
    }),
  last_name: Joi.string().min(2).max(100).required()
    .messages({
      'any.required': 'Sobrenome é obrigatório.',
    }),
  email: schemas.email.required()
    .messages({
      'any.required': 'Email é obrigatório.',
    }),
  password: schemas.password.required()
    .messages({
      'any.required': 'Senha é obrigatória.',
      'string.min': 'Senha deve ter no mínimo 6 caracteres.',
    }),
  phone: schemas.phone.optional(),
  role: Joi.string().valid(...Object.values(ROLES)).optional()
    .messages({
      'any.only': 'Role inválida.',
    }),
  avatar: Joi.string().uri().optional().allow('', null),
});

const updateUserSchema = Joi.object({
  first_name: Joi.string().min(2).max(100).optional(),
  last_name: Joi.string().min(2).max(100).optional(),
  email: schemas.email.optional(),
  phone: schemas.phone.optional().allow('', null),
  avatar: Joi.string().uri().optional().allow('', null),
  is_active: Joi.boolean().optional(),
  settings: Joi.object().optional(),
});

const changePasswordSchema = Joi.object({
  current_password: Joi.string().required()
    .messages({
      'any.required': 'Senha atual é obrigatória.',
    }),
  new_password: schemas.password.required()
    .messages({
      'any.required': 'Nova senha é obrigatória.',
      'string.min': 'Nova senha deve ter no mínimo 6 caracteres.',
    }),
  confirm_password: Joi.string().valid(Joi.ref('new_password')).required()
    .messages({
      'any.only': 'Confirmação de senha não confere.',
      'any.required': 'Confirmação de senha é obrigatória.',
    }),
});

const resetPasswordSchema = Joi.object({
  new_password: schemas.password.required()
    .messages({
      'any.required': 'Nova senha é obrigatória.',
    }),
});

const changeRoleSchema = Joi.object({
  role: Joi.string().valid(...Object.values(ROLES)).required()
    .messages({
      'any.required': 'Role é obrigatória.',
      'any.only': 'Role inválida.',
    }),
});

const listUsersSchema = Joi.object({
  page: schemas.pagination.page,
  limit: schemas.pagination.limit,
  role: Joi.string().valid(...Object.values(ROLES)).optional(),
  is_active: Joi.boolean().optional(),
  search: Joi.string().max(100).optional(),
});

module.exports = {
  createUserSchema,
  updateUserSchema,
  changePasswordSchema,
  resetPasswordSchema,
  changeRoleSchema,
  listUsersSchema,
};
