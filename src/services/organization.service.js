const organizationRepository = require('../repositories/organization.repository');

class OrganizationService {
  async create(data) {
    return organizationRepository.create(data);
  }

  async findAll(params) {
    return organizationRepository.findAll(params);
  }

  async findById(id) {
    return organizationRepository.findById(id);
  }

  async update(id, data) {
    return organizationRepository.update(id, data);
  }

  async delete(id) {
    return organizationRepository.delete(id);
  }
}
module.exports = new OrganizationService();
