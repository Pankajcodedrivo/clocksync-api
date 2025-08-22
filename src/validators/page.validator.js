const Joi = require('joi');

const singleId = Joi.object({
  id: Joi.string().required(),
});

module.exports = {
  singleId,
};
