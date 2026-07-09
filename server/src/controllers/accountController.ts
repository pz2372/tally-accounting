import { Response } from 'express';
import prisma from '../config/database';
import { AuthenticatedRequest } from '../types/http';
import { ACCOUNTS, isValidAccountKey } from '../config/defaultAccounts';

type Handler = (req: AuthenticatedRequest, res: Response) => Promise<Response | void> | Response | void;

// Get the org's Chart of Accounts.
// Returns all accounts grouped by type, merged with per-org overrides.
export const getAccounts: Handler = async (req, res) => {
  try {
    const { orgId } = req.user;

    if (!orgId) {
      return res.status(403).json({ success: false, error: 'Organization context required' });
    }

    const overrides = await prisma.orgCategory.findMany({ where: { orgId } });
    const overrideMap = new Map(overrides.map(o => [o.categoryKey, o]));

    const accounts = ACCOUNTS.map(a => {
      const override = overrideMap.get(a.key);
      return {
        key:                a.key,
        code:               a.code,
        name:               a.name,
        type:               a.type,
        scheduleCLine:      a.scheduleCLine,
        color:              a.color,
        icon:               a.icon,
        sortOrder:          a.sortOrder,
        isEnabled:          override ? override.isEnabled           : true,
        visibleToEmployees: override ? override.visibleToEmployees  : true,
      };
    });

    // Group by type
    const income = accounts.filter(a => a.type === 'INCOME');
    const cogs   = accounts.filter(a => a.type === 'COST_OF_GOODS_SOLD');
    const expense = accounts.filter(a => a.type === 'EXPENSE');

    res.json({
      success: true,
      accounts,
      grouped: { income, cogs, expense },
    });
  } catch (error) {
    console.error('getAccounts error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Update one or more account overrides for the org (enable/disable, visibility).
// Body: { accounts: Array<{ key, isEnabled?, visibleToEmployees? }> }
export const updateAccounts: Handler = async (req, res) => {
  try {
    const { orgId, role } = req.user;
    const { accounts } = req.body;

    if (role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    if (!Array.isArray(accounts)) {
      return res.status(400).json({ success: false, error: 'accounts array is required' });
    }

    for (const acct of accounts) {
      if (!isValidAccountKey(acct.key)) {
        return res.status(400).json({ success: false, error: `Unknown account key: ${acct.key}` });
      }

      const data: { isEnabled?: boolean; visibleToEmployees?: boolean } = {};
      if (acct.isEnabled          !== undefined) data.isEnabled          = acct.isEnabled;
      if (acct.visibleToEmployees !== undefined) data.visibleToEmployees = acct.visibleToEmployees;

      await prisma.orgCategory.upsert({
        where:  { orgId_categoryKey: { orgId, categoryKey: acct.key } },
        update: data,
        create: { orgId, categoryKey: acct.key, ...data },
      });
    }

    res.json({ success: true, message: 'Accounts updated' });
  } catch (error) {
    console.error('updateAccounts error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
