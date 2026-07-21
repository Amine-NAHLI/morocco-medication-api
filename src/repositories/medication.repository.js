const BaseRepository = require('./base.repository');
const prisma = require('../config/prisma');

class MedicationRepository extends BaseRepository {
  constructor() {
    super(prisma.medication);
  }
}
module.exports = new MedicationRepository();
