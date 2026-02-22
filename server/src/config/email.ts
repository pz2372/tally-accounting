import nodemailer from 'nodemailer';

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendInviteEmail = async (
  to: string,
  inviteToken: string,
  orgName: string,
  inviterName?: string | null
) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const inviteLink = `${frontendUrl}/accept-invite/${inviteToken}`;

  await transporter.sendMail({
    from: `"Tally" <${process.env.SMTP_USER}>`,
    to,
    subject: `You've been invited to ${orgName} on Tally`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0f172a;color:#f1f5f9;border-radius:12px;">
        <h2 style="margin:0 0 8px;font-size:22px;">You're invited!</h2>
        <p style="color:#94a3b8;margin:0 0 24px;">
          ${inviterName ? `${inviterName} has` : 'You have been'} invited you to join <strong style="color:#f1f5f9;">${orgName}</strong> on Tally.
        </p>
        <p style="color:#94a3b8;margin:0 0 28px;">
          Click the button below to set up your password and get started.
        </p>
        <div style="text-align:center;margin:0 0 28px;">
          <a href="${inviteLink}" style="display:inline-block;padding:14px 32px;background:#6366F1;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;">
            Accept Invitation
          </a>
        </div>
        <p style="color:#64748b;margin:0;font-size:12px;">
          This invitation expires in 7 days. If you didn't expect this, you can safely ignore this email.
        </p>
      </div>
    `,
  });
};

export const sendVerificationEmail = async (
  to: string,
  code: string,
  name?: string | null
) => {
  await transporter.sendMail({
    from: `"Tally" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Your Tally Verification Code',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0f172a;color:#f1f5f9;border-radius:12px;">
        <h2 style="margin:0 0 8px;font-size:22px;">Verify your identity</h2>
        <p style="color:#94a3b8;margin:0 0 28px;">
          Hi${name ? ` ${name}` : ''}, use the code below to connect your bank accounts in Tally.
          This code expires in <strong>10 minutes</strong>.
        </p>
        <div style="background:#1e293b;border-radius:8px;padding:24px;text-align:center;letter-spacing:12px;font-size:32px;font-weight:800;color:#818cf8;">
          ${code}
        </div>
        <p style="color:#64748b;margin:20px 0 0;font-size:12px;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });
};
