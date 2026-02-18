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
