const categoryRepository = require('../repositories/category.repository');

class CategoryService {
  async create(data) {
    return categoryRepository.create(data);
  }

  async findAll(params) {
    return categoryRepository.findAll(params);
  }

  async findById(id) {
    return categoryRepository.findById(id);
  }

  async update(id, data) {
    return categoryRepository.update(id, data);
  }

  async delete(id) {
    return categoryRepository.delete(id);
  }
}
module.exports = new CategoryService();
