const xlsx = require('xlsx');

class ExcelParserService {
  parseBuffer(buffer) {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Read raw data
    const rawData = xlsx.utils.sheet_to_json(sheet, { defval: null });
    
    // Normalize keys
    return rawData.map(row => this.normalizeRow(row));
  }

  normalizeRow(row) {
    const normalized = {};
    for (const [key, value] of Object.entries(row)) {
      if (key && typeof key === 'string') {
        const cleanKey = key.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
        normalized[cleanKey] = value;
      }
    }
    return normalized;
  }
}

module.exports = new ExcelParserService();
