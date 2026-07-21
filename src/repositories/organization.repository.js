const BaseRepository = require('./base.repository');
const prisma = require('../config/prisma');

class OrganizationRepository extends BaseRepository {
  constructor() {
    super(prisma.managingOrganization);
  }
}
module.exports = new OrganizationRepository();
