export interface InvitationEmailData {
  recipientEmail: string;
  recipientName?: string;
  companyName: string;
  role: string;
  type: string;
  inviterName?: string;
  inviterEmail: string;
  signupUrl: string;
}

export function generateInvitationEmailHTML(data: InvitationEmailData): string {
  const roleDisplay = data.role.charAt(0).toUpperCase() + data.role.slice(1);
  const typeDisplay = data.type === 'office' ? 'Office Staff' : 'Field Staff';
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited to Join ${data.companyName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">OmniFlow</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 24px; font-weight: 600;">You've Been Invited!</h2>
              
              <p style="margin: 0 0 16px; color: #4a5568; font-size: 16px; line-height: 1.6;">
                ${data.inviterName || data.inviterEmail} has invited you to join <strong>${data.companyName}</strong> on OmniFlow.
              </p>
              
              <div style="background-color: #f7fafc; border-left: 4px solid #667eea; padding: 16px; margin: 24px 0; border-radius: 4px;">
                <p style="margin: 0 0 8px; color: #2d3748; font-size: 14px;">
                  <strong>Your Role:</strong> ${roleDisplay}
                </p>
                <p style="margin: 0; color: #2d3748; font-size: 14px;">
                  <strong>Position Type:</strong> ${typeDisplay}
                </p>
              </div>
              
              <p style="margin: 24px 0 16px; color: #4a5568; font-size: 16px; line-height: 1.6;">
                To get started, click the button below to create your account:
              </p>
              
              <div style="text-align: center; margin: 32px 0;">
                <a href="${data.signupUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
                  Create Your Account
                </a>
              </div>
              
              <div style="background-color: #fff5e6; border: 1px solid #ffd699; padding: 16px; margin: 24px 0; border-radius: 4px;">
                <p style="margin: 0 0 8px; color: #856404; font-size: 14px; font-weight: 600;">
                  ⚠️ Important:
                </p>
                <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.5;">
                  When you sign up, make sure to use this exact email address: <strong>${data.recipientEmail}</strong>
                </p>
              </div>
              
              <p style="margin: 24px 0 0; color: #718096; font-size: 14px; line-height: 1.6;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 8px 0 0; color: #4299e1; font-size: 14px; word-break: break-all;">
                ${data.signupUrl}
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f7fafc; border-top: 1px solid #e2e8f0; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 8px; color: #718096; font-size: 13px; text-align: center;">
                This invitation was sent by ${data.inviterEmail}
              </p>
              <p style="margin: 0; color: #a0aec0; font-size: 12px; text-align: center;">
                © ${new Date().getFullYear()} OmniFlow. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
        
        <!-- Below email notice -->
        <p style="margin: 24px 0 0; color: #a0aec0; font-size: 12px; text-align: center; max-width: 600px;">
          If you didn't expect this invitation, you can safely ignore this email.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function generateInvitationEmailSubject(companyName: string): string {
  return `You've been invited to join ${companyName} on OmniFlow`;
}
