const manufacturerRepository = require('../repositories/manufacturer.repository');

class ManufacturerService {
  async create(data) {
    return manufacturerRepository.create(data);
  }

  async findAll(params) {
    return manufacturerRepository.findAll(params);
  }

  async findById(id) {
    return manufacturerRepository.findById(id);
  }

  async update(id, data) {
    return manufacturerRepository.update(id, data);
  }

  async delete(id) {
    return manufacturerRepository.delete(id);
  }
}
module.exports = new ManufacturerService();
