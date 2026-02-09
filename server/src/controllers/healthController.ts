import { Request, Response } from 'express';

type Handler = (req: Request, res: Response) => void;

// Health check
export const healthCheck: Handler = (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
};

// Get server info
export const getInfo: Handler = (req, res) => {
  res.json({ 
    message: 'Tally API Server',
    version: '1.0.0',
    status: 'running',
    environment: process.env.NODE_ENV || 'development'
  });
};
