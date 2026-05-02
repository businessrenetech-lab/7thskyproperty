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
 * Configure Hostinger SMTP transporter setup
 * This gets configured per-send now to allow dynamic setting updates,
 * or cached effectively if preferred. We'll build a fresh transport each time
 * to ensure if superadmin changes settings, they apply immediately.
 */
const createTransporter = async () => {
  const host = await getConfig('SMTP_HOST') || 'smtp.hostinger.com';
  const port = parseInt(await getConfig('SMTP_PORT')) || 465;
  const user = await getConfig('SMTP_USER') || 'your-email@yourdomain.com';
  const pass = await getConfig('SMTP_PASS') || 'your-smtp-password';

  return nodemailer.createTransport({
    host,
    port,
    secure: true,
    auth: { user, pass }
  });
};

/**
 * Replace variables like {{name}} or {{course}} in the text
 */
const parseTemplate = (text, recipient) => {
  if (!text) return '';
  return text
    .replace(/\{\{name\}\}/gi, recipient.name || '')
    .replace(/\{\{phone\}\}/gi, recipient.phone || '')
    .replace(/\{\{email\}\}/gi, recipient.email || '')
    .replace(/\{\{course\}\}/gi, recipient.batch_interest || recipient.course_interest || 'our course');
};

/**
 * Send an email using Nodemailer
 */
