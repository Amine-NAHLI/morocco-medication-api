const BaseConnector = require('./base.connector');
const prisma = require('../../config/prisma');
const logger = require('../../utils/logger');
const xlsx = require('xlsx');
const crypto = require('crypto');
const https = require('https');
const dns = require('dns');
const { URL } = require('url');
const ipaddr = require('ipaddr.js');

const normalizeColumnName = (value) => String(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-zA-Z0-9]/g, '')
  .toUpperCase();

const getColumnValue = (row, aliases) => {
  const normalizedAliases = new Set(aliases.map(normalizeColumnName));
  const entry = Object.entries(row).find(([key]) => normalizedAliases.has(normalizeColumnName(key)));
  return entry ? entry[1] : null;
};

const normalizeText = (value) => {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized || null;
};

const parseCnopsPrice = (value) => {
  if (value === null || value === undefined) return null;

  let normalized = String(value).trim().replace(/\s+/g, '');
  if (!normalized || normalized === '-') return null;
  normalized = normalized.replace(/[^0-9,.-]/g, '');

  const lastComma = normalized.lastIndexOf(',');
  const lastDot = normalized.lastIndexOf('.');
  if (lastComma !== -1 && lastDot !== -1) {
    normalized = lastDot > lastComma
      ? normalized.replace(/,/g, '')
      : normalized.replace(/\./g, '').replace(',', '.');
  } else if (lastComma !== -1) {
    normalized = normalized.replace(',', '.');
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const parseCnopsReimbursementRate = (value) => {
  const normalizedValue = normalizeText(value);
  if (!normalizedValue || normalizedValue === '-') return null;

  const normalized = normalizedValue
    .replace(/\s+/g, '')
    .replace(/%/g, '')
    .replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

const isGenericMedication = (value) => {
  if (value === null || value === undefined) return false;
  const normalized = String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
  return normalized === 'G' || normalized.includes('GENERIQUE') || normalized.includes('GENERIC');
};

class CnopsOpenDataConnector extends BaseConnector {
  constructor() {
    super('CNOPS', 'Caisse Nationale des Organismes de Prévoyance Sociale');
    this.packageUrl = 'https://data.gov.ma/data/api/3/action/package_show?id=referentiel-des-medicaments';
    this.ALLOWED_HOSTNAMES = ['data.gov.ma', 'www.data.gov.ma'];
    this.MAX_REDIRECTS = 5;
    this.MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
    this.NORMALIZATION_VERSION = 2;
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
    if (this.syncInProgress) return { success: false, status: 'SYNC_ALREADY_RUNNING', message: 'CNOPS synchronization is already running' };
    this.syncInProgress = true;
    let syncJob = null;
    try {
      let source = await prisma.source.findUnique({ where: { code: this.sourceCode } });
      if (!source) {
        source = await prisma.source.create({
          data: { code: this.sourceCode, name: this.sourceName }
        });
      }

      const cnopsOrganization = await prisma.managingOrganization.upsert({
        where: { code: this.sourceCode },
        update: {},
        create: { code: this.sourceCode, name: this.sourceName },
      });

      // A job without completedAt is resumable. Its checkpoint is advanced in the
      // same transaction as each imported row, so it is always contiguous.
      syncJob = await prisma.syncJob.findFirst({
        where: {
          sourceId: source.id,
          completedAt: null,
          status: { in: ['PENDING', 'SYNC_IN_PROGRESS', 'SYNC_PARTIAL', 'SYNC_FAILED'] }
        },
        orderBy: { startedAt: 'desc' }
      });

      if (!syncJob) {
        syncJob = await prisma.syncJob.create({
          data: { sourceId: source.id, status: 'PENDING' }
        });
      }

      const resMeta = await this.discoverResources();
      
      const buffer = await this.downloadResourceBuffer(resMeta.url);
      const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

      // Only a fully successful import may suppress a later retry of the same file.
      const lastSuccessfulResource = await prisma.sourceResource.findFirst({
        where: {
          sourceId: source.id,
          syncJobs: { some: { status: 'SYNC_SUCCESS' } }
        },
        orderBy: { createdAt: 'desc' }
      });

      if (
        lastSuccessfulResource
        && lastSuccessfulResource.fileHash === fileHash
        && lastSuccessfulResource.normalizationVersion >= this.NORMALIZATION_VERSION
      ) {
        await prisma.syncJob.update({
          where: { id: syncJob.id },
          data: { status: 'SOURCE_CHANGED_NO_UPDATE', completedAt: new Date() }
        });
        return { success: true, message: 'Source has not changed. Skipping sync.' };
      }

      const rawRows = await this.parseResource(buffer);
      
      // A changed row count is the one source change detectable without storing a
      // pre-success resource hash. Do not apply an old offset to that file.
      if (syncJob.recordsRead > 0 && syncJob.recordsRead !== rawRows.length) {
        await prisma.syncJob.update({
          where: { id: syncJob.id },
          data: {
            status: 'SOURCE_CHANGED',
            errorDetails: `Cannot resume: source row count changed from ${syncJob.recordsRead} to ${rawRows.length}`
          }
        });
        syncJob = await prisma.syncJob.create({
          data: { sourceId: source.id, status: 'PENDING' }
        });
      }

      const resumeFrom = Math.min(
        Math.max(0, Number(syncJob.recordsProcessed) || 0),
        rawRows.length
      );
      let created = Number(syncJob.recordsCreated) || 0;
      let updated = Number(syncJob.recordsUpdated) || 0;
      let errorsCount = 0;

      await prisma.syncJob.update({
        where: { id: syncJob.id },
        data: {
          status: 'SYNC_IN_PROGRESS',
          recordsRead: rawRows.length,
          recordsProcessed: resumeFrom,
          errorsCount: 0,
          errorDetails: null
        }
      });

      for (let i = resumeFrom; i < rawRows.length; i++) {
        const row = rawRows[i];
        
        // Keep aliases used by older CNOPS exports for backward compatibility.
        const code = normalizeText(getColumnValue(row, ['CODE', 'Code', 'Code Medicament', 'code']));
        const name = normalizeText(getColumnValue(row, ['NOM', 'Nom', 'Nom Commercial', 'Nom_Commercial', 'name'])) || 'Inconnu';
        const form = normalizeText(getColumnValue(row, ['FORME', 'Forme', 'Form', 'Forme Pharmaceutique']));
        const presentation = normalizeText(getColumnValue(row, ['PRESENTATION', 'Présentation', 'Presentation']));
        const dosage = normalizeText(getColumnValue(row, ['DOSAGE1', 'DOSAGE', 'Dosage', 'Dose']));
        const dosageUnit = normalizeText(getColumnValue(row, ['UNITE_DOSAGE1', 'UNITE_DOSAGE', 'Unite Dosage', 'Unité Dosage', 'Dosage Unit']));
        const activeIngredientName = normalizeText(getColumnValue(row, ['DCI1', 'DCI', 'Dénomination Commune Internationale', 'Denomination Commune Internationale', 'Active Ingredient', 'Substance Active']));
        const isGeneric = isGenericMedication(getColumnValue(row, ['PRINCEPS_GENERIQUE', 'Princeps Generique', 'Type']));
        const ppv = parseCnopsPrice(getColumnValue(row, ['PPV', 'Prix Public']));
        const phg = parseCnopsPrice(getColumnValue(row, ['PH', 'PHG', 'Prix Hôpital', 'Prix Hopital']));
        const referencePrice = parseCnopsPrice(getColumnValue(row, ['PRIX_BR', 'PRIX BR', 'Prix BR', 'Prix Reference', 'Prix Référence']));
        const reimbursementRate = parseCnopsReimbursementRate(getColumnValue(row, ['TAUX_REMBOURSEMENT', 'TAUX REMBOURSEMENT', 'Taux Remboursement', 'Taux', 'Rate']));
        
        if (!code) {
          errorsCount++;
          const finalStatus = created + updated > 0 ? 'SYNC_PARTIAL' : 'SYNC_FAILED';
          await prisma.syncJob.update({
            where: { id: syncJob.id },
            data: {
              status: finalStatus,
              recordsRead: rawRows.length,
              recordsProcessed: i,
              recordsCreated: created,
              recordsUpdated: updated,
              errorsCount,
              errorDetails: `CNOPS row ${i + 1} has no medication code`
            }
          });
          return {
            success: true,
            status: finalStatus,
            summary: { read: rawRows.length, created, updated, errors: errorsCount }
          };
        }

        try {
          const wasUpdated = await prisma.$transaction(async (tx) => {
            const existingMed = await tx.medication.findUnique({ where: { code: code.toString() } });
            const medicationData = {
              name: name.toString(),
              isGeneric,
              sourceId: source.id,
              ...(form ? { form } : {}),
              ...(presentation ? { presentation } : {}),
              ...(dosageUnit ? { dosageUnit } : {}),
            };
            
            const med = await tx.medication.upsert({
              where: { code: code.toString() },
              update: medicationData,
              create: {
                code: code.toString(),
                ...medicationData,
              }
            });

            // Fetch the last price
            const lastPrice = await tx.medicationPrice.findFirst({
              where: { medicationId: med.id },
              orderBy: { effectiveDate: 'desc' }
            });

            const hasChanged = !lastPrice ||
                               (ppv !== null && lastPrice.publicPrice !== ppv) ||
                               (phg !== null && lastPrice.hospitalPrice !== phg);

            if (hasChanged && (ppv !== null || phg !== null)) {
              await tx.medicationPrice.create({
                data: {
                  medicationId: med.id,
                  publicPrice: ppv,
                  hospitalPrice: phg,
                  effectiveDate: new Date()
                }
              });
            }

            if (activeIngredientName) {
              const activeIngredient = await tx.activeIngredient.upsert({
                where: { name: activeIngredientName },
                update: {},
                create: { name: activeIngredientName },
              });

              await tx.medicationIngredient.upsert({
                where: {
                  medicationId_activeIngredientId: {
                    medicationId: med.id,
                    activeIngredientId: activeIngredient.id,
                  },
                },
                update: {
                  ...(dosage ? { dosage } : {}),
                  ...(dosageUnit ? { dosageUnit } : {}),
                },
                create: {
                  medicationId: med.id,
                  activeIngredientId: activeIngredient.id,
                  dosage,
                  dosageUnit,
                },
              });
            }

            if (reimbursementRate !== null || referencePrice !== null) {
              await tx.reimbursement.upsert({
                where: {
                  medicationId_organizationId: {
                    medicationId: med.id,
                    organizationId: cnopsOrganization.id,
                  },
                },
                update: {
                  ...(reimbursementRate !== null ? { reimbursementRate } : {}),
                  ...(referencePrice !== null ? { referencePrice } : {}),
                },
                create: {
                  medicationId: med.id,
                  organizationId: cnopsOrganization.id,
                  reimbursementRate,
                  referencePrice,
                },
              });
            }

            // The row data and its checkpoint are committed atomically. A process
            // crash can therefore only leave both unapplied, never one without the other.
            await tx.syncJob.update({
              where: { id: syncJob.id },
              data: {
                status: 'SYNC_IN_PROGRESS',
                recordsRead: rawRows.length,
                recordsProcessed: i + 1,
                recordsCreated: { increment: existingMed ? 0 : 1 },
                recordsUpdated: { increment: existingMed ? 1 : 0 },
                errorsCount: 0,
                errorDetails: null
              }
            });

            return Boolean(existingMed);
          });
          if (wasUpdated) updated++;
          else created++;
        } catch (dbError) {
          logger.error(`Error saving CNOPS row ${i + 1}: ${dbError.message}`);
          errorsCount++;
          const finalStatus = created + updated > 0 ? 'SYNC_PARTIAL' : 'SYNC_FAILED';
          await prisma.syncJob.update({
            where: { id: syncJob.id },
            data: {
              status: finalStatus,
              recordsRead: rawRows.length,
              recordsProcessed: i,
              recordsCreated: created,
              recordsUpdated: updated,
              errorsCount,
              errorDetails: `CNOPS row ${i + 1}: ${dbError.message}`
            }
          });
          return {
            success: true,
            status: finalStatus,
            summary: { read: rawRows.length, created, updated, errors: errorsCount }
          };
        }
      }

      const finalStatus = 'SYNC_SUCCESS';

      let resourceId = null;
      if (finalStatus === 'SYNC_SUCCESS') {
        const resourceRecord = await prisma.sourceResource.create({
          data: {
            name: resMeta.name,
            url: resMeta.url,
            fileHash,
            publishedAt: resMeta.lastModified ? new Date(resMeta.lastModified) : null,
            normalizationVersion: this.NORMALIZATION_VERSION,
            sourceId: source.id
          }
        });
        resourceId = resourceRecord.id;
      }

      await prisma.syncJob.update({
        where: { id: syncJob.id },
        data: {
          status: finalStatus,
          recordsRead: rawRows.length,
          recordsProcessed: rawRows.length,
          recordsCreated: created,
          recordsUpdated: updated,
          errorsCount,
          ...(resourceId ? { resourceId } : {}),
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
          // Keep the job open: if the process failed after some row commits, its
          // transactional recordsProcessed checkpoint is still safe to resume.
          data: { status: 'SYNC_FAILED', errorDetails: error.message }
        });
      }
      return { success: false, status: 'SYNC_FAILED', message: error.message };
    } finally {
      this.syncInProgress = false;
    }
  }
}

module.exports = new CnopsOpenDataConnector();
