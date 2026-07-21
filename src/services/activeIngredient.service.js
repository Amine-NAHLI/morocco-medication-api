const activeIngredientRepository = require('../repositories/activeIngredient.repository');

class ActiveIngredientService {
  async create(data) {
    return activeIngredientRepository.create(data);
  }

  async findAll(params) {
    return activeIngredientRepository.findAll(params);
  }

  async findById(id) {
    return activeIngredientRepository.findById(id);
  }

  async update(id, data) {
    return activeIngredientRepository.update(id, data);
  }

  async delete(id) {
    return activeIngredientRepository.delete(id);
  }
}
module.exports = new ActiveIngredientService();
