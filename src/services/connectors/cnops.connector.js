const BaseConnector = require('./base.connector');
const prisma = require('../../config/prisma');
const logger = require('../../utils/logger');
const xlsx = require('xlsx');
const crypto = require('crypto');
const https = require('https');
const dns = require('dns');
const { URL } = require('url');
const ipaddr = require('ipaddr.js');

class CnopsOpenDataConnector extends BaseConnector {
  constructor() {
    super('CNOPS', 'Caisse Nationale des Organismes de Prévoyance Sociale');
    this.packageUrl = 'https://data.gov.ma/data/api/3/action/package_show?id=referentiel-des-medicaments';
    this.ALLOWED_HOSTNAMES = ['data.gov.ma', 'www.data.gov.ma'];
    this.MAX_REDIRECTS = 5;
    this.MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
  }

  async isUrlSafe(urlString) {
    try {
      const parsedUrl = new URL(urlString);
      
      // Enforce HTTPS
      if (parsedUrl.protocol !== 'https:') {
        return { safe: false, reason: 'Only HTTPS is allowed' };
      }

      // Explicit Hostname Allowlist
      if (!this.ALLOWED_HOSTNAMES.includes(parsedUrl.hostname)) {
        return { safe: false, reason: `Hostname ${parsedUrl.hostname} is not allowed` };
      }

      // Resolve DNS
      const addresses = await dns.promises.lookup(parsedUrl.hostname, { all: true });
      if (!addresses || addresses.length === 0) {
        return { safe: false, reason: 'Could not resolve DNS' };
      }

      for (const record of addresses) {
        try {
          const addr = ipaddr.parse(record.address);
          const range = addr.range();

          // Reject unsafe ranges
          const unsafeRanges = ['loopback', 'private', 'linkLocal', 'multicast', 'unspecified'];
          if (unsafeRanges.includes(range)) {
            return { safe: false, reason: `Resolved IP ${record.address} is in unsafe range: ${range}` };
          }
          
          // Additional IPv4-mapped IPv6 check
          if (addr.kind() === 'ipv6' && addr.isIPv4MappedAddress()) {
            const ipv4 = addr.toIPv4Address();
            const ipv4Range = ipv4.range();
            if (unsafeRanges.includes(ipv4Range)) {
              return { safe: false, reason: `Resolved mapped IP ${ipv4.toString()} is in unsafe range: ${ipv4Range}` };
            }
          }
        } catch (ipErr) {
          return { safe: false, reason: `Invalid IP format resolved: ${record.address}` };
        }
      }

      return { safe: true, url: parsedUrl };
    } catch (e) {
      return { safe: false, reason: `Invalid URL: ${e.message}` };
    }
  }

  async discoverResources() {
    try {
      // Validate initial packageUrl
      const urlCheck = await this.isUrlSafe(this.packageUrl);
      if (!urlCheck.safe) {
        throw new Error(`Unsafe package URL: ${urlCheck.reason}`);
      }

      const response = await fetch(this.packageUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      
      let resources = data.result.resources.filter(r => r.format.toLowerCase() === 'xlsx');
      if (resources.length === 0) throw new Error('No XLSX resource found');

      // Sort by last_modified descending to get the newest
      resources.sort((a, b) => {
        const dateA = new Date(a.last_modified || a.created || 0);
        const dateB = new Date(b.last_modified || b.created || 0);
        return dateB - dateA;
      });

      const newest = resources[0];
      return {
        url: newest.url,
        lastModified: newest.last_modified || newest.created,
        name: newest.name,
        hash: newest.hash || ''
      };
    } catch (error) {
      logger.error(`CNOPS discovery failed: ${error.message}`);
      throw error;
    }
  }

  downloadResourceBuffer(urlString, redirectCount = 0) {
    return new Promise(async (resolve, reject) => {
      if (redirectCount > this.MAX_REDIRECTS) {
        return reject(new Error('Too many redirects'));
      }

      const urlCheck = await this.isUrlSafe(urlString);
      if (!urlCheck.safe) {
        return reject(new Error(`Unsafe URL encountered during download: ${urlCheck.reason}`));
      }

      const options = {
        timeout: 10000 // 10 seconds connection timeout
      };

      const req = https.get(urlCheck.url, options, (res) => {
        // Handle redirects
        if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
          const nextUrl = res.headers.location;
          if (!nextUrl) return reject(new Error('Redirected without location header'));
          
          // resolve relative redirects if any
          const absoluteNextUrl = new URL(nextUrl, urlString).toString();
          return resolve(this.downloadResourceBuffer(absoluteNextUrl, redirectCount + 1));
        }

        if (res.statusCode !== 200) {
          return reject(new Error(`Download failed with status ${res.statusCode}`));
        }

        // Validate content-type (basic check, allow typical xlsx or generic octet-stream from CKAN)
        const cType = (res.headers['content-type'] || '').toLowerCase();
        if (!cType.includes('spreadsheet') && !cType.includes('xlsx') && !cType.includes('octet-stream')) {
           return reject(new Error(`Unexpected Content-Type: ${cType}`));
        }

        const chunks = [];
        let totalLength = 0;

        res.setTimeout(30000, () => {
          req.destroy();
          reject(new Error('Response timeout'));
        });

        res.on('data', chunk => {
          totalLength += chunk.length;
          if (totalLength > this.MAX_FILE_SIZE) {
            req.destroy();
            reject(new Error(`File exceeds maximum allowed size of ${this.MAX_FILE_SIZE} bytes`));
          }
          chunks.push(chunk);
        });

        res.on('end', () => resolve(Buffer.concat(chunks)));
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Connection timeout'));
      });
    });
  }

