import { Link } from 'react-router-dom';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import './Pricing.css';

const features = [
  'Unlimited team members',
  'Unlimited receipt scans',
  'Bank statement matching',
  'Expense categorization',
  'Sales report tracking',
  'Recurring charges',
  'Custom categories',
  'Priority support',
];

export default function Pricing() {
  return (
    <>
      <section className="pricing-hero">
        <div className="container">
          <h1 className="section-title">Simple, transparent pricing</h1>
          <p className="section-subtitle" style={{ marginBottom: 0 }}>
            Everything you need. One flat price. Start with a 14-day free trial.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="pricing-single">
            <div className="pricing-card card popular">
              <h3 className="plan-name">Tally</h3>
              <p className="plan-desc">Everything your business needs to take control of expenses.</p>
              <div className="plan-price">
                <span className="price-amount">$49</span>
                <span className="price-period">/month</span>
              </div>
              <Link to="/register" className="btn btn-primary plan-cta">
                Start Free Trial
              </Link>
              <ul className="plan-features">
                {features.map((f, i) => (
                  <li key={i}>
                    <CheckCircle2 size={16} className="feat-yes" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section section-alt">
        <div className="container">
          <h2 className="section-title">Frequently Asked Questions</h2>
          <div className="faq-grid">
            <div className="faq-item">
              <h4>Can I switch plans later?</h4>
              <p>
                Yes, you can upgrade or downgrade at any time. Changes take
                effect at the start of your next billing cycle.
              </p>
            </div>
            <div className="faq-item">
              <h4>What happens after the trial?</h4>
              <p>
                Your trial converts to a paid subscription. You can cancel
                anytime before the trial ends with no charge.
              </p>
            </div>
            <div className="faq-item">
              <h4>Is my data secure?</h4>
              <p>
                All data is encrypted in transit and at rest. We use
                industry-standard security measures and regularly audit
                our systems.
              </p>
            </div>
            <div className="faq-item">
              <h4>Do you offer annual pricing?</h4>
              <p>
                Yes! Annual plans give you 2 months free. Contact us for
                details on annual billing.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
