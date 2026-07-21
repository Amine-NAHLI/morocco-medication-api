const reimbursementService = require('../services/reimbursement.service');
const catchAsync = require('../utils/catchAsync');
const { formatSuccess } = require('../utils/responseFormatter');
const { buildPagination, buildSorting } = require('../utils/queryBuilder');
const ApiError = require('../utils/ApiError');

const create = catchAsync(async (req, res) => {
  const data = await reimbursementService.create(req.body);
  formatSuccess(res, data, 'Reimbursement created successfully', 201);
});

const findAll = catchAsync(async (req, res) => {
  const pagination = buildPagination(req.query);
  const orderBy = buildSorting(req.query);
  const where = {}; // Add specific search/filters here later
  
  const result = await reimbursementService.findAll({ ...pagination, orderBy, where });
  formatSuccess(res, result.data, 'Reimbursements retrieved successfully', 200, {
    total: result.total,
    page: pagination.page,
    limit: pagination.limit
  });
});

const findById = catchAsync(async (req, res) => {
  const data = await reimbursementService.findById(req.params.id);
  if (!data) throw new ApiError(404, 'Reimbursement not found');
  formatSuccess(res, data, 'Reimbursement retrieved successfully');
});

const update = catchAsync(async (req, res) => {
  const data = await reimbursementService.update(req.params.id, req.body);
  formatSuccess(res, data, 'Reimbursement updated successfully');
});

const deleteRecord = catchAsync(async (req, res) => {
  await reimbursementService.delete(req.params.id);
  formatSuccess(res, null, 'Reimbursement deleted successfully', 204);
});

module.exports = {
  create,
  findAll,
  findById,
  update,
  delete: deleteRecord
};
