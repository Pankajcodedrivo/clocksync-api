const Field = require('../../models/field.model');
const ApiError = require('../../helpers/apiErrorConverter');

// Create new Field
const createField = async (data) => {
  return Field.create(data);
};

// Find Field by id
const getByFieldId = async (id) => {
  return Field.findById(id);
};

// Get All Fields
const getAllField = async () => {
  return Field.find();
};


// update Field
const updateField = async (id, data) => {
  const updatedField = await Field.findByIdAndUpdate(
    id,
    { $set: data },
    { new: true },
  );
  return updatedField;
};
// List all fields with optional pagination + search
const listFields = async ({ page = 1, limit = 10, search = "" }) => {
  const skip = (page - 1) * limit;

  // Build query condition
  let query = {};
  if (search) {
    query = {
      $or: [
        { name: { $regex: search, $options: "i" } },  // case-insensitive match
      ]
    };
  }

  const total = await Field.countDocuments(query);
  const fields = await Field.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    fields,
  };
};


const deleteFieldById = async (id) => {
  return Field.findByIdAndDelete(id)
};
module.exports = {
  createField,
  getByFieldId,
  updateField,
  listFields,
  deleteFieldById,
  getAllField
};