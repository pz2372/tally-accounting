import { useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { API_BASE, getAuthHeaders } from '../utils/dashboardApi';
import type { OrgInfo } from '../utils/dashboardApi';

interface CreateOrgFormProps {
  onCreated: (org: OrgInfo) => void;
  onCancel: () => void;
}

export default function CreateOrgForm({ onCreated, onCancel }: CreateOrgFormProps) {
  const [orgName, setOrgName] = useState('');
  const [orgDBA, setOrgDBA] = useState('');
  const [orgEIN, setOrgEIN] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!orgName.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/organizations/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          name: orgName.trim(),
          dba: orgDBA.trim() || undefined,
          ein: orgEIN.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start checkout');

      // Redirect to Stripe Checkout
      window.location.href = data.checkoutUrl;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create organization');
      setSubmitting(false);
    }
  };

  return (
    <div className="dash-create-org-wrapper">
      <div className="dash-card" style={{ maxWidth: 520 }}>
        <h3 className="dash-card-title">Create Organization</h3>

        {error && (
          <div className="dash-roles-state error" style={{ justifyContent: 'flex-start', marginBottom: 16, padding: '12px 16px' }}>
            <AlertCircle size={16} />{error}
          </div>
        )}

        <div className="dash-org-form">
          <input
            type="text"
            className="dash-org-input"
            placeholder="Organization name (required)"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
            disabled={submitting}
          />
          <input
            type="text"
            className="dash-org-input"
            placeholder="DBA — Doing Business As (optional)"
            value={orgDBA}
            onChange={(e) => setOrgDBA(e.target.value)}
            disabled={submitting}
          />
          <input
            type="text"
            className="dash-org-input"
            placeholder="EIN — Employer Identification Number (optional)"
            value={orgEIN}
            onChange={(e) => setOrgEIN(e.target.value)}
            disabled={submitting}
          />
          <div className="dash-org-form-actions">
            <button className="dash-btn-outline" onClick={onCancel} disabled={submitting}>
              Cancel
            </button>
            <button
              className="dash-btn-primary"
              onClick={handleCreate}
              disabled={submitting || !orgName.trim()}
            >
              {submitting ? <><Loader2 size={14} className="dash-spinner" /> Redirecting to payment…</> : 'Continue to Payment — $49'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
