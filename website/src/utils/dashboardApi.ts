export const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/api\/?$/, '').replace(/\/$/, '') + '/api';

export function getAuthHeaders(orgId?: string): Record<string, string> {
  const token = localStorage.getItem('accessToken');
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  if (orgId) {
    headers['x-org-id'] = orgId;
  } else {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const firstOrgId = user?.organizations?.[0]?.id;
      if (firstOrgId) headers['x-org-id'] = firstOrgId;
    } catch { /* ignore */ }
  }
  return headers;
}

export interface OrgInfo {
  id: string;
  name: string;
  role: string;
  dba?: string;
  ein?: string;
}

export interface PlaidAccountData {
  id: string;
  accountId: string;
  name: string;
  officialName: string | null;
  type: string;
  subtype: string | null;
  mask: string | null;
  currentBalance: number | null;
  availableBalance: number | null;
  currency: string;
}

export interface PlaidItemData {
  id: string;
  institutionName: string | null;
  accounts: PlaidAccountData[];
}
