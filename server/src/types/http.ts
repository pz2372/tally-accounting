import { Request } from 'express';

export interface AuthUser {
  id?: string;
  uid?: string;
  userId?: string;
  email?: string;
  name?: string | null;
  emailVerified?: boolean;
  orgId?: string | null;
  role?: string | null;
  permissions?: string[];
  memberships?: Array<{
    orgId: string;
    orgName: string;
    role?: string | null;
    permissions?: string[];
  }>;
  businessId?: string;
}

export type AuthenticatedRequest = Request & { user?: AuthUser };
