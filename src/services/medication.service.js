const medicationRepository = require('../repositories/medication.repository');

class MedicationService {
  async create(data) {
    return medicationRepository.create(data);
  }

  async findAll(params) {
    return medicationRepository.findAll(params);
  }

  async findById(id) {
    return medicationRepository.findById(id);
  }

  async update(id, data) {
    return medicationRepository.update(id, data);
  }

  async delete(id) {
    return medicationRepository.delete(id);
  }
}
module.exports = new MedicationService();
