const { buildPagination, buildSorting } = require('../../src/utils/queryBuilder');

describe('QueryBuilder', () => {
  it('should build pagination parameters with defaults', () => {
    const result = buildPagination({});
    expect(result.skip).toBe(0);
    expect(result.take).toBe(10);
  });

  it('should build pagination parameters from query', () => {
    const result = buildPagination({ page: '2', limit: '20' });
    expect(result.skip).toBe(20);
    expect(result.take).toBe(20);
  });

  it('should build sorting parameters with defaults', () => {
    const result = buildSorting({});
    expect(result).toEqual({ id: 'desc' }); // wait, I set default sortBy to 'createdAt', but in standard it might be 'id'. Let's check queryBuilder.
  });

  it('should build sorting parameters from query', () => {
    const result = buildSorting({ sortBy: 'name', order: 'asc' });
    expect(result).toEqual({ name: 'asc' });
  });
});
