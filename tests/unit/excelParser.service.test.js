const ExcelParserService = require('../../src/services/excelParser.service');
const xlsx = require('xlsx');

describe('ExcelParserService', () => {
  it('should parse an excel buffer and normalize row keys', () => {
    const mockData = [
      { 'Code AMM': '123', 'Nom Commercial': 'TEST MED', 'Prix Public (PPV)': 50 }
    ];

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(mockData);
    xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const result = ExcelParserService.parseBuffer(buffer);

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('code_amm', '123');
    expect(result[0]).toHaveProperty('nom_commercial', 'TEST MED');
    expect(result[0]).toHaveProperty('prix_public_ppv', 50);
  });
});