const sendEmail = async (to, subject, htmlBody, attachments = []) => {
  const user = await getConfig('SMTP_USER');
  
  if (!user || user === 'your-email@yourdomain.com') {
    console.log(`[SIMULATION] Email Sent to: ${to} | Object: ${subject}`);
    await new Promise(r => setTimeout(r, 200));
    return { success: true, message: 'Simulated Email Sent' };
  }

  const transporter = await createTransporter();

  const mailOptions = {
    from: `"Language Academy" <${user}>`,
    to,
    subject,
    html: htmlBody,
    attachments
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, message: `Email sent: ${info.messageId}` };
  } catch (error) {
    console.error('[COMM_SERVICE] Email send failed:', error.message);
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
 * Branded HTML wrapper for Language Academy emails
 */
const brandedEmailWrapper = (title, bodyContent) => {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background:#0f1117;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1117;padding:32px 16px;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,#0d9488 0%,#0f766e 50%,#134e4a 100%);padding:32px 40px;border-radius:16px 16px 0 0;text-align:center;">
                <h1 style="margin:0;font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">🎓 Language Academy</h1>
                <p style="margin:8px 0 0 0;font-size:14px;color:rgba(255,255,255,0.8);font-weight:500;">Best PTE & IELTS Coaching Centre in Bangladesh</p>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="background:#1a1d27;padding:32px 40px;">
                ${bodyContent}
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="background:#12141c;padding:24px 40px;border-radius:0 0 16px 16px;border-top:1px solid rgba(255,255,255,0.06);">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="text-align:center;">
                      <p style="margin:0 0 8px 0;font-size:13px;color:#94a3b8;">📍 House 23, Road 1, Dhanmondi, Dhaka 1205</p>
                      <p style="margin:0 0 8px 0;font-size:13px;color:#94a3b8;">📞 +880 1234-567890 &nbsp;|&nbsp; 📧 info@languageacademy.com.bd</p>
                      <p style="margin:12px 0 0 0;font-size:12px;color:#475569;">© ${new Date().getFullYear()} Language Academy Bangladesh. All rights reserved.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>`;
};

/**
 * Send branded enrollment confirmation email to the student
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
    <h2 style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:#ffffff;">Congratulations! 🎉</h2>
    <p style="margin:0 0 24px 0;font-size:15px;color:#cbd5e1;line-height:1.6;">
      Dear <strong style="color:#2dd4bf;">${student_name}</strong>, you have been successfully enrolled at Language Academy. Welcome to your journey towards excellence!
    </p>

    <!-- Receipt Card -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;overflow:hidden;">
      <tr>
        <td style="background:linear-gradient(135deg,#0d9488,#0f766e);padding:14px 20px;">
          <h3 style="margin:0;font-size:16px;font-weight:700;color:#ffffff;">💳 Payment Receipt</h3>
        </td>
      </tr>
      <tr>
        <td style="padding:20px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:8px 0;font-size:14px;color:#94a3b8;width:40%;">Student Name</td>
              <td style="padding:8px 0;font-size:14px;color:#f1f5f9;font-weight:600;">${student_name}</td>
            </tr>
            <tr><td colspan="2" style="border-bottom:1px solid rgba(255,255,255,0.06);"></td></tr>
            <tr>
              <td style="padding:8px 0;font-size:14px;color:#94a3b8;">Email</td>
              <td style="padding:8px 0;font-size:14px;color:#f1f5f9;">${email}</td>
            </tr>
            <tr><td colspan="2" style="border-bottom:1px solid rgba(255,255,255,0.06);"></td></tr>
            <tr>
              <td style="padding:8px 0;font-size:14px;color:#94a3b8;">Course</td>
              <td style="padding:8px 0;font-size:14px;color:#2dd4bf;font-weight:600;">${course_name}</td>
            </tr>
            <tr><td colspan="2" style="border-bottom:1px solid rgba(255,255,255,0.06);"></td></tr>
            <tr>
              <td style="padding:8px 0;font-size:14px;color:#94a3b8;">Batch</td>
              <td style="padding:8px 0;font-size:14px;color:#f1f5f9;">${batch_name || 'TBA'}</td>
            </tr>
            <tr><td colspan="2" style="border-bottom:1px solid rgba(255,255,255,0.06);"></td></tr>
            <tr>
              <td style="padding:8px 0;font-size:14px;color:#94a3b8;">Batch Start Date</td>
              <td style="padding:8px 0;font-size:14px;color:#f1f5f9;">${formattedStartDate}</td>
            </tr>
            ${course_duration ? `
            <tr><td colspan="2" style="border-bottom:1px solid rgba(255,255,255,0.06);"></td></tr>
            <tr>
              <td style="padding:8px 0;font-size:14px;color:#94a3b8;">Duration</td>
              <td style="padding:8px 0;font-size:14px;color:#f1f5f9;">${course_duration}</td>
            </tr>` : ''}
            <tr><td colspan="2" style="border-bottom:1px solid rgba(255,255,255,0.06);"></td></tr>
            <tr>
              <td style="padding:8px 0;font-size:14px;color:#94a3b8;">Payment Ref</td>
              <td style="padding:8px 0;font-size:14px;color:#f1f5f9;font-family:monospace;">${payment_ref || 'N/A'}</td>
            </tr>
            <tr><td colspan="2" style="border-bottom:1px solid rgba(255,255,255,0.06);"></td></tr>
            <tr>
              <td style="padding:8px 0;font-size:14px;color:#94a3b8;">Payment Date</td>
              <td style="padding:8px 0;font-size:14px;color:#f1f5f9;">${formattedDate}</td>
            </tr>
            <tr><td colspan="2" style="border-bottom:2px solid rgba(13,148,136,0.3);"></td></tr>
            <tr>
              <td style="padding:12px 0;font-size:16px;color:#94a3b8;font-weight:700;">Amount Paid</td>
              <td style="padding:12px 0;font-size:20px;color:#10b981;font-weight:800;">৳${formattedAmount} ${currency || 'BDT'}</td>
            </tr>
            <tr>
              <td colspan="2" style="padding:8px 0;">
                <span style="display:inline-block;padding:6px 16px;background:rgba(16,185,129,0.15);color:#10b981;border:1px solid rgba(16,185,129,0.3);border-radius:20px;font-size:13px;font-weight:700;">✅ PAYMENT SUCCESSFUL</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- PTE Portal Access Notice -->
    <div style="margin:24px 0;padding:16px 20px;background:linear-gradient(135deg,rgba(99,102,241,0.12),rgba(139,92,246,0.12));border:1px solid rgba(99,102,241,0.25);border-radius:10px;">
      <p style="margin:0;font-size:15px;color:#a78bfa;font-weight:700;">🖥️ PTE Practice Portal Access</p>
      <p style="margin:8px 0 0 0;font-size:14px;color:#c4b5fd;line-height:1.5;">You will receive <strong>PTE PRACTICE PORTAL ACCESS</strong> soon! Our team is processing your credentials and you'll get a separate email with your login details shortly.</p>
    </div>

    <!-- Welcome message -->
    <p style="margin:16px 0 0 0;font-size:14px;color:#94a3b8;line-height:1.6;">
      We're thrilled to have you onboard. If you have any questions, feel free to reach out to us anytime. We look forward to helping you achieve your goals!
    </p>
    <p style="margin:16px 0 0 0;font-size:14px;color:#64748b;">
      Warm regards,<br/><strong style="color:#cbd5e1;">Language Academy Team</strong>
    </p>
  `;

  const html = brandedEmailWrapper('Enrollment Confirmation — Language Academy', bodyContent);
  return sendEmail(email, '🎓 Enrollment Confirmed — Welcome to Language Academy!', html);
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
    <h2 style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:#ffffff;">Portal Access Request</h2>
    <p style="margin:0 0 24px 0;font-size:15px;color:#cbd5e1;line-height:1.6;">
      A new student has been enrolled and requires PTE practice portal access. Please provide the login credentials at your earliest convenience.
    </p>

    <!-- Student Details Card -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;overflow:hidden;">
      <tr>
        <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:14px 20px;">
          <h3 style="margin:0;font-size:16px;font-weight:700;color:#ffffff;">👤 Student Details</h3>
        </td>
      </tr>
      <tr>
        <td style="padding:20px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:10px 0;font-size:14px;color:#94a3b8;width:40%;">Student Name</td>
              <td style="padding:10px 0;font-size:14px;color:#f1f5f9;font-weight:600;">${student_name}</td>
            </tr>
            <tr><td colspan="2" style="border-bottom:1px solid rgba(255,255,255,0.06);"></td></tr>
            <tr>
              <td style="padding:10px 0;font-size:14px;color:#94a3b8;">Student Email</td>
              <td style="padding:10px 0;font-size:14px;color:#2dd4bf;">${student_email}</td>
            </tr>
            <tr><td colspan="2" style="border-bottom:1px solid rgba(255,255,255,0.06);"></td></tr>
            <tr>
              <td style="padding:10px 0;font-size:14px;color:#94a3b8;">Phone Number</td>
              <td style="padding:10px 0;font-size:14px;color:#f1f5f9;">${student_phone || 'N/A'}</td>
            </tr>
            <tr><td colspan="2" style="border-bottom:1px solid rgba(255,255,255,0.06);"></td></tr>
            <tr>
              <td style="padding:10px 0;font-size:14px;color:#94a3b8;">Course</td>
              <td style="padding:10px 0;font-size:14px;color:#a78bfa;font-weight:600;">${course_name}</td>
            </tr>
            <tr><td colspan="2" style="border-bottom:1px solid rgba(255,255,255,0.06);"></td></tr>
            <tr>
              <td style="padding:10px 0;font-size:14px;color:#94a3b8;">Batch Enrolled</td>
              <td style="padding:10px 0;font-size:14px;color:#f1f5f9;">${batch_name || 'TBA'}</td>
            </tr>
            <tr><td colspan="2" style="border-bottom:1px solid rgba(255,255,255,0.06);"></td></tr>
            <tr>
              <td style="padding:10px 0;font-size:14px;color:#94a3b8;">Time Length</td>
              <td style="padding:10px 0;font-size:14px;color:#f1f5f9;">${course_duration || 'N/A'}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Action Request -->
    <div style="margin:24px 0;padding:16px 20px;background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.25);border-radius:10px;">
      <p style="margin:0;font-size:14px;color:#fbbf24;font-weight:700;">⚡ Action Required</p>
      <p style="margin:8px 0 0 0;font-size:14px;color:#fde68a;line-height:1.5;">Please reply to this email with the student's PTE practice portal login credentials. Your reply will be delivered to both the Language Academy admin team and the student directly.</p>
    </div>

    <p style="margin:16px 0 0 0;font-size:14px;color:#64748b;">
      Thank you for your partnership,<br/><strong style="color:#cbd5e1;">Language Academy Admin</strong>
    </p>
  `;

  const html = brandedEmailWrapper('Portal Access Request — Language Academy', bodyContent);

  // Build reply-to with both admin and student email
  const replyTo = [adminEmail, student_email].filter(Boolean).join(', ');

  const user = await getConfig('SMTP_USER');

  if (!user || user === 'your-email@yourdomain.com') {
    console.log(`[SIMULATION] Partner Access Email Sent to: ${partnerEmail} | Student: ${student_name}`);
    await new Promise(r => setTimeout(r, 200));
    return { success: true, message: 'Simulated Partner Email Sent' };
  }

  const transporter = await createTransporter();

  const mailOptions = {
    from: `"Language Academy" <${user}>`,
    to: partnerEmail,
    replyTo: replyTo,
    subject: `🔐 Portal Access Request — ${student_name} | Language Academy`,
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
  sendEnrollmentConfirmationEmail,
  sendPartnerAccessRequestEmail
};
