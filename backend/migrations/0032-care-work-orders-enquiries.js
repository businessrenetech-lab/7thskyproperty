'use strict';

/**
 * 0032 — Property Care service delivery: work orders + enquiries/leads.
 *
 *  care_work_orders — a service job: customer + site + catalog service, auto-priced
 *  into (service value = Seventh Sky fee + provider charge), matched & assigned to a
 *  verified provider (or internal), tracked through delivery → invoice → payout.
 *
 *  care_enquiries — incoming service enquiries and the sales lead pipeline; converts
 *  into a work order.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { INTEGER, STRING, TEXT, DECIMAL, ENUM, DATE, DATEONLY } = Sequelize;
    const qi = queryInterface;
    const has = async (t) => { try { await qi.describeTable(t); return true; } catch { return false; } };
    const stamps = {
      created_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    };

    if (!(await has('care_work_orders'))) {
      await qi.createTable('care_work_orders', {
        id: { type: INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: INTEGER },
        work_order_code: { type: STRING(40), unique: true },
        vertical: { type: STRING(60) },
        service_id: { type: INTEGER },
        category_id: { type: INTEGER },
        service_name: { type: STRING },
        // Customer + site
        customer_contact_id: { type: INTEGER },
        customer_name: { type: STRING },
        customer_phone: { type: STRING },
        site_address: { type: TEXT },
        district: { type: STRING(80) },
        city: { type: STRING(80) },
        // Optional link to property management
        property_id: { type: INTEGER },
        tenancy_id: { type: INTEGER },
        source_type: { type: ENUM('standalone', 'property', 'enquiry'), defaultValue: 'standalone' },
        enquiry_id: { type: INTEGER },
        scope: { type: TEXT },
        requested_date: { type: DATEONLY },
        scheduled_date: { type: DATEONLY },
        completed_date: { type: DATEONLY },
        // Delivery + assignment
        delivery_mode: { type: ENUM('provider', 'internal'), defaultValue: 'provider' },
        assigned_provider_id: { type: INTEGER },
        // Pricing (auto from catalog fee split)
        service_value: { type: DECIMAL(15, 2), defaultValue: 0 },     // client charge
        materials_cost: { type: DECIMAL(15, 2), defaultValue: 0 },
        sspc_fee: { type: DECIMAL(15, 2), defaultValue: 0 },          // our income
        provider_charge: { type: DECIMAL(15, 2), defaultValue: 0 },   // provider payable
        status: { type: ENUM('draft', 'priced', 'matching', 'assigned', 'accepted', 'scheduled', 'in_progress', 'completed', 'inspected', 'invoiced', 'closed', 'cancelled'), defaultValue: 'draft' },
        payment_status: { type: ENUM('unbilled', 'invoiced', 'paid', 'provider_paid', 'settled'), defaultValue: 'unbilled' },
        invoice_id: { type: INTEGER },
        notes: { type: TEXT },
        created_by: { type: INTEGER },
        ...stamps,
      });
      await qi.addIndex('care_work_orders', ['status'], { name: 'idx_cwo_status' });
      await qi.addIndex('care_work_orders', ['assigned_provider_id'], { name: 'idx_cwo_provider' });
      await qi.addIndex('care_work_orders', ['customer_contact_id'], { name: 'idx_cwo_customer' });
    }

    if (!(await has('care_enquiries'))) {
      await qi.createTable('care_enquiries', {
        id: { type: INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: INTEGER },
        enquiry_code: { type: STRING(40), unique: true },
        customer_contact_id: { type: INTEGER },
        customer_name: { type: STRING },
        mobile: { type: STRING },
        email: { type: STRING },
        vertical: { type: STRING(60) },
        service_id: { type: INTEGER },
        category_id: { type: INTEGER },
        service_interest: { type: STRING },
        site_address: { type: TEXT },
        district: { type: STRING(80) },
        city: { type: STRING(80) },
        property_type: { type: STRING(60) },
        message: { type: TEXT },
        source: { type: STRING(40), defaultValue: 'manual' },
        stage: { type: ENUM('new', 'contacted', 'assessment', 'quoted', 'won', 'lost'), defaultValue: 'new' },
        estimated_value: { type: DECIMAL(15, 2), defaultValue: 0 },
        assigned_to: { type: INTEGER },
        work_order_id: { type: INTEGER },
        notes: { type: TEXT },
        created_by: { type: INTEGER },
        ...stamps,
      });
      await qi.addIndex('care_enquiries', ['stage'], { name: 'idx_cenq_stage' });
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('care_work_orders').catch(() => {});
    await queryInterface.dropTable('care_enquiries').catch(() => {});
  },
};
