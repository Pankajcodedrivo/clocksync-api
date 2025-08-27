const Joi = require('joi');

const createGame = Joi.object({
    homeTeamName: Joi.string().required(),
    homeTeamLogo: Joi.string().uri().optional(),
    awayTeamName: Joi.string().required(),
    awayTeamLogo: Joi.string().uri().optional(),
    fieldId: Joi.string().length(24).hex().optional(),
    startDateTime: Joi.date().required(),
    timeZone: Joi.string().required(),
    assignUserId: Joi.string().length(24).hex().optional(),
});

const singleId = Joi.object({
    id: Joi.string().length(24).hex().required()
});

module.exports = {
    createGame,
    singleId,
};
