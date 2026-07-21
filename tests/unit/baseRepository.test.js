const BaseRepository = require('../../src/repositories/base.repository');

describe('BaseRepository', () => {
  let repo;
  let mockModel;

  beforeEach(() => {
    mockModel = {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    repo = new BaseRepository(mockModel);
  });

  it('should create a record', async () => {
    mockModel.create.mockResolvedValue({ id: 1, name: 'Test' });
    const result = await repo.create({ name: 'Test' });
    expect(result).toEqual({ id: 1, name: 'Test' });
    expect(mockModel.create).toHaveBeenCalledWith({ data: { name: 'Test' } });
  });

  it('should find a record by ID', async () => {
    mockModel.findUnique.mockResolvedValue({ id: 1 });
    const result = await repo.findById(1);
    expect(result).toEqual({ id: 1 });
    expect(mockModel.findUnique).toHaveBeenCalledWith({ where: { id: 1 }, include: undefined });
  });

  it('should find a record by ID with include', async () => {
    mockModel.findUnique.mockResolvedValue({ id: 1, manufacturer: {} });
    const result = await repo.findById(1, { manufacturer: true });
    expect(mockModel.findUnique).toHaveBeenCalledWith({ where: { id: 1 }, include: { manufacturer: true } });
  });

  it('should findAll with pagination', async () => {
    mockModel.findMany.mockResolvedValue([{ id: 1 }]);
    mockModel.count.mockResolvedValue(1);
    const result = await repo.findAll({ skip: 0, take: 10, orderBy: { id: 'desc' }, where: {} });
    expect(result).toEqual({ data: [{ id: 1 }], total: 1 });
  });

  it('should findAll with include', async () => {
    mockModel.findMany.mockResolvedValue([{ id: 1 }]);
    mockModel.count.mockResolvedValue(1);
    const result = await repo.findAll({ skip: 0, take: 10, orderBy: {}, where: {}, include: { manufacturer: true } });
    expect(mockModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ include: { manufacturer: true } })
    );
  });

  it('should findAll without include when empty', async () => {
    mockModel.findMany.mockResolvedValue([]);
    mockModel.count.mockResolvedValue(0);
    const result = await repo.findAll({ skip: 0, take: 10, orderBy: {}, where: {}, include: {} });
    expect(mockModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ include: undefined })
    );
  });

  it('should update a record', async () => {
    mockModel.update.mockResolvedValue({ id: 1, name: 'Updated' });
    const result = await repo.update(1, { name: 'Updated' });
    expect(result).toEqual({ id: 1, name: 'Updated' });
  });

  it('should delete a record', async () => {
    mockModel.delete.mockResolvedValue({ id: 1 });
    const result = await repo.delete(1);
    expect(result).toEqual({ id: 1 });
  });
});
