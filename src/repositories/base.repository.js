class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  async create(data) {
    return this.model.create({ data });
  }

  async findById(id, include = {}) {
    return this.model.findUnique({
      where: { id: parseInt(id, 10) },
      include: Object.keys(include).length ? include : undefined,
    });
  }

  async findAll({ skip, take, orderBy, where, include }) {
    const [data, total] = await Promise.all([
      this.model.findMany({
        skip,
        take,
        orderBy,
        where,
        include: include && Object.keys(include).length ? include : undefined,
      }),
      this.model.count({ where })
    ]);
    return { data, total };
  }

  async update(id, data) {
    return this.model.update({
      where: { id: parseInt(id, 10) },
      data,
    });
  }

  async delete(id) {
    return this.model.delete({
      where: { id: parseInt(id, 10) },
    });
  }
}

module.exports = BaseRepository;
