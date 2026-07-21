const importHistoryService = require('../services/importHistory.service');
const catchAsync = require('../utils/catchAsync');
const { formatSuccess } = require('../utils/responseFormatter');
const { buildPagination, buildSorting } = require('../utils/queryBuilder');
const ApiError = require('../utils/ApiError');

const create = catchAsync(async (req, res) => {
  const data = await importHistoryService.create(req.body);
  formatSuccess(res, data, 'ImportHistory created successfully', 201);
});

const findAll = catchAsync(async (req, res) => {
  const pagination = buildPagination(req.query);
  const orderBy = buildSorting(req.query);
  const where = {}; // Add specific search/filters here later
  
  const result = await importHistoryService.findAll({ ...pagination, orderBy, where });
  formatSuccess(res, result.data, 'ImportHistorys retrieved successfully', 200, {
    total: result.total,
    page: pagination.page,
    limit: pagination.limit
  });
});

const findById = catchAsync(async (req, res) => {
  const data = await importHistoryService.findById(req.params.id);
  if (!data) throw new ApiError(404, 'ImportHistory not found');
  formatSuccess(res, data, 'ImportHistory retrieved successfully');
});

const update = catchAsync(async (req, res) => {
  const data = await importHistoryService.update(req.params.id, req.body);
  formatSuccess(res, data, 'ImportHistory updated successfully');
});

const deleteRecord = catchAsync(async (req, res) => {
  await importHistoryService.delete(req.params.id);
  formatSuccess(res, null, 'ImportHistory deleted successfully', 204);
});

module.exports = {
  create,
  findAll,
  findById,
  update,
  delete: deleteRecord
};
