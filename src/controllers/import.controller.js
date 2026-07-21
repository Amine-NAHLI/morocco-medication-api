const importService = require('../services/import.service');
const catchAsync = require('../utils/catchAsync');
const { formatSuccess } = require('../utils/responseFormatter');
const ApiError = require('../utils/ApiError');

const uploadFile = catchAsync(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'Please upload an Excel file');
  }

  const result = await importService.processExcelImport(req.file.originalname, req.file.buffer);
  
  formatSuccess(res, result.summary, 'Import completed', 200, { historyId: result.historyId });
});

module.exports = {
  uploadFile
};
