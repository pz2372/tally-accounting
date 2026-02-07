# Prisma Setup and Migration Guide

## Initial Setup

1. **Configure your database connection**
   ```bash
   # Copy the example env file
   cp .env.example .env
   
   # Edit .env and set your DATABASE_URL
   # Example: DATABASE_URL="postgresql://user:password@localhost:5432/tally_db"
   ```

2. **Generate Prisma Client**
   ```bash
   npx prisma generate
   ```

3. **Create and run your first migration**
   ```bash
   npx prisma migrate dev --name init
   ```

4. **Seed default categories (optional)**
   ```bash
   # Make a POST request to your API
   curl -X POST http://localhost:3000/api/categories/seed
   ```

## Common Prisma Commands

- **Create a new migration**: `npx prisma migrate dev --name <migration_name>`
- **Apply migrations in production**: `npx prisma migrate deploy`
- **View your database**: `npx prisma studio`
- **Reset database**: `npx prisma migrate reset` (⚠️ deletes all data)
- **Pull schema from existing DB**: `npx prisma db pull`
- **Regenerate client after schema changes**: `npx prisma generate`

## Schema Changes Workflow

1. Edit `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name <describe_your_change>`
3. Prisma will auto-generate the client

## Database Structure

### User
- Stores user profile data linked to Firebase Auth via `uid`
- Includes role (admin/employee) and business association

### Category
- Expense categories with icons and colors
- Can be active/inactive

### Expense
- Linked to User and Category
- Includes vendor, amount, date, receipt, and notes

## Firebase + Prisma Flow

1. User authenticates with Firebase Auth (mobile/web)
2. Request includes Firebase ID token
3. Auth middleware verifies token with Firebase
4. Middleware creates/fetches User from Prisma by Firebase UID
5. Controllers use Prisma to query/mutate data
6. User ID from Prisma is used for all relations