  async parseResource(buffer) {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    return xlsx.utils.sheet_to_json(sheet, { raw: false, defval: null });
  }

  async syncDatabase() {
    let syncJob = null;
    try {
      let source = await prisma.source.findUnique({ where: { code: this.sourceCode } });
      if (!source) {
        source = await prisma.source.create({
          data: { code: this.sourceCode, name: this.sourceName }
        });
      }

      syncJob = await prisma.syncJob.create({
        data: { sourceId: source.id, status: 'PENDING' }
      });

      const resMeta = await this.discoverResources();
      
      const buffer = await this.downloadResourceBuffer(resMeta.url);
      const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

      // Check if unchanged
      const lastResource = await prisma.sourceResource.findFirst({
        where: { sourceId: source.id },
        orderBy: { createdAt: 'desc' }
      });

      if (lastResource && lastResource.fileHash === fileHash) {
        await prisma.syncJob.update({
          where: { id: syncJob.id },
          data: { status: 'SOURCE_CHANGED_NO_UPDATE', completedAt: new Date() }
        });
        return { success: true, message: 'Source has not changed. Skipping sync.' };
      }

      // Record new resource
      const resourceRecord = await prisma.sourceResource.create({
        data: {
          name: resMeta.name,
          url: resMeta.url,
          fileHash,
          publishedAt: resMeta.lastModified ? new Date(resMeta.lastModified) : null,
          sourceId: source.id
        }
      });

      await prisma.syncJob.update({
        where: { id: syncJob.id },
        data: { resourceId: resourceRecord.id }
      });

      const rawRows = await this.parseResource(buffer);
      
      let created = 0, updated = 0, errorsCount = 0;

      for (let i = 0; i < rawRows.length; i++) {
        const row = rawRows[i];
        
        // Normalize CNOPS format
        const code = row['Code'] || row['Code Medicament'] || row['code'] || null;
        const name = row['Nom'] || row['Nom Commercial'] || row['Nom_Commercial'] || row['name'] || 'Inconnu';
        const isGeneric = row['Type']?.toString().toLowerCase().includes('générique') || false;
        
        if (!code) {
          errorsCount++;
          continue;
        }

        try {
          await prisma.$transaction(async (tx) => {
            const existingMed = await tx.medication.findUnique({ where: { code: code.toString() } });
            
            const med = await tx.medication.upsert({
              where: { code: code.toString() },
              update: {
                name: name.toString(),
                isGeneric,
                sourceId: source.id
              },
              create: {
                code: code.toString(),
                name: name.toString(),
                isGeneric,
                sourceId: source.id
              }
            });

            if (existingMed) updated++;
            else created++;

            const ppv = parseFloat(row['PPV'] || row['Prix Public'] || 0);
            const phg = parseFloat(row['PHG'] || row['Prix Hôpital'] || 0);

            // Fetch the last price
            const lastPrice = await tx.medicationPrice.findFirst({
              where: { medicationId: med.id },
              orderBy: { effectiveDate: 'desc' }
            });

            const hasChanged = !lastPrice || 
                               (ppv > 0 && lastPrice.publicPrice !== ppv) || 
                               (phg > 0 && lastPrice.hospitalPrice !== phg);

            if (hasChanged && (ppv > 0 || phg > 0)) {
              await tx.medicationPrice.create({
                data: {
                  medicationId: med.id,
                  publicPrice: ppv > 0 ? ppv : null,
                  hospitalPrice: phg > 0 ? phg : null,
                  effectiveDate: new Date()
                }
              });
            }
          });
        } catch (dbError) {
          logger.error(`Error saving CNOPS row ${i}: ${dbError.message}`);
          errorsCount++;
        }
      }

      const finalStatus = errorsCount === 0 ? 'SYNC_SUCCESS' : (created + updated > 0 ? 'SYNC_PARTIAL' : 'SYNC_FAILED');

      await prisma.syncJob.update({
        where: { id: syncJob.id },
        data: {
          status: finalStatus,
          recordsRead: rawRows.length,
          recordsCreated: created,
          recordsUpdated: updated,
          errorsCount,
          completedAt: new Date()
        }
      });

      return {
        success: true,
        status: finalStatus,
        summary: { read: rawRows.length, created, updated, errors: errorsCount }
      };

    } catch (error) {
      if (syncJob) {
        await prisma.syncJob.update({
          where: { id: syncJob.id },
          data: { status: 'SYNC_FAILED', errorDetails: error.message, completedAt: new Date() }
        });
      }
      return { success: false, status: 'SYNC_FAILED', message: error.message };
    }
  }
}

module.exports = new CnopsOpenDataConnector();
