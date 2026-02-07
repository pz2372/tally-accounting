// Health check
exports.healthCheck = (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
};

// Get server info
exports.getInfo = (req, res) => {
  res.json({ 
    message: 'Tally API Server',
    version: '1.0.0',
    status: 'running',
    environment: process.env.NODE_ENV || 'development'
  });
};
