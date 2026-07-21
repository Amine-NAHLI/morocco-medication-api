const express = require('express');

const organizationRoutes = require('./organization.routes');
const manufacturerRoutes = require('./manufacturer.routes');
const categoryRoutes = require('./category.routes');
const activeIngredientRoutes = require('./activeIngredient.routes');
const medicationRoutes = require('./medication.routes');
const medicationIngredientRoutes = require('./medicationIngredient.routes');
const reimbursementRoutes = require('./reimbursement.routes');
const importHistoryRoutes = require('./importHistory.routes');

const router = express.Router();

const defaultRoutes = [
  { path: '/organizations', route: organizationRoutes },
  { path: '/manufacturers', route: manufacturerRoutes },
  { path: '/categories', route: categoryRoutes },
  { path: '/active-ingredients', route: activeIngredientRoutes },
  { path: '/medications', route: medicationRoutes },
  { path: '/medication-ingredients', route: medicationIngredientRoutes },
  { path: '/reimbursements', route: reimbursementRoutes },
  { path: '/import-histories', route: importHistoryRoutes },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

module.exports = router;
