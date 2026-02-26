import { Response } from 'express';
import prisma from '../config/database';
import { AuthenticatedRequest } from '../types/http';
import { PRESET_CATEGORIES, isValidCategoryName } from '../config/categories';

type Handler = (req: AuthenticatedRequest, res: Response) => Promise<Response | void> | Response | void;

// Get all preset categories (from constants — no DB needed)
export const getAllPresetCategories: Handler = async (_req, res) => {
  res.json({ success: true, categories: PRESET_CATEGORIES });
};

// Get the org's category settings.
// Returns all preset categories merged with any per-org overrides.
// Categories with no override row are on by default.
export const getOrgCategories: Handler = async (req, res) => {
  try {
    const { orgId } = req.user;

    if (!orgId) {
      return res.status(403).json({ success: false, error: 'Organization context required' });
    }

    // Fetch only overrides (rows only exist for customised categories)
    const overrides = await prisma.orgCategory.findMany({ where: { orgId } });
    const overrideMap = new Map(overrides.map(o => [o.categoryKey, o]));

    const categories = PRESET_CATEGORIES.map(preset => {
      const override = overrideMap.get(preset.key);
      return {
        key:               preset.key,
        name:              preset.name,
        color:             preset.color,
        sortOrder:         preset.sortOrder,
        isEnabled:         override ? override.isEnabled          : true,
        visibleToEmployees: override ? override.visibleToEmployees : true,
      };
    });

    res.json({ success: true, categories });
  } catch (error) {
    console.error('getOrgCategories error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Update one or more category overrides for the org.
// Body: { categories: Array<{ key, isEnabled?, visibleToEmployees? }> }
export const updateOrgCategories: Handler = async (req, res) => {
  try {
    const { orgId, role } = req.user;
    const { categories } = req.body;

    if (role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    if (!Array.isArray(categories)) {
      return res.status(400).json({ success: false, error: 'categories array is required' });
    }

    // Map presetCategoryId to key for backwards compatibility
    const normalizedCategories = categories.map(cat => {
      let key = cat.key;

      // Convert presetCategoryId to key if needed
      if (!key && cat.presetCategoryId) {
        const idToKeyMap: Record<string, string> = {
          'preset_misc': 'miscellaneous',
          'preset_labor': 'labor',
          'preset_inventory': 'inventory',
          'preset_operations': 'operations',
          'preset_tax': 'tax',
          'preset_transport': 'transportation',
        };
        key = idToKeyMap[cat.presetCategoryId];
      }

      return { ...cat, key };
    });

    for (const cat of normalizedCategories) {
      if (!isValidCategoryName(cat.key) && !PRESET_CATEGORIES.find(p => p.key === cat.key)) {
        return res.status(400).json({ success: false, error: `Unknown category key: ${cat.key}` });
      }

      const data: { isEnabled?: boolean; visibleToEmployees?: boolean } = {};
      if (cat.isEnabled          !== undefined) data.isEnabled          = cat.isEnabled;
      if (cat.visibleToEmployees !== undefined) data.visibleToEmployees = cat.visibleToEmployees;

      await prisma.orgCategory.upsert({
        where:  { orgId_categoryKey: { orgId, categoryKey: cat.key } },
        update: data,
        create: { orgId, categoryKey: cat.key, ...data },
      });
    }

    res.json({ success: true, message: 'Categories updated' });
  } catch (error) {
    console.error('updateOrgCategories error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
