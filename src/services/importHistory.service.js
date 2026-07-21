const importHistoryRepository = require('../repositories/importHistory.repository');

class ImportHistoryService {
  async create(data) {
    return importHistoryRepository.create(data);
  }

  async findAll(params) {
    return importHistoryRepository.findAll(params);
  }

  async findById(id) {
    return importHistoryRepository.findById(id);
  }

  async update(id, data) {
    return importHistoryRepository.update(id, data);
  }

  async delete(id) {
    return importHistoryRepository.delete(id);
  }
}
module.exports = new ImportHistoryService();
