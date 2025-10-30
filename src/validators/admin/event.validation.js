const Joi = require('joi');

const createEvent = Joi.object({
    eventName: Joi.string()
        .required()
        .messages({
            "string.base": "Event name must be a string",
            "string.empty": "Event name is required",
            "any.required": "Event name is required",
        }),

    eventLogo: Joi.string()
        .uri()
        .optional()
        .messages({
            "string.uri": "Event logo must be a valid URL",
        }),



    startDate: Joi.date()
        .required()
        .messages({
            "date.base": "Start date must be a valid date",
            "any.required": "Start date is required",
        }),
    endDate: Joi.date()
        .required()
        .messages({
            "date.base": "End date must be a valid date",
            "any.required": "End date is required",
        }),
    assignUserId: Joi.string()
        .length(24)
        .hex()
        .optional()
        .messages({
            "string.length": "Event director ID must be a 24-character hex string",
            "string.hex": "Event director ID must be a valid hex string",
        }),
});


const singleId = Joi.object({
    id: Joi.string().length(24).hex().required()
});

module.exports = {
    createEvent,
    singleId,
};
