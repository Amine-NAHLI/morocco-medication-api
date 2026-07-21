const BaseConnector = require('./base.connector');
const prisma = require('../../config/prisma');

class CnssOfficialConnector extends BaseConnector {
  constructor() {
    super('CNSS', 'Caisse Nationale de Sécurité Sociale');
  }

  async getSourceStatus() {
    return {
      status: 'SOURCE_NOT_AUTOMATABLE',
      reason: 'CNSS public pages for medication reimbursements do not provide structured data. Automating extraction is unreliable and violates best practices as there is no official open API or stable dataset format.'
    };
  }

  async syncDatabase() {
    const status = await this.getSourceStatus();
    
    const source = await prisma.source.upsert({
      where: { code: this.sourceCode },
      update: { name: this.sourceName },
      create: { code: this.sourceCode, name: this.sourceName }
    });

    const syncJob = await prisma.syncJob.create({
      data: {
        sourceId: source.id,
        status: status.status,
        errorDetails: status.reason,
        completedAt: new Date()
      }
    });

    return {
      success: false,
      status: status.status,
      message: status.reason,
      syncJobId: syncJob.id
    };
  }
}

module.exports = new CnssOfficialConnector();
