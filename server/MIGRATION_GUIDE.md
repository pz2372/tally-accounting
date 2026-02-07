# Updated Schema - Migration Guide

## What Changed

Your schema has been upgraded from a simple single-tenant structure to a **multi-tenant organization system** with advanced features:

### Old Structure
- Users with Firebase UID
- Simple expenses tied to users
- Categories as separate entities

### New Structure
- Organizations (multi-tenant)
- Users can belong to multiple organizations
- Role-based permissions (ADMIN, EMPLOYEE)
- Receipts with OCR support
- Card statement upload and matching
- Expenses linked to receipts
- Categories are now just strings on expenses

## Updated Files

### Auth Middleware ([src/middleware/auth.js](src/middleware/auth.js))
- Finds users by **email** (not Firebase UID)
- Auto-creates users on first login
- Loads organization memberships
- Sets `req.user.orgId` from `x-org-id` header
- New `requireOrg` middleware to enforce organization context

### Controllers

#### [authController.js](src/controllers/authController.js)
- Returns user with all organization memberships
- Profile updates simplified (name only)

#### [expenseController.js](src/controllers/expenseController.js)
- All queries scoped to organization
- Linked to receipts
- Includes receipt matching data
- Category is now a string field
- Added `getCategories()` to list used categories
- Filters: date range, category, amount range

#### [organizationController.js](src/controllers/organizationController.js) - NEW
- Create organization
- Invite members
- Update member roles/permissions
- Remove members
- Get organization details

#### [receiptController.js](src/controllers/receiptController.js) - NEW
- Upload receipts with OCR data
- List receipts (with filters)
- Update receipt data
- Convert receipt to expense
- Delete receipts

#### [categoryController.js](src/controllers/categoryController.js)
- Simplified to return list of used categories
- Includes default suggestions
- Categories are no longer database entities

## API Changes

### Headers Required
All organization-scoped requests need:
```
Authorization: Bearer <firebase-token>
x-org-id: <organization-id>
```

### New Endpoints

**Organizations:**
- `POST /api/organizations` - Create org
- `GET /api/organizations/:id` - Get org details
- `PUT /api/organizations/:id` - Update org
- `GET /api/organizations/:id/members` - List members
- `POST /api/organizations/:id/invite` - Invite member
- `PUT /api/organizations/:id/members/:memberId` - Update member
- `DELETE /api/organizations/:id/members/:memberId` - Remove member

**Receipts:**
- `POST /api/receipts` - Upload receipt
- `GET /api/receipts` - List receipts
- `GET /api/receipts/:id` - Get receipt
- `PUT /api/receipts/:id` - Update receipt
- `DELETE /api/receipts/:id` - Delete receipt
- `POST /api/receipts/:id/convert` - Convert to expense

**Expenses:**
- `GET /api/expenses?startDate=&endDate=&category=&minAmount=&maxAmount=`
- `POST /api/expenses` - body includes `receiptId` (optional)
- Amount is now `amountCents` (integer)
- Date is now `expenseDate`

## Migration Steps

1. **Set up your database:**
   ```bash
   cp .env.example .env
   # Add DATABASE_URL
   ```

2. **Generate Prisma client:**
   ```bash
   npx prisma generate
   ```

3. **Run migration:**
   ```bash
   npx prisma migrate dev --name multi_tenant_organizations
   ```

4. **Create your first organization:**
   ```bash
   # After logging in, call:
   POST /api/organizations
   {
     "name": "My Restaurant"
   }
   ```

5. **Use the organization in requests:**
   Add `x-org-id` header to all subsequent requests

## Permission System

### Roles
- `ADMIN` - Full access to everything
- `EMPLOYEE` - Limited access based on permissions

### Permissions
Fine-grained control for employees:
- `RECEIPT_CREATE`, `RECEIPT_EDIT`, `RECEIPT_VIEW`, `RECEIPT_DELETE`
- `EXPENSE_CREATE`, `EXPENSE_EDIT`, `EXPENSE_VIEW`, `EXPENSE_DELETE`
- `STATEMENT_UPLOAD`, `STATEMENT_VIEW`, `STATEMENT_DELETE`
- `MATCH_RUN`, `MATCH_REVIEW`
- `MEMBER_INVITE`, `MEMBER_EDIT`, `MEMBER_REMOVE`
- `BILLING_MANAGE`

Admins bypass permission checks.

## Next Steps

1. Update your routes to include new controllers
2. Add statement upload controller (if needed)
3. Add matching algorithm controller (if needed)
4. Update mobile app to:
   - Select organization after login
   - Send `x-org-id` header
   - Handle receipt upload
   - Display receipt-expense relationships

## Database Commands

```bash
# View data in browser
npx prisma studio

# Reset everything (⚠️ deletes data)
npx prisma migrate reset

# Deploy to production
npx prisma migrate deploy
```
