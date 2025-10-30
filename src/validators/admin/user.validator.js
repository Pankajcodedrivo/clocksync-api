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

const pagination = Joi.object({
  limit: Joi.string().optional(),
  page: Joi.string().required(),
});

const addUser = Joi.object({
  fullName: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  role: Joi.string().valid('admin', 'scorekeeper', 'event-director').required(),
  isSubscribedByAdmin: Joi.string().required()
});

const updateuser = Joi.object({
  fullName: Joi.string().required(),
  role: Joi.string().valid('admin', 'scorekeeper', 'event-director').required(),
  isSubscribedByAdmin: Joi.string().required()
});

const singleId = Joi.object({
  id: Joi.string().required(),
});

const statusSchema = Joi.object({
  isVerified: Joi.boolean().required(),
});

const singleUserId = Joi.object({
  id: Joi.string().required(),
  limit: Joi.string().optional(),
  page: Joi.string().required(),
});

module.exports = {
  pagination,
  addUser,
  singleId,
  updateuser,
  statusSchema,
  singleUserId,
};
