import { Resend } from 'resend';

// ── Resend Client ──────────────────────────────────────────────────────────
const RESEND_API_KEY = process.env.RESEND_API_KEY;

let resend: Resend | null = null;

function getResend(): Resend {
  if (!resend) {
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not set — email cannot be sent');
    }
    resend = new Resend(RESEND_API_KEY);
  }
  return resend;
}

// Use Resend's default sender for unverified domains; swap to your verified domain
const FROM_EMAIL = process.env.EMAIL_FROM || 'Wrkly <noreply@wrkly.in>';

// Frontend URL for links in emails
const APP_URL = process.env.CORS_ORIGIN?.split(',')[0]?.trim() || 'http://localhost:3000';

// ── Welcome Email ──────────────────────────────────────────────────────────

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  try {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to,
      subject: 'Welcome to Wrkly! 🎉',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px; color: #1a1a2e;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="font-size: 28px; font-weight: 700; margin: 0; color: #4F6AF6;">Wrkly</h1>
          </div>
          <h2 style="font-size: 22px; font-weight: 600; margin: 0 0 16px;">Welcome aboard, ${name}!</h2>
          <p style="font-size: 15px; line-height: 1.6; color: #555; margin: 0 0 24px;">
            Your account is ready. You can now create workspaces, build boards, and supercharge your workflow with AI.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${APP_URL}/workspaces" style="display: inline-block; padding: 12px 32px; background: #4F6AF6; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
              Go to Wrkly →
            </a>
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
          <p style="font-size: 12px; color: #999; text-align: center;">
            You received this email because you signed up for Wrkly. If this wasn't you, you can safely ignore this email.
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error('[email] Failed to send welcome email:', err);
    // Non-critical — don't throw; the user is already registered
  }
}

// ── Password Reset Email ───────────────────────────────────────────────────

export async function sendPasswordResetEmail(to: string, name: string, resetToken: string): Promise<void> {
  const resetLink = `${APP_URL}/reset-password?token=${encodeURIComponent(resetToken)}`;

  try {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to,
      subject: 'Reset your Wrkly password',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px; color: #1a1a2e;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="font-size: 28px; font-weight: 700; margin: 0; color: #4F6AF6;">Wrkly</h1>
          </div>
          <h2 style="font-size: 22px; font-weight: 600; margin: 0 0 16px;">Reset your password</h2>
          <p style="font-size: 15px; line-height: 1.6; color: #555; margin: 0 0 8px;">
            Hi ${name},
          </p>
          <p style="font-size: 15px; line-height: 1.6; color: #555; margin: 0 0 24px;">
            We received a request to reset your password. Click the button below to choose a new one. This link expires in 1 hour.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetLink}" style="display: inline-block; padding: 12px 32px; background: #4F6AF6; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
              Reset Password
            </a>
          </div>
          <p style="font-size: 13px; color: #777; margin: 24px 0 0;">
            If you didn't request this, just ignore this email — your password won't change.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
          <p style="font-size: 12px; color: #999; text-align: center;">
            This link expires in 1 hour. If you need help, contact support.
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error('[email] Failed to send password reset email:', err);
    // Still throw — if this fails the user can't reset their password
    throw new Error('Failed to send password reset email. Please try again.');
  }
}
