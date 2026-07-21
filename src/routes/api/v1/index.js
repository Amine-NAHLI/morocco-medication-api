const express = require('express');

const catalogRoutes = require('./catalog.routes');
const medicationRoutes = require('./medication.routes');
const medicationIngredientRoutes = require('./medicationIngredient.routes');
const importRoutes = require('./import.routes');
const authRoutes = require('./auth.routes');
const syncRoutes = require('./sync.routes');

const router = express.Router();

const defaultRoutes = [
  { path: '/auth', route: authRoutes },
  ...Object.entries(catalogRoutes).map(([path, route]) => ({ path: `/${path}`, route })),
  { path: '/medications', route: medicationRoutes },
  { path: '/medication-ingredients', route: medicationIngredientRoutes },
  { path: '/import', route: importRoutes },
  { path: '/sync', route: syncRoutes },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

module.exports = router;
