const reimbursementRepository = require('../repositories/reimbursement.repository');

class ReimbursementService {
  async create(data) {
    return reimbursementRepository.create(data);
  }

  async findAll(params) {
    return reimbursementRepository.findAll(params);
  }

  async findById(id) {
    return reimbursementRepository.findById(id);
  }

  async update(id, data) {
    return reimbursementRepository.update(id, data);
  }

  async delete(id) {
    return reimbursementRepository.delete(id);
  }
}
module.exports = new ReimbursementService();
