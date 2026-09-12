'use strict';
// Phase 6 CRM Task Management — sales_tasks table for managing CRM action items,
// calls, meetings, viewings, negotiations, and to-dos with property/contact linkage.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('sales_tasks').catch(() => null);
    if (!table) {
      await queryInterface.createTable('sales_tasks', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        branch_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        task_code: {
          type: Sequelize.STRING(32),
          allowNull: false,
        },
        title: {
          type: Sequelize.STRING(255),
          allowNull: false,
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        task_type: {
          type: Sequelize.ENUM('call', 'email', 'meeting', 'viewing', 'document', 'negotiation', 'settlement', 'general'),
          defaultValue: 'general',
          allowNull: false,
        },
        priority: {
          type: Sequelize.ENUM('urgent', 'high', 'medium', 'low'),
          defaultValue: 'medium',
          allowNull: false,
        },
        status: {
          type: Sequelize.ENUM('pending', 'in_progress', 'completed', 'cancelled'),
          defaultValue: 'pending',
          allowNull: false,
        },
        due_date: {
          type: Sequelize.DATEONLY,
          allowNull: true,
        },
        due_time: {
          type: Sequelize.STRING(10),
          allowNull: true,
        },
        property_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        deal_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        contact_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        enquiry_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        assigned_to: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        created_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        completed_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        completed_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        completion_notes: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        metadata: {
          type: Sequelize.JSON,
          allowNull: true,
        },
        created_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updated_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      });

      await queryInterface.addIndex('sales_tasks', ['branch_id', 'status', 'due_date']);
      await queryInterface.addIndex('sales_tasks', ['branch_id', 'assigned_to']);
      await queryInterface.addIndex('sales_tasks', ['branch_id', 'property_id']);
    }
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('sales_tasks').catch(() => {});
  },
};
