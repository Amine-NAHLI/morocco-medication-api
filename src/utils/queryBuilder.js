/**
 * Builds Prisma query objects from Express req.query
 */
const buildPagination = (query) => {
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 10;
  const skip = (page - 1) * limit;
  return { skip, take: limit, page, limit };
};

const buildSorting = (query, defaultSort = { createdAt: 'desc' }) => {
  if (!query.sortBy) return defaultSort;
  const order = query.order && query.order.toLowerCase() === 'asc' ? 'asc' : 'desc';
  return { [query.sortBy]: order };
};

module.exports = {
  buildPagination,
  buildSorting,
};
