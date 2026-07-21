const BaseRepository = require('./base.repository');
const prisma = require('../config/prisma');

class ImportHistoryRepository extends BaseRepository {
  constructor() {
    super(prisma.syncJob, ['status']);
  }
}
module.exports = new ImportHistoryRepository();
