'use strict';

const indexColumns = (index) => (index.fields || []).map((field) => field.attribute || field.name);

const hasIndex = (indexes, columns, unique = false) => indexes.some((index) => {
  const fields = indexColumns(index);
  return (!unique || index.unique) && fields.length === columns.length && columns.every((column, i) => fields[i] === column);
});

async function assertNoDuplicates(queryInterface, table, column, nullable = false) {
  const quotedTable = queryInterface.queryGenerator.quoteTable(table);
  const quotedColumn = queryInterface.queryGenerator.quoteIdentifier(column);
  const nullClause = nullable ? `WHERE ${quotedColumn} IS NOT NULL` : '';
  const [rows] = await queryInterface.sequelize.query(
    `SELECT ${quotedColumn} AS duplicate_value, COUNT(*) AS duplicate_count FROM ${quotedTable} ${nullClause} GROUP BY ${quotedColumn} HAVING COUNT(*) > 1 LIMIT 1`
  );
  if (rows.length) {
    throw new Error(`Cannot add unique constraint on ${table}.${column}: duplicate value '${rows[0].duplicate_value}' exists. Resolve duplicates without deleting data, then rerun migration 0061.`);
  }
}

async function addIndexIfMissing(queryInterface, table, columns, options) {
  const indexes = await queryInterface.showIndex(table);
  if (!hasIndex(indexes, columns, !!options.unique)) {
    if (options.unique) await assertNoDuplicates(queryInterface, table, columns[0], !!options.nullable);
    const indexOptions = { ...options };
    delete indexOptions.nullable;
    await queryInterface.addIndex(table, columns, indexOptions);
  }
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('short_stay_property_profiles')) {
      throw new Error('Migration 0061 requires short_stay_property_profiles from migration 0059.');
    }

    const profileColumns = await queryInterface.describeTable('short_stay_property_profiles');
    if (!profileColumns.min_nights) {
      await queryInterface.addColumn('short_stay_property_profiles', 'min_nights', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      });
    }
    if (!profileColumns.cancellation_policy) {
      await queryInterface.addColumn('short_stay_property_profiles', 'cancellation_policy', {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }

    await addIndexIfMissing(queryInterface, 'short_stay_property_profiles', ['property_id'], {
      name: 'short_stay_profiles_property_uq', unique: true,
    });
    await addIndexIfMissing(queryInterface, 'short_stay_property_profiles', ['public_slug'], {
      name: 'short_stay_profiles_public_slug_uq', unique: true, nullable: true,
    });
    await addIndexIfMissing(queryInterface, 'short_stay_property_profiles', ['branch_id', 'status', 'is_website_listed'], {
      name: 'short_stay_profiles_branch_status_publish_idx',
    });
    await addIndexIfMissing(queryInterface, 'short_stay_availability_blocks', ['property_id', 'start_date', 'end_date'], {
      name: 'short_stay_availability_property_dates_idx',
    });
    await addIndexIfMissing(queryInterface, 'short_stay_bookings', ['branch_id', 'property_id', 'check_in_date', 'check_out_date'], {
      name: 'short_stay_bookings_branch_property_dates_idx',
    });

    if (!tables.includes('short_stay_enquiries')) {
      await queryInterface.createTable('short_stay_enquiries', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: Sequelize.INTEGER, allowNull: false },
        property_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'properties', key: 'id' },
          onDelete: 'SET NULL',
        },
        profile_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'short_stay_property_profiles', key: 'id' },
          onDelete: 'SET NULL',
        },
        guest_name: { type: Sequelize.STRING(150), allowNull: false },
        guest_email: { type: Sequelize.STRING(190), allowNull: true },
        guest_phone: { type: Sequelize.STRING(60), allowNull: true },
        check_in_date: { type: Sequelize.DATEONLY, allowNull: false },
        check_out_date: { type: Sequelize.DATEONLY, allowNull: false },
        adults_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
        children_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        message: { type: Sequelize.TEXT, allowNull: true },
        quoted_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
        status: {
          type: Sequelize.ENUM('new', 'contacted', 'quoted', 'converted', 'closed'),
          allowNull: false,
          defaultValue: 'new',
        },
        source: { type: Sequelize.STRING(40), allowNull: false, defaultValue: 'website' },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
      });
    }

    await addIndexIfMissing(queryInterface, 'short_stay_enquiries', ['branch_id', 'status'], {
      name: 'short_stay_enquiries_branch_status_idx',
    });
    await addIndexIfMissing(queryInterface, 'short_stay_enquiries', ['property_id', 'check_in_date', 'check_out_date'], {
      name: 'short_stay_enquiries_property_dates_idx',
    });
  },

  down: async (queryInterface) => {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('short_stay_enquiries')) await queryInterface.dropTable('short_stay_enquiries');
    if (tables.includes('short_stay_property_profiles')) {
      const columns = await queryInterface.describeTable('short_stay_property_profiles');
      if (columns.cancellation_policy) await queryInterface.removeColumn('short_stay_property_profiles', 'cancellation_policy');
      if (columns.min_nights) await queryInterface.removeColumn('short_stay_property_profiles', 'min_nights');
    }
  },
};
