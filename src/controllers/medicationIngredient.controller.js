const medicationIngredientService = require('../services/medicationIngredient.service');
const catchAsync = require('../utils/catchAsync');
const { formatSuccess } = require('../utils/responseFormatter');
const { buildPagination, buildSorting } = require('../utils/queryBuilder');
const ApiError = require('../utils/ApiError');

const create = catchAsync(async (req, res) => {
  const data = await medicationIngredientService.create(req.body);
  formatSuccess(res, data, 'MedicationIngredient created successfully', 201);
});

const findAll = catchAsync(async (req, res) => {
  const pagination = buildPagination(req.query);
  const orderBy = buildSorting(req.query);
  const where = {}; // Add specific search/filters here later
  
  const result = await medicationIngredientService.findAll({ ...pagination, orderBy, where });
  formatSuccess(res, result.data, 'MedicationIngredients retrieved successfully', 200, {
    total: result.total,
    page: pagination.page,
    limit: pagination.limit
  });
});

const findById = catchAsync(async (req, res) => {
  const data = await medicationIngredientService.findById(req.params.id);
  if (!data) throw new ApiError(404, 'MedicationIngredient not found');
  formatSuccess(res, data, 'MedicationIngredient retrieved successfully');
});

const update = catchAsync(async (req, res) => {
  const data = await medicationIngredientService.update(req.params.id, req.body);
  formatSuccess(res, data, 'MedicationIngredient updated successfully');
});

const deleteRecord = catchAsync(async (req, res) => {
  await medicationIngredientService.delete(req.params.id);
  formatSuccess(res, null, 'MedicationIngredient deleted successfully', 204);
});

module.exports = {
  create,
  findAll,
  findById,
  update,
  delete: deleteRecord
};
