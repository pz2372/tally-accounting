import { Link } from 'react-router-dom';
import '../css/Legal.css';

export default function TermsConditions() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <Link to="/" className="legal-back">&larr; Back to Home</Link>
        <h1>Terms & Conditions</h1>
        <p className="legal-updated">Last Updated: February 22, 2026</p>

        <section>
          <h2>1. Acceptance of Terms</h2>
          <p>
            By downloading, installing, and using Tally, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions ("Terms"). If you do not agree with any part of these Terms, you may not use our Service. These Terms constitute the entire agreement between you and Tally regarding your use of the Service.
          </p>
        </section>

        <section>
          <h2>2. Description of Service</h2>
          <p>
            Tally is a mobile application designed to help restaurants, food service businesses, and similar establishments manage expenses, track receipts, and match financial transactions. The Service includes:
          </p>
          <ul>
            <li>Expense tracking and categorization</li>
            <li>Receipt capture and OCR processing</li>
            <li>Bank transaction syncing via Plaid</li>
            <li>Receipt-to-transaction matching</li>
            <li>Financial reporting and analytics</li>
            <li>Team collaboration and role-based access</li>
          </ul>
        </section>

        <section>
          <h2>3. Use License & Acceptable Use</h2>
          <p>
            We grant you a limited, non-exclusive, non-transferable license to use Tally for lawful business purposes. You agree NOT to:
          </p>
          <ul>
            <li>Use the Service for any illegal or fraudulent purpose</li>
            <li>Reverse engineer, decompile, or attempt to derive the source code</li>
            <li>Transmit viruses, malware, or harmful code</li>
            <li>Attempt to gain unauthorized access to our systems or accounts</li>
            <li>Interfere with or disrupt the integrity or performance of the Service</li>
            <li>Remove any proprietary notices or labels</li>
            <li>Resell, redistribute, or sublicense the Service</li>
          </ul>
        </section>

        <section>
          <h2>4. User Accounts & Responsibility</h2>
          <p>When you create an account, you must:</p>
          <ul>
            <li>Provide accurate, complete, and truthful information</li>
            <li>Maintain the security and confidentiality of your credentials</li>
            <li>Take responsibility for all activities under your account</li>
            <li>Notify us immediately of unauthorized access</li>
          </ul>
          <p>
            You are solely responsible for all activities, transactions, and communications on your account. We are not liable for unauthorized access due to your negligence.
          </p>
        </section>

        <section>
          <h2>5. Financial Data & Disclaimer</h2>
          <p>Important Disclaimers:</p>
          <ul>
            <li>You are solely responsible for the accuracy of all financial data you enter</li>
            <li>Tally does NOT provide accounting, tax, or financial advice</li>
            <li>You should consult with qualified CPAs or accountants for tax matters</li>
            <li>Automated receipt matching may occasionally produce false positives or negatives</li>
            <li>You should regularly review all matched transactions for accuracy</li>
          </ul>
          <p>
            We are not liable for any financial, tax, or accounting consequences resulting from your use of Tally.
          </p>
        </section>

        <section>
          <h2>6. Subscription Plans & Payments</h2>
          <p>By subscribing to Tally, you agree to:</p>
          <ul>
            <li>Pay all fees according to your chosen subscription plan</li>
            <li>Provide current, valid billing information via Stripe</li>
            <li>Allow automatic renewal unless you cancel before the renewal date</li>
            <li>Cancellations must be made through the app settings</li>
          </ul>
          <p>
            Refunds are issued according to our refund policy. There are no refunds for partial subscription periods except as required by law.
          </p>
        </section>

        <section>
          <h2>7. Organization Members & Access Control</h2>
          <p>If you create an organization in Tally, you agree to:</p>
          <ul>
            <li>Only invite authorized team members to access the organization</li>
            <li>Assign appropriate roles and permissions to members</li>
            <li>Maintain control of member access and promptly remove inactive users</li>
            <li>Take responsibility for actions taken by invited members</li>
          </ul>
        </section>

        <section>
          <h2>8. Third-Party Integrations</h2>
          <p>
            Tally integrates with third-party services including Plaid (for banking) and Stripe (for payments). Your use of these integrations is governed by their respective terms of service. We are not responsible for:
          </p>
          <ul>
            <li>Service interruptions from third-party providers</li>
            <li>Changes to third-party APIs or services</li>
            <li>Data security practices of third-party providers</li>
          </ul>
        </section>

        <section>
          <h2>9. Intellectual Property Rights</h2>
          <p>
            The Tally application, including its design, features, functionality, and content, is owned by StrataLumen Labs and protected by copyright, trademark, and other intellectual property laws. You may not:
          </p>
          <ul>
            <li>Copy or reproduce any part of the Service without permission</li>
            <li>Use our trademarks or logos without authorization</li>
            <li>Create derivative works based on Tally</li>
          </ul>
        </section>

        <section>
          <h2>10. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, TALLY AND STRATALUMEN LABS SHALL NOT BE LIABLE FOR:
          </p>
          <ul>
            <li>Indirect, incidental, or consequential damages</li>
            <li>Loss of data, profits, revenue, or business</li>
            <li>Service interruptions or technical failures</li>
            <li>Inaccurate receipt matching or financial calculations</li>
          </ul>
          <p>
            Our total liability shall not exceed the amount you paid for Tally in the 12 months preceding the claim.
          </p>
        </section>

        <section>
          <h2>11. Disclaimer of Warranties</h2>
          <p>
            TALLY IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT ANY WARRANTIES, EXPRESS OR IMPLIED, INCLUDING:
          </p>
          <ul>
            <li>Warranties of merchantability or fitness for a particular purpose</li>
            <li>Warranties of accuracy or completeness of data</li>
            <li>Warranties of uninterrupted or error-free service</li>
          </ul>
        </section>

        <section>
          <h2>12. Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless Tally and StrataLumen Labs from any claims, damages, or costs arising from your violation of these Terms, misuse of the Service, or infringement of third-party rights through your use of the Service.
          </p>
        </section>

        <section>
          <h2>13. Account Termination</h2>
          <p>We may terminate your account immediately for:</p>
          <ul>
            <li>Violation of these Terms</li>
            <li>Illegal or fraudulent activity</li>
            <li>Non-payment of subscription fees</li>
            <li>Misuse of the Service or threat to security</li>
          </ul>
          <p>
            Upon termination, your access to the Service ceases immediately. You may request your data export before deletion, subject to applicable laws.
          </p>
        </section>

        <section>
          <h2>14. Data Backup & Recovery</h2>
          <p>
            While we maintain backups for disaster recovery purposes, we are not responsible for data loss due to your failure to maintain your own backups. We recommend regularly exporting your data for safekeeping.
          </p>
        </section>

        <section>
          <h2>15. Modifications to Service</h2>
          <p>
            We reserve the right to modify, suspend, or discontinue any part of Tally at any time. We will provide reasonable notice of material changes that negatively impact your use of the Service.
          </p>
        </section>

        <section>
          <h2>16. Governing Law & Jurisdiction</h2>
          <p>
            These Terms are governed by the laws of the United States, without regard to conflict of law principles. Any legal action or proceeding arising under these Terms shall be brought exclusively in the federal or state courts located in the jurisdiction where StrataLumen Labs is registered.
          </p>
        </section>

        <section>
          <h2>17. Severability</h2>
          <p>
            If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.
          </p>
        </section>

        <section>
          <h2>18. Changes to Terms</h2>
          <p>
            We may update these Terms at any time. Material changes will be posted in the app with at least 30 days' notice. Continued use of Tally constitutes acceptance of the updated Terms.
          </p>
        </section>

        <section>
          <h2>19. Contact & Support</h2>
          <p>
            For questions about these Terms, account issues, or support requests, please contact us.
          </p>
        </section>
      </div>
    </div>
  );
}
