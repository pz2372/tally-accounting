import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Loader2, CheckCircle } from 'lucide-react';
import '../css/ForgotPassword.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${import.meta.env.VITE_FIREBASE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestType: 'PASSWORD_RESET',
            email,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        const code = data?.error?.message || '';
        if (code.includes('EMAIL_NOT_FOUND')) {
          throw new Error('No account found with this email address');
        }
        throw new Error('Failed to send reset email. Please try again.');
      }

      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-page">
      <div className="forgot-container">
        <div className="forgot-card glass-card">
          {sent ? (
            <div className="forgot-success">
              <div className="forgot-success-icon">
                <CheckCircle size={48} />
              </div>
              <h1 className="forgot-title">Check your email</h1>
              <p className="forgot-subtitle">
                We've sent a password reset link to <strong>{email}</strong>. Check your inbox and follow the instructions to reset your password.
              </p>
              <Link to="/login" className="btn btn-glow forgot-btn">
                <ArrowLeft size={16} />
                Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <div className="forgot-icon">
                <Mail size={32} />
              </div>
              <h1 className="forgot-title">Forgot password?</h1>
              <p className="forgot-subtitle">
                Enter your email address and we'll send you a link to reset your password.
              </p>

              {error && (
                <div className="forgot-error">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="forgot-form">
                <div className="form-group">
                  <label className="form-label" htmlFor="reset-email">Email</label>
                  <input
                    id="reset-email"
                    type="email"
                    className="form-input"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    disabled={loading}
                    autoComplete="email"
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-glow forgot-btn"
                  disabled={loading || !email}
                >
                  {loading ? (
                    <Loader2 size={18} className="spin" />
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </form>

              <Link to="/login" className="forgot-back-link">
                <ArrowLeft size={14} />
                Back to Sign In
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
