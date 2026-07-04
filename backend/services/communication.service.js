const nodemailer = require('nodemailer');
const axios = require('axios');
const Activity = require('../models/Activity');
const SystemSetting = require('../models/SystemSetting');
const { decrypt } = require('../utils/encryption');

/**
 * Communication Service to handle dispatching Emails and SMS (Alpha SMS BD / Bulk SMS BD).
 * Currently implemented in Simulation Mode so keys can be plugged in later.
 */

/**
 * Helper to get a config value, decrypting if it is set as a secret.
 * Falls back to process.env if available, just in case.
 */
const getConfig = async (key) => {
  try {
    const setting = await SystemSetting.findOne({ where: { setting_key: key } });
    if (setting && setting.setting_value) {
      if (setting.is_secret) {
        return decrypt(setting.setting_value);
      }
      return setting.setting_value;
    }
  } catch (err) {
    console.error(`[COMM_SERVICE] Error fetching config ${key}`, err);
  }
  return process.env[key];
};

/**
 * SMTP Account definitions for multi-account routing.
 * Each account maps to a purpose and has its own credentials.
 * Accounts: 'info' (default), 'hr', 'support'
 */
const SMTP_ACCOUNTS = {
  info:    { userKey: 'SMTP_USER',         passKey: 'SMTP_PASS',         label: 'Seventh Sky Property Care' },
  hr:      { userKey: 'SMTP_HR_USER',      passKey: 'SMTP_HR_PASS',      label: 'Seventh Sky Property Care HR' },
  support: { userKey: 'SMTP_SUPPORT_USER', passKey: 'SMTP_SUPPORT_PASS', label: 'Seventh Sky Property Care Support' },
};

/**
 * Configure Hostinger SMTP transporter setup.
 * Supports multi-account: 'info' (default), 'hr', 'support'.
 * Each account uses its own credentials from SystemSettings.
 */
const createTransporter = async (account = 'info') => {
  const host = await getConfig('SMTP_HOST') || 'smtp.hostinger.com';
  const port = parseInt(await getConfig('SMTP_PORT')) || 465;

  const acct = SMTP_ACCOUNTS[account] || SMTP_ACCOUNTS.info;
  const user = await getConfig(acct.userKey);
  const pass = await getConfig(acct.passKey);

  if (!user || !pass) {
    // Fallback to default info account if the requested account is not configured
    if (account !== 'info') {
      console.warn(`[COMM_SERVICE] SMTP account '${account}' not configured, falling back to 'info'`);
      return createTransporter('info');
    }
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: true,
    auth: { user: user || 'your-email@yourdomain.com', pass: pass || 'your-smtp-password' }
  });
};

/**
 * Replace variables like {{name}} or {{property}} in the text
 */
const parseTemplate = (text, recipient) => {
  if (!text) return '';
  return text
    .replace(/\{\{name\}\}/gi, recipient.name || '')
    .replace(/\{\{phone\}\}/gi, recipient.phone || '')
    .replace(/\{\{email\}\}/gi, recipient.email || '')
    .replace(/\{\{course\}\}/gi, recipient.batch_interest || recipient.course_interest || 'our service')
    .replace(/\{\{property\}\}/gi, recipient.property_interest || recipient.batch_interest || recipient.course_interest || 'your property');
};

/**
 * Send an email using Nodemailer.
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} htmlBody - HTML email body
 * @param {Array} attachments - Optional attachments
 * @param {string} fromAccount - SMTP account to send from: 'info' (default), 'hr', 'support'
 */
