const Joi = require('joi');

// Ad placement schema
const placementSchema = Joi.array().items(
    Joi.object({
        imageUrl: Joi.string().allow('').required(),
        link: Joi.string().allow('').optional(),
    })
);

// Field creation/updation schema
const createField = Joi.object({
    name: Joi.string().required(),
    unviseralClock: Joi.boolean(),
    ads: Joi.object({
        desktop: Joi.object({
            top: placementSchema.optional(),
            left: placementSchema.optional(),
            right: placementSchema.optional(),
        }).optional(),
        mobile: Joi.object({
            top: placementSchema.optional(),
            middle: placementSchema.optional(),
            bottom: placementSchema.optional(),
        }).optional(),
    }).optional(),
});

const singleId = Joi.object({
    id: Joi.string().required(),
});
const getFieldBySlug = Joi.object({
    slug: Joi.string().required(),
})
module.exports = {
    createField,
    singleId,
    getFieldBySlug
};
