const Joi = require('joi');

const createField = Joi.object({
    name: Joi.string().required(),
});

const singleId = Joi.object({
    id: Joi.string().length(24).hex().required()
});

const getFieldBySlug = Joi.object({
    slug: Joi.string().required(),
})

module.exports = {
    createField,
    singleId,
    getFieldBySlug
};