import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/environment';
import { stream } from './config/logger';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import authRoutes from './routes/auth.routes';
import usersRoutes from './routes/users.routes';
import staffRoutes from './routes/staff.routes';
import learnersRoutes from './routes/learners.routes';
import departmentsRoutes from './routes/departments.routes';
import academicYearsRoutes from './routes/academic-years.routes';

const app: Application = express();

// Security middleware
app.use(helmet());
app.use(cors(config.cors));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (config.env !== 'test') {
  app.use(morgan('combined', { stream }));
}

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is healthy',
    timestamp: new Date().toISOString()
  });
});

// API routes - Phase 1
app.use('/api/v2/auth', authRoutes);
app.use('/api/v2/users', usersRoutes);
app.use('/api/v2/users/staff', staffRoutes);
app.use('/api/v2/users/learners', learnersRoutes);
app.use('/api/v2/departments', departmentsRoutes);
app.use('/api/v2/calendar', academicYearsRoutes);

// 404 handler
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

export default app;
