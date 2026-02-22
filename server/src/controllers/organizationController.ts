import { Response } from 'express';
import prisma from '../config/database';
import { AuthenticatedRequest } from '../types/http';
import { sendInviteEmail } from '../config/email';

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
    const { email, role: newUserRole, permissions } = req.body;
    
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
        data: { email }
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

