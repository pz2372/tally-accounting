import { Response } from 'express';
import prisma from '../config/database';
import { AuthenticatedRequest } from '../types/http';
import { sendInviteEmail } from '../config/email';
import { stripe } from '../config/stripe';

type Handler = (req: AuthenticatedRequest, res: Response) => Promise<Response | void> | Response | void;

// Create new organization
export const createOrganization: Handler = async (req, res) => {
  try {
    const { name, dba, ein } = req.body;
    const userId = req.user.id;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Organization name is required'
      });
    }

    // Create organization with creator as admin
    const org = await prisma.organization.create({
      data: {
        name: name.trim(),
        dba: dba?.trim() || null,
        ein: ein?.trim() || null,
        billingOwnerId: userId,
        members: {
          create: {
            userId,
            role: 'ADMIN',
            permissions: [] // Admins have all permissions by default
          }
        },
        subscription: {
          create: {
            status: 'INCOMPLETE',
            plan: 'basic'
          }
        }
      },
      include: {
        members: {
          include: {
            user: true
          }
        },
        subscription: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Organization created successfully',
      organization: org
    });
  } catch (error) {
    console.error('createOrganization error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Create Stripe Checkout session for org creation
export const createCheckoutSession: Handler = async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ success: false, error: 'Payment service unavailable' });
    }

    const { name, dba, ein } = req.body;
    const userId = req.user.id;

    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, error: 'Organization name is required' });
    }

    const frontendUrl = process.env.FRONTEND_URL || req.headers.origin || 'http://localhost:5173';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        { price: process.env.STRIPE_PRICE_ID!, quantity: 1 },
      ],
      subscription_data: {
        metadata: {
          userId,
          orgName: name.trim(),
          orgDba: dba?.trim() || '',
          orgEin: ein?.trim() || '',
        },
      },
      metadata: {
        userId,
        orgName: name.trim(),
        orgDba: dba?.trim() || '',
        orgEin: ein?.trim() || '',
      },
      allow_promotion_codes: true,
      success_url: `${frontendUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/dashboard?checkout_canceled=true`,
    });

    res.json({ success: true, checkoutUrl: session.url });
  } catch (error) {
    console.error('createCheckoutSession error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Complete checkout — verify payment and create organization
export const completeCheckout: Handler = async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ success: false, error: 'Payment service unavailable' });
    }

    const { sessionId } = req.body;
    const userId = req.user.id;

    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'Session ID is required' });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return res.status(400).json({ success: false, error: 'Payment not completed' });
    }

    if (session.metadata?.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    // Idempotency check — don't create duplicate org for same subscription
    const stripeSubId = session.subscription as string;
    const existingSub = await prisma.organizationSubscription.findFirst({
      where: { stripeSubscriptionId: stripeSubId },
      include: {
        org: {
          include: {
            members: { include: { user: true } },
            subscription: true,
          },
        },
      },
    });

    if (existingSub) {
      return res.json({ success: true, organization: existingSub.org });
    }

    const orgName = session.metadata?.orgName;
    const orgDba = session.metadata?.orgDba || null;
    const orgEin = session.metadata?.orgEin || null;

    if (!orgName) {
      return res.status(400).json({ success: false, error: 'Invalid session metadata' });
    }

    const org = await prisma.organization.create({
      data: {
        name: orgName,
        dba: orgDba,
        ein: orgEin,
        billingOwnerId: userId,
        members: {
          create: {
            userId,
            role: 'ADMIN',
            permissions: [],
          },
        },
        subscription: {
          create: {
            status: 'ACTIVE',
            plan: 'basic',
            stripeCustomerId: (session.customer as string) || null,
            stripeSubscriptionId: stripeSubId,
          },
        },
      },
      include: {
        members: { include: { user: true } },
        subscription: true,
      },
    });

    res.status(201).json({ success: true, organization: org });
  } catch (error) {
    console.error('completeCheckout error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get organization details
export const getOrganization: Handler = async (req, res) => {
  try {
    const { orgId } = req.user;
    
    if (!orgId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required'
      });
    }
    
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        members: {
          include: {
            user: true
          }
        },
        subscription: true,
        _count: {
          select: {
            expenses: true,
            statements: true
          }
        }
      }
    });
    
    if (!org) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found'
      });
    }
    
    res.json({
      success: true,
      organization: org
    });
  } catch (error) {
    console.error('getOrganization error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Update organization
export const updateOrganization: Handler = async (req, res) => {
  try {
    const { orgId, role } = req.user;
    const { name, dba, ein } = req.body;

    if (role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Organization name is required'
      });
    }

    const org = await prisma.organization.update({
      where: { id: orgId },
      data: {
        name: name.trim(),
        dba: dba?.trim() || null,
        ein: ein?.trim() || null
      }
    });

    res.json({
      success: true,
      message: 'Organization updated successfully',
      organization: org
    });
  } catch (error) {
    console.error('updateOrganization error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Invite user to organization
export const inviteUser: Handler = async (req, res) => {
  try {
    const { orgId, role, permissions: userPermissions } = req.user;
    const { email, name, role: newUserRole, permissions } = req.body;
    
    // Check permissions
    if (role !== 'ADMIN' && !userPermissions.includes('MEMBER_INVITE')) {
      return res.status(403).json({
        success: false,
        error: 'Permission denied'
      });
    }
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }
    
    // Find or create user
    let invitedUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!invitedUser) {
      invitedUser = await prisma.user.create({
        data: { email, name: name?.trim() || null }
      });
    }
    
    // Check if already a member
    const existingMembership = await prisma.orgUser.findUnique({
      where: {
        orgId_userId: {
          orgId,
          userId: invitedUser.id
        }
      }
    });
    
    if (existingMembership) {
      return res.status(400).json({
        success: false,
        error: 'User is already a member of this organization'
      });
    }
    
    // Create membership
    const membership = await prisma.orgUser.create({
      data: {
        orgId,
        userId: invitedUser.id,
        role: newUserRole || 'EMPLOYEE',
        permissions: permissions || []
      },
      include: {
        user: true,
        org: true
      }
    });

    // Create invite token (expires in 7 days)
    const inviteToken = await prisma.inviteToken.create({
      data: {
        userId: invitedUser.id,
        orgId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Send invite email
    try {
      const inviterUser = await prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true } });
      await sendInviteEmail(email, inviteToken.token, membership.org.name, inviterUser?.name);
    } catch (emailError) {
      console.error('Failed to send invite email:', emailError);
      // Don't fail the invite if email fails — membership is already created
    }

    res.status(201).json({
      success: true,
      message: 'User invited successfully',
      membership
    });
  } catch (error) {
    console.error('inviteUser error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Update member role/permissions
export const updateMember: Handler = async (req, res) => {
  try {
    const { orgId, role, permissions: userPermissions } = req.user;
    const { memberId } = req.params;
    const { role: newRole, permissions } = req.body;
    
    // Check permissions
    if (role !== 'ADMIN' && !userPermissions.includes('MEMBER_EDIT')) {
      return res.status(403).json({
        success: false,
        error: 'Permission denied'
      });
    }
    
    const membership = await prisma.orgUser.update({
      where: { id: memberId, orgId },
      data: {
        role: newRole,
        permissions
      },
      include: {
        user: true
      }
    });
    
    res.json({
      success: true,
      message: 'Member updated successfully',
      membership
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Member not found'
      });
    }
    console.error('updateMember error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Remove member from organization
export const removeMember: Handler = async (req, res) => {
  try {
    const { orgId, role, permissions: userPermissions } = req.user;
    const { memberId } = req.params;
    
    // Check permissions
    if (role !== 'ADMIN' && !userPermissions.includes('MEMBER_REMOVE')) {
      return res.status(403).json({
        success: false,
        error: 'Permission denied'
      });
    }
    
    await prisma.orgUser.delete({
      where: { id: memberId }
    });
    
    res.json({
      success: true,
      message: 'Member removed successfully'
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Member not found'
      });
    }
    console.error('removeMember error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Get organization members
export const getMembers: Handler = async (req, res) => {
  try {
    const { orgId } = req.user;
    
    if (!orgId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required'
      });
    }
    
    const members = await prisma.orgUser.findMany({
      where: { orgId },
      include: {
        user: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    res.json({
      success: true,
      members
    });
  } catch (error) {
    console.error('getMembers error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

