/**
 * waterTankClientDocs.js — client document management for the Property Doc
 * Verification & Transfer service lines (Land & Property Assessment, and the
 * three sibling sub-services to come).
 *
 * Two tables, created by migration 0096:
 *   wt_client_documents      — a filed document belonging to a client (NID,
 *                              Khatian, deed, survey plan, …). service_line-tagged.
 *   wt_client_doc_requests   — a tokenised request link sent to a client so they
 *                              can upload the required documents themselves.
 *
 * Only lines whose manifest sets `doc_manager: true` use these; the tables carry a
 * service_line column like every other wt_* table so the data stays isolated.
 */
const { DataTypes: D } = require('sequelize');
const sequelize = require('../config/db.config');

const base = {
  id: { type: D.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: D.INTEGER, allowNull: false, defaultValue: 1 },
  service_line: { type: D.STRING(40), allowNull: false, defaultValue: 'water_tank' },
};

const WtClientDocument = sequelize.define('WtClientDocument', {
  ...base,
  client_id: { type: D.INTEGER, allowNull: false },
  client_code: D.STRING(40),
  // The request link (if any) this document arrived through.
  request_id: D.INTEGER,
  // Matches a manifest ui.client_docs[].key (e.g. 'rs_khatian'); 'other' for ad-hoc.
  doc_key: { type: D.STRING(60), allowNull: false, defaultValue: 'other' },
  doc_type: { type: D.STRING(120), allowNull: false },
  category: { type: D.STRING(30), allowNull: false, defaultValue: 'other' },
  file_url: D.STRING(500),
  original_name: D.STRING(255),
  size: D.INTEGER,
  mime: D.STRING(120),
  doc_number: D.STRING(120),
  issue_date: D.DATEONLY,
  expiry_date: D.DATEONLY,
  // Requested (checklist item with no file yet) | Submitted | Verified | Rejected.
  status: { type: D.STRING(30), allowNull: false, defaultValue: 'Submitted' },
  verified_by: D.STRING(120),
  verified_date: D.DATEONLY,
  // staff (uploaded by an operator) | client_link (submitted via a request link).
  source: { type: D.STRING(20), allowNull: false, defaultValue: 'staff' },
  // Optional linkage so a document can be tied to the job it supports.
  assessment_code: D.STRING(40),
  request_code: D.STRING(40),
  project_id: D.STRING(40),
  uploaded_by: D.STRING(120),
  notes: D.TEXT,
}, { tableName: 'wt_client_documents' });

const WtClientDocRequest = sequelize.define('WtClientDocRequest', {
  ...base,
  code: { type: D.STRING(30), allowNull: false },
  client_id: { type: D.INTEGER, allowNull: false },
  client_code: D.STRING(40),
  client_name: D.STRING(200),
  client_email: D.STRING(200),
  client_phone: D.STRING(60),
  // SHA-256 of the raw token; the raw token lives only in the emailed link.
  token_hash: D.STRING(64),
  token_expires_at: D.DATE,
  // [{ key, label, category, required }] snapshot of what was asked for.
  requested_docs: D.JSON,
  message: D.TEXT,
  // Sent | Submitted (client uploaded) | Completed (staff reviewed) | Expired.
  status: { type: D.STRING(30), allowNull: false, defaultValue: 'Sent' },
  submitted_at: D.DATE,
  notes: D.TEXT,
}, { tableName: 'wt_client_doc_requests' });

module.exports = { WtClientDocument, WtClientDocRequest };
