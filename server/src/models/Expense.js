class Expense {
  constructor(data) {
    this.id = data.id;
    this.vendor = data.vendor;
    this.amount = data.amount;
    this.category = data.category;
    this.date = data.date;
    this.description = data.description;
    this.notes = data.notes;
    this.receipt = data.receipt;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  static validate(data) {
    const errors = [];
    
    if (!data.vendor || data.vendor.trim() === '') {
      errors.push('Vendor is required');
    }
    
    if (!data.amount || isNaN(data.amount) || data.amount <= 0) {
      errors.push('Valid amount is required');
    }
    
    if (!data.category || data.category.trim() === '') {
      errors.push('Category is required');
    }
    
    if (!data.date) {
      errors.push('Date is required');
    }
    
    return errors;
  }
}

module.exports = Expense;
