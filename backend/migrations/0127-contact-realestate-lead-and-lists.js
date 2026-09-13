'use strict';

/**
 * Migration 0127: Add Contact Lists and Real Estate Lead Profile fields to contacts table.
 * Guards with describeTable checks for idempotency.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('contacts').catch(() => ({}));

    if (!table.contact_list) {
      await queryInterface.addColumn('contacts', 'contact_list', {
        type: Sequelize.STRING(100),
        allowNull: true,
        defaultValue: 'General Leads',
      });
    }

    if (!table.contact_lists) {
      await queryInterface.addColumn('contacts', 'contact_lists', {
        type: Sequelize.JSON,
        allowNull: true,
      });
    }

    if (!table.lead_status) {
      await queryInterface.addColumn('contacts', 'lead_status', {
        type: Sequelize.STRING(40),
        allowNull: true,
        defaultValue: 'new',
      });
    }

    if (!table.lead_source) {
      await queryInterface.addColumn('contacts', 'lead_source', {
        type: Sequelize.STRING(100),
        allowNull: true,
      });
    }

    if (!table.looking_for) {
      await queryInterface.addColumn('contacts', 'looking_for', {
        type: Sequelize.STRING(40),
        allowNull: true,
      });
    }

    if (!table.preferred_areas) {
      await queryInterface.addColumn('contacts', 'preferred_areas', {
        type: Sequelize.JSON,
        allowNull: true,
      });
    }

    if (!table.property_types) {
      await queryInterface.addColumn('contacts', 'property_types', {
        type: Sequelize.JSON,
        allowNull: true,
      });
    }

    if (!table.budget_min) {
      await queryInterface.addColumn('contacts', 'budget_min', {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
      });
    }

    if (!table.budget_max) {
      await queryInterface.addColumn('contacts', 'budget_max', {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
      });
    }

    if (!table.bedrooms_min) {
      await queryInterface.addColumn('contacts', 'bedrooms_min', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }

    if (!table.bathrooms_min) {
      await queryInterface.addColumn('contacts', 'bathrooms_min', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }

    if (!table.size_min_sft) {
      await queryInterface.addColumn('contacts', 'size_min_sft', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }

    if (!table.financing_status) {
      await queryInterface.addColumn('contacts', 'financing_status', {
        type: Sequelize.STRING(60),
        allowNull: true,
      });
    }

    if (!table.urgency) {
      await queryInterface.addColumn('contacts', 'urgency', {
        type: Sequelize.STRING(40),
        allowNull: true,
      });
    }

    if (!table.last_contacted_at) {
      await queryInterface.addColumn('contacts', 'last_contacted_at', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    if (!table.lead_notes) {
      await queryInterface.addColumn('contacts', 'lead_notes', {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface) => {
    const table = await queryInterface.describeTable('contacts').catch(() => ({}));
    const cols = [
      'contact_list', 'contact_lists', 'lead_status', 'lead_source',
      'looking_for', 'preferred_areas', 'property_types',
      'budget_min', 'budget_max', 'bedrooms_min', 'bathrooms_min',
      'size_min_sft', 'financing_status', 'urgency',
      'last_contacted_at', 'lead_notes'
    ];

    for (const col of cols) {
      if (table[col]) {
        await queryInterface.removeColumn('contacts', col).catch(() => {});
      }
    }
  },
};
