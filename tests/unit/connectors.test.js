jest.mock('../../src/config/prisma');
const prismaMock = require('../../src/config/prisma');
const cnssConnector = require('../../src/services/connectors/cnss.connector');
const anamConnector = require('../../src/services/connectors/anam.connector');
const cnopsConnector = require('../../src/services/connectors/cnops.connector');
const dns = require('dns');
const https = require('https');
const { EventEmitter } = require('events');

// Helper to create a mock HTTPS response
function createMockResponse(statusCode, headers = {}, body = Buffer.alloc(0)) {
  const res = new EventEmitter();
  res.statusCode = statusCode;
  res.headers = headers;
  res.setTimeout = jest.fn((ms, cb) => { res._timeoutCb = cb; });
  // Emit data and end on next tick
  process.nextTick(() => {
    if (body && body.length > 0) {
      res.emit('data', body);
    }
    res.emit('end');
  });
  return res;
}

// Helper to create a mock HTTPS request
function createMockRequest(response) {
  const req = new EventEmitter();
  req.destroy = jest.fn();
  req.setTimeout = jest.fn();
  // Trigger the callback with the response on next tick
  process.nextTick(() => {
    if (req._callback) req._callback(response);
  });
  return req;
}

describe('Connectors', () => {
  describe('CNSS Connector', () => {
    it('should return SOURCE_NOT_AUTOMATABLE', async () => {
      prismaMock.source.upsert.mockResolvedValue({ id: 1 });
      prismaMock.syncJob.create.mockResolvedValue({ id: 1 });
      const result = await cnssConnector.syncDatabase();
      expect(result.success).toBe(false);
      expect(result.status).toBe('SOURCE_NOT_AUTOMATABLE');
    });
  });

  describe('ANAM Connector', () => {
    it('should return SOURCE_NOT_AUTOMATABLE', async () => {
      prismaMock.source.upsert.mockResolvedValue({ id: 1 });
      prismaMock.syncJob.create.mockResolvedValue({ id: 1 });
      const result = await anamConnector.syncDatabase();
      expect(result.success).toBe(false);
      expect(result.status).toBe('SOURCE_NOT_AUTOMATABLE');
    });
  });

  describe('CNOPS Connector', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
      prismaMock.managingOrganization.upsert.mockResolvedValue({ id: 1 });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    // ---- isUrlSafe ----
    describe('URL Validation (isUrlSafe)', () => {
      it('should allow valid HTTPS URL with allowed hostname and public IP', async () => {
        jest.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: '8.8.8.8', family: 4 }]);
        const res = await cnopsConnector.isUrlSafe('https://data.gov.ma/test.xlsx');
        expect(res.safe).toBe(true);
      });

      it('should reject HTTP URLs', async () => {
        const res = await cnopsConnector.isUrlSafe('http://data.gov.ma/test.xlsx');
        expect(res.safe).toBe(false);
        expect(res.reason).toContain('Only HTTPS');
      });

      it('should reject non-whitelisted hostnames', async () => {
        const res = await cnopsConnector.isUrlSafe('https://evil.com/test.xlsx');
        expect(res.safe).toBe(false);
        expect(res.reason).toContain('is not allowed');
      });

      it('should reject loopback IPv4', async () => {
        jest.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: '127.0.0.1', family: 4 }]);
        const res = await cnopsConnector.isUrlSafe('https://data.gov.ma/test.xlsx');
        expect(res.safe).toBe(false);
        expect(res.reason).toContain('loopback');
      });

      it('should reject private IPv4 (192.168.x.x)', async () => {
        jest.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: '192.168.1.1', family: 4 }]);
        const res = await cnopsConnector.isUrlSafe('https://data.gov.ma/test.xlsx');
        expect(res.safe).toBe(false);
        expect(res.reason).toContain('private');
      });

      it('should reject private IPv4 (10.x.x.x)', async () => {
        jest.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: '10.0.0.1', family: 4 }]);
        const res = await cnopsConnector.isUrlSafe('https://data.gov.ma/test.xlsx');
        expect(res.safe).toBe(false);
        expect(res.reason).toContain('private');
      });

      it('should reject link-local IPv4', async () => {
        jest.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: '169.254.1.1', family: 4 }]);
        const res = await cnopsConnector.isUrlSafe('https://data.gov.ma/test.xlsx');
        expect(res.safe).toBe(false);
        expect(res.reason).toContain('linkLocal');
      });

      it('should reject multicast IPv4', async () => {
        jest.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: '224.0.0.1', family: 4 }]);
        const res = await cnopsConnector.isUrlSafe('https://data.gov.ma/test.xlsx');
        expect(res.safe).toBe(false);
        expect(res.reason).toContain('multicast');
      });

      it('should reject IPv6 loopback', async () => {
        jest.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: '::1', family: 6 }]);
        const res = await cnopsConnector.isUrlSafe('https://data.gov.ma/test.xlsx');
        expect(res.safe).toBe(false);
        expect(res.reason).toContain('loopback');
      });

      it('should reject IPv4-mapped private IPv6', async () => {
        jest.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: '::ffff:192.168.1.1', family: 6 }]);
        const res = await cnopsConnector.isUrlSafe('https://data.gov.ma/test.xlsx');
        expect(res.safe).toBe(false);
      });

      it('should reject IPv4-mapped loopback IPv6', async () => {
        jest.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: '::ffff:127.0.0.1', family: 6 }]);
        const res = await cnopsConnector.isUrlSafe('https://data.gov.ma/test.xlsx');
        expect(res.safe).toBe(false);
        expect(res.reason).toContain('loopback');
      });

      it('should reject unspecified addresses', async () => {
        jest.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: '0.0.0.0', family: 4 }]);
        const res = await cnopsConnector.isUrlSafe('https://data.gov.ma/test.xlsx');
        expect(res.safe).toBe(false);
        expect(res.reason).toContain('unspecified');
      });

      it('should handle unresolvable domains', async () => {
        jest.spyOn(dns.promises, 'lookup').mockResolvedValue([]);
        const res = await cnopsConnector.isUrlSafe('https://data.gov.ma/test.xlsx');
        expect(res.safe).toBe(false);
        expect(res.reason).toContain('Could not resolve');
      });

      it('should reject completely invalid URLs', async () => {
        const res = await cnopsConnector.isUrlSafe('not a url');
        expect(res.safe).toBe(false);
        expect(res.reason).toContain('Invalid URL');
      });

      it('should allow www.data.gov.ma', async () => {
        jest.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: '1.2.3.4', family: 4 }]);
        const res = await cnopsConnector.isUrlSafe('https://www.data.gov.ma/test.xlsx');
        expect(res.safe).toBe(true);
      });
    });

    // ---- discoverResources ----
    describe('Resource Discovery', () => {
      it('should sort resources by last_modified and pick the newest', async () => {
        jest.spyOn(cnopsConnector, 'isUrlSafe').mockResolvedValue({ safe: true });
        global.fetch.mockResolvedValue({
          ok: true,
          json: async () => ({
            result: {
              resources: [
                { format: 'XLSX', url: 'https://data.gov.ma/old.xlsx', last_modified: '2022-01-01', created: '2021-01-01', name: 'Old' },
                { format: 'XLSX', url: 'https://data.gov.ma/newest.xlsx', last_modified: '2025-06-01', created: '2024-01-01', name: 'Newest' },
                { format: 'XLSX', url: 'https://data.gov.ma/mid.xlsx', last_modified: '2023-06-01', created: '2023-01-01', name: 'Mid' }
              ]
            }
          })
        });

        const resMeta = await cnopsConnector.discoverResources();
        expect(resMeta.url).toBe('https://data.gov.ma/newest.xlsx');
        expect(resMeta.name).toBe('Newest');
      });

      it('should fall back to created date when last_modified is null', async () => {
        jest.spyOn(cnopsConnector, 'isUrlSafe').mockResolvedValue({ safe: true });
        global.fetch.mockResolvedValue({
          ok: true,
          json: async () => ({
            result: {
              resources: [
                { format: 'XLSX', url: 'https://data.gov.ma/old.xlsx', last_modified: null, created: '2022-01-01', name: 'Old' },
                { format: 'XLSX', url: 'https://data.gov.ma/new.xlsx', last_modified: null, created: '2025-01-01', name: 'New' }
              ]
            }
          })
        });

        const resMeta = await cnopsConnector.discoverResources();
        expect(resMeta.url).toBe('https://data.gov.ma/new.xlsx');
      });

      it('should throw error if no XLSX found', async () => {
        jest.spyOn(cnopsConnector, 'isUrlSafe').mockResolvedValue({ safe: true });
        global.fetch.mockResolvedValue({
          ok: true,
          json: async () => ({ result: { resources: [{ format: 'PDF' }] } })
        });
        await expect(cnopsConnector.discoverResources()).rejects.toThrow('No XLSX resource found');
      });

      it('should throw if HTTP response is not ok', async () => {
        jest.spyOn(cnopsConnector, 'isUrlSafe').mockResolvedValue({ safe: true });
        global.fetch.mockResolvedValue({ ok: false, status: 503 });
        await expect(cnopsConnector.discoverResources()).rejects.toThrow('HTTP 503');
      });

      it('should throw if CKAN URL is unsafe', async () => {
        jest.spyOn(cnopsConnector, 'isUrlSafe').mockResolvedValue({ safe: false, reason: 'Bad hostname' });
        await expect(cnopsConnector.discoverResources()).rejects.toThrow('Unsafe package URL');
      });
    });

    // ---- downloadResourceBuffer ----
    describe('Download Resource Buffer', () => {
      it('should reject too many redirects', async () => {
        jest.spyOn(cnopsConnector, 'isUrlSafe').mockResolvedValue({ safe: true, url: new URL('https://data.gov.ma/test.xlsx') });
        await expect(cnopsConnector.downloadResourceBuffer('https://data.gov.ma/test.xlsx', 6))
          .rejects.toThrow('Too many redirects');
      });

      it('should reject unsafe URLs before downloading', async () => {
        jest.spyOn(cnopsConnector, 'isUrlSafe').mockResolvedValue({ safe: false, reason: 'Blocked host' });
        await expect(cnopsConnector.downloadResourceBuffer('https://evil.com/test.xlsx'))
          .rejects.toThrow('Unsafe URL encountered during download');
      });

      it('should successfully download a valid XLSX response', async () => {
        const body = Buffer.from('fake-xlsx-content');
        jest.spyOn(cnopsConnector, 'isUrlSafe').mockResolvedValue({ safe: true, url: new URL('https://data.gov.ma/test.xlsx') });

        jest.spyOn(https, 'get').mockImplementation((url, opts, callback) => {
          const req = new EventEmitter();
          req.destroy = jest.fn();

          setTimeout(() => {
            const res = new EventEmitter();
            res.statusCode = 200;
            res.headers = { 'content-type': 'application/octet-stream' };
            res.setTimeout = jest.fn();
            callback(res);
            setTimeout(() => {
              res.emit('data', body);
              res.emit('end');
            }, 0);
          }, 0);

          return req;
        });

        const result = await cnopsConnector.downloadResourceBuffer('https://data.gov.ma/test.xlsx');
        expect(result).toEqual(body);
      });

      it('should reject non-200 responses', async () => {
        jest.spyOn(cnopsConnector, 'isUrlSafe').mockResolvedValue({ safe: true, url: new URL('https://data.gov.ma/test.xlsx') });

        jest.spyOn(https, 'get').mockImplementation((url, opts, callback) => {
          const res = createMockResponse(500, {});
          process.nextTick(() => callback(res));
          const req = new EventEmitter();
          req.destroy = jest.fn();
          return req;
        });

        await expect(cnopsConnector.downloadResourceBuffer('https://data.gov.ma/test.xlsx'))
          .rejects.toThrow('Download failed with status 500');
      });

      it('should reject unexpected Content-Type', async () => {
        jest.spyOn(cnopsConnector, 'isUrlSafe').mockResolvedValue({ safe: true, url: new URL('https://data.gov.ma/test.xlsx') });

        jest.spyOn(https, 'get').mockImplementation((url, opts, callback) => {
          const res = createMockResponse(200, { 'content-type': 'text/html' });
          process.nextTick(() => callback(res));
          const req = new EventEmitter();
          req.destroy = jest.fn();
          return req;
        });

        await expect(cnopsConnector.downloadResourceBuffer('https://data.gov.ma/test.xlsx'))
          .rejects.toThrow('Unexpected Content-Type');
      });

      it('should follow a 302 redirect and validate the next URL', async () => {
        jest.spyOn(cnopsConnector, 'isUrlSafe').mockResolvedValue({ safe: true, url: new URL('https://data.gov.ma/redirect') });

        let callCount = 0;
        jest.spyOn(https, 'get').mockImplementation((url, opts, callback) => {
          callCount++;
          const req = new EventEmitter();
          req.destroy = jest.fn();

          if (callCount === 1) {
            // First call: redirect
            setTimeout(() => {
              const res = new EventEmitter();
              res.statusCode = 302;
              res.headers = { location: 'https://data.gov.ma/real.xlsx' };
              res.setTimeout = jest.fn();
              callback(res);
            }, 0);
          } else {
            // Second call: actual file
            setTimeout(() => {
              const res = new EventEmitter();
              res.statusCode = 200;
              res.headers = { 'content-type': 'application/octet-stream' };
              res.setTimeout = jest.fn();
              callback(res);
              setTimeout(() => {
                res.emit('data', Buffer.from('data'));
                res.emit('end');
              }, 0);
            }, 0);
          }

          return req;
        });

        const result = await cnopsConnector.downloadResourceBuffer('https://data.gov.ma/redirect');
        expect(result).toEqual(Buffer.from('data'));
      });

      it('should reject redirect without location header', async () => {
        jest.spyOn(cnopsConnector, 'isUrlSafe').mockResolvedValue({ safe: true, url: new URL('https://data.gov.ma/test') });

        jest.spyOn(https, 'get').mockImplementation((url, opts, callback) => {
          const res = new EventEmitter();
          res.statusCode = 302;
          res.headers = {}; // no location
          res.setTimeout = jest.fn();
          process.nextTick(() => callback(res));
          const req = new EventEmitter();
          req.destroy = jest.fn();
          return req;
        });

        await expect(cnopsConnector.downloadResourceBuffer('https://data.gov.ma/test'))
          .rejects.toThrow('Redirected without location header');
      });

      it('should reject files exceeding max size', async () => {
        jest.spyOn(cnopsConnector, 'isUrlSafe').mockResolvedValue({ safe: true, url: new URL('https://data.gov.ma/test.xlsx') });

        // Temporarily set MAX_FILE_SIZE to something tiny
        const origMax = cnopsConnector.MAX_FILE_SIZE;
        cnopsConnector.MAX_FILE_SIZE = 10;

        jest.spyOn(https, 'get').mockImplementation((url, opts, callback) => {
          const res = new EventEmitter();
          res.statusCode = 200;
          res.headers = { 'content-type': 'application/octet-stream' };
          res.setTimeout = jest.fn();
          process.nextTick(() => {
            callback(res);
            process.nextTick(() => {
              res.emit('data', Buffer.alloc(20)); // 20 bytes > 10 limit
            });
          });
          const req = new EventEmitter();
          req.destroy = jest.fn();
          return req;
        });

        await expect(cnopsConnector.downloadResourceBuffer('https://data.gov.ma/test.xlsx'))
          .rejects.toThrow('File exceeds maximum allowed size');
        cnopsConnector.MAX_FILE_SIZE = origMax;
      });

      it('should handle request errors', async () => {
        jest.spyOn(cnopsConnector, 'isUrlSafe').mockResolvedValue({ safe: true, url: new URL('https://data.gov.ma/test.xlsx') });

        jest.spyOn(https, 'get').mockImplementation((url, opts, callback) => {
          const req = new EventEmitter();
          req.destroy = jest.fn();
          process.nextTick(() => req.emit('error', new Error('ECONNRESET')));
          return req;
        });

        await expect(cnopsConnector.downloadResourceBuffer('https://data.gov.ma/test.xlsx'))
          .rejects.toThrow('ECONNRESET');
      });
    });

    // ---- syncDatabase ----
    describe('Database Sync', () => {
      it('should sync with new file, create price when changed', async () => {
        prismaMock.source.findUnique.mockResolvedValue(null);
        prismaMock.source.create.mockResolvedValue({ id: 1 });
        prismaMock.syncJob.create.mockResolvedValue({ id: 1 });
        prismaMock.sourceResource.findFirst.mockResolvedValue(null);
        prismaMock.sourceResource.create.mockResolvedValue({ id: 1 });
        prismaMock.syncJob.update.mockResolvedValue({});
        prismaMock.$transaction.mockImplementation(async (cb) => cb(prismaMock));
        prismaMock.medication.findUnique.mockResolvedValue(null);
        prismaMock.medication.upsert.mockResolvedValue({ id: 1 });
        prismaMock.medicationPrice.findFirst.mockResolvedValue(null); // no prior price
        prismaMock.medicationPrice.create.mockResolvedValue({});

        jest.spyOn(cnopsConnector, 'discoverResources').mockResolvedValue({
          url: 'https://data.gov.ma/test.xlsx', lastModified: '2024-01-01', name: 'Test', hash: ''
        });
        jest.spyOn(cnopsConnector, 'downloadResourceBuffer').mockResolvedValue(Buffer.from('test'));
        jest.spyOn(cnopsConnector, 'parseResource').mockResolvedValue([
          { CODE: '123', NOM: 'Test Med', PPV: '2,882.00', PH: '2,555.00', PRINCEPS_GENERIQUE: 'G' },
          { CODE: null } // Invalid row
        ]);

        const result = await cnopsConnector.syncDatabase();
        expect(result.success).toBe(true);
        expect(result.summary.created).toBe(1);
        expect(result.summary.errors).toBe(1);
        expect(prismaMock.medicationPrice.create).toHaveBeenCalledWith(expect.objectContaining({
          data: expect.objectContaining({ publicPrice: 2882, hospitalPrice: 2555 })
        }));
        expect(prismaMock.medication.upsert).toHaveBeenCalledWith(expect.objectContaining({
          create: expect.objectContaining({ isGeneric: true })
        }));
      });

      it('should map official CNOPS details, ingredient and reimbursement without duplicates', async () => {
        prismaMock.source.findUnique.mockResolvedValue({ id: 1 });
        prismaMock.managingOrganization.upsert.mockResolvedValue({ id: 7 });
        prismaMock.syncJob.create.mockResolvedValue({ id: 1 });
        prismaMock.sourceResource.findFirst.mockResolvedValue(null);
        prismaMock.sourceResource.create.mockResolvedValue({ id: 1 });
        prismaMock.syncJob.update.mockResolvedValue({});
        prismaMock.$transaction.mockImplementation(async (cb) => cb(prismaMock));
        prismaMock.medication.findUnique.mockResolvedValue(null);
        prismaMock.medication.upsert.mockResolvedValue({ id: 12 });
        prismaMock.medicationPrice.findFirst.mockResolvedValue(null);
        prismaMock.medicationPrice.create.mockResolvedValue({});
        prismaMock.activeIngredient.upsert.mockResolvedValue({ id: 20 });
        prismaMock.medicationIngredient.upsert.mockResolvedValue({});
        prismaMock.reimbursement.upsert.mockResolvedValue({});

        jest.spyOn(cnopsConnector, 'discoverResources').mockResolvedValue({
          url: 'https://data.gov.ma/test.xlsx', lastModified: null, name: 'Test', hash: ''
        });
        jest.spyOn(cnopsConnector, 'downloadResourceBuffer').mockResolvedValue(Buffer.from('official-columns'));
        jest.spyOn(cnopsConnector, 'parseResource').mockResolvedValue([{
          CODE: '6118010116230',
          NOM: 'ELOXATINE 5 MG/ML',
          DCI1: 'OXALIPLATINE',
          DOSAGE1: '200',
          UNITE_DOSAGE1: 'MG',
          FORME: 'SOLUTION A DILUER POUR PERFUSION',
          PRESENTATION: '1 BOITE 1 FLACON 40 ML',
          PPV: '2,882.00',
          PH: '2,555.00',
          PRIX_BR: '2,882.00',
          PRINCEPS_GENERIQUE: 'P',
          TAUX_REMBOURSEMENT: '70%',
        }]);

        await cnopsConnector.syncDatabase();

        expect(prismaMock.medication.upsert).toHaveBeenCalledWith(expect.objectContaining({
          update: expect.objectContaining({
            form: 'SOLUTION A DILUER POUR PERFUSION',
            presentation: '1 BOITE 1 FLACON 40 ML',
            dosageUnit: 'MG',
          }),
        }));
        expect(prismaMock.medicationIngredient.upsert).toHaveBeenCalledWith(expect.objectContaining({
          create: expect.objectContaining({ medicationId: 12, activeIngredientId: 20, dosage: '200', dosageUnit: 'MG' }),
        }));
        expect(prismaMock.reimbursement.upsert).toHaveBeenCalledWith(expect.objectContaining({
          create: expect.objectContaining({ organizationId: 7, reimbursementRate: 70, referencePrice: 2882 }),
        }));
      });

      it('should skip price creation if price unchanged', async () => {
        prismaMock.source.findUnique.mockResolvedValue({ id: 1 });
        prismaMock.syncJob.create.mockResolvedValue({ id: 1 });
        prismaMock.sourceResource.findFirst.mockResolvedValue(null);
        prismaMock.sourceResource.create.mockResolvedValue({ id: 1 });
        prismaMock.syncJob.update.mockResolvedValue({});
        prismaMock.$transaction.mockImplementation(async (cb) => cb(prismaMock));
        prismaMock.medication.findUnique.mockResolvedValue({ id: 1 }); // existing med → update
        prismaMock.medication.upsert.mockResolvedValue({ id: 1 });
        prismaMock.medicationPrice.findFirst.mockResolvedValue({ publicPrice: 10, hospitalPrice: null });
        prismaMock.medicationPrice.create.mockResolvedValue({});

        jest.spyOn(cnopsConnector, 'discoverResources').mockResolvedValue({
          url: 'https://data.gov.ma/test.xlsx', lastModified: null, name: 'Test', hash: ''
        });
        jest.spyOn(cnopsConnector, 'downloadResourceBuffer').mockResolvedValue(Buffer.from('test'));
        jest.spyOn(cnopsConnector, 'parseResource').mockResolvedValue([
          { Code: '123', Nom: 'Test Med', PPV: '10' }
        ]);

        const result = await cnopsConnector.syncDatabase();
        expect(result.success).toBe(true);
        expect(prismaMock.medicationPrice.create).not.toHaveBeenCalled();
      });

      it('resumes from the first uncommitted CNOPS row and advances the checkpoint atomically', async () => {
        prismaMock.source.findUnique.mockResolvedValue({ id: 1 });
        prismaMock.syncJob.findFirst.mockResolvedValue({
          id: 77,
          status: 'SYNC_IN_PROGRESS',
          recordsRead: 4,
          recordsProcessed: 2,
          recordsCreated: 2,
          recordsUpdated: 0,
        });
        prismaMock.sourceResource.findFirst.mockResolvedValue(null);
        prismaMock.sourceResource.create.mockResolvedValue({ id: 9 });
        prismaMock.syncJob.update.mockResolvedValue({});
        prismaMock.$transaction.mockImplementation(async (cb) => cb(prismaMock));
        prismaMock.medication.findUnique.mockResolvedValue(null);
        prismaMock.medication.upsert.mockResolvedValue({ id: 1 });
        prismaMock.medicationPrice.findFirst.mockResolvedValue(null);
        prismaMock.medicationPrice.create.mockResolvedValue({});

        jest.spyOn(cnopsConnector, 'discoverResources').mockResolvedValue({
          url: 'https://data.gov.ma/test.xlsx', lastModified: null, name: 'Test', hash: ''
        });
        jest.spyOn(cnopsConnector, 'downloadResourceBuffer').mockResolvedValue(Buffer.from('resumable-file'));
        jest.spyOn(cnopsConnector, 'parseResource').mockResolvedValue([
          { CODE: '1', NOM: 'Already committed 1' },
          { CODE: '2', NOM: 'Already committed 2' },
          { CODE: '3', NOM: 'Resume here' },
          { CODE: '4', NOM: 'And finish here' },
        ]);

        const result = await cnopsConnector.syncDatabase();

        expect(result).toMatchObject({
          success: true,
          status: 'SYNC_SUCCESS',
          summary: { read: 4, created: 4, updated: 0, errors: 0 },
        });
        expect(prismaMock.syncJob.create).not.toHaveBeenCalled();
        expect(prismaMock.medication.upsert).toHaveBeenCalledTimes(2);
        expect(prismaMock.medication.upsert).toHaveBeenNthCalledWith(1, expect.objectContaining({
          where: { code: '3' },
        }));
        expect(prismaMock.medication.upsert).toHaveBeenNthCalledWith(2, expect.objectContaining({
          where: { code: '4' },
        }));
        expect(prismaMock.syncJob.update).toHaveBeenCalledWith(expect.objectContaining({
          where: { id: 77 },
          data: expect.objectContaining({ recordsProcessed: 3 }),
        }));
        expect(prismaMock.syncJob.update).toHaveBeenCalledWith(expect.objectContaining({
          where: { id: 77 },
          data: expect.objectContaining({ recordsProcessed: 4 }),
        }));
      });

      it('should skip sync if file hash is identical', async () => {
        prismaMock.source.findUnique.mockResolvedValue({ id: 1 });
        prismaMock.syncJob.create.mockResolvedValue({ id: 1 });
        prismaMock.syncJob.update.mockResolvedValue({});

        const testBuffer = Buffer.from('test');
        const hash = require('crypto').createHash('sha256').update(testBuffer).digest('hex');
        prismaMock.sourceResource.findFirst.mockResolvedValue({ fileHash: hash, normalizationVersion: 2 });

        jest.spyOn(cnopsConnector, 'discoverResources').mockResolvedValue({
          url: 'https://data.gov.ma/test.xlsx', lastModified: null, name: 'Test', hash: ''
        });
        jest.spyOn(cnopsConnector, 'downloadResourceBuffer').mockResolvedValue(testBuffer);

        const result = await cnopsConnector.syncDatabase();
        expect(result.message).toContain('Skipping sync');
      });

      it('should handle transaction errors gracefully (SYNC_PARTIAL)', async () => {
        prismaMock.source.findUnique.mockResolvedValue({ id: 1 });
        prismaMock.syncJob.create.mockResolvedValue({ id: 1 });
        prismaMock.sourceResource.findFirst.mockResolvedValue(null);
        prismaMock.sourceResource.create.mockResolvedValue({ id: 1 });
        prismaMock.syncJob.update.mockResolvedValue({});

        let txCall = 0;
        prismaMock.$transaction.mockImplementation(async (cb) => {
          txCall++;
          if (txCall === 1) {
            // First row succeeds
            prismaMock.medication.findUnique.mockResolvedValue(null);
            prismaMock.medication.upsert.mockResolvedValue({ id: 1 });
            prismaMock.medicationPrice.findFirst.mockResolvedValue(null);
            prismaMock.medicationPrice.create.mockResolvedValue({});
            return cb(prismaMock);
          }
          // Second row fails
          throw new Error('Constraint violation');
        });

        jest.spyOn(cnopsConnector, 'discoverResources').mockResolvedValue({
          url: 'https://data.gov.ma/test.xlsx', lastModified: null, name: 'Test', hash: ''
        });
        jest.spyOn(cnopsConnector, 'downloadResourceBuffer').mockResolvedValue(Buffer.from('x'));
        jest.spyOn(cnopsConnector, 'parseResource').mockResolvedValue([
          { Code: '1', Nom: 'Good', PPV: '5' },
          { Code: '2', Nom: 'Bad', PPV: '10' }
        ]);

        const result = await cnopsConnector.syncDatabase();
        expect(result.status).toBe('SYNC_PARTIAL');
        expect(result.summary.errors).toBe(1);
        expect(prismaMock.sourceResource.create).not.toHaveBeenCalled();
        expect(prismaMock.syncJob.update).toHaveBeenCalledWith(expect.objectContaining({
          data: expect.objectContaining({
            status: 'SYNC_PARTIAL',
            recordsProcessed: 1,
          }),
        }));
      });

      it('should return SYNC_FAILED when all rows fail', async () => {
        prismaMock.source.findUnique.mockResolvedValue({ id: 1 });
        prismaMock.syncJob.create.mockResolvedValue({ id: 1 });
        prismaMock.sourceResource.findFirst.mockResolvedValue(null);
        prismaMock.sourceResource.create.mockResolvedValue({ id: 1 });
        prismaMock.syncJob.update.mockResolvedValue({});
        prismaMock.$transaction.mockRejectedValue(new Error('DB down'));

        jest.spyOn(cnopsConnector, 'discoverResources').mockResolvedValue({
          url: 'https://data.gov.ma/test.xlsx', lastModified: null, name: 'Test', hash: ''
        });
        jest.spyOn(cnopsConnector, 'downloadResourceBuffer').mockResolvedValue(Buffer.from('x'));
        jest.spyOn(cnopsConnector, 'parseResource').mockResolvedValue([
          { Code: '1', Nom: 'A', PPV: '5' }
        ]);

        const result = await cnopsConnector.syncDatabase();
        expect(result.status).toBe('SYNC_FAILED');
      });

      it('does not persist a resource hash for a failed import, allowing a retry', async () => {
        prismaMock.source.findUnique.mockResolvedValue({ id: 1 });
        prismaMock.syncJob.create.mockResolvedValue({ id: 1 });
        prismaMock.sourceResource.findFirst.mockResolvedValue(null);
        prismaMock.sourceResource.create.mockResolvedValue({ id: 1 });
        prismaMock.syncJob.update.mockResolvedValue({});
        prismaMock.$transaction.mockImplementation(async (cb) => cb(prismaMock));
        prismaMock.medication.findUnique.mockResolvedValue(null);
        prismaMock.medication.upsert.mockResolvedValue({ id: 1 });
        prismaMock.medicationPrice.findFirst.mockResolvedValue(null);
        prismaMock.medicationPrice.create.mockResolvedValue({});

        jest.spyOn(cnopsConnector, 'discoverResources').mockResolvedValue({
          url: 'https://data.gov.ma/test.xlsx', lastModified: null, name: 'Test', hash: ''
        });
        jest.spyOn(cnopsConnector, 'downloadResourceBuffer').mockResolvedValue(Buffer.from('same-file'));
        jest.spyOn(cnopsConnector, 'parseResource')
          .mockResolvedValueOnce([{ CODE: null }])
          .mockResolvedValueOnce([{ CODE: '123', NOM: 'Retryable medication', PPV: '10' }]);

        const failed = await cnopsConnector.syncDatabase();
        expect(failed.status).toBe('SYNC_FAILED');
        expect(prismaMock.sourceResource.create).not.toHaveBeenCalled();

        const retried = await cnopsConnector.syncDatabase();
        expect(retried.status).toBe('SYNC_SUCCESS');
        expect(prismaMock.sourceResource.create).toHaveBeenCalledTimes(1);
      });

      it('should catch unhandled errors without syncJob', async () => {
        prismaMock.source.findUnique.mockRejectedValue(new Error('DB Error'));
        const res = await cnopsConnector.syncDatabase();
        expect(res.success).toBe(false);
        expect(res.status).toBe('SYNC_FAILED');
      });

      it('should update syncJob on top-level failure if syncJob exists', async () => {
        prismaMock.source.findUnique.mockResolvedValue({ id: 1 });
        prismaMock.syncJob.create.mockResolvedValue({ id: 99 });
        prismaMock.syncJob.update.mockResolvedValue({});
        jest.spyOn(cnopsConnector, 'discoverResources').mockRejectedValue(new Error('Network down'));

        const res = await cnopsConnector.syncDatabase();
        expect(res.success).toBe(false);
        expect(prismaMock.syncJob.update).toHaveBeenCalledWith(
          expect.objectContaining({ where: { id: 99 } })
        );
      });

      it('should handle row with only hospital price', async () => {
        prismaMock.source.findUnique.mockResolvedValue({ id: 1 });
        prismaMock.syncJob.create.mockResolvedValue({ id: 1 });
        prismaMock.sourceResource.findFirst.mockResolvedValue(null);
        prismaMock.sourceResource.create.mockResolvedValue({ id: 1 });
        prismaMock.syncJob.update.mockResolvedValue({});
        prismaMock.$transaction.mockImplementation(async (cb) => cb(prismaMock));
        prismaMock.medication.findUnique.mockResolvedValue(null);
        prismaMock.medication.upsert.mockResolvedValue({ id: 1 });
        prismaMock.medicationPrice.findFirst.mockResolvedValue(null);
        prismaMock.medicationPrice.create.mockResolvedValue({});

        jest.spyOn(cnopsConnector, 'discoverResources').mockResolvedValue({
          url: 'https://data.gov.ma/test.xlsx', lastModified: null, name: 'Test', hash: ''
        });
        jest.spyOn(cnopsConnector, 'downloadResourceBuffer').mockResolvedValue(Buffer.from('x'));
        jest.spyOn(cnopsConnector, 'parseResource').mockResolvedValue([
          { Code: '1', Nom: 'A', PHG: '15' } // Only hospital price
        ]);

        const result = await cnopsConnector.syncDatabase();
        expect(result.success).toBe(true);
        expect(prismaMock.medicationPrice.create).toHaveBeenCalled();
      });

      it('should handle row with no prices', async () => {
        prismaMock.source.findUnique.mockResolvedValue({ id: 1 });
        prismaMock.syncJob.create.mockResolvedValue({ id: 1 });
        prismaMock.sourceResource.findFirst.mockResolvedValue(null);
        prismaMock.sourceResource.create.mockResolvedValue({ id: 1 });
        prismaMock.syncJob.update.mockResolvedValue({});
        prismaMock.$transaction.mockImplementation(async (cb) => cb(prismaMock));
        prismaMock.medication.findUnique.mockResolvedValue(null);
        prismaMock.medication.upsert.mockResolvedValue({ id: 1 });

        jest.spyOn(cnopsConnector, 'discoverResources').mockResolvedValue({
          url: 'https://data.gov.ma/test.xlsx', lastModified: null, name: 'Test', hash: ''
        });
        jest.spyOn(cnopsConnector, 'downloadResourceBuffer').mockResolvedValue(Buffer.from('x'));
        jest.spyOn(cnopsConnector, 'parseResource').mockResolvedValue([
          { Code: '1', Nom: 'A' } // No price columns at all
        ]);

        const result = await cnopsConnector.syncDatabase();
        expect(result.success).toBe(true);
        expect(prismaMock.medicationPrice.create).not.toHaveBeenCalled();
      });

      it('should detect generic type from row', async () => {
        prismaMock.source.findUnique.mockResolvedValue({ id: 1 });
        prismaMock.syncJob.create.mockResolvedValue({ id: 1 });
        prismaMock.sourceResource.findFirst.mockResolvedValue(null);
        prismaMock.sourceResource.create.mockResolvedValue({ id: 1 });
        prismaMock.syncJob.update.mockResolvedValue({});
        prismaMock.$transaction.mockImplementation(async (cb) => cb(prismaMock));
        prismaMock.medication.findUnique.mockResolvedValue(null);
        prismaMock.medication.upsert.mockResolvedValue({ id: 1 });

        jest.spyOn(cnopsConnector, 'discoverResources').mockResolvedValue({
          url: 'https://data.gov.ma/test.xlsx', lastModified: null, name: 'Test', hash: ''
        });
        jest.spyOn(cnopsConnector, 'downloadResourceBuffer').mockResolvedValue(Buffer.from('x'));
        jest.spyOn(cnopsConnector, 'parseResource').mockResolvedValue([
          { Code: '1', Nom: 'A', Type: 'Générique' }
        ]);

        const result = await cnopsConnector.syncDatabase();
        expect(result.success).toBe(true);
        expect(prismaMock.medication.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            create: expect.objectContaining({ isGeneric: true })
          })
        );
      });
    });
  });

  describe('Base Connector', () => {
    it('should throw Not implemented on all methods', async () => {
      const BaseConnector = require('../../src/services/connectors/base.connector');
      const base = new BaseConnector('TEST', 'Test');
      await expect(base.discoverResources()).rejects.toThrow('Not implemented');
      await expect(base.downloadResource()).rejects.toThrow('Not implemented');
      await expect(base.validateResource()).rejects.toThrow('Not implemented');
      await expect(base.parseResource()).rejects.toThrow('Not implemented');
      await expect(base.normalizeRecords()).rejects.toThrow('Not implemented');
      await expect(base.syncDatabase()).rejects.toThrow('Not implemented');
      await expect(base.getSourceStatus()).rejects.toThrow('Not implemented');
    });
  });
});
