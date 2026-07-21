const path = require('path');
const YAML = require('yamljs');

const document = YAML.load(path.join(__dirname, '../../src/docs/swagger.yml'));

const expectedPaths = [
  '/api/v1/auth/register', '/api/v1/auth/login', '/api/v1/auth/refresh-token', '/api/v1/auth/logout', '/api/v1/auth/me', '/api/v1/auth/users/{id}/role',
  '/api/v1/medications', '/api/v1/medications/{id}', '/api/v1/manufacturers', '/api/v1/manufacturers/{id}',
  '/api/v1/categories', '/api/v1/categories/{id}', '/api/v1/active-ingredients', '/api/v1/active-ingredients/{id}',
  '/api/v1/medication-ingredients', '/api/v1/medication-ingredients/{id}', '/api/v1/organizations', '/api/v1/organizations/{id}',
  '/api/v1/regimes', '/api/v1/regimes/{id}', '/api/v1/reimbursements', '/api/v1/reimbursements/{id}',
  '/api/v1/medication-prices', '/api/v1/medication-prices/{id}', '/api/v1/sources', '/api/v1/sources/{id}',
  '/api/v1/source-resources', '/api/v1/source-resources/{id}', '/api/v1/official-documents', '/api/v1/official-documents/{id}',
  '/api/v1/sync-jobs', '/api/v1/sync-jobs/{id}', '/api/v1/import/excel', '/api/v1/sync/cnops', '/api/v1/sync/cnss',
  '/api/v1/sync/anam', '/api/v1/sync/all', '/api/v1/sync/status', '/api/v1/sync/history',
];

const adminOperations = Object.values(document.paths)
  .flatMap((pathItem) => Object.values(pathItem))
  .filter((operation) => operation && operation['x-required-role'] === 'ADMIN');

describe('OpenAPI specification', () => {
  test('is valid YAML/OpenAPI with the public API prefix and Bearer authorization', () => {
    expect(document.openapi).toBe('3.0.3');
    expect(document.components.securitySchemes.BearerAuth).toMatchObject({ type: 'http', scheme: 'bearer' });
    expect(document.servers[0].url).toBe('/');
  });

  test('documents every currently mounted v1 endpoint and no retired ImportHistory path', () => {
    expect(Object.keys(document.paths).sort()).toEqual(expectedPaths.sort());
    expect(JSON.stringify(document)).not.toContain('ImportHistory');
    expect(document.paths['/api/v1/medication-prices'].post.requestBody).toBeDefined();
    expect(document.components.schemas.Medication.properties.publicPrice).toBeUndefined();
  });

  test('marks every ADMIN operation with BearerAuth security', () => {
    expect(adminOperations.length).toBeGreaterThan(0);
    for (const operation of adminOperations) {
      expect(operation.security).toEqual([{ BearerAuth: [] }]);
      expect(operation.responses['401']).toBeDefined();
      expect(operation.responses['403']).toBeDefined();
    }
  });
});
