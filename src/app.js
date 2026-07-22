const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const ApiError = require('./utils/ApiError');
const { errorConverter, errorHandler } = require('./middlewares/error.middleware');
const routes = require('./routes/api/v1');
const { getHttpConfig } = require('./config/env');

const app = express();

// Middlewares
app.use(morgan('dev'));
app.use(helmet());
const httpConfig = getHttpConfig();
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(compression());
app.use(cors({
  origin(origin, callback) {
    if (!origin || httpConfig.corsOrigins.includes(origin)) return callback(null, true);
    return callback(new ApiError(403, 'Origin is not allowed by CORS policy'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false, message: { status: 'error', message: 'Too many authentication attempts. Please retry later.' } });
app.use('/api/v1/auth/register', authLimiter);
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/refresh-token', authLimiter);

// API v1 routes
app.use('/api/v1', routes);

// Swagger Documentation
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');
const swaggerDocument = YAML.load(path.join(__dirname, 'docs', 'swagger.yml'));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Send back a 404 error for any unknown api request
app.use((req, res, next) => {
  next(new ApiError(404, 'Route Not found'));
});

// Convert error to ApiError if needed
app.use(errorConverter);

// Handle global errors
app.use(errorHandler);

module.exports = app;
