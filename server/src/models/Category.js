class Category {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.icon = data.icon;
    this.color = data.color;
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  static getDefaultCategories() {
    return [
      { id: '1', name: 'Miscellaneous', icon: 'apps-outline', color: '#6B7280', isActive: true },
      { id: '2', name: 'Labor', icon: 'people-outline', color: '#9333EA', isActive: true },
      { id: '3', name: 'Inventory', icon: 'cube-outline', color: '#10B981', isActive: true },
      { id: '4', name: 'Operations', icon: 'settings-outline', color: '#F59E0B', isActive: true },
      { id: '5', name: 'Tax', icon: 'calculator-outline', color: '#EF4444', isActive: true },
      { id: '6', name: 'Transportation', icon: 'car-outline', color: '#3B82F6', isActive: true }
    ];
  }
}

module.exports = Category;
