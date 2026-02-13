import prisma from '../config/database';
import { Response } from 'express';
import { AuthenticatedRequest } from '../types/http';

type Handler = (req: AuthenticatedRequest, res: Response) => Promise<Response | void> | Response | void;

// Create a support ticket
export const createTicket: Handler = async (req, res) => {
  try {
    const { subject, message } = req.body;
    const userId = req.user.id;
    const orgId = req.user.orgId || null;

    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        error: 'Subject and message are required',
      });
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        subject: subject.trim(),
        message: message.trim(),
        userId,
        orgId,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Support ticket created successfully',
      ticket,
    });
  } catch (error) {
    console.error('Create support ticket error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Get user's support tickets
export const getTickets: Handler = async (req, res) => {
  try {
    const userId = req.user.id;

    const tickets = await prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      tickets,
    });
  } catch (error) {
    console.error('Get support tickets error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
