import PDFDocument from 'pdfkit';
import { buildRentClauses, buildSaleClauses, formatPkt } from './agreementClauses.js';

const BUCKET = 'realnest-documents';

function drawPageNumber(doc, pageNum, totalPages) {
  const text = `Page ${pageNum} of ${totalPages}`;
  doc.save();
  doc.fontSize(9).fillColor('#666666');
  doc.text(text, doc.page.margins.left, doc.page.height - 40, {
    width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
    align: 'center',
  });
  doc.restore();
}

function drawExecutedFooter(doc, data) {
  const { document: d, seller, buyer } = data;
  const sellerLine = `Seller Confirmed: ${seller?.name || '—'} | ${formatPkt(d.sellerAgreedAt)} PKT | OTP Verified ✓`;
  const buyerLine = `Buyer Confirmed: ${buyer?.name || '—'} | ${formatPkt(d.buyerAgreedAt)} PKT | OTP Verified ✓`;
  const idLine = `Document ID: ${d.id} | Legally binding under ETO 2002, Pakistan`;
  doc.save();
  doc.fontSize(7).fillColor('#333333');
  const y = doc.page.height - 72;
  const w = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  doc.text(sellerLine, doc.page.margins.left, y, { width: w });
  doc.text(buyerLine, doc.page.margins.left, y + 10, { width: w });
  doc.text(idLine, doc.page.margins.left, y + 20, { width: w });
  doc.restore();
}

function drawHeader(doc, documentId) {
  doc.save();
  doc.fillColor('#0f172a').fontSize(16).text('RealNest');
  doc.moveDown(0.2);
  doc.fontSize(10).fillColor('#64748b').text(`Legal document · ID: ${documentId}`);
  doc.moveDown(0.8);
  doc.strokeColor('#e2e8f0')
    .lineWidth(1)
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .stroke();
  doc.moveDown(0.8);
  doc.restore();
}

function paragraph(doc, title, body) {
  doc.fontSize(11).fillColor('#0f172a').font('Helvetica-Bold').text(title);
  doc.moveDown(0.2);
  doc.font('Helvetica').fillColor('#334155').text(body, { align: 'justify' });
  doc.moveDown(0.6);
}

function renderClauses(doc, clauses) {
  clauses.forEach(({ title, body }) => paragraph(doc, title, body));
}

function saleDeedContent(doc, data, planId = 'society_standard') {
  renderClauses(doc, buildSaleClauses(data, planId));
}

function rentAgreementContent(doc, data, planId = 'standard_lease') {
  renderClauses(doc, buildRentClauses(data, planId));
}

/**
 * Builds a PDF buffer for a populated document { document, property, seller, buyer }.
 * When document.status === FULLY_EXECUTED, adds binding footer on every page.
 */
export function buildDocumentPdfBuffer(data, options = {}) {
  const d = data.document;
  const planId = options.paymentPlanId || 'society_standard';
  const rentPlanId = options.rentPlanId || 'standard_lease';
  const chunks = [];
  const doc = new PDFDocument({
    size: 'A4',
    margin: 48,
    bufferPages: true,
    info: {
      Title: d.type === 'SALE_DEED' ? 'Sale Deed' : 'Rent Agreement',
      Author: 'RealNest',
      Subject: d.id,
    },
  });

  doc.on('data', (c) => chunks.push(c));

  const done = new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  doc.on('pageAdded', () => {
    drawHeader(doc, d.id);
  });

  drawHeader(doc, d.id);
  if (d.type === 'SALE_DEED') saleDeedContent(doc, data, planId);
  else rentAgreementContent(doc, data, rentPlanId);

  const range = doc.bufferedPageRange();
  const total = range.count;
  const showExecuted = d.status === 'FULLY_EXECUTED';

  for (let i = 0; i < total; i += 1) {
    doc.switchToPage(i);
    if (showExecuted) drawExecutedFooter(doc, data);
    drawPageNumber(doc, i + 1, total);
  }

  doc.flushPages();
  doc.end();

  return done;
}

export { BUCKET };

/**
 * Upload PDF buffer to Supabase Storage and return public URL (or null if not configured / failed).
 */
export async function uploadPdfToSupabase(supabaseAdmin, documentId, buffer) {
  if (!supabaseAdmin) return null;
  const path = `${documentId}.pdf`;
  const { error } = await supabaseAdmin.storage.from(BUCKET).upload(path, buffer, {
    contentType: 'application/pdf',
    upsert: true,
  });
  if (error) {
    console.error('Supabase document upload error:', error.message);
    return null;
  }
  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
  return data?.publicUrl || null;
}
