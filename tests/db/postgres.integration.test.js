const bcrypt = require('bcryptjs');
const xlsx = require('xlsx');
const request = require('supertest');

const prisma = require('../../src/config/prisma');
const app = require('../../src/app');
const authService = require('../../src/services/auth.service');
const medicationService = require('../../src/services/medication.service');
const importService = require('../../src/services/import.service');
const cnopsConnector = require('../../src/services/connectors/cnops.connector');
const { generateAccessToken } = require('../../src/utils/jwt');

const cleanDatabase = async () => {
  await prisma.reimbursement.deleteMany();
  await prisma.medicationPrice.deleteMany();
  await prisma.medicationIngredient.deleteMany();
  await prisma.syncJob.deleteMany();
  await prisma.sourceResource.deleteMany();
  await prisma.medication.deleteMany();
  await prisma.managingOrganization.deleteMany();
  await prisma.regime.deleteMany();
  await prisma.officialDocument.deleteMany();
  await prisma.activeIngredient.deleteMany();
  await prisma.category.deleteMany();
  await prisma.manufacturer.deleteMany();
  await prisma.source.deleteMany();
  await prisma.user.deleteMany();
};

const createWorkbook = () => {
  const sheet = xlsx.utils.json_to_sheet([{
    code: 'DB-XLSX-001', name: 'Imported test medicine', manufacturer: 'Import Lab',
    category: 'Import category', active_ingredient: 'Ingredient from XLSX', public_price: '34.50',
    organization: 'CNOPS-TEST', rate: '70', base_price: '30',
  }]);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, sheet, 'Medications');
  return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};

// Extracted from the official CNOPS XLSX downloaded from data.gov.ma on 2026-07-21.
const createOfficialCnopsExtract = () => {
  const sheet = xlsx.utils.json_to_sheet([
    {
      CODE: '6118001230068',
      NOM: 'URO / EAU POUR IRRIGATION',
      DCI1: 'EAU POUR PREPARATION INJECTABLE',
      DOSAGE1: '3000',
      UNITE_DOSAGE1: 'ML',
      FORME: 'SOLUTION POUR IRRIGATION',
      PRESENTATION: '1 POCHE 3 L',
      PPV: ' 95.00   ',
      PH: ' -     ',
      PRIX_BR: ' 95.00   ',
      PRINCEPS_GENERIQUE: 'P',
      TAUX_REMBOURSEMENT: '0%',
    },
    {
      CODE: '6118010116230',
      NOM: 'ELOXATINE 5 MG/ML',
      DCI1: 'OXALIPLATINE',
      DOSAGE1: '200',
      UNITE_DOSAGE1: 'MG',
      FORME: 'SOLUTION A DILUER POUR PERFUSION',
      PRESENTATION: '1 BOITE 1 FLACON 40 ML',
      PPV: ' 2,882.00   ',
      PH: ' 2,555.00   ',
      PRIX_BR: ' 2,882.00   ',
      PRINCEPS_GENERIQUE: 'P',
      TAUX_REMBOURSEMENT: '70%',
    },
  ]);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, sheet, 'CNOPS');
  return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};

