class User {
  constructor(data) {
    this.uid = data.uid;
    this.email = data.email;
    this.displayName = data.displayName;
    this.photoURL = data.photoURL;
    this.role = data.role || 'employee'; // 'admin' or 'employee'
    this.businessId = data.businessId;
    this.emailVerified = data.emailVerified || false;
    this.createdBy = data.createdBy; // UID of admin who created this user
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  static ROLES = {
    ADMIN: 'admin',
    EMPLOYEE: 'employee'
  };

  static validate(data) {
    const errors = [];
    
    if (!data.email || !data.email.includes('@')) {
      errors.push('Valid email is required');
    }
    
    if (!data.role || ![User.ROLES.ADMIN, User.ROLES.EMPLOYEE].includes(data.role)) {
      errors.push('Valid role is required (admin or employee)');
    }
    
    return errors;
  }

  isAdmin() {
    return this.role === User.ROLES.ADMIN;
  }

  isEmployee() {
    return this.role === User.ROLES.EMPLOYEE;
  }
}

module.exports = User;
