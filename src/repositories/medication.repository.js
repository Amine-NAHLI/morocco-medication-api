const BaseRepository = require('./base.repository');
const prisma = require('../config/prisma');

class MedicationRepository extends BaseRepository {
  constructor() {
    super(prisma.medication);
  }

  async findDetailedById(id) {
    return prisma.medication.findUnique({ where: { id: Number(id) }, include: this.detailsInclude() });
  }

  detailsInclude() {
    return {
      manufacturer: true,
      category: true,
      source: true,
      ingredients: { include: { activeIngredient: true } },
      prices: { orderBy: { effectiveDate: 'desc' } },
      reimbursements: { include: { organization: true, regime: true, document: true } },
    };
  }

  async findDetailed(params) {
    const { skip, take, orderBy, where } = params;
    const [data, total] = await Promise.all([
      prisma.medication.findMany({ skip, take, orderBy, where, include: this.detailsInclude() }),
      prisma.medication.count({ where }),
    ]);
    return { data, total };
  }
}
module.exports = new MedicationRepository();
