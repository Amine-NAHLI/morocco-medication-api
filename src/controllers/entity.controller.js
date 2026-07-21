const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const { formatSuccess } = require('../utils/responseFormatter');
const { buildPagination, buildSorting } = require('../utils/queryBuilder');
const prisma = require('../config/prisma');

const createEntityController = ({ model, label, fields, searchable = ['name'], includes = {}, sortable = ['name', 'createdAt', 'updatedAt'], archive = false }) => {
  const client = prisma[model];
  const body = (input) => Object.fromEntries(Object.entries(input).filter(([key]) => fields.includes(key)));
  const list = catchAsync(async (req, res) => {
    const pagination = buildPagination(req.query);
    const search = req.query.search?.trim();
    const where = search && searchable.length ? { OR: searchable.map((field) => ({ [field]: { contains: search, mode: 'insensitive' } })) } : {};
    const [data, total] = await Promise.all([client.findMany({ ...pagination, where, orderBy: buildSorting(req.query, sortable), include: Object.keys(includes).length ? includes : undefined }), client.count({ where })]);
    formatSuccess(res, data, `${label} retrieved successfully`, 200, { total, page: pagination.page, limit: pagination.limit });
  });
  const detail = catchAsync(async (req, res) => {
    const data = await client.findUnique({ where: { id: Number(req.params.id) }, include: Object.keys(includes).length ? includes : undefined });
    if (!data) throw new ApiError(404, `${label} not found`);
    formatSuccess(res, data, `${label} retrieved successfully`);
  });
  const create = catchAsync(async (req, res) => formatSuccess(res, await client.create({ data: body(req.body) }), `${label} created successfully`, 201));
  const update = catchAsync(async (req, res) => formatSuccess(res, await client.update({ where: { id: Number(req.params.id) }, data: body(req.body) }), `${label} updated successfully`));
  const remove = catchAsync(async (req, res) => {
    const data = archive ? await client.update({ where: { id: Number(req.params.id) }, data: { status: 'ARCHIVED' } }) : await client.delete({ where: { id: Number(req.params.id) } });
    formatSuccess(res, data, `${label} deleted successfully`, 204);
  });
  return { list, detail, create, update, remove };
};
module.exports = createEntityController;
