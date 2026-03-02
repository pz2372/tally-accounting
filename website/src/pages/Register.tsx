import { useState, useEffect, type FormEvent } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import '../css/Register.css';

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
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [completingRegistration, setCompletingRegistration] = useState(false);

  const [form, setForm] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    orgName: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});

  // Handle return from Stripe
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const canceled = searchParams.get('checkout_canceled');

    if (canceled) {
      window.history.replaceState({}, '', '/register');
      setApiError('Payment was canceled. Please try again.');
      const saved = localStorage.getItem('registerFormData');
      if (saved) {
        const parsed = JSON.parse(saved);
        setForm(parsed);
        setStep(2);
      }
      return;
    }

    if (sessionId) {
      setCompletingRegistration(true);
      const saved = localStorage.getItem('registerFormData');
      if (!saved) {
        setCompletingRegistration(false);
        setApiError('Registration data not found. Please try again.');
        window.history.replaceState({}, '', '/register');
        return;
      }

      const parsed = JSON.parse(saved);

      fetch(`${API_BASE}/auth/complete-registration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          password: parsed.password,
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            localStorage.removeItem('registerFormData');
            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('user', JSON.stringify(data.user));
            window.history.replaceState({}, '', '/register');
            navigate('/dashboard');
          } else {
            throw new Error(data.error || 'Registration failed');
          }
        })
        .catch((err) => {
          setCompletingRegistration(false);
          setApiError(err instanceof Error ? err.message : 'Registration failed');
          window.history.replaceState({}, '', '/register');
        });
    }
  }, []);

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
      // Save form data to localStorage before Stripe redirect
      localStorage.setItem('registerFormData', JSON.stringify(form));

      const res = await fetch(`${API_BASE}/auth/register-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          orgName: form.orgName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to start checkout');
      }

      // Redirect to Stripe Checkout
      window.location.href = data.checkoutUrl;
    } catch (err: unknown) {
      localStorage.removeItem('registerFormData');
      setApiError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  };

  if (completingRegistration) {
    return (
      <section className="register-page">
        <div className="register-container">
          <div className="register-card card animate-in" style={{ textAlign: 'center', padding: '3rem' }}>
            <Loader2 size={40} className="spinner" style={{ margin: '0 auto 1rem' }} />
            <h2 className="register-title">Setting up your account...</h2>
            <p className="register-subtitle">Please wait while we complete your registration.</p>
          </div>
        </div>
      </section>
    );
  }

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
                Get started with Tally for $49.
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
                      Redirecting...
                    </>
                  ) : (
                    <>
                      Continue to Payment — $49/mo
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
