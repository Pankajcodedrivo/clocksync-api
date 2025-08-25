const slugify = require('slugify');
const Field = require('../models/field.model');

async function generateUniqueSlug(name) {
  let baseSlug = slugify(name, { lower: true, strict: true });
  let slug = baseSlug;
  let counter = 1;

  // Keep checking until slug is unique
  while (await Field.findOne({ slug })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

module.exports = { generateUniqueSlug };
