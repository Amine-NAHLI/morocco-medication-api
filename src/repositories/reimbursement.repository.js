const BaseRepository = require('./base.repository');
const prisma = require('../config/prisma');

class ReimbursementRepository extends BaseRepository {
  constructor() {
    super(prisma.reimbursement);
  }
}
module.exports = new ReimbursementRepository();
