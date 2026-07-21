const BaseRepository = require('./base.repository');
const prisma = require('../config/prisma');

class MedicationIngredientRepository extends BaseRepository {
  constructor() {
    super(prisma.medicationIngredient);
  }
}
module.exports = new MedicationIngredientRepository();
