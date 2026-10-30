import { MailService } from '@sendgrid/mail';

// Invite emails are optional: invites always produce a link the inviter can
// share, and these emails go out automatically once SENDGRID_API_KEY is set.
// EMAIL_FROM must be a sender verified in SendGrid.

let mailService: MailService | null = null;

if (process.env.SENDGRID_API_KEY) {
  mailService = new MailService();
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('[EMAIL-SERVICE] SendGrid initialized successfully');
} else {
  console.log('[EMAIL-SERVICE] SENDGRID_API_KEY not set: invites are shared as links, no emails sent');
}

export function emailConfigured() {
  return mailService !== null;
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

interface InviteEmailParams {
  toEmail: string;
  inviterName: string;
  workspaceName: string;
  projectName?: string | null;
  inviteUrl: string;
}

export async function sendInviteEmail(params: InviteEmailParams): Promise<boolean> {
  if (!mailService) return false;

  const target = params.projectName
    ? `the project "${params.projectName}" in ${params.workspaceName}`
    : params.workspaceName;
  const subject = `${params.inviterName} invited you to ${params.projectName ?? params.workspaceName} on Blupi`;
  const html = `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:24px;background:#F6F2EC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#14242E;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;padding:32px;">
      <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">
        <strong>${escapeHtml(params.inviterName)}</strong> invited you to join ${escapeHtml(target)} on Blupi, a tool for mapping customer journeys together.
      </p>
      <p style="margin:24px 0;">
        <a href="${escapeHtml(params.inviteUrl)}" style="display:inline-block;background:#2E6A8E;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:600;">Accept invitation</a>
      </p>
      <p style="margin:0;font-size:13px;line-height:1.5;color:#5D6C76;">
        Or open this link: ${escapeHtml(params.inviteUrl)}<br>
        The invitation expires in 7 days. If you weren't expecting it, you can ignore this email.
      </p>
    </div>
  </body>
</html>`;
  const text = `${params.inviterName} invited you to join ${target} on Blupi.

Accept the invitation: ${params.inviteUrl}

The invitation expires in 7 days. If you weren't expecting it, you can ignore this email.`;

  try {
    await mailService.send({
      to: params.toEmail,
      from: { email: process.env.EMAIL_FROM || 'noreply@blupi.io', name: 'Blupi' },
      subject,
      html,
      text,
    });
    return true;
  } catch (error) {
    console.error('[EMAIL-SERVICE] Sending invite email failed:', error);
    return false;
  }
}
