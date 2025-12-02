const { schemas, utils } = require('@waterbills/shared');

const validateRequest = (schema) => {
  return (req, res, next) => {
    const result = utils.validateSchema(schema, req.body);
    
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.errors
      });
    }
    
    req.validatedData = result.data;
    next();
  };
};

const validateQuery = (schema) => {
  return (req, res, next) => {
    const result = utils.validateSchema(schema, req.query);
    
    if (!result.success) {
      return res.status(400).json({
        error: 'Query validation failed',
        details: result.errors
      });
    }
    
    req.validatedQuery = result.data;
    next();
  };
};

const validateParams = (schema) => {
  return (req, res, next) => {
    const result = utils.validateSchema(schema, req.params);
    
    if (!result.success) {
      return res.status(400).json({
        error: 'Parameter validation failed',
        details: result.errors
      });
    }
    
    req.validatedParams = result.data;
    next();
  };
};

module.exports = {
  validateRequest,
  validateQuery,
  validateParams
};
