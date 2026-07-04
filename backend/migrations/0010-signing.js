'use strict';

/**
 * 0010 — Native DocuSign-style signing.
 * document_templates → signing_envelopes → envelope_signers → signature_fields,
 * plus signing_audit_logs and a tamper-evident content hash + completion cert.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { INTEGER, STRING, TEXT, BOOLEAN, ENUM, JSON, DATE } = Sequelize;
    const ts = {
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    };
    const fkUser = (allowNull = true) => ({ type: INTEGER, allowNull, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' });

    // ── document_templates ──────────────────────────────────────────────────
    await queryInterface.createTable('document_templates', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: { type: INTEGER, references: { model: 'branches', key: 'id' }, onDelete: 'SET NULL' },
      name: { type: STRING, allowNull: false },
      category: { type: STRING },         // Service Agreement, Lease, Work Order, Quotation, Inspection, Consent, Provider Agreement
      vertical_key: { type: STRING(40) },
      description: { type: TEXT },
      body_html: { type: TEXT('long') },  // rich content with {{placeholders}}
      placeholders: { type: JSON, defaultValue: [] },  // [{key, label, source}]
      default_signers: { type: JSON, defaultValue: [] }, // [{role, order, required}]
      field_layout: { type: JSON, defaultValue: [] },    // default signature field positions
      is_active: { type: BOOLEAN, defaultValue: true },
      created_by: fkUser(true),
      ...ts,
    });

    // ── signing_envelopes ────────────────────────────────────────────────────
    await queryInterface.createTable('signing_envelopes', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: { type: INTEGER, allowNull: false, references: { model: 'branches', key: 'id' }, onDelete: 'RESTRICT' },
      envelope_code: { type: STRING(40), unique: true },
      template_id: { type: INTEGER, references: { model: 'document_templates', key: 'id' }, onDelete: 'SET NULL' },
      title: { type: STRING, allowNull: false },
      status: {
        type: ENUM('draft', 'pending_approval', 'sent', 'viewed', 'partially_signed', 'completed', 'declined', 'voided', 'expired'),
        defaultValue: 'draft',
      },
      // Link to CRM record this envelope concerns
      related_type: { type: STRING(40) },  // client | project | property | work_order | provider
      related_id: { type: INTEGER },
      document_html: { type: TEXT('long') },  // rendered, populated content
      message: { type: TEXT },                // email message to signers
      signing_order_enforced: { type: BOOLEAN, defaultValue: true },
      final_pdf_url: { type: STRING },
      certificate_url: { type: STRING },
      content_hash: { type: STRING(128) },    // SHA-256 of final signed content (tamper evidence)
      expires_at: { type: DATE },
      sent_at: { type: DATE },
      completed_at: { type: DATE },
      voided_reason: { type: STRING },
      created_by: fkUser(true),
      ...ts,
    });

    // ── envelope_signers ─────────────────────────────────────────────────────
    await queryInterface.createTable('envelope_signers', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      envelope_id: { type: INTEGER, allowNull: false, references: { model: 'signing_envelopes', key: 'id' }, onDelete: 'CASCADE' },
      signer_order: { type: INTEGER, defaultValue: 1 },
      role: { type: ENUM('internal_approver', 'client', 'landlord', 'tenant', 'provider', 'staff_countersign', 'witness'), defaultValue: 'client' },
      name: { type: STRING, allowNull: false },
      email: { type: STRING, allowNull: false },
      phone: { type: STRING },
      contact_id: { type: INTEGER, references: { model: 'contacts', key: 'id' }, onDelete: 'SET NULL' },
      user_id: fkUser(true),
      // Secure access token (unique, expiring)
      access_token: { type: STRING(120), unique: true },
      token_expires_at: { type: DATE },
      otp_required: { type: BOOLEAN, defaultValue: false },
      otp_code: { type: STRING(10) },
      status: { type: ENUM('pending', 'sent', 'viewed', 'signed', 'declined'), defaultValue: 'pending' },
      viewed_at: { type: DATE },
      signed_at: { type: DATE },
      declined_reason: { type: STRING },
      ip_address: { type: STRING },
      user_agent: { type: STRING },
      ...ts,
    });

    // ── signature_fields ─────────────────────────────────────────────────────
    await queryInterface.createTable('signature_fields', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      envelope_id: { type: INTEGER, allowNull: false, references: { model: 'signing_envelopes', key: 'id' }, onDelete: 'CASCADE' },
      signer_id: { type: INTEGER, references: { model: 'envelope_signers', key: 'id' }, onDelete: 'CASCADE' },
      field_type: { type: ENUM('signature', 'initials', 'date_signed', 'full_name', 'email', 'text', 'checkbox'), defaultValue: 'signature' },
      page: { type: INTEGER, defaultValue: 1 },
      pos_x: { type: INTEGER, defaultValue: 0 },
      pos_y: { type: INTEGER, defaultValue: 0 },
      width: { type: INTEGER, defaultValue: 180 },
      height: { type: INTEGER, defaultValue: 60 },
      required: { type: BOOLEAN, defaultValue: true },
      label: { type: STRING },
      value: { type: TEXT },   // filled value / signature image data URL
      ...ts,
    });

    // ── signing_audit_logs ───────────────────────────────────────────────────
    await queryInterface.createTable('signing_audit_logs', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      envelope_id: { type: INTEGER, allowNull: false, references: { model: 'signing_envelopes', key: 'id' }, onDelete: 'CASCADE' },
      signer_id: { type: INTEGER, references: { model: 'envelope_signers', key: 'id' }, onDelete: 'SET NULL' },
      event: { type: STRING, allowNull: false },   // created, sent, viewed, signed, declined, voided, downloaded, reminded, completed
      actor_email: { type: STRING },
      ip_address: { type: STRING },
      user_agent: { type: STRING },
      meta: { type: JSON, defaultValue: {} },
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    // Late FK: documents.signing_envelope_id → signing_envelopes.id
    await queryInterface.addConstraint('documents', {
      fields: ['signing_envelope_id'],
      type: 'foreign key',
      name: 'fk_documents_envelope',
      references: { table: 'signing_envelopes', field: 'id' },
      onUpdate: 'CASCADE', onDelete: 'SET NULL',
    });

    await queryInterface.addIndex('signing_envelopes', ['branch_id', 'status']);
    await queryInterface.addIndex('signing_envelopes', ['related_type', 'related_id']);
    await queryInterface.addIndex('envelope_signers', ['envelope_id']);
    await queryInterface.addIndex('envelope_signers', ['access_token']);
    await queryInterface.addIndex('signature_fields', ['envelope_id', 'signer_id']);
    await queryInterface.addIndex('signing_audit_logs', ['envelope_id']);
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint('documents', 'fk_documents_envelope').catch(() => {});
    await queryInterface.dropTable('signing_audit_logs');
    await queryInterface.dropTable('signature_fields');
    await queryInterface.dropTable('envelope_signers');
    await queryInterface.dropTable('signing_envelopes');
    await queryInterface.dropTable('document_templates');
  },
};
