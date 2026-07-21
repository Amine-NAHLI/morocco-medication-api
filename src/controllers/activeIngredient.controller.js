const activeIngredientService = require('../services/activeIngredient.service');
const catchAsync = require('../utils/catchAsync');
const { formatSuccess } = require('../utils/responseFormatter');
const { buildPagination, buildSorting } = require('../utils/queryBuilder');
const ApiError = require('../utils/ApiError');

const create = catchAsync(async (req, res) => {
  const data = await activeIngredientService.create(req.body);
  formatSuccess(res, data, 'ActiveIngredient created successfully', 201);
});

const findAll = catchAsync(async (req, res) => {
  const pagination = buildPagination(req.query);
  const orderBy = buildSorting(req.query);
  const where = {}; // Add specific search/filters here later
  
  const result = await activeIngredientService.findAll({ ...pagination, orderBy, where });
  formatSuccess(res, result.data, 'ActiveIngredients retrieved successfully', 200, {
    total: result.total,
    page: pagination.page,
    limit: pagination.limit
  });
});

const findById = catchAsync(async (req, res) => {
  const data = await activeIngredientService.findById(req.params.id);
  if (!data) throw new ApiError(404, 'ActiveIngredient not found');
  formatSuccess(res, data, 'ActiveIngredient retrieved successfully');
});

const update = catchAsync(async (req, res) => {
  const data = await activeIngredientService.update(req.params.id, req.body);
  formatSuccess(res, data, 'ActiveIngredient updated successfully');
});

const deleteRecord = catchAsync(async (req, res) => {
  await activeIngredientService.delete(req.params.id);
  formatSuccess(res, null, 'ActiveIngredient deleted successfully', 204);
});

module.exports = {
  create,
  findAll,
  findById,
  update,
  delete: deleteRecord
};
