const Joi = require('joi');

const singleId = Joi.object({
    id: Joi.string().required(),
});

const testimonial = Joi.object({
    title: Joi.string().required().messages({
        'any.required': 'Title is required.',
    }),
    description: Joi.string().required().messages({
        'any.required': 'Description is required.',
    }),
});

module.exports = {
    singleId,
    testimonial,
};
