const BaseRepository = require('./base.repository');
const prisma = require('../config/prisma');

class OrganizationRepository extends BaseRepository {
  constructor() {
    super(prisma.organization);
  }
}
module.exports = new OrganizationRepository();
