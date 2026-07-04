const Rule = require('../models/Rule');
const Notification = require('../models/Notification');
const Lead = require('../models/Lead');
const Student = require('../models/Student');
const User = require('../models/User');
const communicationService = require('./communication.service');
const { Op, fn, col, where } = require('sequelize');

const DEFAULT_BIRTHDAY_RULE = {
  name: 'Birthday Wishes for Leads & Clients',
  trigger_type: 'birthday_reminder',
  action_type: 'send_sms',
  template: 'Dear {Name}, wishing you a wonderful year ahead. Happy Birthday from Seventh Sky Property Care.',
  is_active: true,
};

const getStartOfToday = (baseDate = new Date()) => {
  const date = new Date(baseDate);
  date.setHours(0, 0, 0, 0);
  return date;
};

const getDateKey = (baseDate = new Date()) => {
  const year = baseDate.getFullYear();
  const month = String(baseDate.getMonth() + 1).padStart(2, '0');
  const day = String(baseDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Automation Service
 * Handles processing of system triggers based on active rules.
 */
class AutomationService {
  async ensureDefaultBirthdayRule() {
    try {
      const existing = await Rule.findOne({ where: { trigger_type: 'birthday_reminder' } });
      if (!existing) {
        await Rule.create(DEFAULT_BIRTHDAY_RULE);
      }
    } catch (error) {
      console.error('Automation Error [ensureDefaultBirthdayRule]:', error);
    }
  }
  
  /**
   * Process a system trigger
   * @param {string} triggerType - e.g., 'new_lead', 'fee_overdue'
   * @param {object} data - Contextual data (student, lead, branch_id)
   */
  async processTrigger(triggerType, data) {
    try {
      // 1. Fetch active rules for this trigger
      const rules = await Rule.findAll({
        where: { trigger_type: triggerType, is_active: true }
      });

      for (const rule of rules) {
        await this.executeRule(rule, data);
      }
    } catch (error) {
      console.error(`Automation Error [${triggerType}]:`, error);
    }
  }

  /**
   * Execute a specific rule
   */
  async executeRule(rule, data) {
    const message = this.parseTemplate(rule.template, data);

    switch (rule.action_type) {
      case 'create_notification':
        if (!data.user_id) return false;
        await Notification.create({
          user_id: data.user_id,
          branch_id: data.branch_id,
          title: rule.name,
          message: message,
          type: 'alert'
        });
        return true;
      
      case 'send_sms':
        if (!data.phone) return false;
        return (await communicationService.sendSMS(data.phone, message)).success;

      case 'send_whatsapp':
        if (!data.phone) return false;
        return (await communicationService.sendSMS(data.phone, message)).success;

      case 'send_email':
        if (!data.email) return false;
        return (await communicationService.sendEmail(
          data.email,
          rule.config?.subject || rule.name || 'Seventh Sky Property Care',
          `<p>${message}</p>`
        )).success;

      default:
        console.log(`Action ${rule.action_type} not implemented yet`);
        return false;
    }
  }

  async processBirthdayReminders(baseDate = new Date()) {
    try {
      const today = new Date(baseDate);
      const startOfToday = getStartOfToday(today);
      const month = today.getMonth() + 1;
      const day = today.getDate();

      const rules = await Rule.findAll({ where: { trigger_type: 'birthday_reminder', is_active: true } });
      if (!rules.length) return { processed: 0, sent: 0, date: getDateKey(today) };

      const birthdayDateFilter = {
        date_of_birth: { [Op.ne]: null },
        [Op.or]: [
          { birthday_wish_last_sent_at: null },
          { birthday_wish_last_sent_at: { [Op.lt]: startOfToday } },
        ],
        [Op.and]: [
          where(fn('MONTH', col('date_of_birth')), month),
          where(fn('DAYOFMONTH', col('date_of_birth')), day),
        ],
      };

      const [students, leads] = await Promise.all([
        Student.findAll({
          where: birthdayDateFilter,
          include: [{ model: User, attributes: ['name', 'email'], required: false }],
        }),
        Lead.findAll({ where: birthdayDateFilter }),
      ]);

      let processed = 0;
      let sent = 0;

      for (const student of students) {
        const payload = {
          id: student.id,
          branch_id: student.branch_id,
          user_id: student.user_id,
          name: student.User?.name || [student.first_name, student.last_name].filter(Boolean).join(' ') || 'Student',
          student_name: student.User?.name || [student.first_name, student.last_name].filter(Boolean).join(' ') || 'Student',
          phone: student.mobile_no || '',
          email: student.User?.email || '',
          recipient_type: 'student',
          date: getDateKey(today),
        };

        let delivered = false;
        for (const rule of rules) {
          if (rule.branch_id && rule.branch_id !== student.branch_id) continue;
          delivered = (await this.executeRule(rule, payload)) || delivered;
        }

        processed += 1;
        if (delivered) {
          sent += 1;
          await student.update({ birthday_wish_last_sent_at: new Date() });
        }
      }

      for (const lead of leads) {
        const payload = {
          id: lead.id,
          branch_id: lead.branch_id,
          name: lead.name || 'Lead',
          student_name: lead.name || 'Lead',
          phone: lead.phone || '',
          email: lead.email || '',
          recipient_type: 'lead',
          date: getDateKey(today),
        };

        let delivered = false;
        for (const rule of rules) {
          if (rule.branch_id && rule.branch_id !== lead.branch_id) continue;
          delivered = (await this.executeRule(rule, payload)) || delivered;
        }

        processed += 1;
        if (delivered) {
          sent += 1;
          await lead.update({ birthday_wish_last_sent_at: new Date() });
        }
      }

      return { processed, sent, date: getDateKey(today) };
    } catch (error) {
      console.error('Automation Error [processBirthdayReminders]:', error);
      return { processed: 0, sent: 0, error: error.message };
    }
  }

  /**
   * Parse template placeholders
   */
  parseTemplate(template, data) {
    let message = template;
    const placeholders = {
      name: data.name || data.student_name || 'Student',
      student_name: data.student_name || data.name || 'Student',
      amount: data.amount || '0',
      date: data.date || new Date().toLocaleDateString(),
      batch_name: data.batch_name || 'Batch',
      branch_name: data.branch_name || 'Branch',
      recipient_type: data.recipient_type || 'recipient',
    };

    for (const [key, value] of Object.entries(placeholders)) {
      message = message.replace(new RegExp(`\\{${key}\\}`, 'gi'), value);
    }

    return message;
  }
}

module.exports = new AutomationService();
