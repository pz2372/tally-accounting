import cors from 'cors';
import express from 'express';
import 'dotenv/config';
import { initializeFirebase } from './src/config/firebase';

const app = express();
const PORT = process.env.PORT || 3000;

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

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/', mainRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/statements', statementRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/sales-reports', salesReportRoutes);
app.use('/api/recurring-charges', recurringChargeRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/support', supportRoutes);

// Error handling middleware
app.use((err: Error, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: err.message
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
