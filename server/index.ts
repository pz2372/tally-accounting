import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import 'dotenv/config';
import { initializeFirebase } from './src/config/firebase';

// Validate required environment variables before starting
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

const app = express();
const PORT = process.env.PORT || 3000;

// Trust Render's reverse proxy so express-rate-limit can identify clients correctly
app.set('trust proxy', 1);

// Initialize Firebase
initializeFirebase();

// Import routes
import mainRoutes from './src/routes';
import expenseRoutes from './src/routes/expenseRoutes';
import categoryRoutes from './src/routes/categoryRoutes';
import authRoutes from './src/routes/authRoutes';
import organizationRoutes from './src/routes/organizationRoutes';
import statementRoutes from './src/routes/statementRoutes';
import matchRoutes from './src/routes/matchRoutes';
import salesReportRoutes from './src/routes/salesReportRoutes';
import recurringChargeRoutes from './src/routes/recurringChargeRoutes';
import uploadRoutes from './src/routes/uploadRoutes';
import supportRoutes from './src/routes/supportRoutes';
import plaidRoutes from './src/routes/plaidRoutes';
import receiptRoutes from './src/routes/receiptRoutes';
import { handleStripeWebhook } from './src/controllers/stripeWebhookController';

// Security headers
app.use(helmet());

// CORS — restrict to known origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : [
      'http://localhost:5173',
      'https://tally-accounting.netlify.app',
    ];
app.use(cors({ origin: allowedOrigins, credentials: true }));

// Global rate limit: 100 requests per 15 minutes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later' }
});
app.use(globalLimiter);

// Stricter rate limit for auth endpoints: 10 requests per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many authentication attempts, please try again later' }
});

// Stripe webhook — needs raw body for signature verification, must be before express.json()
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Routes
app.use('/', mainRoutes);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/statements', statementRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/sales-reports', salesReportRoutes);
app.use('/api/recurring-charges', recurringChargeRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/plaid', plaidRoutes);
app.use('/api/receipts', receiptRoutes);

// Error handling middleware — never leak internal error details
app.use((err: Error, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
});
