const Joi = require('joi');

const pagination = Joi.object({
  limit: Joi.string().optional(),
  page: Joi.string().required(),
});

const addTeam = Joi.object({
  teamName: Joi.string().required().messages({
    'any.required': 'Name is required.',
  }),
  location: Joi.string().required().messages({
    'any.required': 'Location is required.',
  }),
  randomNumber: Joi.optional(),
  seedNumber: Joi.string().required().messages({
    'any.required': 'Seed number is required.',
  }),
});

const updateTeam = Joi.object({});

const singleId = Joi.object({
  id: Joi.string().required(),
});

const singleUserId = Joi.object({
  id: Joi.string().required(),
  limit: Joi.string().optional(),
  page: Joi.string().required(),
});

module.exports = {
  pagination,
  addTeam,
  singleId,
  updateTeam,
  singleUserId
};