const sendEmail = async (to, subject, htmlBody, attachments = [], fromAccount = 'info') => {
  const acct = SMTP_ACCOUNTS[fromAccount] || SMTP_ACCOUNTS.info;
  const user = await getConfig(acct.userKey);

  if (!user || user === 'your-email@yourdomain.com') {
    console.log(`[SIMULATION] Email Sent via ${fromAccount}@ to: ${to} | Subject: ${subject}`);
    await new Promise(r => setTimeout(r, 200));
    return { success: true, message: 'Simulated Email Sent' };
  }

  const transporter = await createTransporter(fromAccount);

  const mailOptions = {
    from: `"${acct.label}" <${user}>`,
    to,
    subject,
    html: htmlBody,
    attachments
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[COMM_SERVICE] Email sent via ${fromAccount}@ to ${to}: ${info.messageId}`);
    return { success: true, message: `Email sent: ${info.messageId}` };
  } catch (error) {
    console.error(`[COMM_SERVICE] Email send failed (${fromAccount}@):`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send an SMS via BulkSMSBD / Alpha SMS
 */
const sendSMS = async (to, message) => {
  const apiKey = await getConfig('SMS_API_KEY');
  const senderId = await getConfig('SMS_SENDER_ID');

  if (!apiKey) {
    console.log(`[SIMULATION] SMS Sent to: ${to} | Message: ${message}`);
    await new Promise(r => setTimeout(r, 200));
    return { success: true, message: 'Simulated SMS Sent' };
  }

  try {
    const url = `http://bulksmsbd.net/api/smsapi`;
    const response = await axios.post(url, {
      api_key: apiKey,
      senderid: senderId,
      number: to,
      message: message
    });
    return { success: true, response: response.data };
  } catch (error) {
    console.error('[COMM_SERVICE] SMS send failed:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Bulk Dispatcher (Background Processor)
 * Mapped to CRM targets and generates CRM Activities.
 */
const processCampaignBatch = async (campaign, recipients) => {
  console.log(`[COMM_SERVICE] Starting campaign dispatch for ID ${campaign.id} to ${recipients.length} recipients...`);
  
  let successCount = 0;
  
  for (const recipient of recipients) {
    const isEmail = campaign.channel === 'email';
    const isSms = campaign.channel === 'sms' || campaign.channel === 'whatsapp'; // using sms implementation for both unless specified
    
    // Determine destination (email or phone)
    const destination = isEmail ? recipient.email : recipient.phone;
    if (!destination) continue; // Skip if contact missing info

    // Parse specific variables per recipient
    const parsedSubject = parseTemplate(campaign.subject || campaign.name, recipient);
    const parsedBody = parseTemplate(campaign.body, recipient);

    let dispatchResult = { success: false };

    if (isEmail) {
      let attachments = [];
      if (campaign.attachment_url) {
        // Automatically set the downloaded name from url, or let nodemailer handle `path: url`
        // Nodemailer supports { path: 'https://...' } natively for attachments.
        attachments.push({ path: campaign.attachment_url });
      }
      dispatchResult = await sendEmail(destination, parsedSubject, parsedBody, attachments);
    } else {
      dispatchResult = await sendSMS(destination, parsedBody);
    }

    if (dispatchResult.success) {
      successCount++;
      // Log the Activity
      try {
        await Activity.create({
          branch_id: campaign.branch_id,
          lead_id: recipient.status ? recipient.id : null, // If it's a lead, status exists usually
          contact_id: recipient.status ? null : recipient.id, // Better tracking logic exists in controllers usually, but this is base
          type: isEmail ? 'email' : 'call', // DB enum constraint typically is 'email' or 'call' or 'meeting'
          subject: `Campaign: ${campaign.name}`,
          description: `Sent via ${campaign.channel}: ${parsedBody.substring(0, 100)}...`,
          due_date: new Date(),
          is_done: true,
          completed_at: new Date(),
          created_by: campaign.created_by
        });
      } catch (err) {
        console.error('[COMM_SERVICE] Failed to create CRM Activity log for recipient.', err.message);
      }
    }
  }

  console.log(`[COMM_SERVICE] Campaign ${campaign.id} completed. Effectively dispatched to ${successCount} recipients.`);
  
  // Optionally update campaign with final success stats here.
  // CampaignTemplate.update({ sent_count: successCount }, { where: { id: campaign.id } });
};

/**
 * Branded HTML wrapper for Seventh Sky Property Care emails.
 * Mobile-first, responsive, professional design using the real estate brand identity.
 */
const brandedEmailWrapper = (title, bodyContent) => {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${title}</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style>
    /* Reset */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
    /* Mobile */
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .fluid-padding { padding-left: 20px !important; padding-right: 20px !important; }
      .stack-column { display: block !important; width: 100% !important; }
      .mobile-center { text-align: center !important; }
      .mobile-padding { padding: 20px !important; }
      .header-pad { padding: 24px 20px !important; }
      .body-pad { padding: 24px 20px !important; }
      .footer-pad { padding: 20px !important; }
      .receipt-label { width: 38% !important; }
      .receipt-value { width: 62% !important; }
      .detail-row td { padding-top: 6px !important; padding-bottom: 6px !important; font-size: 13px !important; }
      .hero-title { font-size: 22px !important; }
      .amount-text { font-size: 18px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f0f2f5;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <!-- Preheader (hidden preview text) -->
  <div style="display:none;font-size:1px;color:#f0f2f5;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${title}</div>

  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0f2f5;">
    <tr>
      <td align="center" style="padding:24px 12px;">

        <!-- Email container -->
        <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;margin:0 auto;">

          <!-- ===== HEADER WITH LOGO ===== -->
          <tr>
            <td class="header-pad" align="center" style="background-color:#003768;padding:28px 40px 24px 40px;border-radius:12px 12px 0 0;">
              <!-- Logo -->
              <img src="https://seventhskypropertycare.com/logo.png" alt="Seventh Sky Property Care" width="72" height="72" style="display:block;margin:0 auto 12px auto;width:72px;height:72px;border-radius:12px;" />
              <!-- Brand Name -->
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:0.3px;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">Seventh Sky Property Care</h1>
              <!-- Tagline -->
              <p style="margin:6px 0 0 0;font-size:13px;color:rgba(255,255,255,0.8);font-weight:400;letter-spacing:0.2px;">Real estate service, property care, and client management</p>
              <!-- Accent bar -->
              <div style="width:48px;height:3px;background-color:#1bbdf1;margin:14px auto 0 auto;border-radius:2px;"></div>
            </td>
          </tr>

          <!-- ===== BODY CONTENT ===== -->
          <tr>
            <td class="body-pad" style="background-color:#ffffff;padding:32px 40px;">
              ${bodyContent}
            </td>
          </tr>

          <!-- ===== FOOTER ===== -->
          <tr>
            <td class="footer-pad" style="background-color:#f8f9fa;padding:24px 40px;border-top:1px solid #e9ecef;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <!-- Address -->
                <tr>
                  <td align="center" style="padding-bottom:10px;">
                    <p style="margin:0;font-size:13px;color:#6c757d;line-height:1.5;">
                      Address to be updated
                    </p>
                  </td>
                </tr>
                <!-- Contact -->
                <tr>
                  <td align="center" style="padding-bottom:14px;">
                    <p style="margin:0;font-size:13px;color:#6c757d;">
                      Phone: <a href="tel:" style="color:#003768;text-decoration:none;font-weight:600;">To be updated</a>
                    </p>
                  </td>
                </tr>
                <!-- Divider -->
                <tr>
                  <td align="center" style="padding-bottom:14px;">
                    <div style="width:60px;height:2px;background-color:#1bbdf1;margin:0 auto;border-radius:1px;"></div>
                  </td>
                </tr>
                <!-- Social / Website -->
                <tr>
                  <td align="center" style="padding-bottom:12px;">
                    <a href="https://seventhskypropertycare.com" style="font-size:13px;color:#003768;text-decoration:none;font-weight:600;">seventhskypropertycare.com</a>
                  </td>
                </tr>
                <!-- Copyright -->
                <tr>
                  <td align="center">
                    <p style="margin:0;font-size:11px;color:#adb5bd;">&copy; ${year} Seventh Sky Property Care. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Bottom rounded border -->
          <tr>
            <td style="height:6px;background-color:#003768;border-radius:0 0 12px 12px;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

        </table>
        <!-- /Email container -->

      </td>
    </tr>
  </table>
</body>
</html>`;
};

/**
 * Send branded booking confirmation email to the client
 */
const sendEnrollmentConfirmationEmail = async (orderData) => {
  const {
    student_name, email, phone,
    course_name, batch_name, batch_schedule, batch_start_date,
    amount, currency, payment_ref, paid_at, course_duration
  } = orderData;

  const formattedAmount = Number(amount || 0).toLocaleString('en-BD');
  const formattedDate = paid_at ? new Date(paid_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A';
  const formattedStartDate = batch_start_date ? new Date(batch_start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'TBA';

  const bodyContent = `
    <!-- Greeting -->
    <h2 class="hero-title" style="margin:0 0 6px 0;font-size:24px;font-weight:700;color:#1a1a2e;">Congratulations!</h2>
    <p style="margin:0 0 24px 0;font-size:15px;color:#495057;line-height:1.7;">
      Dear <strong style="color:#003768;">${student_name}</strong>, your request has been successfully received by Seventh Sky Property Care. Our team will follow up with the next steps.
    </p>

    <!-- Receipt Card -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e9ecef;border-radius:10px;overflow:hidden;margin-bottom:24px;">
      <!-- Receipt Header -->
      <tr>
        <td style="background-color:#003768;padding:14px 20px;">
          <h3 style="margin:0;font-size:15px;font-weight:700;color:#ffffff;letter-spacing:0.3px;">Payment Receipt</h3>
        </td>
      </tr>
      <!-- Receipt Body -->
      <tr>
        <td style="padding:0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr class="detail-row">
              <td class="receipt-label" style="padding:12px 20px 12px 20px;font-size:14px;color:#6c757d;width:40%;border-bottom:1px solid #f0f2f5;">Client Name</td>
              <td class="receipt-value" style="padding:12px 20px 12px 0;font-size:14px;color:#1a1a2e;font-weight:600;border-bottom:1px solid #f0f2f5;">${student_name}</td>
            </tr>
            <tr class="detail-row">
              <td class="receipt-label" style="padding:12px 20px;font-size:14px;color:#6c757d;border-bottom:1px solid #f0f2f5;">Email</td>
              <td class="receipt-value" style="padding:12px 20px 12px 0;font-size:14px;color:#1a1a2e;border-bottom:1px solid #f0f2f5;">${email}</td>
            </tr>
            <tr class="detail-row">
              <td class="receipt-label" style="padding:12px 20px;font-size:14px;color:#6c757d;border-bottom:1px solid #f0f2f5;">Service / Property</td>
              <td class="receipt-value" style="padding:12px 20px 12px 0;font-size:14px;color:#003768;font-weight:700;border-bottom:1px solid #f0f2f5;">${course_name}</td>
            </tr>
            <tr class="detail-row">
              <td class="receipt-label" style="padding:12px 20px;font-size:14px;color:#6c757d;border-bottom:1px solid #f0f2f5;">Project / Stage</td>
              <td class="receipt-value" style="padding:12px 20px 12px 0;font-size:14px;color:#1a1a2e;border-bottom:1px solid #f0f2f5;">${batch_name || 'TBA'}</td>
            </tr>
            <tr class="detail-row">
              <td class="receipt-label" style="padding:12px 20px;font-size:14px;color:#6c757d;border-bottom:1px solid #f0f2f5;">Expected Start Date</td>
              <td class="receipt-value" style="padding:12px 20px 12px 0;font-size:14px;color:#1a1a2e;border-bottom:1px solid #f0f2f5;">${formattedStartDate}</td>
            </tr>
            ${course_duration ? `
            <tr class="detail-row">
              <td class="receipt-label" style="padding:12px 20px;font-size:14px;color:#6c757d;border-bottom:1px solid #f0f2f5;">Duration</td>
              <td class="receipt-value" style="padding:12px 20px 12px 0;font-size:14px;color:#1a1a2e;border-bottom:1px solid #f0f2f5;">${course_duration}</td>
            </tr>` : ''}
            <tr class="detail-row">
              <td class="receipt-label" style="padding:12px 20px;font-size:14px;color:#6c757d;border-bottom:1px solid #f0f2f5;">Payment Ref</td>
              <td class="receipt-value" style="padding:12px 20px 12px 0;font-size:14px;color:#1a1a2e;font-family:'Courier New',monospace;border-bottom:1px solid #f0f2f5;">${payment_ref || 'N/A'}</td>
            </tr>
            <tr class="detail-row">
              <td class="receipt-label" style="padding:12px 20px;font-size:14px;color:#6c757d;border-bottom:2px solid #003768;">Payment Date</td>
              <td class="receipt-value" style="padding:12px 20px 12px 0;font-size:14px;color:#1a1a2e;border-bottom:2px solid #003768;">${formattedDate}</td>
            </tr>
            <!-- Amount Row -->
            <tr>
              <td style="padding:14px 20px;font-size:15px;color:#495057;font-weight:700;">Amount Paid</td>
              <td class="amount-text" style="padding:14px 20px 14px 0;font-size:20px;color:#1bbdf1;font-weight:800;">${String.fromCharCode(2547)}${formattedAmount} ${currency || 'BDT'}</td>
            </tr>
            <!-- Status Badge -->
            <tr>
              <td colspan="2" style="padding:0 20px 16px 20px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="background-color:#e8f5e9;padding:6px 18px;border-radius:20px;font-size:13px;font-weight:700;color:#2e7d32;letter-spacing:0.3px;">PAYMENT SUCCESSFUL</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Client Portal Access Notice -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
      <tr>
        <td style="background-color:#eef2ff;border-left:4px solid #003768;padding:16px 20px;border-radius:0 8px 8px 0;">
          <p style="margin:0 0 6px 0;font-size:15px;color:#003768;font-weight:700;">Client Portal Access</p>
          <p style="margin:0;font-size:14px;color:#495057;line-height:1.6;">If portal access is needed, our team will process your credentials and send login details separately.</p>
        </td>
      </tr>
    </table>

    <!-- Welcome message -->
    <p style="margin:0 0 16px 0;font-size:14px;color:#495057;line-height:1.7;">
      We're thrilled to have you onboard. If you have any questions, feel free to reach out to us anytime. We look forward to helping you achieve your goals!
    </p>
    <p style="margin:0;font-size:14px;color:#6c757d;">
      Warm regards,<br/><strong style="color:#1a1a2e;">Seventh Sky Property Care Team</strong>
    </p>
  `;

  const html = brandedEmailWrapper('Request Confirmation — Seventh Sky Property Care', bodyContent);
  return sendEmail(email, 'Request Confirmed — Seventh Sky Property Care', html, [], 'info');
};

/**
 * Send branded partner access request email
 */
const sendPartnerAccessRequestEmail = async (studentData, adminEmail) => {
  const {
    student_name, student_email, student_phone,
    course_name, batch_name, course_duration
  } = studentData;

  const partnerEmail = 'aarsayem002@gmail.com';

  const bodyContent = `
    <!-- Title -->
    <h2 class="hero-title" style="margin:0 0 6px 0;font-size:24px;font-weight:700;color:#1a1a2e;">Client Portal Access Request</h2>
    <p style="margin:0 0 24px 0;font-size:15px;color:#495057;line-height:1.7;">
      A new client record requires portal access. Please provide the login credentials at your earliest convenience.
    </p>

    <!-- Student Details Card -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e9ecef;border-radius:10px;overflow:hidden;margin-bottom:24px;">
      <!-- Card Header -->
      <tr>
        <td style="background-color:#003768;padding:14px 20px;">
          <h3 style="margin:0;font-size:15px;font-weight:700;color:#ffffff;letter-spacing:0.3px;">Client Details</h3>
        </td>
      </tr>
      <!-- Card Body -->
      <tr>
        <td style="padding:0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr class="detail-row">
              <td class="receipt-label" style="padding:12px 20px;font-size:14px;color:#6c757d;width:40%;border-bottom:1px solid #f0f2f5;">Client Name</td>
              <td class="receipt-value" style="padding:12px 20px 12px 0;font-size:14px;color:#1a1a2e;font-weight:600;border-bottom:1px solid #f0f2f5;">${student_name}</td>
            </tr>
            <tr class="detail-row">
              <td class="receipt-label" style="padding:12px 20px;font-size:14px;color:#6c757d;border-bottom:1px solid #f0f2f5;">Client Email</td>
              <td class="receipt-value" style="padding:12px 20px 12px 0;font-size:14px;color:#003768;font-weight:600;border-bottom:1px solid #f0f2f5;">${student_email}</td>
            </tr>
            <tr class="detail-row">
              <td class="receipt-label" style="padding:12px 20px;font-size:14px;color:#6c757d;border-bottom:1px solid #f0f2f5;">Phone Number</td>
              <td class="receipt-value" style="padding:12px 20px 12px 0;font-size:14px;color:#1a1a2e;border-bottom:1px solid #f0f2f5;">${student_phone || 'N/A'}</td>
            </tr>
            <tr class="detail-row">
              <td class="receipt-label" style="padding:12px 20px;font-size:14px;color:#6c757d;border-bottom:1px solid #f0f2f5;">Service / Property</td>
              <td class="receipt-value" style="padding:12px 20px 12px 0;font-size:14px;color:#003768;font-weight:700;border-bottom:1px solid #f0f2f5;">${course_name}</td>
            </tr>
            <tr class="detail-row">
              <td class="receipt-label" style="padding:12px 20px;font-size:14px;color:#6c757d;border-bottom:1px solid #f0f2f5;">Project / Stage</td>
              <td class="receipt-value" style="padding:12px 20px 12px 0;font-size:14px;color:#1a1a2e;border-bottom:1px solid #f0f2f5;">${batch_name || 'TBA'}</td>
            </tr>
            <tr class="detail-row">
              <td class="receipt-label" style="padding:12px 20px;font-size:14px;color:#6c757d;">Duration</td>
              <td class="receipt-value" style="padding:12px 20px 12px 0;font-size:14px;color:#1a1a2e;">${course_duration || 'N/A'}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Action Request Callout -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
      <tr>
        <td style="background-color:#fff8e1;border-left:4px solid #f59e0b;padding:16px 20px;border-radius:0 8px 8px 0;">
          <p style="margin:0 0 6px 0;font-size:15px;color:#b45309;font-weight:700;">Action Required</p>
          <p style="margin:0;font-size:14px;color:#78350f;line-height:1.6;">Please reply to this email with the client's portal login credentials. Your reply will be delivered to both the Seventh Sky Property Care admin team and the client directly.</p>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-size:14px;color:#6c757d;">
      Thank you for your partnership,<br/><strong style="color:#1a1a2e;">Seventh Sky Property Care Admin</strong>
    </p>
  `;

  const html = brandedEmailWrapper('Portal Access Request — Seventh Sky Property Care', bodyContent);

  // Build reply-to with both admin and student email
  const replyTo = [adminEmail, student_email].filter(Boolean).join(', ');

  const acct = SMTP_ACCOUNTS.info;
  const user = await getConfig(acct.userKey);

  if (!user || user === 'your-email@yourdomain.com') {
    console.log(`[SIMULATION] Partner Access Email Sent to: ${partnerEmail} | Student: ${student_name}`);
    await new Promise(r => setTimeout(r, 200));
    return { success: true, message: 'Simulated Partner Email Sent' };
  }

  const transporter = await createTransporter('info');

  const mailOptions = {
    from: `"${acct.label}" <${user}>`,
    to: partnerEmail,
    replyTo: replyTo,
    subject: `Portal Access Request — ${student_name} | Seventh Sky Property Care`,
    html
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, message: `Partner access email sent: ${info.messageId}` };
  } catch (error) {
    console.error('[COMM_SERVICE] Partner access email failed:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendEmail,
  sendSMS,
  processCampaignBatch,
  parseTemplate,
  brandedEmailWrapper,
  sendEnrollmentConfirmationEmail,
  sendPartnerAccessRequestEmail,
  SMTP_ACCOUNTS
};
