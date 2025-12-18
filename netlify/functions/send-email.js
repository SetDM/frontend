const nodemailer = require("nodemailer");

// Create transporter with Gmail
const getTransporter = () => {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;

    if (!user || !pass) {
        return null;
    }

    return nodemailer.createTransport({
        service: "gmail",
        auth: { user, pass },
    });
};

// Email templates
const getInviteEmailHtml = ({ inviterName, workspaceName, role, inviteUrl }) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <tr>
            <td>
                <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <div style="text-align: center; margin-bottom: 32px;">
                        <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #18181b;">SetDM</h1>
                    </div>
                    
                    <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #18181b;">
                        You've been invited!
                    </h2>
                    
                    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #52525b;">
                        <strong>${inviterName || "Someone"}</strong> has invited you to join 
                        <strong>${workspaceName || "their workspace"}</strong> on SetDM as ${role === "admin" ? "an" : "a"} <strong>${role}</strong>.
                    </p>
                    
                    <p style="margin: 0 0 32px; font-size: 14px; line-height: 1.6; color: #71717a;">
                        SetDM helps automate Instagram DM conversations with AI.
                    </p>
                    
                    <div style="text-align: center; margin-bottom: 32px;">
                        <a href="${inviteUrl}" 
                           style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px;">
                            Accept Invite
                        </a>
                    </div>
                    
                    <p style="margin: 0 0 8px; font-size: 12px; color: #a1a1aa; text-align: center;">
                        Or copy and paste this link:
                    </p>
                    <p style="margin: 0 0 32px; font-size: 12px; color: #71717a; text-align: center; word-break: break-all;">
                        ${inviteUrl}
                    </p>
                    
                    <div style="background: #fef3c7; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px;">
                        <p style="margin: 0; font-size: 13px; color: #92400e;">
                            ⏰ This invite expires in 24 hours.
                        </p>
                    </div>
                    
                    <p style="margin: 0; font-size: 13px; color: #a1a1aa; text-align: center;">
                        If you didn't expect this invite, you can safely ignore this email.
                    </p>
                </div>
                
                <p style="margin: 24px 0 0; font-size: 12px; color: #a1a1aa; text-align: center;">
                    © ${new Date().getFullYear()} SetDM. All rights reserved.
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
`;

const getMagicLinkHtml = ({ name, loginUrl, workspaceName }) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <tr>
            <td>
                <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <div style="text-align: center; margin-bottom: 32px;">
                        <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #18181b;">SetDM</h1>
                    </div>
                    
                    <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #18181b;">
                        Hi${name ? ` ${name}` : ""}! 👋
                    </h2>
                    
                    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #52525b;">
                        Click the button below to log in to ${workspaceName || "your workspace"} on SetDM.
                    </p>
                    
                    <div style="text-align: center; margin-bottom: 32px;">
                        <a href="${loginUrl}" 
                           style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px;">
                            Log In to SetDM
                        </a>
                    </div>
                    
                    <p style="margin: 0 0 8px; font-size: 12px; color: #a1a1aa; text-align: center;">
                        Or copy and paste this link:
                    </p>
                    <p style="margin: 0 0 32px; font-size: 12px; color: #71717a; text-align: center; word-break: break-all;">
                        ${loginUrl}
                    </p>
                    
                    <div style="background: #fef3c7; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px;">
                        <p style="margin: 0; font-size: 13px; color: #92400e;">
                            ⏰ This link expires in 15 minutes.
                        </p>
                    </div>
                    
                    <p style="margin: 0; font-size: 13px; color: #a1a1aa; text-align: center;">
                        If you didn't request this login link, you can safely ignore this email.
                    </p>
                </div>
                
                <p style="margin: 24px 0 0; font-size: 12px; color: #a1a1aa; text-align: center;">
                    © ${new Date().getFullYear()} SetDM. All rights reserved.
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
`;

exports.handler = async (event) => {
    // Only allow POST
    if (event.httpMethod !== "POST") {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: "Method not allowed" }),
        };
    }

    const transporter = getTransporter();
    if (!transporter) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Email not configured", sent: false }),
        };
    }

    try {
        const body = JSON.parse(event.body);
        const { type, to, ...data } = body;

        if (!to || !type) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Missing required fields: to, type" }),
            };
        }

        let subject, html;

        if (type === "invite") {
            const { inviterName, workspaceName, role, inviteUrl } = data;
            subject = `You've been invited to join ${workspaceName || "a workspace"} on SetDM`;
            html = getInviteEmailHtml({ inviterName, workspaceName, role, inviteUrl });
        } else if (type === "magic-link") {
            const { name, loginUrl, workspaceName } = data;
            subject = "Your SetDM login link";
            html = getMagicLinkHtml({ name, loginUrl, workspaceName });
        } else {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Invalid email type" }),
            };
        }

        await transporter.sendMail({
            from: `"SetDM" <${process.env.GMAIL_USER}>`,
            to,
            subject,
            html,
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ sent: true }),
        };
    } catch (error) {
        console.error("Email error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message, sent: false }),
        };
    }
};
