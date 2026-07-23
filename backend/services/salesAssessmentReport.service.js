const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const sequelize = require('../config/db.config');
const Property = require('../models/Property');
const Contact = require('../models/Contact');
const { SaleParty } = require('../models/SalesModels');
const {
  SaleAssessment,
  SaleAssessmentItem,
  SaleAppraisal,
  SaleAppraisalComparable,
  SaleProposal,
  SaleReportVersion,
} = require('../models/SalesAssessmentModels');

const DOCUMENTS_DIR = path.resolve(__dirname, '../uploads/documents');
const UPLOADS_DIR = path.resolve(__dirname, '../uploads');
const NAVY = '#0B1F3A';
const CYAN = '#18B6D9';
const INK = '#172033';
const MUTED = '#627086';

const plain = (row) => row?.get ? row.get({ plain: true }) : row;

function text(value, fallback = 'Not provided') {
  if (value == null || value === '') return fallback;
  const normalized = String(value).normalize('NFKC').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
  return normalized || fallback;
}

function dateText(value) {
  if (!value) return 'Not provided';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? text(value) : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function money(value, currency = 'BDT') {
  if (value == null || value === '') return 'Not provided';
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 'Not provided';
  return `${text(currency, 'BDT')} ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function imageValue(value) {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return null;
  return value.url || value.file_url || value.src || value.path || null;
}

function resolveLocalImage(value) {
  const raw = imageValue(value);
  if (!raw || /^(?:https?:)?\/\//i.test(raw)) return null;
  let decoded;
  try { decoded = decodeURIComponent(raw.split(/[?#]/)[0]).replace(/\\/g, '/'); } catch { return null; }
  const marker = decoded.toLowerCase().indexOf('/uploads/');
  if (marker < 0) return null;
  const relative = decoded.slice(marker + '/uploads/'.length);
  const candidate = path.resolve(UPLOADS_DIR, relative);
  if (!candidate.startsWith(`${UPLOADS_DIR}${path.sep}`) || !/\.(?:png|jpe?g)$/i.test(candidate)) return null;
  try { return fs.statSync(candidate).isFile() ? candidate : null; } catch { return null; }
}

function resolveLocalEvidence(value) {
  const raw = imageValue(value);
  if (!raw || /^(?:https?:)?\/\//i.test(raw)) return null;
  let decoded;
  try { decoded = decodeURIComponent(raw.split(/[?#]/)[0]).replace(/\\/g, '/'); } catch { return null; }
  const marker = decoded.toLowerCase().indexOf('/uploads/');
  if (marker < 0) return null;
  const candidate = path.resolve(UPLOADS_DIR, decoded.slice(marker + '/uploads/'.length));
  if (!candidate.startsWith(`${UPLOADS_DIR}${path.sep}`) || !/\.(?:png|jpe?g|gif|webp|heic)$/i.test(candidate)) return null;
  try { return fs.statSync(candidate).isFile() ? candidate : null; } catch { return null; }
}

function resolveReportFile(report) {
  const value = report?.pdf_url || report?.report_url;
  if (!value || /^(?:https?:)?\/\//i.test(value)) return null;
  const normalized = String(value).split(/[?#]/)[0].replace(/\\/g, '/');
  const fileName = path.basename(normalized);
  if (!normalized.startsWith('/uploads/documents/') || !fileName || fileName !== report.file_name || !/\.pdf$/i.test(fileName)) return null;
  const candidate = path.resolve(DOCUMENTS_DIR, fileName);
  if (!candidate.startsWith(`${DOCUMENTS_DIR}${path.sep}`)) return null;
  try { return fs.statSync(candidate).isFile() ? candidate : null; } catch { return null; }
}

async function loadAssessmentBundle(assessment, branchId) {
  const [property, items, vendorParties] = await Promise.all([
    Property.findOne({ where: { id: assessment.property_id, branch_id: branchId } }),
    SaleAssessmentItem.findAll({ where: { assessment_id: assessment.id, branch_id: branchId }, order: [['sort_order', 'ASC'], ['id', 'ASC']] }),
    SaleParty.findAll({ where: { property_id: assessment.property_id, branch_id: branchId, role: 'vendor', status: 'active' }, order: [['is_primary', 'DESC'], ['id', 'ASC']] }),
  ]);
  if (!property) throw Object.assign(new Error('Sale property not found'), { status: 404 });
  const contactIds = [...new Set([assessment.owner_contact_id, property.owner_contact_id, ...vendorParties.map((party) => party.contact_id)].filter(Boolean))];
  const contacts = contactIds.length
    ? await Contact.findAll({ where: { id: { [Op.in]: contactIds }, branch_id: branchId } })
    : [];
  const contactsById = new Map(contacts.map((contact) => [Number(contact.id), plain(contact)]));
  return {
    property: plain(property),
    assessment: plain(assessment),
    items: items.map(plain),
    owner: contactsById.get(Number(assessment.owner_contact_id || property.owner_contact_id)) || null,
    vendors: vendorParties.map((party) => ({ ...plain(party), contact: contactsById.get(Number(party.contact_id)) || null })),
  };
}

function addHeader(doc, title) {
  doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(10).text('SEVENTH SKY PROPERTY CARE', 48, 34);
  doc.fillColor(CYAN).rect(48, 52, 500, 3).fill();
  doc.fillColor(MUTED).font('Helvetica').fontSize(8).text(text(title), 48, 62, { align: 'right', width: 500 });
  doc.y = 88;
}

function ensureSpace(doc, height, title) {
  if (doc.y + height < 735) return;
  doc.addPage();
  addHeader(doc, title);
}

function heading(doc, label, title) {
  ensureSpace(doc, 55, title);
  doc.moveDown(0.4).fillColor(NAVY).font('Helvetica-Bold').fontSize(14).text(text(label));
  doc.fillColor(CYAN).rect(48, doc.y + 4, 54, 2).fill();
  doc.moveDown(1);
}

function keyValue(doc, label, value, title) {
  ensureSpace(doc, 34, title);
  const y = doc.y;
  doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(8).text(text(label).toUpperCase(), 48, y, { width: 145 });
  doc.fillColor(INK).font('Helvetica').fontSize(10).text(text(value), 198, y, { width: 350 });
  doc.y = Math.max(doc.y, y + 22);
}

function bodyText(doc, value, title) {
  ensureSpace(doc, 65, title);
  doc.fillColor(INK).font('Helvetica').fontSize(10).text(text(value), { lineGap: 3 });
  doc.moveDown(0.7);
}

function bulletList(doc, values, emptyText, title) {
  if (!Array.isArray(values) || !values.length) return bodyText(doc, emptyText, title);
  for (const value of values) {
    ensureSpace(doc, 30, title);
    const label = typeof value === 'object' && value !== null ? value.label || value.name || value.description : value;
    doc.fillColor(CYAN).circle(55, doc.y + 6, 2.5).fill();
    doc.fillColor(INK).font('Helvetica').fontSize(10).text(text(label), 66, doc.y, { width: 475 });
    doc.moveDown(0.35);
  }
}

function drawCover(doc, snapshot, reportTitle) {
  const property = snapshot.property;
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(NAVY);
  doc.fillColor(CYAN).rect(48, 68, 88, 5).fill();
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(12).text('SEVENTH SKY', 48, 92);
  doc.font('Helvetica').fontSize(10).fillColor('#B9C7D8').text('PROPERTY CARE', 48, 110);
  doc.font('Helvetica-Bold').fontSize(32).fillColor('#FFFFFF').text(reportTitle, 48, 175, { width: 500, lineGap: 4 });
  doc.font('Helvetica').fontSize(15).fillColor('#C7D5E6').text(text(property.title), 48, 275, { width: 500 });
  doc.fontSize(10).fillColor('#92A7BD').text(text(property.address), 48, 304, { width: 500 });

  const photo = resolveLocalImage(property.featured_image_url)
    || (snapshot.assessment.photos || []).map(resolveLocalImage).find(Boolean);
  if (photo) {
    try {
      doc.roundedRect(48, 356, 500, 260, 8).fill('#FFFFFF');
      doc.image(photo, 52, 360, { fit: [492, 252], align: 'center', valign: 'center' });
    } catch {
      doc.roundedRect(48, 356, 500, 120, 8).fill('#112C50');
    }
  } else {
    doc.roundedRect(48, 356, 500, 120, 8).fill('#112C50');
    doc.fillColor('#92A7BD').fontSize(10).text('Property image not available', 48, 409, { width: 500, align: 'center' });
  }
  doc.fillColor('#92A7BD').fontSize(9).text(`Prepared ${dateText(new Date())}`, 48, 742);
  doc.addPage();
}

function addPeople(doc, snapshot, title) {
  heading(doc, 'Owner and vendor details', title);
  const people = [snapshot.owner, ...snapshot.vendors.map((vendor) => vendor.contact)]
    .filter(Boolean)
    .filter((person, index, all) => all.findIndex((candidate) => Number(candidate.id) === Number(person.id)) === index);
  if (!people.length) return bodyText(doc, 'No owner or vendor contact details are recorded.', title);
  for (const person of people) {
    ensureSpace(doc, 56, title);
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(10).text(text(person.full_name || person.company_name));
    doc.fillColor(MUTED).font('Helvetica').fontSize(9).text([person.primary_phone, person.email].filter(Boolean).map(text).join(' | ') || 'Contact details not provided');
    doc.moveDown(0.6);
  }
}

function addAssessmentSummary(doc, snapshot, title) {
  heading(doc, 'Assessment summary', title);
  keyValue(doc, 'Assessment date', dateText(snapshot.assessment.assessment_date), title);
  keyValue(doc, 'Inspector', snapshot.assessment.inspector_name, title);
  keyValue(doc, 'Occupancy', snapshot.assessment.occupancy_status, title);
  keyValue(doc, 'Overall score', snapshot.assessment.overall_score == null ? 'Not scored' : `${snapshot.assessment.overall_score}/100`, title);
  keyValue(doc, 'Marketability score', snapshot.assessment.marketability_score == null ? 'Not scored' : `${snapshot.assessment.marketability_score}/100`, title);
  bodyText(doc, snapshot.assessment.condition_summary, title);
  if (snapshot.assessment.blockers?.length) keyValue(doc, 'Blockers', snapshot.assessment.blockers.map((item) => text(item)).join(', '), title);
  heading(doc, 'Condition findings', title);
  if (!snapshot.items.length) return bodyText(doc, 'No assessment findings were recorded.', title);
  for (const item of snapshot.items) {
    ensureSpace(doc, 48, title);
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(9).text(text(item.label));
    doc.fillColor(MUTED).font('Helvetica').fontSize(8).text(`${text(item.condition_status, 'Not assessed').replace(/_/g, ' ')}${item.score == null ? '' : ` | ${item.score}/100`}${item.notes ? ` | ${text(item.notes)}` : ''}`, { width: 500 });
    doc.moveDown(0.45);
  }
}

function addPageNumbers(doc) {
  const range = doc.bufferedPageRange();
  for (let index = range.start; index < range.start + range.count; index += 1) {
    doc.switchToPage(index);
    doc.fillColor('#8391A5').font('Helvetica').fontSize(8)
      .text(`Seventh Sky Property Care  |  ${index + 1} of ${range.count}`, 48, 770, { width: 500, align: 'center', lineBreak: false });
  }
}

function writePdf(filePath, snapshot, reportType) {
  let PDFDocument;
  try { PDFDocument = require('pdfkit'); } catch {
    throw Object.assign(new Error('PDF generation requires the pdfkit dependency. Run npm install in backend.'), { status: 503 });
  }
  return new Promise((resolve, reject) => {
    const title = reportType === 'appraisal' ? 'Property Appraisal Report' : 'Sales Agency Proposal';
    const doc = new PDFDocument({ size: 'A4', margins: { top: 42, right: 48, bottom: 58, left: 48 }, bufferPages: true, info: { Title: title, Author: 'Seventh Sky Property Care' } });
    const output = fs.createWriteStream(filePath);
    output.on('finish', resolve);
    output.on('error', reject);
    doc.on('error', reject);
    doc.pipe(output);

    drawCover(doc, snapshot, title);
    addHeader(doc, title);
    heading(doc, 'Property', title);
    keyValue(doc, 'Reference', snapshot.property.property_code, title);
    keyValue(doc, 'Address', snapshot.property.address, title);
    keyValue(doc, 'Type', `${text(snapshot.property.category)} / ${text(snapshot.property.property_type)}`, title);
    keyValue(doc, 'Configuration', `${snapshot.property.bedrooms || 0} bedrooms, ${snapshot.property.bathrooms || 0} bathrooms`, title);
    addPeople(doc, snapshot, title);
    addAssessmentSummary(doc, snapshot, title);

    if (reportType === 'appraisal') {
      const appraisal = snapshot.appraisal;
      heading(doc, 'Appraisal conclusion', title);
      keyValue(doc, 'Appraisal date', dateText(appraisal.appraisal_date), title);
      keyValue(doc, 'Valuation method', appraisal.valuation_method, title);
      keyValue(doc, 'Market value range', `${money(appraisal.market_value_min, appraisal.currency)} - ${money(appraisal.market_value_max, appraisal.currency)}`, title);
      keyValue(doc, 'Recommended value', money(appraisal.recommended_value, appraisal.currency), title);
      keyValue(doc, 'Approved value', money(appraisal.approved_value, appraisal.currency), title);
      keyValue(doc, 'Reserve value', money(appraisal.reserve_value, appraisal.currency), title);
      keyValue(doc, 'Quick sale value', money(appraisal.quick_sale_value, appraisal.currency), title);
      keyValue(doc, 'Expected market time', appraisal.expected_days == null ? 'Not provided' : `${appraisal.expected_days} days`, title);
      bodyText(doc, appraisal.market_summary, title);
      heading(doc, 'Strengths', title);
      bulletList(doc, appraisal.strengths, 'No specific strengths were recorded.', title);
      heading(doc, 'Weaknesses', title);
      bulletList(doc, appraisal.weaknesses, 'No specific weaknesses were recorded.', title);
      heading(doc, 'Comparable evidence', title);
      if (!snapshot.comparables.length) bodyText(doc, 'No comparable properties were recorded.', title);
      for (const comparable of snapshot.comparables) {
        ensureSpace(doc, 100, title);
        const y = doc.y;
        doc.roundedRect(48, y, 500, 82, 5).fillAndStroke('#F5F8FC', '#DCE5EF');
        doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(10).text(text(comparable.title || comparable.address, 'Comparable property'), 60, y + 12, { width: 330 });
        doc.fillColor(MUTED).font('Helvetica').fontSize(8).text(text(comparable.address, ''), 60, y + 29, { width: 330 });
        doc.fillColor(INK).font('Helvetica-Bold').fontSize(10).text(money(comparable.sale_price || comparable.asking_price, appraisal.currency), 400, y + 12, { width: 136, align: 'right' });
        doc.fillColor(MUTED).font('Helvetica').fontSize(8).text(`Adjusted: ${money(comparable.adjusted_value, appraisal.currency)}\n${dateText(comparable.transaction_date)}`, 400, y + 30, { width: 136, align: 'right' });
        doc.y = y + 94;
      }
      heading(doc, 'Assumptions and disclaimer', title);
      bodyText(doc, appraisal.assumptions, title);
      bodyText(doc, appraisal.disclaimer || 'This appraisal is an opinion of market value based on available evidence and is not a structural survey, legal opinion, or guarantee of sale price.', title);
    } else {
      const proposal = snapshot.proposal;
      heading(doc, 'Recommended sales position', title);
      keyValue(doc, 'Proposal date', dateText(proposal.proposal_date), title);
      keyValue(doc, 'Valid until', dateText(proposal.valid_until), title);
      keyValue(doc, 'Proposed asking price', money(proposal.proposed_asking_price, proposal.currency), title);
      keyValue(doc, 'Reserve price', money(proposal.proposed_reserve_price, proposal.currency), title);
      keyValue(doc, 'Agency type', proposal.agency_type, title);
      keyValue(doc, 'Commission', proposal.commission_percent != null ? `${proposal.commission_percent}%` : money(proposal.commission_fixed, proposal.currency), title);
      keyValue(doc, 'Marketing budget', money(proposal.marketing_budget, proposal.currency), title);
      bodyText(doc, proposal.summary, title);
      if (snapshot.appraisal) {
        heading(doc, 'Valuation context', title);
        keyValue(doc, 'Market value range', `${money(snapshot.appraisal.market_value_min, snapshot.appraisal.currency)} - ${money(snapshot.appraisal.market_value_max, snapshot.appraisal.currency)}`, title);
        keyValue(doc, 'Recommended value', money(snapshot.appraisal.recommended_value, snapshot.appraisal.currency), title);
        keyValue(doc, 'Comparable evidence', snapshot.comparables.length ? `${snapshot.comparables.length} comparable properties reviewed` : 'No comparable properties recorded', title);
        for (const comparable of snapshot.comparables) {
          ensureSpace(doc, 34, title);
          doc.fillColor(INK).font('Helvetica-Bold').fontSize(9).text(text(comparable.title || comparable.address, 'Comparable property'), { continued: true });
          doc.font('Helvetica').fillColor(MUTED).text(`  ${money(comparable.sale_price || comparable.asking_price, snapshot.appraisal.currency)}`);
        }
      }
      heading(doc, 'Marketing plan and services', title);
      const plan = [...(proposal.marketing_plan || []), ...(proposal.included_services || [])];
      if (!plan.length) bodyText(doc, 'The detailed campaign plan will be agreed with the vendor before launch.', title);
      for (const item of plan) {
        ensureSpace(doc, 28, title);
        doc.fillColor(CYAN).circle(55, doc.y + 6, 2.5).fill();
        doc.fillColor(INK).font('Helvetica').fontSize(10).text(text(typeof item === 'object' ? item.label || item.name || item.description : item), 66, doc.y, { width: 475 });
        doc.moveDown(0.35);
      }
      heading(doc, 'Terms, assumptions and disclaimer', title);
      bodyText(doc, proposal.terms, title);
      bodyText(doc, proposal.assumptions, title);
      bodyText(doc, proposal.disclaimer || 'This proposal is subject to contract, satisfactory ownership and compliance checks, and the final signed agency agreement.', title);
    }

    addPageNumbers(doc);
    doc.end();
  });
}

async function persistReport({ reportType, snapshot, branchId, actorId, assessmentId, appraisal, proposal }) {
  fs.mkdirSync(DOCUMENTS_DIR, { recursive: true });
  const entityId = appraisal?.id || proposal?.id;
  const entityWhere = appraisal ? { appraisal_id: appraisal.id } : { proposal_id: proposal.id };
  const version = Number(await SaleReportVersion.max('version_number', { where: { branch_id: branchId, report_type: reportType, ...entityWhere } })) + 1 || 1;
  const fileName = `sale-${reportType}-${entityId}-v${version}-${Date.now()}.pdf`;
  const filePath = path.join(DOCUMENTS_DIR, fileName);
  const reportUrl = `/uploads/documents/${fileName}`;
  const snapshotHash = crypto.createHash('sha256').update(stableJson(snapshot)).digest('hex');
  try {
    await writePdf(filePath, snapshot, reportType);
    const { report, source } = await sequelize.transaction(async (transaction) => {
      await SaleReportVersion.update({ status: 'superseded' }, { where: { branch_id: branchId, report_type: reportType, ...entityWhere, status: 'generated' }, transaction });
      const createdReport = await SaleReportVersion.create({
        branch_id: branchId,
        property_id: snapshot.property.id,
        assessment_id: assessmentId,
        appraisal_id: appraisal?.id || null,
        proposal_id: proposal?.id || null,
        report_type: reportType,
        version_number: version,
        status: 'generated',
        snapshot,
        snapshot_hash: snapshotHash,
        file_name: fileName,
        report_url: reportUrl,
        pdf_url: reportUrl,
        mime_type: 'application/pdf',
        generated_by: actorId,
        generated_at: new Date(),
      }, { transaction });
      const sourceRow = appraisal || proposal;
      await sourceRow.update({ report_url: reportUrl, pdf_url: reportUrl, ...(proposal ? { generated_at: new Date(), status: 'generated' } : {}) }, { transaction });
      return { report: createdReport, source: sourceRow };
    });
    return { report, source };
  } catch (error) {
    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
    throw error;
  }
}

async function generateAppraisalReport({ appraisalId, scope, actorId }) {
  const appraisal = await SaleAppraisal.findOne({ where: { id: appraisalId, ...scope } });
  if (!appraisal) throw Object.assign(new Error('Appraisal not found'), { status: 404 });
  const branchId = appraisal.branch_id;
  const assessment = await SaleAssessment.findOne({ where: { id: appraisal.assessment_id, branch_id: branchId } });
  if (!assessment) throw Object.assign(new Error('Assessment not found'), { status: 404 });
  const [bundle, comparables] = await Promise.all([
    loadAssessmentBundle(assessment, branchId),
    SaleAppraisalComparable.findAll({ where: { appraisal_id: appraisal.id, branch_id: branchId }, order: [['sort_order', 'ASC'], ['id', 'ASC']] }),
  ]);
  const snapshot = { ...bundle, appraisal: plain(appraisal), comparables: comparables.map(plain) };
  return persistReport({ reportType: 'appraisal', snapshot, branchId, actorId, assessmentId: assessment.id, appraisal });
}

async function generateProposalReport({ proposalId, scope, actorId }) {
  const proposal = await SaleProposal.findOne({ where: { id: proposalId, ...scope } });
  if (!proposal) throw Object.assign(new Error('Proposal not found'), { status: 404 });
  const branchId = proposal.branch_id;
  const assessment = await SaleAssessment.findOne({ where: { id: proposal.assessment_id, branch_id: branchId } });
  if (!assessment) throw Object.assign(new Error('Assessment not found'), { status: 404 });
  const bundle = await loadAssessmentBundle(assessment, branchId);
  let appraisal = null;
  let comparables = [];
  if (proposal.appraisal_id) {
    appraisal = await SaleAppraisal.findOne({ where: { id: proposal.appraisal_id, branch_id: branchId } });
    comparables = appraisal ? await SaleAppraisalComparable.findAll({ where: { appraisal_id: appraisal.id, branch_id: branchId }, order: [['sort_order', 'ASC'], ['id', 'ASC']] }) : [];
  }
  const snapshot = { ...bundle, proposal: plain(proposal), appraisal: plain(appraisal), comparables: comparables.map(plain) };
  return persistReport({ reportType: 'proposal', snapshot, branchId, actorId, assessmentId: assessment.id, proposal });
}

module.exports = { generateAppraisalReport, generateProposalReport, resolveReportFile, resolveLocalImage, resolveLocalEvidence };
