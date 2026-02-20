import { Response } from 'express';
import { AuthenticatedRequest } from '../types/http';
import { sendVerificationEmail } from '../config/email';

type Handler = (req: AuthenticatedRequest, res: Response) => Promise<Response | void>;

// In-memory store: userId → { code, expiresAt }
const pendingCodes = new Map<string, { code: string; expiresAt: number }>();

// Cleanup expired codes every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of pendingCodes.entries()) {
    if (val.expiresAt < now) pendingCodes.delete(key);
  }
}, 5 * 60 * 1000);

// POST /api/auth/send-verification-code
export const sendCode: Handler = async (req, res) => {
  try {
    const { id: userId, email, name } = req.user;

    // Rate-limit: don't re-issue within 60 seconds
    const existing = pendingCodes.get(userId);
    if (existing && existing.expiresAt - 9 * 60 * 1000 > Date.now() - 60 * 1000) {
      return res.status(429).json({
        success: false,
        error: 'Please wait before requesting another code',
      });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    pendingCodes.set(userId, { code, expiresAt: Date.now() + 10 * 60 * 1000 });

    await sendVerificationEmail(email, code, name);

    return res.json({ success: true, message: `Code sent to ${email}` });
  } catch (error) {
    console.error('sendCode error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// POST /api/auth/verify-code
export const verifyCode: Handler = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, error: 'Code is required' });
    }

    const entry = pendingCodes.get(userId);

    if (!entry) {
      return res.status(400).json({ success: false, error: 'No code found. Please request a new one.' });
    }

    if (Date.now() > entry.expiresAt) {
      pendingCodes.delete(userId);
      return res.status(400).json({ success: false, error: 'Code expired. Please request a new one.' });
    }

    if (entry.code !== String(code).trim()) {
      return res.status(400).json({ success: false, error: 'Invalid code' });
    }

    pendingCodes.delete(userId);
    return res.json({ success: true, message: 'Verified' });
  } catch (error) {
    console.error('verifyCode error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
