const BaseRepository = require('./base.repository');
const prisma = require('../config/prisma');

class CategoryRepository extends BaseRepository {
  constructor() {
    super(prisma.category);
  }
}
module.exports = new CategoryRepository();
