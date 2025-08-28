const Joi = require('joi');

const createGame = Joi.object({
    homeTeamName: Joi.string()
        .required()
        .messages({
            "string.base": "Home team name must be a string",
            "string.empty": "Home team name is required",
            "any.required": "Home team name is required",
        }),

    homeTeamLogo: Joi.string()
        .uri()
        .optional()
        .messages({
            "string.uri": "Home team logo must be a valid URL",
        }),

    awayTeamName: Joi.string()
        .required()
        .messages({
            "string.base": "Away team name must be a string",
            "string.empty": "Away team name is required",
            "any.required": "Away team name is required",
        }),

    awayTeamLogo: Joi.string()
        .uri()
        .optional()
        .messages({
            "string.uri": "Away team logo must be a valid URL",
        }),

    fieldId: Joi.string()
        .length(24)
        .hex()
        .optional()
        .messages({
            "string.length": "Field ID must be a 24-character hex string",
            "string.hex": "Field ID must be a valid hex string",
        }),

    startDateTime: Joi.date()
        .required()
        .messages({
            "date.base": "Start date must be a valid date",
            "any.required": "Start date is required",
        }),
    endDateTime: Joi.date()
        .required()
        .messages({
            "date.base": "Start date must be a valid date",
            "any.required": "Start date is required",
        }),
    assignUserId: Joi.string()
        .length(24)
        .hex()
        .optional()
        .messages({
            "string.length": "Scorekeeper ID must be a 24-character hex string",
            "string.hex": "Scorekeeper ID must be a valid hex string",
        }),
});


const singleId = Joi.object({
    id: Joi.string().length(24).hex().required()
});

module.exports = {
    createGame,
    singleId,
};
