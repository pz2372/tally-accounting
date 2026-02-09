declare namespace Express {
  interface Request {
    user?: {
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
    };
  }
}
