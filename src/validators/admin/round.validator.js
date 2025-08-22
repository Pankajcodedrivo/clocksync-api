const Joi = require('joi');

const roundValidation = Joi.object({
    roundname: Joi.string().required().messages({
        'any.required': 'Round name is required',
    }),
    rounddate: Joi.string().required().messages({
        'any.required': 'Round date is required',
    }),
    roundorder: Joi.number().required().messages({
        'any.required': 'Round order is required',
    }),
});

module.exports = {
    roundValidation
}