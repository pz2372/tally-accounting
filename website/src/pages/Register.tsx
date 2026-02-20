import { useState, type FormEvent } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './Register.css';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/api\/?$/, '').replace(/\/$/, '') + '/api';

interface FormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  orgName: string;
}

interface FormErrors {
  [key: string]: string;
}

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const [form, setForm] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    orgName: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const update = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
    setApiError('');
  };

  const validateStep1 = (): boolean => {
    const errs: FormErrors = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Invalid email';
    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 6) errs.password = 'At least 6 characters';
    if (form.password !== form.confirmPassword)
      errs.confirmPassword = 'Passwords do not match';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = (): boolean => {
    const errs: FormErrors = {};
    if (!form.orgName.trim()) errs.orgName = 'Organization name is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = (e: FormEvent) => {
    e.preventDefault();
    if (validateStep1()) setStep(2);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateStep2()) return;

    setLoading(true);
    setApiError('');

    try {
      // 1. Register the user
      const registerRes = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          name: form.name,
        }),
      });

      const registerData = await registerRes.json();

      if (!registerRes.ok) {
        throw new Error(registerData.error || 'Registration failed');
      }

      const { accessToken } = registerData;

      // 2. Create the organization
      const orgRes = await fetch(`${API_BASE}/organizations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: form.orgName,
        }),
      });

      const orgData = await orgRes.json();

      if (!orgRes.ok) {
        throw new Error(orgData.error || 'Failed to create organization');
      }

      // Store user with org so Dashboard has the org ID available
      const userWithOrg = {
        ...registerData.user,
        organizations: [{
          id: orgData.organization.id,
          name: orgData.organization.name,
          role: 'ADMIN',
        }],
      };
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('user', JSON.stringify(userWithOrg));
      navigate('/dashboard');
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="register-page">
      <div className="register-container">
        <div className="register-card card animate-in">
          {/* Step indicator */}
          <div className="step-indicator">
            <div className={`step ${step >= 1 ? 'active' : ''}`}>
              <span className="step-num">1</span>
              <span className="step-label">Account</span>
            </div>
            <div className="step-line" />
            <div className={`step ${step >= 2 ? 'active' : ''}`}>
              <span className="step-num">2</span>
              <span className="step-label">Organization</span>
            </div>
          </div>

          {apiError && <div className="api-error">{apiError}</div>}

          {step === 1 && (
            <form onSubmit={handleNext}>
              <h2 className="register-title">Create your account</h2>
              <p className="register-subtitle">
                Start your 14-day free trial. No credit card required.
              </p>

              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input
                  id="name"
                  type="text"
                  placeholder="Jane Smith"
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                />
                {errors.name && (
                  <div className="form-error">{errors.name}</div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  placeholder="jane@restaurant.com"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                />
                {errors.email && (
                  <div className="form-error">{errors.email}</div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                />
                {errors.password && (
                  <div className="form-error">{errors.password}</div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repeat your password"
                  value={form.confirmPassword}
                  onChange={(e) => update('confirmPassword', e.target.value)}
                />
                {errors.confirmPassword && (
                  <div className="form-error">{errors.confirmPassword}</div>
                )}
              </div>

              <button type="submit" className="btn btn-primary btn-large register-btn">
                Continue
                <ArrowRight size={18} />
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit}>
              <h2 className="register-title">Set up your organization</h2>
              <p className="register-subtitle">
                This is the business or restaurant you'll be tracking expenses for.
              </p>

              <div className="form-group">
                <label htmlFor="orgName">Organization Name</label>
                <input
                  id="orgName"
                  type="text"
                  placeholder="Joe's Pizza"
                  value={form.orgName}
                  onChange={(e) => update('orgName', e.target.value)}
                />
                {errors.orgName && (
                  <div className="form-error">{errors.orgName}</div>
                )}
              </div>

              <div className="register-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setStep(1)}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-large"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="spinner" />
                      Creating...
                    </>
                  ) : (
                    <>
                      Create Account
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
