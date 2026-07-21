const medicationRepository = require('../repositories/medication.repository');

class MedicationService {
  async create(data) {
    return medicationRepository.create(data);
  }

  async findAll(params) {
    return medicationRepository.findDetailed(params);
  }

  async findById(id) {
    return medicationRepository.findDetailedById(id);
  }

  async update(id, data) {
    return medicationRepository.update(id, data);
  }

  async delete(id) {
    return medicationRepository.delete(id);
  }
}
module.exports = new MedicationService();
