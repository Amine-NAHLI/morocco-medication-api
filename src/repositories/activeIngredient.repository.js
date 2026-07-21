const BaseRepository = require('./base.repository');
const prisma = require('../config/prisma');

class ActiveIngredientRepository extends BaseRepository {
  constructor() {
    super(prisma.activeIngredient);
  }
}
module.exports = new ActiveIngredientRepository();
