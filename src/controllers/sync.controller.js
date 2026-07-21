const cnopsConnector = require('../services/connectors/cnops.connector');
const cnssConnector = require('../services/connectors/cnss.connector');
const anamConnector = require('../services/connectors/anam.connector');
const prisma = require('../config/prisma');

class SyncController {
  async syncCnops(req, res) {
    const result = await cnopsConnector.syncDatabase();
    res.status(result.success ? 200 : 500).json({ status: 'success', data: result });
  }

  async syncCnss(req, res) {
    const result = await cnssConnector.syncDatabase();
    res.status(200).json({ status: 'success', data: result });
  }

  async syncAnam(req, res) {
    const result = await anamConnector.syncDatabase();
    res.status(200).json({ status: 'success', data: result });
  }

  async syncAll(req, res) {
    const cnops = await cnopsConnector.syncDatabase();
    const cnss = await cnssConnector.syncDatabase();
    const anam = await anamConnector.syncDatabase();
    res.status(200).json({
      status: 'success',
      data: { cnops, cnss, anam }
    });
  }

  async getStatus(req, res) {
    const sources = await prisma.source.findMany({
      include: {
        syncJobs: {
          orderBy: { startedAt: 'desc' },
          take: 1
        }
      }
    });
    res.status(200).json({ status: 'success', data: sources });
  }

  async getHistory(req, res) {
    const jobs = await prisma.syncJob.findMany({
      orderBy: { startedAt: 'desc' },
      include: { source: true, resource: true }
    });
    res.status(200).json({ status: 'success', data: jobs });
  }
}

module.exports = new SyncController();
