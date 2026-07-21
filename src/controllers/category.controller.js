const categoryService = require('../services/category.service');
const catchAsync = require('../utils/catchAsync');
const { formatSuccess } = require('../utils/responseFormatter');
const { buildPagination, buildSorting } = require('../utils/queryBuilder');
const ApiError = require('../utils/ApiError');

const create = catchAsync(async (req, res) => {
  const data = await categoryService.create(req.body);
  formatSuccess(res, data, 'Category created successfully', 201);
});

const findAll = catchAsync(async (req, res) => {
  const pagination = buildPagination(req.query);
  const orderBy = buildSorting(req.query);
  const where = {}; // Add specific search/filters here later
  
  const result = await categoryService.findAll({ ...pagination, orderBy, where });
  formatSuccess(res, result.data, 'Categorys retrieved successfully', 200, {
    total: result.total,
    page: pagination.page,
    limit: pagination.limit
  });
});

const findById = catchAsync(async (req, res) => {
  const data = await categoryService.findById(req.params.id);
  if (!data) throw new ApiError(404, 'Category not found');
  formatSuccess(res, data, 'Category retrieved successfully');
});

const update = catchAsync(async (req, res) => {
  const data = await categoryService.update(req.params.id, req.body);
  formatSuccess(res, data, 'Category updated successfully');
});

const deleteRecord = catchAsync(async (req, res) => {
  await categoryService.delete(req.params.id);
  formatSuccess(res, null, 'Category deleted successfully', 204);
});

module.exports = {
  create,
  findAll,
  findById,
  update,
  delete: deleteRecord
};
