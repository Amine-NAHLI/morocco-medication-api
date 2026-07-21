const ValidationService = require('../../src/services/validation.service');

describe('ValidationService', () => {
  it('should invalidate a row missing required fields', () => {
    const row = { code: null, name: 'Med', manufacturer: null };
    const result = ValidationService.validateMedicationRow(row);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Missing Code AMM');
    expect(result.errors).toContain('Missing Manufacturer');
  });

  it('should validate a correct row and extract data properly', () => {
    const row = {
      code_amm: '123',
      nom_commercial: 'Paracetamol',
      laboratoire: 'Pharma',
      ppv: '45,50',
      substances_actives: 'Paracetamol, Cafeine',
      organisme: 'CNOPS',
      taux_remboursement: '70'
    };

    const result = ValidationService.validateMedicationRow(row);
    expect(result.isValid).toBe(true);
    expect(result.data.code).toBe('123');
    expect(result.data.publicPrice).toBe(45.50);
    expect(result.data.activeIngredients).toEqual(['Paracetamol', 'Cafeine']);
    expect(result.data.reimbursement.organization).toBe('CNOPS');
    expect(result.data.reimbursement.rate).toBe(70);
  });

  it('should gracefully handle empty rows or missing optional fields', () => {
    const row = { code: 'ABC', name: 'Test', manufacturer: 'Lab' };
    const result = ValidationService.validateMedicationRow(row);
    expect(result.isValid).toBe(true);
    expect(result.data.publicPrice).toBeNull();
    expect(result.data.activeIngredients).toEqual([]);
    expect(result.data.reimbursement).toBeNull();
  });
});