describe('isolated PostgreSQL integration', () => {
  beforeAll(async () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.DATABASE_URL).toBe(process.env.TEST_DATABASE_URL);
    await prisma.$connect();
  });

  beforeEach(cleanDatabase);
  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
  });

  test('connects to migrated PostgreSQL and records applied migrations', async () => {
    const rows = await prisma.$queryRawUnsafe('SELECT migration_name FROM "_prisma_migrations"');
    expect(rows.length).toBeGreaterThanOrEqual(3);
  });

  test('registers, authenticates, rotates and revokes hashed refresh tokens', async () => {
    const registration = await authService.register({ email: 'db-user@example.test', password: 'Password!123', name: 'DB User', role: 'ADMIN' });
    expect(registration.user.role).toBe('USER');
    const stored = await prisma.user.findUnique({ where: { id: registration.user.id } });
    expect(await bcrypt.compare('Password!123', stored.password)).toBe(true);
    expect(stored.password).not.toBe('Password!123');
    expect(stored.refreshTokenHash).not.toBe(registration.refreshToken);
    expect(await bcrypt.compare(registration.refreshToken, stored.refreshTokenHash)).toBe(true);

    const login = await authService.login({ email: 'DB-USER@EXAMPLE.TEST', password: 'Password!123' });
    const rotated = await authService.refreshToken(login.refreshToken);
    expect(rotated.accessToken).toEqual(expect.any(String));
    expect(rotated.refreshToken).not.toBe(login.refreshToken);
    const afterRotation = await prisma.user.findUnique({ where: { id: registration.user.id } });
    expect(await bcrypt.compare(rotated.refreshToken, afterRotation.refreshTokenHash)).toBe(true);
    expect(await bcrypt.compare(login.refreshToken, afterRotation.refreshTokenHash)).toBe(false);
    await expect(authService.refreshToken(login.refreshToken)).rejects.toMatchObject({ statusCode: 401 });
    await authService.logout(registration.user.id);
    expect((await prisma.user.findUnique({ where: { id: registration.user.id } })).refreshTokenHash).toBeNull();
  });

  test('enforces admin-only role promotion and protects an administrator from self-demotion', async () => {
    const admin = await prisma.user.create({ data: { email: 'admin@example.test', password: 'hash', role: 'ADMIN' } });
    const user = await prisma.user.create({ data: { email: 'user@example.test', password: 'hash', role: 'USER' } });
    const denied = await request(app)
      .patch(`/api/v1/auth/users/${user.id}/role`)
      .set('Authorization', `Bearer ${generateAccessToken(user)}`)
      .send({ role: 'ADMIN' });
    expect(denied.status).toBe(403);
    const allowed = await request(app)
      .patch(`/api/v1/auth/users/${user.id}/role`)
      .set('Authorization', `Bearer ${generateAccessToken(admin)}`)
      .send({ role: 'ADMIN' });
    expect(allowed.status).toBe(200);
    await expect(authService.setRole(admin.id, admin.id, 'USER')).rejects.toMatchObject({ statusCode: 400 });
    const promoted = await prisma.user.findUnique({ where: { id: user.id } });
    expect(promoted.role).toBe('ADMIN');
  });

  test('persists a medication graph, filters it, paginates it, and returns relations', async () => {
    const [manufacturer, category, ingredient, source, organization, regime] = await Promise.all([
      prisma.manufacturer.create({ data: { name: 'DB Lab' } }),
      prisma.category.create({ data: { name: 'Analgesic' } }),
      prisma.activeIngredient.create({ data: { name: 'Paracetamol' } }),
      prisma.source.create({ data: { code: 'DB_SOURCE', name: 'Database source' } }),
      prisma.managingOrganization.create({ data: { code: 'DB_ORG', name: 'DB insurer' } }),
      prisma.regime.create({ data: { code: 'DB_REGIME', name: 'DB regime' } }),
    ]);
    const medication = await prisma.medication.create({ data: { code: 'DB-MED-001', name: 'Database Paracetamol', isGeneric: true, manufacturerId: manufacturer.id, categoryId: category.id, sourceId: source.id } });
    await prisma.medicationIngredient.create({ data: { medicationId: medication.id, activeIngredientId: ingredient.id, dosage: '500mg' } });
    const price = await prisma.medicationPrice.create({ data: { medicationId: medication.id, publicPrice: 21.5, hospitalPrice: 18, effectiveDate: new Date() } });
    const reimbursement = await prisma.reimbursement.create({ data: { medicationId: medication.id, organizationId: organization.id, regimeId: regime.id, reimbursementRate: 70 } });

    const result = await medicationService.findAll({ skip: 0, take: 1, orderBy: { name: 'asc' }, where: { AND: [{ isGeneric: true }, { ingredients: { some: { activeIngredient: { name: { contains: 'Paracetamol', mode: 'insensitive' } } } } }] } });
    expect(result.total).toBe(1);
    expect(result.data[0]).toMatchObject({ id: medication.id, manufacturer: { id: manufacturer.id }, category: { id: category.id }, source: { id: source.id } });
    expect(result.data[0].ingredients[0].activeIngredient.name).toBe('Paracetamol');
    expect(result.data[0].prices[0].id).toBe(price.id);
    expect(result.data[0].reimbursements[0]).toMatchObject({ id: reimbursement.id, organization: { id: organization.id }, regime: { id: regime.id } });
  });

  test('imports a minimal XLSX with SyncJob, prices and reimbursement relations', async () => {
    const result = await importService.processExcelImport('minimal.xlsx', createWorkbook());
    expect(result.success).toBe(true);
    expect(result.summary.created).toBe(1);
    const job = await prisma.syncJob.findUnique({ where: { id: result.historyId } });
    const medication = await prisma.medication.findUnique({ where: { code: 'DB-XLSX-001' }, include: { prices: true, reimbursements: { include: { organization: true } }, ingredients: true } });
    expect(job).toMatchObject({ status: 'SYNC_SUCCESS', recordsRead: 1, recordsValid: 1, recordsCreated: 1 });
    expect(medication.prices[0].publicPrice).toBe(34.5);
    expect(medication.reimbursements[0]).toMatchObject({ reimbursementRate: 70, organization: { code: 'CNOPS-TEST' } });
    expect(medication.ingredients).toHaveLength(1);
  });

  test('imports an official CNOPS extract using the current production column names', async () => {
    const buffer = createOfficialCnopsExtract();
    jest.spyOn(cnopsConnector, 'discoverResources').mockResolvedValue({
      url: 'https://data.gov.ma/dataset/referentiel-des-medicaments.xlsx',
      lastModified: '2026-07-21T00:00:00.000Z',
      name: 'Réf des médicaments',
    });
    jest.spyOn(cnopsConnector, 'downloadResourceBuffer').mockResolvedValue(buffer);

    const result = await cnopsConnector.syncDatabase();

    expect(result).toMatchObject({
      success: true,
      status: 'SYNC_SUCCESS',
      summary: { read: 2, created: 2, updated: 0, errors: 0 },
    });
    const medications = await prisma.medication.findMany({
      where: { code: { in: ['6118001230068', '6118010116230'] } },
      include: { prices: true, source: true },
      orderBy: { code: 'asc' },
    });
    expect(medications).toHaveLength(2);
    expect(medications[0]).toMatchObject({
      code: '6118001230068',
      name: 'URO / EAU POUR IRRIGATION',
      isGeneric: false,
      source: { code: 'CNOPS' },
    });
    expect(medications[0].prices[0]).toMatchObject({ publicPrice: 95, hospitalPrice: null });
    expect(medications[1].prices[0]).toMatchObject({ publicPrice: 2882, hospitalPrice: 2555 });
    expect(await prisma.sourceResource.count()).toBe(1);

    const retry = await cnopsConnector.syncDatabase();
    expect(retry.message).toContain('Skipping sync');
    expect(await prisma.medication.count({ where: { source: { is: { code: 'CNOPS' } } } })).toBe(2);
  });

  test('rolls back failed transactions and retains database uniqueness and foreign-key constraints', async () => {
    await expect(prisma.$transaction(async (tx) => {
      await tx.manufacturer.create({ data: { name: 'Rolled back lab' } });
      throw new Error('intentional rollback');
    })).rejects.toThrow('intentional rollback');
    expect(await prisma.manufacturer.findUnique({ where: { name: 'Rolled back lab' } })).toBeNull();

    await prisma.manufacturer.create({ data: { name: 'Unique lab' } });
    await expect(prisma.manufacturer.create({ data: { name: 'Unique lab' } })).rejects.toMatchObject({ code: 'P2002' });
    await expect(prisma.medicationPrice.create({ data: { medicationId: 999999, publicPrice: 10 } })).rejects.toMatchObject({ code: 'P2003' });
  });
});
