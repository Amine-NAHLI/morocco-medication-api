const fs = require('fs');
const path = require('path');

const models = [
  'organization',
  'manufacturer',
  'category',
  'activeIngredient',
  'medication',
  'medicationIngredient',
  'reimbursement',
  'importHistory'
];

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

models.forEach(model => {
  const modelNameCap = capitalize(model);
  
  // 1. Repository
  const repoCode = `const BaseRepository = require('./base.repository');
const prisma = require('../config/prisma');

class ${modelNameCap}Repository extends BaseRepository {
  constructor() {
    super(prisma.${model});
  }
}
module.exports = new ${modelNameCap}Repository();
`;
  fs.writeFileSync(path.join(__dirname, '..', 'src', 'repositories', `${model}.repository.js`), repoCode);

  // 2. Service
  const serviceCode = `const ${model}Repository = require('../repositories/${model}.repository');

class ${modelNameCap}Service {
  async create(data) {
    return ${model}Repository.create(data);
  }

  async findAll(params) {
    return ${model}Repository.findAll(params);
  }

  async findById(id) {
    return ${model}Repository.findById(id);
  }

  async update(id, data) {
    return ${model}Repository.update(id, data);
  }

  async delete(id) {
    return ${model}Repository.delete(id);
  }
}
module.exports = new ${modelNameCap}Service();
`;
  fs.writeFileSync(path.join(__dirname, '..', 'src', 'services', `${model}.service.js`), serviceCode);

  // 3. Controller
  const controllerCode = `const ${model}Service = require('../services/${model}.service');
const catchAsync = require('../utils/catchAsync');
const { formatSuccess } = require('../utils/responseFormatter');
const { buildPagination, buildSorting } = require('../utils/queryBuilder');
const ApiError = require('../utils/ApiError');

const create = catchAsync(async (req, res) => {
  const data = await ${model}Service.create(req.body);
  formatSuccess(res, data, '${modelNameCap} created successfully', 201);
});

const findAll = catchAsync(async (req, res) => {
  const pagination = buildPagination(req.query);
  const orderBy = buildSorting(req.query);
  const where = {}; // Add specific search/filters here later
  
  const result = await ${model}Service.findAll({ ...pagination, orderBy, where });
  formatSuccess(res, result.data, '${modelNameCap}s retrieved successfully', 200, {
    total: result.total,
    page: pagination.page,
    limit: pagination.limit
  });
});

const findById = catchAsync(async (req, res) => {
  const data = await ${model}Service.findById(req.params.id);
  if (!data) throw new ApiError(404, '${modelNameCap} not found');
  formatSuccess(res, data, '${modelNameCap} retrieved successfully');
});

const update = catchAsync(async (req, res) => {
  const data = await ${model}Service.update(req.params.id, req.body);
  formatSuccess(res, data, '${modelNameCap} updated successfully');
});

const deleteRecord = catchAsync(async (req, res) => {
  await ${model}Service.delete(req.params.id);
  formatSuccess(res, null, '${modelNameCap} deleted successfully', 204);
});

module.exports = {
  create,
  findAll,
  findById,
  update,
  delete: deleteRecord
};
`;
  fs.writeFileSync(path.join(__dirname, '..', 'src', 'controllers', `${model}.controller.js`), controllerCode);

  // 4. Routes
  const routeCode = `const express = require('express');
const { body } = require('express-validator');
const validate = require('../../../middlewares/validate.middleware');
const ${model}Controller = require('../../../controllers/${model}.controller');

const router = express.Router();

router.route('/')
  .post(
    // Placeholder for express-validator
    validate,
    ${model}Controller.create
  )
  .get(${model}Controller.findAll);

router.route('/:id')
  .get(${model}Controller.findById)
  .put(
    validate,
    ${model}Controller.update
  )
  .delete(${model}Controller.delete);

module.exports = router;
`;
  fs.writeFileSync(path.join(__dirname, '..', 'src', 'routes', 'api', 'v1', `${model}.routes.js`), routeCode);
});

console.log("Scaffolding complete.");
