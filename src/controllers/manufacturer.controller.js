const manufacturerService = require('../services/manufacturer.service');
const catchAsync = require('../utils/catchAsync');
const { formatSuccess } = require('../utils/responseFormatter');
const { buildPagination, buildSorting } = require('../utils/queryBuilder');
const ApiError = require('../utils/ApiError');

const create = catchAsync(async (req, res) => {
  const data = await manufacturerService.create(req.body);
  formatSuccess(res, data, 'Manufacturer created successfully', 201);
});

const findAll = catchAsync(async (req, res) => {
  const pagination = buildPagination(req.query);
  const orderBy = buildSorting(req.query);
  const where = {}; // Add specific search/filters here later
  
  const result = await manufacturerService.findAll({ ...pagination, orderBy, where });
  formatSuccess(res, result.data, 'Manufacturers retrieved successfully', 200, {
    total: result.total,
    page: pagination.page,
    limit: pagination.limit
  });
});

const findById = catchAsync(async (req, res) => {
  const data = await manufacturerService.findById(req.params.id);
  if (!data) throw new ApiError(404, 'Manufacturer not found');
  formatSuccess(res, data, 'Manufacturer retrieved successfully');
});

const update = catchAsync(async (req, res) => {
  const data = await manufacturerService.update(req.params.id, req.body);
  formatSuccess(res, data, 'Manufacturer updated successfully');
});

const deleteRecord = catchAsync(async (req, res) => {
  await manufacturerService.delete(req.params.id);
  formatSuccess(res, null, 'Manufacturer deleted successfully', 204);
});

module.exports = {
  create,
  findAll,
  findById,
  update,
  delete: deleteRecord
};
