const Joi = require('joi');

const password = (value, helpers) => {
  if (
    !value.match(
      /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/,
    )
  ) {
    return helpers.message(
      'Password must me 8 characters long with at least one capital letter, one small letter, one digit, one special character',
    );
  }
  return value;
};

const passchange = Joi.object({
  password_new: Joi.string().required().custom(password),
  password_old: Joi.string().required().custom(password),
});

const passchangefirst = Joi.object({
  password: Joi.string().required().custom(password),
});

const notificationToggle = Joi.object({
  notification: Joi.boolean().required(),
});

const immegrationRequest = Joi.object({
  immegration_purpose: Joi.array().required(),
  temporary_address: Joi.string().required(),
  permanent_address: Joi.string().required(),
  express_entry: Joi.string().required(),
  nominee_program: Joi.string().required(),
  family_sponsorship: Joi.string().required(),
});

const support = Joi.object({
  subject: Joi.string().required().messages({
    'any.required': 'Subject is required.',
  }),
  message: Joi.string().required().messages({
    'any.required': 'Message is required.',
  }),
});

const singleId = Joi.object({
  id: Joi.string().required(),
});

module.exports = {
  passchange,
  notificationToggle,
  immegrationRequest,
  support,
  singleId,
  passchangefirst
};
