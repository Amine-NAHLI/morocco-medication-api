const medicationService = require('../services/medication.service');
const catchAsync = require('../utils/catchAsync');
const { formatSuccess } = require('../utils/responseFormatter');
const { buildPagination, buildSorting } = require('../utils/queryBuilder');
const ApiError = require('../utils/ApiError');

const create = catchAsync(async (req, res) => {
  const data = await medicationService.create(req.body);
  formatSuccess(res, data, 'Medication created successfully', 201);
});

const findAll = catchAsync(async (req, res) => {
  const pagination = buildPagination(req.query);
  const orderBy = buildSorting(req.query);
  const where = {}; // Add specific search/filters here later
  
  const result = await medicationService.findAll({ ...pagination, orderBy, where });
  formatSuccess(res, result.data, 'Medications retrieved successfully', 200, {
    total: result.total,
    page: pagination.page,
    limit: pagination.limit
  });
});

const findById = catchAsync(async (req, res) => {
  const data = await medicationService.findById(req.params.id);
  if (!data) throw new ApiError(404, 'Medication not found');
  formatSuccess(res, data, 'Medication retrieved successfully');
});

const update = catchAsync(async (req, res) => {
  const data = await medicationService.update(req.params.id, req.body);
  formatSuccess(res, data, 'Medication updated successfully');
});

const deleteRecord = catchAsync(async (req, res) => {
  await medicationService.delete(req.params.id);
  formatSuccess(res, null, 'Medication deleted successfully', 204);
});

module.exports = {
  create,
  findAll,
  findById,
  update,
  delete: deleteRecord
};
