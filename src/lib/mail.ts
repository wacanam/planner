import { doc, type Firestore, setDoc } from 'firebase/firestore';
import { createClientId, FIRESTORE_COLLECTIONS, nowIso } from '@/lib/firebase/schema';

export interface WelcomeEmailParams {
  toEmail: string;
  userName?: string | null;
  congregationName: string;
  congregationId: string;
  roleName?: string | null;
  appUrl?: string | null;
}

export interface QueuedEmail {
  id: string;
  to: string;
  message: {
    subject: string;
    text: string;
    html: string;
  };
  data?: Record<string, unknown>;
  createdAt: string;
}

/**
 * Builds the text and HTML content for the welcome email when a user is approved into a congregation.
 */
export function buildWelcomeEmailContent(params: WelcomeEmailParams): {
  subject: string;
  text: string;
  html: string;
} {
  const name = params.userName?.trim() || 'Publisher';
  const congName = params.congregationName.trim();
  const baseUrl =
    params.appUrl ||
    (typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'https://kanataran.app');
  const dashboardUrl = `${baseUrl}/congregation/${params.congregationId}/dashboard`;

  const subject = `Welcome to ${congName} on Kanataran!`;

  const text = `
Hello ${name},

Great news! Your request to join ${congName} has been approved by the Service Overseer.

You are now an active publisher in the congregation workspace. You can access your congregation dashboard, request territory assignments, and track your ministry records seamlessly even when offline.

Get started by visiting your congregation dashboard:
${dashboardUrl}

Key Features:
- Territory Management: View and navigate your assigned territory boundaries.
- Offline-First Tracking: Record visits and encounters without an active internet connection.
- Service Groups: Collaborate with your field service group and overseers.

Best regards,
The Kanataran Team
`.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 24px; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
    <!-- Header -->
    <tr>
      <td style="padding: 32px 32px 24px 32px; background: linear-gradient(135deg, #2563eb, #1d4ed8); text-align: center;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">Kanataran</h1>
        <p style="margin: 6px 0 0 0; font-size: 14px; color: #bfdbfe;">Field Ministry & Territory Planner</p>
      </td>
    </tr>
    
    <!-- Body Content -->
    <tr>
      <td style="padding: 32px;">
        <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #0f172a;">Welcome to ${congName}! 👋</h2>
        <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #334155;">
          Hello <strong>${name}</strong>,
        </p>
        <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #334155;">
          Great news! Your request to join <strong>${congName}</strong> has been approved by the Service Overseer. You are now officially registered as a publisher in this congregation workspace.
        </p>

        <!-- Action Button -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
          <tr>
            <td align="center">
              <a href="${dashboardUrl}" style="display: inline-block; padding: 14px 28px; background-color: #2563eb; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; border-radius: 10px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">
                Open Congregation Dashboard →
              </a>
            </td>
          </tr>
        </table>

        <!-- Features Box -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-top: 24px;">
          <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">What you can do now:</h3>
          <ul style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6; color: #475569;">
            <li style="margin-bottom: 8px;"><strong>Territory Maps:</strong> Browse available territory cards and view street boundaries.</li>
            <li style="margin-bottom: 8px;"><strong>Offline Visit Logging:</strong> Record household visits, notes, and return visits even without internet.</li>
            <li><strong>Service Groups:</strong> Collaborate with your group overseer and ministry partners.</li>
          </ul>
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #94a3b8;">
          You received this email because your membership request was approved for ${congName} on Kanataran.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();

  return { subject, text, html };
}

/**
 * Queues a welcome email in the Firestore 'mail' collection (Firebase Trigger Email extension standard).
 * Returns true if successfully queued, or false if email was not available or queueing failed.
 */
export async function queueWelcomeEmail(
  firestore: Firestore,
  params: WelcomeEmailParams
): Promise<boolean> {
  const normalizedEmail = (params.toEmail || '').trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return false;
  }

  try {
    const { subject, text, html } = buildWelcomeEmailContent(params);
    const emailId = createClientId();
    const now = nowIso();

    const emailDoc: QueuedEmail = {
      id: emailId,
      to: normalizedEmail,
      message: {
        subject,
        text,
        html,
      },
      data: {
        type: 'welcome_congregation',
        congregationId: params.congregationId,
        congregationName: params.congregationName,
        recipientName: params.userName || null,
      },
      createdAt: now,
    };

    await setDoc(doc(firestore, FIRESTORE_COLLECTIONS.mail, emailId), emailDoc);
    return true;
  } catch (err) {
    console.warn('[queueWelcomeEmail] Failed to queue welcome email in mail collection:', err);
    return false;
  }
}
