const prisma = require('../config/database');

// Get all preset categories (system-wide)
exports.getAllPresetCategories = async (req, res) => {
  try {
    const presets = await prisma.presetCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    });
    
    res.json({ 
      success: true,
      categories: presets
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

// Get organization's enabled categories
exports.getOrgCategories = async (req, res) => {
  try {
    const { orgId } = req.user;
    
    if (!orgId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required'
      });
    }
    
    const orgCategories = await prisma.orgCategory.findMany({
      where: { 
        orgId,
        isEnabled: true
      },
      include: {
        preset: true
      },
      orderBy: { sortOrder: 'asc' }
    });
    
    res.json({ 
      success: true,
      categories: orgCategories.map(oc => ({
        id: oc.id,
        key: oc.preset.key,
        name: oc.customName || oc.preset.name,
        color: oc.preset.color,
        sortOrder: oc.sortOrder,
        presetId: oc.presetCategoryId
      }))
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

// Enable a preset category for the organization
exports.enableCategory = async (req, res) => {
  try {
    const { orgId, role } = req.user;
    const { presetCategoryId, customName, sortOrder } = req.body;
    
    if (role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }
    
    if (!presetCategoryId) {
      return res.status(400).json({
        success: false,
        error: 'Preset category ID is required'
      });
    }
    
    // Check if preset exists
    const preset = await prisma.presetCategory.findUnique({
      where: { id: presetCategoryId }
    });
    
    if (!preset) {
      return res.status(404).json({
        success: false,
        error: 'Preset category not found'
      });
    }
    
    // Create or update org category
    const orgCategory = await prisma.orgCategory.upsert({
      where: {
        orgId_presetCategoryId: {
          orgId,
          presetCategoryId
        }
      },
      update: {
        isEnabled: true,
        customName,
        sortOrder: sortOrder || 0
      },
      create: {
        orgId,
        presetCategoryId,
        isEnabled: true,
        customName,
        sortOrder: sortOrder || 0
      },
      include: {
        preset: true
      }
    });
    
    res.status(201).json({ 
      success: true,
      message: 'Category enabled successfully',
      category: orgCategory
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

// Update organization category (custom name, sort order)
exports.updateOrgCategory = async (req, res) => {
  try {
    const { orgId, role } = req.user;
    const { id } = req.params;
    const { customName, sortOrder, isEnabled } = req.body;
    
    if (role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }
    
    const updateData = {};
    if (customName !== undefined) updateData.customName = customName;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (isEnabled !== undefined) updateData.isEnabled = isEnabled;
    
    const orgCategory = await prisma.orgCategory.update({
      where: { id },
      data: updateData,
      include: {
        preset: true
      }
    });
    
    res.json({ 
      success: true,
      message: 'Category updated successfully',
      category: orgCategory
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

// Disable a category for the organization
exports.disableCategory = async (req, res) => {
  try {
    const { orgId, role } = req.user;
    const { id } = req.params;
    
    if (role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }
    
    await prisma.orgCategory.update({
      where: { id },
      data: { isEnabled: false }
    });
    
    res.json({ 
      success: true,
      message: 'Category disabled successfully'
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

// Seed default preset categories (system admin only - run once)
exports.seedPresetCategories = async (req, res) => {
  try {
    const defaultPresets = [
      { key: 'miscellaneous', name: 'Miscellaneous', color: '#6B7280', sortOrder: 0 },
      { key: 'labor', name: 'Labor', color: '#9333EA', sortOrder: 1 },
      { key: 'inventory', name: 'Inventory', color: '#10B981', sortOrder: 2 },
      { key: 'operations', name: 'Operations', color: '#F59E0B', sortOrder: 3 },
      { key: 'tax', name: 'Tax', color: '#EF4444', sortOrder: 4 },
      { key: 'transportation', name: 'Transportation', color: '#3B82F6', sortOrder: 5 },
      { key: 'food_supplies', name: 'Food & Supplies', color: '#10B981', sortOrder: 6 },
      { key: 'utilities', name: 'Utilities', color: '#F59E0B', sortOrder: 7 },
      { key: 'marketing', name: 'Marketing', color: '#EC4899', sortOrder: 8 },
      { key: 'equipment', name: 'Equipment', color: '#8B5CF6', sortOrder: 9 },
      { key: 'maintenance', name: 'Maintenance', color: '#F97316', sortOrder: 10 },
      { key: 'insurance', name: 'Insurance', color: '#06B6D4', sortOrder: 11 }
    ];
    
    const created = [];
    for (const preset of defaultPresets) {
      try {
        const category = await prisma.presetCategory.create({
          data: preset
        });
        created.push(category);
      } catch (error) {
        // Skip if already exists
        if (error.code !== 'P2002') throw error;
      }
    }
    
    res.json({ 
      success: true,
      message: `Seeded ${created.length} preset categories`,
      categories: created
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

module.exports = exports;
