const Joi = require('joi');

const pagination = Joi.object({
    limit: Joi.string().optional(),
    page: Joi.string().required(),
});

const addMatch = Joi.object({
    zone: Joi.optional(),
    round: Joi.string()
        .valid("First Four", "1st Round", "2nd Round", "Sweet 16", "Elite 8", "Final Four", "Championship")
        .required()
        .messages({
            'any.required': 'Round is required.',
            'any.only': 'Round must be one of the predefined tournament stages.'
        }),
    matchNumber: Joi.optional(),
    homeTeam: Joi.optional(),
    awayTeam: Joi.optional(),
    matchDate: Joi.date().required(),
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
    addMatch,
    singleId,
    updateTeam,
    singleUserId
};
