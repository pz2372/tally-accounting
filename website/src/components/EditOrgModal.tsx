import { useState } from 'react';
import { X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { API_BASE, getAuthHeaders } from '../utils/dashboardApi';
import type { OrgInfo } from '../utils/dashboardApi';

interface EditOrgModalProps {
  org: OrgInfo;
  onClose: () => void;
  onSaved: (org: Partial<OrgInfo>) => void;
}

export default function EditOrgModal({ org, onClose, onSaved }: EditOrgModalProps) {
  const [name, setName] = useState(org.name);
  const [dba, setDba] = useState(org.dba || '');
  const [ein, setEin] = useState(org.ein || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/organizations`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(org.id),
        },
        body: JSON.stringify({
          name: name.trim(),
          dba: dba.trim() || undefined,
          ein: ein.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update organization');

      onSaved({
        id: org.id,
        name: data.organization.name,
        dba: data.organization.dba,
        ein: data.organization.ein,
        role: org.role,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update organization');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dash-modal-overlay" onClick={() => !saving && onClose()}>
      <div className="dash-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dash-modal-header">
          <h3>Edit Organization</h3>
          <button className="dash-modal-close" onClick={onClose} disabled={saving}>
            <X size={18} />
          </button>
        </div>
        <div className="dash-modal-content">
          {error && (
            <div className="dash-roles-state error" style={{ justifyContent: 'flex-start', padding: '12px 16px' }}>
              <AlertCircle size={16} />{error}
            </div>
          )}
          <div className="dash-form-group">
            <label className="dash-form-label">Organization Name</label>
            <input
              type="text"
              className="dash-org-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={saving}
              autoFocus
            />
          </div>
          <div className="dash-form-group">
            <label className="dash-form-label">DBA — Doing Business As</label>
            <input
              type="text"
              className="dash-org-input"
              placeholder="Optional"
              value={dba}
              onChange={(e) => setDba(e.target.value)}
              disabled={saving}
            />
          </div>
          <div className="dash-form-group">
            <label className="dash-form-label">EIN — Employer Identification Number</label>
            <input
              type="text"
              className="dash-org-input"
              placeholder="Optional"
              value={ein}
              onChange={(e) => setEin(e.target.value)}
              disabled={saving}
            />
          </div>
        </div>
        <div className="dash-modal-footer">
          <button className="dash-btn-outline" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            className="dash-btn-primary"
            onClick={handleSave}
            disabled={saving || !name.trim()}
          >
            {saving ? <Loader2 size={14} className="dash-spinner" /> : <CheckCircle2 size={14} />}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
