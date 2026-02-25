import { Link } from 'react-router-dom';
import '../css/Legal.css';

export default function PrivacyPolicy() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <Link to="/" className="legal-back">&larr; Back to Home</Link>
        <h1>Privacy Policy</h1>
        <p className="legal-updated">Last Updated: February 22, 2026</p>

        <section>
          <h2>Introduction</h2>
          <p>
            Tally ("we," "us," "our," or "the Company") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our expense management and receipt tracking application, including any related mobile applications and services (the "Service").
          </p>
          <p>
            Please read this Privacy Policy carefully. If you do not agree with our policies and practices, please do not use our Service.
          </p>
        </section>

        <section>
          <h2>1. Information We Collect</h2>
          <p>We collect information in multiple ways:</p>
          <h3>Information You Provide Directly:</h3>
          <ul>
            <li>Account registration (name, email, phone number, password)</li>
            <li>Business information (business name, EIN, DBA, organization details)</li>
            <li>Financial data (expense details, amounts, merchants, categories, payment methods)</li>
            <li>Receipt images, bank statements, and transaction records</li>
            <li>Bank account information via Plaid integration for transaction syncing</li>
            <li>Support communications and customer service inquiries</li>
          </ul>
          <h3>Information Collected Automatically:</h3>
          <ul>
            <li>Device information (device type, OS, app version)</li>
            <li>Usage analytics (features accessed, time spent, interactions)</li>
            <li>Crash reports and performance data</li>
            <li>Location data (only if you grant permission)</li>
          </ul>
        </section>

        <section>
          <h2>2. How We Use Your Information</h2>
          <p>We use the information we collect for the following purposes:</p>
          <ul>
            <li>To provide, maintain, and improve the Service</li>
            <li>To process and manage your expenses and financial records</li>
            <li>To match bank transactions with submitted receipts</li>
            <li>To manage user accounts and provide customer support</li>
            <li>To detect, prevent, and address fraud or technical issues</li>
            <li>To send service notifications and support messages</li>
            <li>To analyze usage patterns and improve user experience</li>
            <li>To comply with legal and regulatory obligations</li>
          </ul>
        </section>

        <section>
          <h2>3. Data Security & Encryption</h2>
          <p>We implement industry-standard security measures to protect your data:</p>
          <ul>
            <li>End-to-end encryption for data in transit (HTTPS/TLS)</li>
            <li>Encryption of sensitive data at rest in our databases</li>
            <li>Regular security audits and penetration testing</li>
            <li>Access controls and role-based permissions for employee accounts</li>
            <li>Secure authentication with Firebase</li>
          </ul>
          <p>
            While we implement these protections, no security system is impenetrable. You acknowledge the inherent risks of internet transmission.
          </p>
        </section>

        <section>
          <h2>4. Data Sharing & Third Parties</h2>
          <p>
            We do not sell, trade, or rent your personal information to third parties. We may share your information only in these circumstances:
          </p>
          <ul>
            <li>With your explicit consent or at your direction</li>
            <li>With service providers (Plaid for bank integration, Stripe for payments, Firebase for authentication)</li>
            <li>With other organization members if you granted them access</li>
            <li>To comply with court orders, subpoenas, or legal requirements</li>
            <li>To protect against fraud or security threats</li>
          </ul>
          <p>
            Our service providers are contractually obligated to maintain the confidentiality and security of your information.
          </p>
        </section>

        <section>
          <h2>5. Your Privacy Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access and download your personal data</li>
            <li>Correct or update inaccurate information</li>
            <li>Request deletion of your account and associated data</li>
            <li>Opt out of certain data processing activities</li>
            <li>Withdraw consent at any time</li>
          </ul>
          <p>
            To exercise these rights, contact us at support@tallyapp.com with proof of your identity.
          </p>
        </section>

        <section>
          <h2>6. Data Retention</h2>
          <p>
            We retain your data for as long as your account is active and needed to provide our services. After account deletion:
          </p>
          <ul>
            <li>Personal data is deleted within 30 days</li>
            <li>Financial records may be retained longer for tax compliance (typically 7 years)</li>
            <li>Backup copies are retained for disaster recovery purposes</li>
          </ul>
        </section>

        <section>
          <h2>7. Children's Privacy</h2>
          <p>
            Tally is not intended for children under 18 years of age. We do not knowingly collect personal information from children under 18. If we become aware of such collection, we will take steps to delete such information promptly.
          </p>
        </section>

        <section>
          <h2>8. International Data Transfers</h2>
          <p>
            Your data may be processed and stored in the United States or other countries where our servers are located. By using Tally, you consent to the transfer of your information to countries outside your country of residence, which may have different data protection rules.
          </p>
        </section>

        <section>
          <h2>9. Changes to This Privacy Policy</h2>
          <p>
            We may update this Privacy Policy periodically. We will notify you of material changes by posting the updated policy in the app and updating the "Last Updated" date. Continued use of our Service constitutes acceptance of the updated Privacy Policy.
          </p>
        </section>

        <section>
          <h2>10. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy or our data practices, please contact us.
          </p>
        </section>
      </div>
    </div>
  );
}
