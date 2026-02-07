const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { initializeFirebase } = require('./src/config/firebase');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Firebase
initializeFirebase();

// Import routes
const mainRoutes = require('./src/routes');
const expenseRoutes = require('./src/routes/expenseRoutes');
const categoryRoutes = require('./src/routes/categoryRoutes');
const authRoutes = require('./src/routes/authRoutes');
const organizationRoutes = require('./src/routes/organizationRoutes');
const receiptRoutes = require('./src/routes/receiptRoutes');
const statementRoutes = require('./src/routes/statementRoutes');
const matchRoutes = require('./src/routes/matchRoutes');
const salesReportRoutes = require('./src/routes/salesReportRoutes');
const recurringChargeRoutes = require('./src/routes/recurringChargeRoutes');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/', mainRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/statements', statementRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/sales-reports', salesReportRoutes);
app.use('/api/recurring-charges', recurringChargeRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/categories', categoryRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
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
