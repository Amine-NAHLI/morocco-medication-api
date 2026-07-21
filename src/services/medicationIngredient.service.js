const medicationIngredientRepository = require('../repositories/medicationIngredient.repository');

class MedicationIngredientService {
  async create(data) {
    return medicationIngredientRepository.create(data);
  }

  async findAll(params) {
    return medicationIngredientRepository.findAll(params);
  }

  async findById(id) {
    return medicationIngredientRepository.findById(id);
  }

  async update(id, data) {
    return medicationIngredientRepository.update(id, data);
  }

  async delete(id) {
    return medicationIngredientRepository.delete(id);
  }
}
module.exports = new MedicationIngredientService();
