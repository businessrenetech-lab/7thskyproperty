'use strict';

/**
 * Migration 0096: client document management for Property Doc Verification &
 * Transfer service lines.
 *
 *   wt_client_documents    — filed client documents (NID, Khatian, deed, plan …),
 *                            service_line-tagged, optionally tied to a request.
 *   wt_client_doc_requests — tokenised links sent to a client to upload the
 *                            required documents themselves.
 *
 * Additive and idempotent; both tables are new. Timestamps use createdAt/updatedAt
 * to match the other wt_* tables (migration 0068 convention).
 */
module.exports = {
  up: async (q, S) => {
    const ts = {
      createdAt: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
    };

    if (!(await q.describeTable('wt_client_documents').catch(() => null))) {
      await q.createTable('wt_client_documents', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: S.INTEGER, allowNull: false, defaultValue: 1 },
        service_line: { type: S.STRING(40), allowNull: false, defaultValue: 'water_tank' },
        client_id: { type: S.INTEGER, allowNull: false },
        client_code: S.STRING(40),
        request_id: S.INTEGER,
        doc_key: { type: S.STRING(60), allowNull: false, defaultValue: 'other' },
        doc_type: { type: S.STRING(120), allowNull: false },
        category: { type: S.STRING(30), allowNull: false, defaultValue: 'other' },
        file_url: S.STRING(500),
        original_name: S.STRING(255),
        size: S.INTEGER,
        mime: S.STRING(120),
        doc_number: S.STRING(120),
        issue_date: S.DATEONLY,
        expiry_date: S.DATEONLY,
        status: { type: S.STRING(30), allowNull: false, defaultValue: 'Submitted' },
        verified_by: S.STRING(120),
        verified_date: S.DATEONLY,
        source: { type: S.STRING(20), allowNull: false, defaultValue: 'staff' },
        assessment_code: S.STRING(40),
        request_code: S.STRING(40),
        project_id: S.STRING(40),
        uploaded_by: S.STRING(120),
        notes: S.TEXT,
        ...ts,
      });
      await q.addIndex('wt_client_documents', ['branch_id', 'service_line'], { name: 'wt_client_documents_service_line' }).catch(() => {});
      await q.addIndex('wt_client_documents', ['client_id'], { name: 'wt_client_documents_client' }).catch(() => {});
    }

    if (!(await q.describeTable('wt_client_doc_requests').catch(() => null))) {
      await q.createTable('wt_client_doc_requests', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: S.INTEGER, allowNull: false, defaultValue: 1 },
        service_line: { type: S.STRING(40), allowNull: false, defaultValue: 'water_tank' },
        code: { type: S.STRING(30), allowNull: false },
        client_id: { type: S.INTEGER, allowNull: false },
        client_code: S.STRING(40),
        client_name: S.STRING(200),
        client_email: S.STRING(200),
        client_phone: S.STRING(60),
        token_hash: S.STRING(64),
        token_expires_at: S.DATE,
        requested_docs: S.JSON,
        message: S.TEXT,
        status: { type: S.STRING(30), allowNull: false, defaultValue: 'Sent' },
        submitted_at: S.DATE,
        notes: S.TEXT,
        ...ts,
      });
      await q.addIndex('wt_client_doc_requests', ['branch_id', 'service_line'], { name: 'wt_client_doc_requests_service_line' }).catch(() => {});
      await q.addIndex('wt_client_doc_requests', ['token_hash'], { name: 'wt_client_doc_requests_token' }).catch(() => {});
    }
  },
  down: async (q) => {
    await q.dropTable('wt_client_documents').catch(() => {});
    await q.dropTable('wt_client_doc_requests').catch(() => {});
  },
};
