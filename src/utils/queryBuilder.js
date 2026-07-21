/**
 * Builds Prisma query objects from Express req.query
 */
const MAX_LIMIT = 100;
const buildPagination = (query) => {
  const page = Number.parseInt(query.page, 10);
  const limit = Number.parseInt(query.limit, 10);
  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, MAX_LIMIT) : 10;
  const skip = (safePage - 1) * safeLimit;
  return { skip, take: safeLimit, page: safePage, limit: safeLimit };
};

const buildSorting = (query, allowedFields = ['id', 'name', 'code', 'createdAt', 'updatedAt'], defaultSort = { createdAt: 'desc' }) => {
  if (!query.sortBy) return defaultSort;
  if (!allowedFields.includes(query.sortBy)) return defaultSort;
  const order = query.order && query.order.toLowerCase() === 'asc' ? 'asc' : 'desc';
  return { [query.sortBy]: order };
};

module.exports = {
  buildPagination,
  buildSorting,
  MAX_LIMIT,
};
