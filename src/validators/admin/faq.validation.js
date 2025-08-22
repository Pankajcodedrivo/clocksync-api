const Joi = require('joi');

const singleId = Joi.object({
  id: Joi.string().required(),
});

const faq = Joi.object({
  question: Joi.string().required().messages({
    'any.required': 'Question is required.',
  }),
  answer: Joi.string().required().messages({
    'any.required': 'Answer is required.',
  }),
});

module.exports = {
  singleId,
  faq,
};
