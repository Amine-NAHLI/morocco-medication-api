const BaseRepository = require('./base.repository');
const prisma = require('../config/prisma');

class ManufacturerRepository extends BaseRepository {
  constructor() {
    super(prisma.manufacturer);
  }
}
module.exports = new ManufacturerRepository();
