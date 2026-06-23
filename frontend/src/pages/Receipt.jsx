import { useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTransaction } from '../hooks/useTransactions';
import { useAuth } from '../context/AuthContext';
import {
  HiOutlinePrinter,
  HiOutlineArrowDownTray,
  HiOutlineArrowLeft,
  HiOutlineCheckBadge,
  HiOutlineHome,
} from 'react-icons/hi2';
// We render the PDF as text (not a screenshot of the DOM) using jsPDF directly.
// Going through html2canvas/html2pdf doesn't work here because Tailwind v4 emits
// modern oklch() / color-mix() colors that html2canvas can't parse. jsPDF is
// loaded lazily via a script tag so its UMD attaches to `window.jspdf`.
import jsPdfUrl from 'jspdf/dist/jspdf.umd.min.js?url';

let jsPdfLoadPromise = null;

function loadJsPdf() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('jsPDF can only be loaded in the browser'));
  }
  if (window.jspdf?.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
  if (jsPdfLoadPromise) return jsPdfLoadPromise;

  jsPdfLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = jsPdfUrl;
    script.async = true;
    script.onload = () => {
      const ctor = window.jspdf?.jsPDF;
      if (typeof ctor === 'function') {
        resolve(ctor);
      } else {
        reject(new Error('jsPDF did not attach to window after loading'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load jsPDF script'));
    document.head.appendChild(script);
  });

  return jsPdfLoadPromise;
}

const PAYMENT_LABEL = {
  JAZZCASH: 'JazzCash',
  EASYPAISA: 'Easypaisa',
  CARD: 'Debit / Credit Card',
};

const STATUS_STYLE = {
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  PROCESSING: 'bg-amber-100 text-amber-700',
  PENDING: 'bg-gray-100 text-gray-700',
  FAILED: 'bg-red-100 text-red-700',
};

function formatDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Receipt() {
  const { id } = useParams();
  const { data: transaction, isLoading, error } = useTransaction(id);
  const { profile } = useAuth();
  const receiptRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  const dashboardPath =
    profile?.role === 'SELLER' ? '/dashboard/seller' : '/dashboard/buyer';

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!transaction || downloading) return;
    setDownloading(true);
    try {
      const JsPDF = await loadJsPdf();
      const doc = new JsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 18;
      const labelColumnWidth = 38;
      const valueColumnX = margin + labelColumnWidth;
      const valueMaxWidth = pageWidth - margin - valueColumnX;
      let y = margin;

      const property = transaction.property || {};
      const buyer = transaction.user || {};
      const seller = property.seller || {};

      const ensureSpace = (height) => {
        const pageHeight = doc.internal.pageSize.getHeight();
        if (y + height > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
      };

      const drawSectionTitle = (title) => {
        ensureSpace(10);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(title, margin, y);
        y += 2;
        doc.setDrawColor(200);
        doc.setLineWidth(0.2);
        doc.line(margin, y, pageWidth - margin, y);
        y += 5;
      };

      const drawRow = (label, value) => {
        const safeValue = value === null || value === undefined || value === ''
          ? '-'
          : String(value);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        const labelLines = doc.splitTextToSize(label, labelColumnWidth - 2);
        doc.setFont('helvetica', 'normal');
        const valueLines = doc.splitTextToSize(safeValue, valueMaxWidth);
        const rowHeight = Math.max(labelLines.length, valueLines.length) * 5 + 1;
        ensureSpace(rowHeight);
        doc.setFont('helvetica', 'bold');
        doc.text(labelLines, margin, y);
        doc.setFont('helvetica', 'normal');
        doc.text(valueLines, valueColumnX, y);
        y += rowHeight;
      };

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('RealNest', margin, y + 6);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Transaction Receipt', pageWidth - margin, y + 6, { align: 'right' });
      y += 12;
      doc.setDrawColor(120);
      doc.setLineWidth(0.4);
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;

      drawSectionTitle('Transaction');
      drawRow('Transaction ID', transaction.id);
      drawRow('Date & Time', formatDate(transaction.createdAt));
      drawRow('Status', transaction.status);
      y += 4;

      drawSectionTitle('Buyer');
      drawRow('Name', buyer.name);
      drawRow('Email', buyer.email);
      drawRow('Phone', buyer.phone);
      y += 4;

      drawSectionTitle('Seller');
      drawRow('Name', seller.name);
      drawRow('Email', seller.email);
      drawRow('Phone', seller.phone);
      y += 4;

      drawSectionTitle('Property');
      drawRow('Title', property.title);
      const address = [property.address, property.city].filter(Boolean).join(', ');
      drawRow('Address', address);
      if (property.type) {
        const typeLabel =
          property.type.charAt(0) + property.type.slice(1).toLowerCase();
        drawRow('Type', typeLabel);
      }
      if (property.bedrooms != null) drawRow('Bedrooms', property.bedrooms);
      if (property.bathrooms != null) drawRow('Bathrooms', property.bathrooms);
      if (property.area != null) drawRow('Area', `${property.area} sqft`);
      y += 4;

      drawSectionTitle('Payment');
      drawRow(
        'Method',
        PAYMENT_LABEL[transaction.paymentMethod] || transaction.paymentMethod
      );
      drawRow(
        'Amount Paid',
        `PKR ${Number(transaction.amount).toLocaleString()}`
      );
      y += 8;

      ensureSpace(20);
      doc.setDrawColor(200);
      doc.setLineWidth(0.2);
      doc.line(margin, y, pageWidth - margin, y);
      y += 6;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      const footer =
        'This receipt was generated by RealNest. This is a demo payment ' +
        'simulation - no real transaction was performed. For any queries, ' +
        'contact the seller using the details above.';
      const footerLines = doc.splitTextToSize(footer, pageWidth - margin * 2);
      doc.text(footerLines, pageWidth / 2, y, { align: 'center' });

      const filename = `RealNest-Receipt-${transaction?.id?.slice(0, 8) || 'receipt'}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error('PDF download failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-10 w-1/3 bg-gray-200 rounded" />
          <div className="h-96 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-red-500 text-lg">Receipt not found</p>
        <Link to={dashboardPath} className="text-blue-600 mt-4 inline-block">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const property = transaction.property || {};
  const buyer = transaction.user || {};
  const seller = property.seller || {};

  return (
    <div className="bg-gray-50 min-h-screen py-8 print:bg-white print:py-0">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Top actions - hidden on print */}
        <div className="flex items-center justify-between mb-6 no-print">
          <Link
            to={dashboardPath}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <HiOutlineArrowLeft className="h-4 w-4" /> Back to dashboard
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-60"
            >
              <HiOutlineArrowDownTray className="h-4 w-4" />
              {downloading ? 'Preparing...' : 'Download PDF'}
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <HiOutlinePrinter className="h-4 w-4" /> Print Receipt
            </button>
          </div>
        </div>

        {/* Receipt Card */}
        <div
          ref={receiptRef}
          className="receipt-card bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm print:shadow-none print:border-0 print:rounded-none"
        >
          {/* Header */}
          <div className="bg-linear-to-r from-blue-600 to-blue-700 text-white px-8 py-6 print:bg-blue-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center">
                  <HiOutlineHome className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs tracking-widest uppercase text-blue-100">RealNest</p>
                  <h1 className="text-2xl font-bold leading-tight">Transaction Receipt</h1>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wider text-blue-100">Status</p>
                <p className="font-semibold text-lg flex items-center gap-1 justify-end">
                  <HiOutlineCheckBadge className="h-5 w-5" />
                  {transaction.status.charAt(0) + transaction.status.slice(1).toLowerCase()}
                </p>
              </div>
            </div>
          </div>

          {/* Meta grid */}
          <div className="px-8 pt-6 pb-2 grid grid-cols-2 gap-6 border-b border-gray-100">
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500">Transaction ID</p>
              <p className="font-mono text-sm text-gray-900 mt-1 break-all">{transaction.id}</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-gray-500">Date &amp; Time</p>
              <p className="text-sm text-gray-900 mt-1">{formatDate(transaction.createdAt)}</p>
            </div>
          </div>

          {/* Buyer & Seller */}
          <div className="px-8 py-6 grid grid-cols-1 sm:grid-cols-2 gap-6 border-b border-gray-100">
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Buyer</p>
              <p className="font-semibold text-gray-900">{buyer.name || '-'}</p>
              {buyer.email && <p className="text-sm text-gray-600">{buyer.email}</p>}
              {buyer.phone && <p className="text-sm text-gray-600">{buyer.phone}</p>}
            </div>
            <div className="sm:text-right">
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Seller</p>
              <p className="font-semibold text-gray-900">{seller.name || '-'}</p>
              {seller.email && <p className="text-sm text-gray-600">{seller.email}</p>}
              {seller.phone && <p className="text-sm text-gray-600">{seller.phone}</p>}
            </div>
          </div>

          {/* Property details */}
          <div className="px-8 py-6 border-b border-gray-100">
            <p className="text-xs uppercase tracking-wider text-gray-500 mb-3">Property</p>
            <div className="bg-gray-50 rounded-xl p-5">
              <h2 className="text-lg font-bold text-gray-900">{property.title || '-'}</h2>
              <p className="text-sm text-gray-600 mt-1">
                {property.address ? `${property.address}, ` : ''}{property.city || ''}
              </p>
              <div className="flex flex-wrap gap-4 text-sm text-gray-700 mt-3">
                {property.type && (
                  <span>
                    <span className="text-gray-500">Type:</span>{' '}
                    {property.type.charAt(0) + property.type.slice(1).toLowerCase()}
                  </span>
                )}
                {property.bedrooms != null && (
                  <span>
                    <span className="text-gray-500">Beds:</span> {property.bedrooms}
                  </span>
                )}
                {property.bathrooms != null && (
                  <span>
                    <span className="text-gray-500">Baths:</span> {property.bathrooms}
                  </span>
                )}
                {property.area != null && (
                  <span>
                    <span className="text-gray-500">Area:</span> {property.area} sqft
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Payment summary */}
          <div className="px-8 py-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Payment Method</p>
                <p className="font-medium text-gray-900 mt-1">
                  {PAYMENT_LABEL[transaction.paymentMethod] || transaction.paymentMethod || '-'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-gray-500">Transaction Status</p>
                <span
                  className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full mt-1 ${
                    STATUS_STYLE[transaction.status] || 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {transaction.status.charAt(0) + transaction.status.slice(1).toLowerCase()}
                </span>
              </div>
            </div>

            <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl px-5 py-4 flex items-center justify-between">
              <span className="text-gray-700 font-medium">Amount Paid</span>
              <span className="text-2xl font-bold text-blue-700">
                PKR {Number(transaction.amount).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 pb-8 pt-2 text-center border-t border-gray-100">
            <p className="text-xs text-gray-500 leading-relaxed max-w-lg mx-auto">
              This receipt was generated by <strong>RealNest</strong>. This is a demo payment
              simulation — no real transaction was performed. For any queries, contact the seller
              directly via the details above.
            </p>
            <p className="text-xs text-gray-400 mt-3">
              Thank you for choosing RealNest.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
