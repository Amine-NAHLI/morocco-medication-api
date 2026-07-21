class ValidationService {
  validateMedicationRow(row) {
    const errors = [];
    
    // Check required fields (using normalized generic keys)
    // We expect something like: code, name, manufacturer, active_ingredient
    const code = row.code || row.code_amm || row.amm;
    const name = row.name || row.nom || row.nom_commercial;
    const manufacturer = row.manufacturer || row.fabricant || row.laboratoire;
    
    if (!code) errors.push('Missing Code AMM');
    if (!name) errors.push('Missing Medication Name');
    if (!manufacturer) errors.push('Missing Manufacturer');
    
    return {
      isValid: errors.length === 0,
      errors,
      data: {
        code: code ? String(code).trim() : null,
        name: name ? String(name).trim() : null,
        manufacturer: manufacturer ? String(manufacturer).trim() : null,
        form: (row.form || row.forme || '')?.toString().trim() || null,
        presentation: (row.presentation || '')?.toString().trim() || null,
        publicPrice: this.parseFloatSafe(row.public_price || row.ppv),
        hospitalPrice: this.parseFloatSafe(row.hospital_price || row.phg),
        category: (row.category || row.categorie || row.classe_therapeutique || '')?.toString().trim() || null,
        activeIngredients: this.extractIngredients(row.active_ingredient || row.substances_actives || row.dci),
        dosage: (row.dosage || '')?.toString().trim() || null,
        reimbursement: this.extractReimbursement(row)
      }
    };
  }

  parseFloatSafe(val) {
    if (val === null || val === undefined || val === '') return null;
    const parsed = parseFloat(String(val).replace(',', '.'));
    return isNaN(parsed) ? null : parsed;
  }

  extractIngredients(ingredientsString) {
    if (!ingredientsString) return [];
    // Assume ingredients are comma-separated
    return String(ingredientsString)
      .split(',')
      .map(i => i.trim())
      .filter(i => i.length > 0);
  }

  extractReimbursement(row) {
    const org = (row.organization || row.organisme || '')?.toString().trim();
    if (!org) return null;
    return {
      organization: org,
      basePrice: this.parseFloatSafe(row.base_price || row.base_remboursement || row.br),
      rate: this.parseFloatSafe(row.rate || row.taux_remboursement || row.taux),
      referencePrice: this.parseFloatSafe(row.reference_price || row.prix_reference || row.pr),
      conditions: (row.conditions || '')?.toString().trim() || null
    };
  }
}

module.exports = new ValidationService();
