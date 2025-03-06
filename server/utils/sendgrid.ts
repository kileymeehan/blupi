import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

interface InvitationEmailParams {
  to: string;
  projectName: string;
  role: string;
  inviterName: string;
}

export async function sendProjectInvitation({
  to,
  projectName,
  role,
  inviterName
}: InvitationEmailParams) {
  const msg = {
    to,
    from: process.env.SENDGRID_VERIFIED_SENDER || 'noreply@blueprint-app.com', // Replace with your verified sender
    subject: `You've been invited to collaborate on ${projectName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Project Invitation</h2>
        <p>Hi there!</p>
        <p>${inviterName} has invited you to collaborate on <strong>${projectName}</strong> as a <strong>${role}</strong>.</p>
        <p>What you'll be able to do:</p>
        <ul>
          ${getRoleCapabilities(role)}
        </ul>
        <p>Click the button below to accept the invitation:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.VITE_APP_URL || 'http://localhost:5000'}/accept-invite" 
             style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Accept Invitation
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">
          If you don't have an account yet, you'll be able to create one when you accept the invitation.
        </p>
      </div>
    `
  };

  try {
    await mailService.send(msg);
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    if (error.response) {
      console.error('SendGrid error response:', error.response.body);
    }
    return false;
  }
}

function getRoleCapabilities(role: string): string {
  switch (role) {
    case 'admin':
      return `
        <li>Create and edit blueprints</li>
        <li>Manage team members</li>
        <li>Configure project settings</li>
        <li>Full access to all features</li>
      `;
    case 'editor':
      return `
        <li>Create and edit blueprints</li>
        <li>Add comments and feedback</li>
        <li>Collaborate in real-time</li>
      `;
    case 'viewer':
      return `
        <li>View all blueprints</li>
        <li>Add comments and feedback</li>
        <li>Track project progress</li>
      `;
    default:
      return '';
  }
}