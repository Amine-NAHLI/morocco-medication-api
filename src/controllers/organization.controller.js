const organizationService = require('../services/organization.service');
const catchAsync = require('../utils/catchAsync');
const { formatSuccess } = require('../utils/responseFormatter');
const { buildPagination, buildSorting } = require('../utils/queryBuilder');
const ApiError = require('../utils/ApiError');

const create = catchAsync(async (req, res) => {
  const data = await organizationService.create(req.body);
  formatSuccess(res, data, 'Organization created successfully', 201);
});

const findAll = catchAsync(async (req, res) => {
  const pagination = buildPagination(req.query);
  const orderBy = buildSorting(req.query);
  const where = {}; // Add specific search/filters here later
  
  const result = await organizationService.findAll({ ...pagination, orderBy, where });
  formatSuccess(res, result.data, 'Organizations retrieved successfully', 200, {
    total: result.total,
    page: pagination.page,
    limit: pagination.limit
  });
});

const findById = catchAsync(async (req, res) => {
  const data = await organizationService.findById(req.params.id);
  if (!data) throw new ApiError(404, 'Organization not found');
  formatSuccess(res, data, 'Organization retrieved successfully');
});

const update = catchAsync(async (req, res) => {
  const data = await organizationService.update(req.params.id, req.body);
  formatSuccess(res, data, 'Organization updated successfully');
});

const deleteRecord = catchAsync(async (req, res) => {
  await organizationService.delete(req.params.id);
  formatSuccess(res, null, 'Organization deleted successfully', 204);
});

module.exports = {
  create,
  findAll,
  findById,
  update,
  delete: deleteRecord
};
