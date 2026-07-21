const BaseConnector = require('./base.connector');
const prisma = require('../../config/prisma');

class AnamOfficialConnector extends BaseConnector {
  constructor() {
    super('ANAM', 'Agence Nationale de l\'Assurance Maladie');
  }

  async getSourceStatus() {
    return {
      status: 'SOURCE_NOT_AUTOMATABLE',
      reason: 'ANAM publishes the GMR (Guide des Médicaments Remboursables) as complex PDFs or via search forms that are not designed for automated extraction. Needs an official tabular dataset or API.'
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

module.exports = new AnamOfficialConnector();
