import { MailService } from '@sendgrid/mail';
import { isProduction } from '../config/environment';

let mailService: MailService | null = null;

if (process.env.SENDGRID_API_KEY) {
  mailService = new MailService();
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('[EMAIL-SERVICE] SendGrid initialized successfully');
} else {
  if (isProduction()) {
    throw new Error('SENDGRID_API_KEY environment variable is required in production');
  }
  console.warn('[EMAIL-SERVICE] SendGrid API key not configured - email features will be disabled in development');
}

interface InviteEmailParams {
  toEmail: string;
  toName?: string;
  inviterName: string;
  teamName: string;
  inviteToken: string;
  appUrl: string;
}

export async function sendTeamInviteEmail(params: InviteEmailParams): Promise<boolean> {
  if (!mailService) {
    console.warn('[EMAIL-SERVICE] Cannot send invite email - SendGrid not configured');
    return false;
  }
  
  try {
    const inviteUrl = `${params.appUrl}/invite/${params.inviteToken}`;
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #302E87; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e1e5e9; }
            .button { display: inline-block; background: #302E87; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .footer { color: #666; font-size: 14px; text-align: center; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>You're invited to join ${params.teamName}</h1>
            </div>
            <div class="content">
              <p>Hi${params.toName ? ` ${params.toName}` : ''},</p>
              
              <p><strong>${params.inviterName}</strong> has invited you to collaborate on <strong>${params.teamName}</strong> using Blupi - a collaborative blueprint design platform.</p>
              
              <p>With Blupi, you can:</p>
              <ul>
                <li>Create and share customer journey blueprints</li>
                <li>Collaborate in real-time with your team</li>
                <li>Organize projects and track progress</li>
                <li>Add comments and feedback on designs</li>
              </ul>
              
              <p>Click the button below to accept the invitation and create your account:</p>
              
              <div style="text-align: center;">
                <a href="${inviteUrl}" class="button">Accept Invitation</a>
              </div>
              
              <p>Or copy and paste this link into your browser:</p>
              <p style="background: #f5f5f5; padding: 10px; border-radius: 4px; word-break: break-all;">${inviteUrl}</p>
              
              <p>This invitation will expire in 7 days.</p>
            </div>
            <div class="footer">
              <p>Powered by Blupi - Collaborative Blueprint Design</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await mailService.send({
      to: params.toEmail,
      from: {
        email: 'noreply@blupi.io',
        name: 'Blupi Team'
      },
      subject: `You're invited to join ${params.teamName} on Blupi`,
      html: emailHtml,
      text: `
        Hi${params.toName ? ` ${params.toName}` : ''},
        
        ${params.inviterName} has invited you to collaborate on ${params.teamName} using Blupi.
        
        Accept your invitation: ${inviteUrl}
        
        This invitation will expire in 7 days.
        
        Powered by Blupi - Collaborative Blueprint Design
      `
    });
    
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}