function validate(schema, source = 'body') {
  return (req, res, next) => {
    const data = source === 'query' ? req.query : req.body;
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = {};
      error.details.forEach((d) => {
        details[d.path.join('.')] = d.message;
      });
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos.',
        error: { code: 'VALIDATION_ERROR', details },
      });
    }

    // Replace with validated/sanitized values
    if (source === 'query') {
      req.query = value;
    } else {
      req.body = value;
    }
    next();
  };
}

module.exports = { validate };
